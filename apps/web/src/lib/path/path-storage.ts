import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { LearningPath, PathProgress } from './path-types';
import { getDataSyncEventManager, SyncEventType } from '../sync/data-sync-events';

interface PathDB extends DBSchema {
  paths: {
    key: string;
    value: LearningPath;
    indexes: { 'by-category': string; 'by-author': string };
  };
  progress: {
    key: string;
    value: PathProgress;
    indexes: { 'by-path': string; 'by-user': string };
  };
}

const DB_NAME = 'learning-paths-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<PathDB> | null = null;

async function getDB(): Promise<IDBPDatabase<PathDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PathDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 路径存储
      if (!db.objectStoreNames.contains('paths')) {
        const pathStore = db.createObjectStore('paths', { keyPath: 'id' });
        pathStore.createIndex('by-category', 'category');
        pathStore.createIndex('by-author', 'author');
      }

      // 进度存储
      if (!db.objectStoreNames.contains('progress')) {
        const progressStore = db.createObjectStore('progress', {
          keyPath: 'pathId'
        });
        progressStore.createIndex('by-path', 'pathId');
        progressStore.createIndex('by-user', 'userId');
      }
    },
  });

  return dbInstance;
}

// ==================== 路径管理 ====================

export async function savePath(path: LearningPath): Promise<void> {
  const db = await getDB();

  // 检查是否是新路径（在保存之前检查）
  const existingPath = await db.get('paths', path.id);
  const isNew = !existingPath;

  // 保存路径
  await db.put('paths', path);

  console.log(`[path-storage] ${isNew ? '创建' : '更新'}路径:`, {
    id: path.id,
    title: path.title,
    nodesCount: path.nodes.length,
    edgesCount: path.edges.length,
  });

  // 发布路径创建/更新事件
  const eventManager = getDataSyncEventManager();
  eventManager.emit(
    isNew ? SyncEventType.PATH_CREATED : SyncEventType.PATH_UPDATED,
    {
      id: path.id,
      title: path.title,
      description: path.description,
      category: path.category,
    },
    'path-storage'
  );
}

export async function getPath(id: string): Promise<LearningPath | undefined> {
  const db = await getDB();
  return db.get('paths', id);
}

export async function getAllPaths(): Promise<LearningPath[]> {
  const db = await getDB();
  return db.getAll('paths');
}

export async function getPathsByCategory(category: string): Promise<LearningPath[]> {
  const db = await getDB();
  return db.getAllFromIndex('paths', 'by-category', category);
}

export async function deletePath(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('paths', id);

  // 发布路径删除事件
  const eventManager = getDataSyncEventManager();
  eventManager.emit(SyncEventType.PATH_DELETED, { id }, 'path-storage');
}

export async function exportPath(id: string): Promise<string> {
  const path = await getPath(id);
  if (!path) throw new Error('Path not found');
  return JSON.stringify(path, null, 2);
}

export async function importPath(jsonString: string): Promise<LearningPath> {
  const path = JSON.parse(jsonString) as LearningPath;
  path.id = `imported-${Date.now()}`;
  path.createdAt = new Date().toISOString();
  path.updatedAt = new Date().toISOString();
  await savePath(path);
  return path;
}

// ==================== 进度管理 ====================

export async function saveProgress(progress: PathProgress): Promise<void> {
  const db = await getDB();
  await db.put('progress', progress);

  // 发布进度更新事件
  const eventManager = getDataSyncEventManager();
  eventManager.emit(
    SyncEventType.PATH_PROGRESS_UPDATED,
    {
      pathId: progress.pathId,
      progress: progress.progress,
      completedNodes: progress.completedNodes,
    },
    'path-storage'
  );
}

export async function getProgress(pathId: string): Promise<PathProgress | undefined> {
  const db = await getDB();
  return db.get('progress', pathId);
}

export async function updateNodeCompletion(
  pathId: string,
  nodeId: string,
  completed: boolean
): Promise<void> {
  const db = await getDB();
  const progress = await db.get('progress', pathId);

  if (!progress) {
    // 创建新进度
    const newProgress: PathProgress = {
      pathId,
      userId: 'default-user',
      completedNodes: completed ? [nodeId] : [],
      currentNode: nodeId,
      startedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      progress: 0,
    };
    await db.put('progress', newProgress);
    return;
  }

  // 更新现有进度
  if (completed && !progress.completedNodes.includes(nodeId)) {
    progress.completedNodes.push(nodeId);
  } else if (!completed) {
    progress.completedNodes = progress.completedNodes.filter(id => id !== nodeId);
  }

  progress.currentNode = nodeId;
  progress.lastAccessedAt = new Date().toISOString();

  // 计算进度百分比
  const path = await getPath(pathId);
  if (path) {
    const totalNodes = path.nodes.filter(n =>
      n.data.type !== 'start' && n.data.type !== 'end'
    ).length;
    progress.progress = totalNodes > 0
      ? Math.round((progress.completedNodes.length / totalNodes) * 100)
      : 0;

    if (progress.progress === 100) {
      progress.completedAt = new Date().toISOString();
    }
  }

  await db.put('progress', progress);
}

export async function resetProgress(pathId: string): Promise<void> {
  const db = await getDB();
  await db.delete('progress', pathId);
}

// ==================== 调试和验证 ====================

/**
 * 验证路径是否正确保存
 */
export async function verifyPathSaved(pathId: string): Promise<boolean> {
  try {
    const db = await getDB();
    const path = await db.get('paths', pathId);

    if (!path) {
      console.error('[path-storage] 路径未找到:', pathId);
      return false;
    }

    console.log('[path-storage] 路径验证成功:', {
      id: path.id,
      title: path.title,
      nodesCount: path.nodes?.length || 0,
      edgesCount: path.edges?.length || 0,
      createdAt: path.createdAt,
      updatedAt: path.updatedAt,
    });

    return true;
  } catch (error) {
    console.error('[path-storage] 路径验证失败:', error);
    return false;
  }
}

/**
 * 获取数据库统计信息
 */
export async function getStorageStats(): Promise<{
  pathsCount: number;
  progressCount: number;
  dbSize?: number;
}> {
  try {
    const db = await getDB();
    const paths = await db.getAll('paths');
    const progress = await db.getAll('progress');

    const stats = {
      pathsCount: paths.length,
      progressCount: progress.length,
    };

    console.log('[path-storage] 存储统计:', stats);
    return stats;
  } catch (error) {
    console.error('[path-storage] 获取统计信息失败:', error);
    return { pathsCount: 0, progressCount: 0 };
  }
}

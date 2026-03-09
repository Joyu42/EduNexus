import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { LearningPath, PathProgress } from './path-types';

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
  await db.put('paths', path);
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

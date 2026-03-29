/**
 * 学习路径本地存储模块
 * 使用 IndexedDB 存储学习路径和任务数据
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { getClientUserIdentity } from '@/lib/auth/client-user-cache';
import { localStoragePathManager } from './path-storage-fallback';
import { getDataSyncEventManager, SyncEventType } from '../sync/data-sync-events';

// 数据类型定义
export type PathStatus = 'not_started' | 'in_progress' | 'completed';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

export type Resource = {
  id: string;
  title: string;
  type: 'article' | 'video' | 'document';
  url: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  progress: number;
  status: TaskStatus;
  dependencies: string[];
  resources: Resource[];
  notes: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  actualTime?: number; // 实际学习时长（分钟）
  documentBinding?: TaskDocumentBinding;
};

export type TaskDocumentDraft = {
  draftId: string;
  draftTitle: string;
  draftContent: string;
  updatedAt: Date;
};

export type TaskDocumentBinding = {
  documentId: string;
  documentTitle?: string;
  boundAt: Date;
  draft?: TaskDocumentDraft;
};

export type Milestone = {
  id: string;
  title: string;
  taskIds: string[];
};

export type LearningPath = {
  id: string;
  title: string;
  description: string;
  status: PathStatus;
  progress: number;
  tags: string[];
  goalId?: string; // 关联的目标 ID
  createdAt: Date;
  updatedAt: Date;
  tasks: Task[];
  milestones: Milestone[];
  deletedDocumentDrafts?: TaskDocumentDraft[];
};

type PackSummary = {
  packId: string;
  title: string;
  topic: string;
  updatedAt: string;
  active?: boolean;
};

type PackGraphNode = {
  id: string;
  label: string;
  kbDocumentId?: string;
};

type PackGraphEdge = {
  source: string;
  target: string;
};

type PackGraphViewResponse = {
  data?: {
    nodes?: PackGraphNode[];
    edges?: PackGraphEdge[];
    packId?: string;
  };
  nodes?: PackGraphNode[];
  edges?: PackGraphEdge[];
  packId?: string;
};

// IndexedDB Schema
interface PathDB extends DBSchema {
  paths: {
    key: string;
    value: LearningPath;
    indexes: { 'by-status': PathStatus; 'by-updated': Date };
  };
}

// 获取用户特定的数据库名
export function resolvePathDatabaseName(userId: string | null): string | null {
  if (!userId) {
    return null;
  }
  return `EduNexusPath_${userId}`;
}

function getDBName(): string | null {
  const userId = getClientUserIdentity();
  return resolvePathDatabaseName(userId);
}

const DB_VERSION = 1;

const toSafeCategory = (path: Pick<LearningPath, 'tags' | 'status'>): string => {
  if (Array.isArray(path.tags) && path.tags.length > 0 && path.tags[0]) {
    return path.tags[0];
  }
  return path.status;
};

const emitPathSyncEvent = (
  type: SyncEventType.PATH_CREATED | SyncEventType.PATH_UPDATED,
  path: LearningPath
): void => {
  const eventManager = getDataSyncEventManager();
  eventManager.emit(
    type,
    {
      id: path.id,
      title: path.title,
      description: path.description,
      category: toSafeCategory(path),
      progress: path.progress,
      status: path.status,
      taskCount: path.tasks.length,
      tags: path.tags,
      updatedAt: path.updatedAt.toISOString(),
    },
    'client-path-storage'
  );
};

const emitPathDeletedEvent = (pathId: string): void => {
  const eventManager = getDataSyncEventManager();
  eventManager.emit(SyncEventType.PATH_DELETED, { id: pathId }, 'client-path-storage');
};

const emitPathProgressEvent = (path: LearningPath): void => {
  const eventManager = getDataSyncEventManager();
  const completedTaskIds = path.tasks.filter((task) => task.status === 'completed').map((task) => task.id);
  eventManager.emit(
    SyncEventType.PATH_PROGRESS_UPDATED,
    {
      pathId: path.id,
      progress: path.progress,
      completedNodes: completedTaskIds,
      completedTasks: completedTaskIds.length,
      totalTasks: path.tasks.length,
      status: path.status,
    },
    'client-path-storage'
  );
};

export class TaskDocumentBindingConflictError extends Error {
  constructor(documentId: string, pathId: string, taskId: string) {
    super(`Document ${documentId} is already bound to task ${taskId} in path ${pathId}`);
    this.name = 'TaskDocumentBindingConflictError';
  }
}

const cloneBinding = (binding?: TaskDocumentBinding): TaskDocumentBinding | undefined => {
  if (!binding) {
    return undefined;
  }

  return {
    ...binding,
    boundAt: new Date(binding.boundAt),
    draft: binding.draft
      ? {
          ...binding.draft,
          updatedAt: new Date(binding.draft.updatedAt),
        }
      : undefined,
  };
};

const cloneTask = (task: Task): Task => ({
  ...task,
  createdAt: new Date(task.createdAt),
  startedAt: task.startedAt ? new Date(task.startedAt) : undefined,
  completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
  documentBinding: cloneBinding(task.documentBinding),
  resources: task.resources.map((resource) => ({ ...resource })),
  dependencies: [...task.dependencies],
});

const cloneDraft = (draft: TaskDocumentDraft): TaskDocumentDraft => ({
  ...draft,
  updatedAt: new Date(draft.updatedAt),
});

const clonePath = (path: LearningPath): LearningPath => ({
  ...path,
  createdAt: new Date(path.createdAt),
  updatedAt: new Date(path.updatedAt),
  tasks: path.tasks.map(cloneTask),
  milestones: path.milestones.map((milestone) => ({ ...milestone, taskIds: [...milestone.taskIds] })),
  deletedDocumentDrafts: path.deletedDocumentDrafts?.map(cloneDraft),
});

const normalizeTaskOrder = (tasks: Task[], orderedTaskIds: string[]): Task[] => {
  const taskById = new Map(tasks.map((task) => [task.id, task] as const));
  const orderedTasks = orderedTaskIds
    .map((taskId) => taskById.get(taskId))
    .filter((task): task is Task => !!task);
  const remainingTasks = tasks.filter((task) => !orderedTaskIds.includes(task.id));
  return [...orderedTasks, ...remainingTasks].map(cloneTask);
};

const findDocumentBindingConflict = (
  paths: LearningPath[],
  documentId: string,
  excludePathId: string,
  excludeTaskId: string
): { pathId: string; taskId: string } | null => {
  for (const path of paths) {
    if (path.id !== excludePathId) {
      const conflict = path.tasks.find((task) => task.documentBinding?.documentId === documentId);
      if (conflict) {
        return { pathId: path.id, taskId: conflict.id };
      }
      continue;
    }

    const conflict = path.tasks.find(
      (task) => task.id !== excludeTaskId && task.documentBinding?.documentId === documentId
    );
    if (conflict) {
      return { pathId: path.id, taskId: conflict.id };
    }
  }

  return null;
};

const validateCandidateBindings = (
  candidateTasks: Task[],
  allPaths: LearningPath[],
  currentPathId: string
): void => {
  const seenDocumentIds = new Map<string, string>();

  for (const candidateTask of candidateTasks) {
    const documentId = candidateTask.documentBinding?.documentId?.trim() ?? "";
    if (!documentId) {
      continue;
    }

    const duplicateTaskId = seenDocumentIds.get(documentId);
    if (duplicateTaskId) {
      throw new TaskDocumentBindingConflictError(documentId, currentPathId, duplicateTaskId);
    }
    seenDocumentIds.set(documentId, candidateTask.id);

    const conflict = findDocumentBindingConflict(allPaths, documentId, currentPathId, candidateTask.id);
    if (conflict) {
      throw new TaskDocumentBindingConflictError(documentId, conflict.pathId, conflict.taskId);
    }
  }
};

export function addTaskToPath(path: LearningPath, task: Task): LearningPath {
  return {
    ...clonePath(path),
    tasks: [...clonePath(path).tasks, cloneTask(task)],
    updatedAt: new Date(),
  };
}

export function renameTaskInPath(path: LearningPath, taskId: string, title: string): LearningPath {
  const nextPath = clonePath(path);
  nextPath.tasks = nextPath.tasks.map((task) =>
    task.id === taskId ? { ...task, title, documentBinding: cloneBinding(task.documentBinding) } : task
  );
  nextPath.updatedAt = new Date();
  return nextPath;
}

export function reorderTasksInPath(path: LearningPath, orderedTaskIds: string[]): LearningPath {
  const nextPath = clonePath(path);
  nextPath.tasks = normalizeTaskOrder(nextPath.tasks, orderedTaskIds);
  nextPath.updatedAt = new Date();
  return nextPath;
}

export function deleteTaskFromPath(
  path: LearningPath,
  taskId: string
): { path: LearningPath; removedTask?: Task } {
  const nextPath = clonePath(path);
  const removedTask = nextPath.tasks.find((task) => task.id === taskId);
  nextPath.tasks = nextPath.tasks.filter((task) => task.id !== taskId);
  if (removedTask?.documentBinding?.draft) {
    nextPath.deletedDocumentDrafts = [
      ...(nextPath.deletedDocumentDrafts ?? []),
      cloneDraft(removedTask.documentBinding.draft),
    ];
  }
  nextPath.updatedAt = new Date();
  return { path: nextPath, removedTask: removedTask ? cloneTask(removedTask) : undefined };
}

export function bindDocumentToTask(
  path: LearningPath,
  taskId: string,
  binding: TaskDocumentBinding,
  allPaths: LearningPath[] = []
): LearningPath {
  const nextPath = clonePath(path);
  nextPath.tasks = nextPath.tasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          documentBinding: {
            ...binding,
            boundAt: new Date(binding.boundAt),
            draft: binding.draft
              ? { ...binding.draft, updatedAt: new Date(binding.draft.updatedAt) }
              : undefined,
          },
        }
      : task
  );
  validateCandidateBindings(nextPath.tasks, allPaths.length > 0 ? allPaths : [path], path.id);
  nextPath.updatedAt = new Date();
  return nextPath;
}

export function unbindDocumentFromTask(path: LearningPath, taskId: string): LearningPath {
  const nextPath = clonePath(path);
  nextPath.tasks = nextPath.tasks.map((task) =>
    task.id === taskId ? { ...task, documentBinding: undefined } : task
  );
  nextPath.updatedAt = new Date();
  return nextPath;
}

const syncPathToServerGraph = async (path: LearningPath): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (path.id.startsWith('lp_')) {
      await fetch('/api/graph/learning-pack/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packId: path.id,
          tasks: path.tasks.map((task) => ({
            taskId: task.id,
            documentBinding: task.documentBinding
              ? { documentId: task.documentBinding.documentId }
              : null,
          })),
        }),
      });
      return;
    }

    await fetch('/api/path/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pathId: path.id,
        title: path.title,
        description: path.description,
        status: path.status,
        progress: path.progress,
        tags: path.tags,
        tasks: path.tasks.map((task) => ({
          taskId: task.id,
          title: task.title,
          description: task.description,
          estimatedTime: task.estimatedTime,
          status: task.status,
          progress: task.progress,
          dependencies: task.dependencies,
        })),
      }),
    });
  } catch (error) {
    console.warn('[PathStorage] 服务端路径图谱同步失败:', error);
  }
};

const deletePathFromServerGraph = async (pathId: string): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    await fetch(`/api/path/sync?pathId=${encodeURIComponent(pathId)}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.warn('[PathStorage] 服务端路径图谱删除失败:', error);
  }
};

/**
 * 学习路径存储管理类
 */
export class PathStorageManager {
  private db: IDBPDatabase<PathDB> | null = null;
  private useLocalStorage = false; // 是否使用 LocalStorage 备用方案

  /**
   * 初始化数据库
   */
  async initialize(): Promise<void> {
    if (this.db) return;
    if (this.useLocalStorage) return; // 已经在使用 LocalStorage

    const dbName = getDBName();
    if (!dbName) {
      return;
    }

    try {
      this.db = await openDB<PathDB>(dbName, DB_VERSION, {
        upgrade(db) {
          // 创建路径存储
          if (!db.objectStoreNames.contains('paths')) {
            const pathStore = db.createObjectStore('paths', { keyPath: 'id' });
            pathStore.createIndex('by-status', 'status');
            pathStore.createIndex('by-updated', 'updatedAt');
          }
        },
      });

      await this.hydrateFromLocalStorage();
    } catch (error) {
      console.error('[PathStorage] 数据库初始化失败，切换到 LocalStorage:', error);
      this.useLocalStorage = true;
      this.db = null;
    }
  }

  private async hydrateFromLocalStorage(): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      const existing = await this.db.getAll('paths');
      if (existing.length > 0) {
        return;
      }

      const fallbackPaths = localStoragePathManager.getAllPaths();
      if (fallbackPaths.length === 0) {
        return;
      }

      await Promise.all(
        fallbackPaths.map((path) => this.db!.put('paths', this.serializePath(path)))
      );
    } catch (error) {
      console.error('[PathStorage] 从 LocalStorage 迁移失败:', error);
    }
  }

  private async hydrateFromPackBacked(packId?: string): Promise<LearningPath[]> {
    try {
      const listResponse = await fetch("/api/graph/learning-pack/list", { credentials: "include" });
      if (!listResponse.ok) {
        return [];
      }

      const listJson = (await listResponse.json()) as { packs?: PackSummary[] };
      const packs = Array.isArray(listJson.packs) ? listJson.packs : [];
      if (packs.length === 0) {
        return [];
      }

      const summary = packId
        ? packs.find((pack) => pack.packId === packId)
        : packs.find((pack) => pack.active) ?? packs[0];
      if (!summary) {
        return [];
      }

      const graphResponse = await fetch(`/api/graph/view?packId=${encodeURIComponent(summary.packId)}`, {
        credentials: "include",
      });
      if (!graphResponse.ok) {
        return [];
      }

      const graphJson = (await graphResponse.json()) as PackGraphViewResponse;
      const nodes = graphJson.data?.nodes ?? graphJson.nodes ?? [];
      const edges = graphJson.data?.edges ?? graphJson.edges ?? [];
      if (!Array.isArray(nodes) || nodes.length === 0) {
        return [];
      }

      const createdAt = new Date(summary.updatedAt);
      const path: LearningPath = {
        id: summary.packId,
        title: summary.title,
        description: `基于学习包「${summary.title}」生成的学习路径`,
        status: "not_started",
        progress: 0,
        tags: [summary.topic],
        createdAt,
        updatedAt: createdAt,
        tasks: nodes.map((node, index) => ({
          id: node.id,
          title: node.label,
          description: "",
          estimatedTime: "30m",
          progress: 0,
          status: "not_started",
          dependencies: edges.filter((edge) => edge.target === node.id).map((edge) => edge.source),
          resources: [],
          notes: "",
          createdAt,
          documentBinding: node.kbDocumentId
            ? {
                documentId: node.kbDocumentId,
                boundAt: createdAt,
              }
            : undefined,
        })),
        milestones: [],
      };

      if (this.db && !this.useLocalStorage) {
        await this.db.put("paths", this.serializePath(path));
      } else {
        const existingPath = localStoragePathManager.getPath(path.id);
        if (existingPath) {
          localStoragePathManager.updatePath(path.id, path as never);
        } else {
          localStoragePathManager.createPath(path as never);
        }
      }

      return [path];
    } catch (error) {
      console.warn("[PathStorage] 从学习包路径同步失败:", error);
      return [];
    }
  }

  /**
   * 将服务器 SyncedPathRecord 转换为 LearningPath
   */
  private serverPathToLearningPath(serverPath: {
    pathId: string;
    title: string;
    description: string;
    status: "not_started" | "in_progress" | "completed";
    progress: number;
    tags: string[];
    tasks: Array<{
      taskId: string;
      title: string;
      description?: string;
      estimatedTime?: string;
      status?: "not_started" | "in_progress" | "completed";
      progress?: number;
      dependencies?: string[];
      documentBinding?: { documentId: string; boundAt: string };
    }>;
    updatedAt: string;
  }): LearningPath {
    return {
      id: serverPath.pathId,
      title: serverPath.title,
      description: serverPath.description,
      status: serverPath.status,
      progress: serverPath.progress,
      tags: serverPath.tags,
      createdAt: new Date(serverPath.updatedAt),
      updatedAt: new Date(serverPath.updatedAt),
      tasks: serverPath.tasks.map((t) => ({
        id: t.taskId,
        title: t.title,
        description: t.description ?? "",
        estimatedTime: t.estimatedTime ?? "30m",
        progress: t.progress ?? 0,
        status: t.status ?? "not_started",
        dependencies: t.dependencies ?? [],
        resources: [],
        notes: "",
        createdAt: new Date(serverPath.updatedAt),
        documentBinding: t.documentBinding
          ? {
              documentId: t.documentBinding.documentId,
              boundAt: new Date(t.documentBinding.boundAt),
            }
          : undefined,
      })),
      milestones: [],
    };
  }

  /**
   * 从服务器同步路径数据并合并到本地存储
   */
  private async hydrateFromServer(): Promise<LearningPath[]> {
    try {
      const res = await fetch("/api/path/sync", { credentials: "include" });
      if (!res.ok) return [];
      const json = await res.json();
      const serverPaths: LearningPath[] = (json.paths ?? []).map((p: Parameters<typeof this.serverPathToLearningPath>[0]) =>
        this.serverPathToLearningPath(p)
      );
      if (serverPaths.length === 0) return [];

      // 将服务器路径写入本地 IndexedDB
      if (this.db && !this.useLocalStorage) {
        await Promise.all(
          serverPaths.map((path) => this.db!.put("paths", this.serializePath(path)))
        );
      }
      return serverPaths;
    } catch (error) {
      console.warn("[PathStorage] 从服务器同步路径失败:", error);
      return [];
    }
  }

  /**
   * 获取所有学习路径
   */
  async getAllPaths(packId?: string): Promise<LearningPath[]> {
    if (!getDBName()) {
      return [];
    }

    try {
      await this.initialize();

      // 使用 LocalStorage 备用方案
      if (this.useLocalStorage) {
        return localStoragePathManager.getAllPaths();
      }

      const localPaths = await this.db!.getAll('paths');
      const deserializedLocal = localPaths.map(this.deserializePath);

      const packPaths = await this.hydrateFromPackBacked(packId);
      if (packPaths.length > 0) {
        const merged = this.mergePaths(packPaths, deserializedLocal);
        return merged;
      }

      // 从服务器 hydrate 并合并（去重，服务器数据优先更新）
      const serverPaths = await this.hydrateFromServer();
      const merged = this.mergePaths(serverPaths, deserializedLocal);

      return merged;
    } catch (error) {
      console.error('[PathStorage] 获取路径失败，尝试 LocalStorage:', error);
      this.useLocalStorage = true;
      return localStoragePathManager.getAllPaths();
    }
  }

  /**
   * 合并本地路径和服务器路径，服务器路径覆盖同名 id
   */
  private mergePaths(local: LearningPath[], server: LearningPath[]): LearningPath[] {
    const serverMap = new Map(server.map((p) => [p.id, p]));
    const localMap = new Map(local.map((p) => [p.id, p]));

    // 本地有服务器没有 → 保留
    // 服务器有本地没有 → 添加
    // 服务器和本地都有 → 服务器优先（因为是更权威的数据源）
    const merged = new Map(localMap);
    for (const [id, serverPath] of serverMap) {
      merged.set(id, serverPath);
    }
    return Array.from(merged.values());
  }

  /**
   * 创建新路径
   */
  async createPath(
    data: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ): Promise<LearningPath> {
    if (!getDBName()) {
      throw new Error('Missing client user identity for path storage');
    }

    try {
      await this.initialize();

      // 使用 LocalStorage 备用方案
      if (this.useLocalStorage) {
        const created = localStoragePathManager.createPath(data);
        emitPathSyncEvent(SyncEventType.PATH_CREATED, created);
        emitPathProgressEvent(created);
        void syncPathToServerGraph(created);
        return created;
      }

      const path: LearningPath = {
        ...data,
        id: data.id ?? `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: data.createdAt ?? new Date(),
        updatedAt: data.updatedAt ?? new Date(),
      };

      const serialized = this.serializePath(path);
      await this.db!.put('paths', serialized);

      // 验证保存
      const saved = await this.db!.get('paths', path.id);
      if (!saved) {
        throw new Error('路径保存后无法读取');
      }

      emitPathSyncEvent(SyncEventType.PATH_CREATED, path);
      emitPathProgressEvent(path);
      void syncPathToServerGraph(path);
      return path;
    } catch (error) {
      console.error('[PathStorage] 创建路径失败，尝试 LocalStorage:', error);
      this.useLocalStorage = true;
      const created = localStoragePathManager.createPath(data);
      emitPathSyncEvent(SyncEventType.PATH_CREATED, created);
      emitPathProgressEvent(created);
      void syncPathToServerGraph(created);
      return created;
    }
  }

  /**
   * 根据 ID 获取路径
   */
  async getPath(id: string): Promise<LearningPath | undefined> {
    if (!getDBName()) {
      return undefined;
    }

    await this.initialize();

    // 使用 LocalStorage 备用方案
    if (this.useLocalStorage) {
      return localStoragePathManager.getPath(id);
    }

    const path = await this.db!.get('paths', id);
    return path ? this.deserializePath(path) : undefined;
  }

  /**
   * 更新路径
   */
  async updatePath(id: string, updates: Partial<LearningPath>): Promise<LearningPath> {
    if (!getDBName()) {
      throw new Error('Missing client user identity for path storage');
    }

    try {
      await this.initialize();

      const existing = await this.getPath(id);
      if (!existing) {
        throw new Error(`Path ${id} not found`);
      }

      const candidateTasks = updates.tasks ?? existing.tasks;
      const allPaths = (await this.getAllPaths()).filter((path) => path.id !== existing.id);
      validateCandidateBindings(candidateTasks, allPaths, existing.id);

      const updated: LearningPath = {
        ...existing,
        ...updates,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date(),
      };

      // 自动计算进度
      if (updated.tasks.length > 0) {
        const totalProgress = updated.tasks.reduce((sum, task) => sum + task.progress, 0);
        updated.progress = Math.round(totalProgress / updated.tasks.length);
      }

      // 自动更新状态
      if (updated.progress === 0) {
        updated.status = 'not_started';
      } else if (updated.progress === 100) {
        updated.status = 'completed';
      } else {
        updated.status = 'in_progress';
      }

      await this.db!.put('paths', this.serializePath(updated));

      emitPathSyncEvent(SyncEventType.PATH_UPDATED, updated);
      emitPathProgressEvent(updated);
      if (updated.id.startsWith('lp_')) {
        try {
          const res = await fetch(`/api/graph/learning-pack/${updated.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: updated.title,
              topic: updated.tags?.[0] ?? (updated as any).topic ?? undefined,
            }),
          });
          if (!res.ok) {
            throw new Error(`Pack PATCH failed: ${res.status}`);
          }
        } catch (e) {
          console.warn('[PathStorage] Pack PATCH failed:', e);
        }
      } else {
        void syncPathToServerGraph(updated);
      }
      return updated;
    } catch (error) {
      console.error('[PathStorage] 更新路径失败:', error);
      throw error;
    }
  }

  /**
   * 删除路径
   */
  async deletePath(id: string): Promise<void> {
    if (!getDBName()) {
      return;
    }

    await this.initialize();

    if (this.useLocalStorage) {
      localStoragePathManager.deletePath(id);
      emitPathDeletedEvent(id);
      if (id.startsWith('lp_')) {
        void (async () => {
          try {
            await fetch(`/api/graph/learning-pack/${id}`, { method: 'DELETE' });
          } catch (e) {
            console.warn('[PathStorage] Pack DELETE failed:', e);
          }
        })();
      } else {
        void deletePathFromServerGraph(id);
      }
      return;
    }

    await this.db!.delete('paths', id);
    emitPathDeletedEvent(id);
    if (id.startsWith('lp_')) {
      void (async () => {
        try {
          await fetch(`/api/graph/learning-pack/${id}`, { method: 'DELETE' });
        } catch (e) {
          console.warn('[PathStorage] Pack DELETE failed:', e);
        }
      })();
    } else {
      void deletePathFromServerGraph(id);
    }
  }

  /**
   * 复制路径
   */
  async duplicatePath(id: string): Promise<LearningPath> {
    if (!getDBName()) {
      throw new Error('Missing client user identity for path storage');
    }

    await this.initialize();

    const original = await this.getPath(id);
    if (!original) {
      throw new Error(`Path ${id} not found`);
    }

    const duplicate: LearningPath = {
      ...original,
      id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `${original.title} (副本)`,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'not_started',
      progress: 0,
      tasks: original.tasks.map(task => ({
        ...task,
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'not_started',
        progress: 0,
        startedAt: undefined,
        completedAt: undefined,
        actualTime: undefined,
      })),
      milestones: original.milestones.map(milestone => ({
        ...milestone,
        id: `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      })),
    };

    await this.db!.put('paths', this.serializePath(duplicate));
    emitPathSyncEvent(SyncEventType.PATH_CREATED, duplicate);
    emitPathProgressEvent(duplicate);
    void syncPathToServerGraph(duplicate);
    return duplicate;
  }

  /**
   * 导出路径数据
   */
  async exportPath(id: string): Promise<string> {
    const path = await this.getPath(id);
    if (!path) {
      throw new Error(`Path ${id} not found`);
    }
    return JSON.stringify(path, null, 2);
  }

  /**
   * 导入路径数据
   */
  async importPath(jsonData: string): Promise<LearningPath> {
    if (!getDBName()) {
      throw new Error('Missing client user identity for path storage');
    }

    const data = JSON.parse(jsonData);

    // 生成新 ID
    const path: LearningPath = {
      ...data,
      id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db!.put('paths', this.serializePath(path));
    emitPathSyncEvent(SyncEventType.PATH_CREATED, path);
    emitPathProgressEvent(path);
    void syncPathToServerGraph(path);
    return path;
  }

  /**
   * 序列化路径（将 Date 转为 string）
   */
  private serializePath(path: LearningPath): any {
    return {
      ...path,
      createdAt: path.createdAt.toISOString(),
      updatedAt: path.updatedAt.toISOString(),
      tasks: path.tasks.map(task => ({
        ...task,
        createdAt: task.createdAt.toISOString(),
        startedAt: task.startedAt?.toISOString(),
        completedAt: task.completedAt?.toISOString(),
        documentBinding: task.documentBinding
          ? {
              ...task.documentBinding,
              boundAt: task.documentBinding.boundAt.toISOString(),
              draft: task.documentBinding.draft
                ? {
                    ...task.documentBinding.draft,
                    updatedAt: task.documentBinding.draft.updatedAt.toISOString(),
                  }
                : undefined,
            }
          : undefined,
      })),
    };
  }

  /**
   * 反序列化路径（将 string 转为 Date）
   */
  private deserializePath(data: any): LearningPath {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      tasks: data.tasks.map((task: any) => ({
        ...task,
        createdAt: new Date(task.createdAt),
        startedAt: task.startedAt ? new Date(task.startedAt) : undefined,
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
        documentBinding: task.documentBinding
          ? {
              ...task.documentBinding,
              boundAt: new Date(task.documentBinding.boundAt),
              draft: task.documentBinding.draft
                ? {
                    ...task.documentBinding.draft,
                    updatedAt: new Date(task.documentBinding.draft.updatedAt),
                  }
                : undefined,
            }
          : undefined,
      })),
    };
  }
}

// 单例实例
export const pathStorage = new PathStorageManager();

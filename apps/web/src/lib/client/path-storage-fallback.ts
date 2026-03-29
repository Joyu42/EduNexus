/**
 * 学习路径存储 - LocalStorage 备用方案
 * 当 IndexedDB 不可用时使用 LocalStorage
 */

import type { LearningPath } from './path-storage';
import { getClientUserIdentity } from '@/lib/auth/client-user-cache';

export function resolvePathLocalStorageKey(userId: string | null): string | null {
  if (!userId) {
    return null;
  }
  return `edunexus_learning_paths_${userId}`;
}

function getStorageKey(): string | null {
  const userId = getClientUserIdentity();
  return resolvePathLocalStorageKey(userId);
}

export class LocalStoragePathManager {
  private getStorageKey(): string | null {
    return getStorageKey();
  }

  /**
   * 获取所有学习路径
   */
  getAllPaths(): LearningPath[] {
    try {
      const storageKey = this.getStorageKey();
      if (!storageKey) {
        return [];
      }

      const data = localStorage.getItem(storageKey);
      if (!data) return [];

      const paths = JSON.parse(data);
      return paths.map(this.deserializePath);
    } catch (error) {
      console.error('[LocalStorage] 获取路径失败:', error);
      return [];
    }
  }

  /**
   * 根据 ID 获取路径
   */
  getPath(id: string): LearningPath | undefined {
    const paths = this.getAllPaths();
    return paths.find(p => p.id === id);
  }

  /**
   * 创建新路径
   */
  createPath(
    data: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      createdAt?: Date;
      updatedAt?: Date;
    }
  ): LearningPath {
    const storageKey = this.getStorageKey();
    if (!storageKey) {
      throw new Error('Missing client user identity for path storage');
    }

    const path: LearningPath = {
      ...data,
      id: data.id ?? `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: data.createdAt ?? new Date(),
      updatedAt: data.updatedAt ?? new Date(),
    };

    const paths = this.getAllPaths();
    paths.push(path);
    this.savePaths(paths, storageKey);

    console.log('[LocalStorage] 路径创建成功:', path.id);
    return path;
  }

  /**
   * 更新路径
   */
  updatePath(id: string, updates: Partial<LearningPath>): LearningPath {
    const storageKey = this.getStorageKey();
    if (!storageKey) {
      throw new Error('Missing client user identity for path storage');
    }

    const paths = this.getAllPaths();
    const index = paths.findIndex(p => p.id === id);

    if (index === -1) {
      throw new Error(`Path ${id} not found`);
    }

    const updated: LearningPath = {
      ...paths[index],
      ...updates,
      id: paths[index].id,
      createdAt: paths[index].createdAt,
      updatedAt: new Date(),
    };

    const candidateTasks = updated.tasks ?? [];
    const seenDocumentIds = new Map<string, string>();
    for (const task of candidateTasks) {
      const documentId = task.documentBinding?.documentId?.trim() ?? '';
      if (!documentId) {
        continue;
      }

      const existingTaskId = seenDocumentIds.get(documentId);
      if (existingTaskId) {
        throw new Error(`Document ${documentId} is already bound to task ${existingTaskId} in path ${id}`);
      }

      seenDocumentIds.set(documentId, task.id);
      const conflict = paths.find((path) =>
        path.id !== id && path.tasks.some((candidate) => candidate.documentBinding?.documentId === documentId)
      );
      if (conflict) {
        const conflictTask = conflict.tasks.find((candidate) => candidate.documentBinding?.documentId === documentId);
        throw new Error(
          `Document ${documentId} is already bound to task ${conflictTask?.id ?? 'unknown'} in path ${conflict.id}`
        );
      }
    }

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

    paths[index] = updated;
    this.savePaths(paths, storageKey);

    console.log('[LocalStorage] 路径更新成功:', id);
    return updated;
  }

  /**
   * 删除路径
   */
  deletePath(id: string): void {
    const storageKey = this.getStorageKey();
    if (!storageKey) {
      return;
    }

    const paths = this.getAllPaths();
    const filtered = paths.filter(p => p.id !== id);
    this.savePaths(filtered, storageKey);
    console.log('[LocalStorage] 路径删除成功:', id);
  }

  /**
   * 保存所有路径
   */
  private savePaths(paths: LearningPath[], storageKey: string): void {
    try {
      const serialized = paths.map(this.serializePath);
      localStorage.setItem(storageKey, JSON.stringify(serialized));
    } catch (error) {
      console.error('[LocalStorage] 保存失败:', error);
      throw error;
    }
  }

  /**
   * 序列化路径
   */
  private serializePath(path: LearningPath): any {
    return {
      ...path,
      createdAt: path.createdAt.toISOString(),
      updatedAt: path.updatedAt.toISOString(),
      deletedDocumentDrafts: path.deletedDocumentDrafts?.map((draft) => ({
        ...draft,
        updatedAt: draft.updatedAt.toISOString(),
      })),
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
   * 反序列化路径
   */
  private deserializePath(data: any): LearningPath {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      deletedDocumentDrafts: data.deletedDocumentDrafts?.map((draft: any) => ({
        ...draft,
        updatedAt: new Date(draft.updatedAt),
      })),
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
export const localStoragePathManager = new LocalStoragePathManager();

/**
 * 学习路径存储 - LocalStorage 备用方案
 * 当 IndexedDB 不可用时使用 LocalStorage
 */

import type { LearningPath, Task, Milestone, PathStatus, TaskStatus } from './path-storage';

const STORAGE_KEY = 'edunexus_learning_paths';

export class LocalStoragePathManager {
  /**
   * 获取所有学习路径
   */
  getAllPaths(): LearningPath[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
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
  createPath(data: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'>): LearningPath {
    const path: LearningPath = {
      ...data,
      id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const paths = this.getAllPaths();
    paths.push(path);
    this.savePaths(paths);

    console.log('[LocalStorage] 路径创建成功:', path.id);
    return path;
  }

  /**
   * 更新路径
   */
  updatePath(id: string, updates: Partial<LearningPath>): LearningPath {
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
    this.savePaths(paths);

    console.log('[LocalStorage] 路径更新成功:', id);
    return updated;
  }

  /**
   * 删除路径
   */
  deletePath(id: string): void {
    const paths = this.getAllPaths();
    const filtered = paths.filter(p => p.id !== id);
    this.savePaths(filtered);
    console.log('[LocalStorage] 路径删除成功:', id);
  }

  /**
   * 保存所有路径
   */
  private savePaths(paths: LearningPath[]): void {
    try {
      const serialized = paths.map(this.serializePath);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
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
      tasks: path.tasks.map(task => ({
        ...task,
        createdAt: task.createdAt.toISOString(),
        startedAt: task.startedAt?.toISOString(),
        completedAt: task.completedAt?.toISOString(),
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
      tasks: data.tasks.map((task: any) => ({
        ...task,
        createdAt: new Date(task.createdAt),
        startedAt: task.startedAt ? new Date(task.startedAt) : undefined,
        completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
      })),
    };
  }
}

// 单例实例
export const localStoragePathManager = new LocalStoragePathManager();

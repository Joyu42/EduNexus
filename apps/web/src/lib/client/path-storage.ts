/**
 * 学习路径本地存储模块
 * 使用 IndexedDB 存储学习路径和任务数据
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { localStoragePathManager } from './path-storage-fallback';

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
};

// IndexedDB Schema
interface PathDB extends DBSchema {
  paths: {
    key: string;
    value: LearningPath;
    indexes: { 'by-status': PathStatus; 'by-updated': Date };
  };
}

const DB_NAME = 'EduNexusPath';
const DB_VERSION = 1;

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

    try {
      console.log('[PathStorage] 初始化数据库...');
      this.db = await openDB<PathDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // 创建路径存储
          if (!db.objectStoreNames.contains('paths')) {
            console.log('[PathStorage] 创建 paths 对象存储');
            const pathStore = db.createObjectStore('paths', { keyPath: 'id' });
            pathStore.createIndex('by-status', 'status');
            pathStore.createIndex('by-updated', 'updatedAt');
          }
        },
      });
      console.log('[PathStorage] 数据库初始化成功');
    } catch (error) {
      console.error('[PathStorage] 数据库初始化失败，切换到 LocalStorage:', error);
      this.useLocalStorage = true;
      this.db = null;
    }
  }

  /**
   * 获取所有学习路径
   */
  async getAllPaths(): Promise<LearningPath[]> {
    try {
      await this.initialize();

      // 使用 LocalStorage 备用方案
      if (this.useLocalStorage) {
        console.log('[PathStorage] 使用 LocalStorage 获取路径');
        return localStoragePathManager.getAllPaths();
      }

      const paths = await this.db!.getAll('paths');
      console.log('[PathStorage] 获取所有路径:', paths.length, '个');
      return paths.map(this.deserializePath);
    } catch (error) {
      console.error('[PathStorage] 获取路径失败，尝试 LocalStorage:', error);
      this.useLocalStorage = true;
      return localStoragePathManager.getAllPaths();
    }
  }

  /**
   * 根据 ID 获取路径
   */
  async getPath(id: string): Promise<LearningPath | undefined> {
    await this.initialize();
    const path = await this.db!.get('paths', id);
    return path ? this.deserializePath(path) : undefined;
  }

  /**
   * 创建新路径
   */
  async createPath(data: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'>): Promise<LearningPath> {
    try {
      await this.initialize();

      // 使用 LocalStorage 备用方案
      if (this.useLocalStorage) {
        console.log('[PathStorage] 使用 LocalStorage 创建路径');
        return localStoragePathManager.createPath(data);
      }

      const path: LearningPath = {
        ...data,
        id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('[PathStorage] 创建路径:', path.id, path.title);
      const serialized = this.serializePath(path);
      await this.db!.put('paths', serialized);
      console.log('[PathStorage] 路径已保存到 IndexedDB');

      // 验证保存
      const saved = await this.db!.get('paths', path.id);
      if (!saved) {
        throw new Error('路径保存后无法读取');
      }
      console.log('[PathStorage] 验证成功，路径已保存');

      return path;
    } catch (error) {
      console.error('[PathStorage] 创建路径失败，尝试 LocalStorage:', error);
      this.useLocalStorage = true;
      return localStoragePathManager.createPath(data);
    }
  }

  /**
   * 根据 ID 获取路径
   */
  async getPath(id: string): Promise<LearningPath | undefined> {
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
    try {
      await this.initialize();

      const existing = await this.getPath(id);
      if (!existing) {
        throw new Error(`Path ${id} not found`);
      }

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

      console.log('[PathStorage] 更新路径:', id, '进度:', updated.progress);
      await this.db!.put('paths', this.serializePath(updated));
      console.log('[PathStorage] 路径已更新');

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
    await this.initialize();
    await this.db!.delete('paths', id);
  }

  /**
   * 复制路径
   */
  async duplicatePath(id: string): Promise<LearningPath> {
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
    const data = JSON.parse(jsonData);

    // 生成新 ID
    const path: LearningPath = {
      ...data,
      id: `path_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.db!.put('paths', this.serializePath(path));
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
      })),
    };
  }
}

// 单例实例
export const pathStorage = new PathStorageManager();

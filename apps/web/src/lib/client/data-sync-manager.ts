/**
 * 数据同步管理器 - 统一管理知识宝库、知识星图、成长地图的数据同步
 */

import { getKGSyncService } from '../graph/kg-sync-service';
import { getLearningTracker } from '../path/learning-tracker';
import type { KBDocument } from '../client/kb-storage';
import type { SkillNode } from '../path/skill-tree-types';

/**
 * 同步任务类型
 */
export type SyncTaskType = 'document' | 'skill' | 'graph';

/**
 * 同步任务状态
 */
export type SyncTaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * 同步任务
 */
export interface SyncTask {
  id: string;
  type: SyncTaskType;
  status: SyncTaskStatus;
  data: any;
  retryCount: number;
  maxRetries: number;
  error?: Error;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean;
  taskId: string;
  error?: Error;
  metadata?: Record<string, any>;
}

/**
 * 同步选项
 */
export interface SyncOptions {
  immediate?: boolean; // 是否立即同步
  retryOnError?: boolean; // 失败时是否重试
  maxRetries?: number; // 最大重试次数
}

/**
 * 数据同步管理器
 */
export class DataSyncManager {
  private syncQueue: SyncTask[] = [];
  private isProcessing: boolean = false;
  private readonly BATCH_SIZE = 5;
  private readonly RETRY_DELAY = 2000; // 2秒
  private readonly MAX_RETRIES = 3;

  private kgSync = getKGSyncService();
  private learningTracker = getLearningTracker();

  constructor() {
    this.initialize();
  }

  /**
   * 初始化
   */
  private async initialize(): Promise<void> {
    await this.kgSync.initialize();
    await this.learningTracker.initialize();

    // 监听页面卸载，保存未完成的任务
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.savePendingTasks();
      });
    }

    // 恢复未完成的任务
    await this.restorePendingTasks();

    console.debug('[DataSyncManager] Initialized');
  }

  /**
   * 同步文档
   */
  async syncDocument(
    document: KBDocument,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const taskId = this.createTask('document', document, options);

    if (options.immediate) {
      return await this.processTask(taskId);
    } else {
      this.scheduleProcessing();
      return { success: true, taskId };
    }
  }

  /**
   * 同步技能节点
   */
  async syncSkillNode(
    skillNode: SkillNode,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const taskId = this.createTask('skill', skillNode, options);

    if (options.immediate) {
      return await this.processTask(taskId);
    } else {
      this.scheduleProcessing();
      return { success: true, taskId };
    }
  }

  /**
   * 创建同步任务
   */
  private createTask(
    type: SyncTaskType,
    data: any,
    options: SyncOptions
  ): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const task: SyncTask = {
      id: taskId,
      type,
      status: 'pending',
      data,
      retryCount: 0,
      maxRetries: options.maxRetries ?? this.MAX_RETRIES,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.syncQueue.push(task);
    console.debug('[DataSyncManager] Created task:', taskId, type);

    return taskId;
  }

  /**
   * 处理单个任务
   */
  private async processTask(taskId: string): Promise<SyncResult> {
    const task = this.syncQueue.find(t => t.id === taskId);
    if (!task) {
      return {
        success: false,
        taskId,
        error: new Error('Task not found'),
      };
    }

    task.status = 'processing';
    task.updatedAt = new Date();

    try {
      let metadata: Record<string, any> = {};

      switch (task.type) {
        case 'document':
          metadata = await this.syncDocumentData(task.data);
          break;
        case 'skill':
          metadata = await this.syncSkillNodeData(task.data);
          break;
        case 'graph':
          metadata = await this.syncGraphData(task.data);
          break;
      }

      task.status = 'completed';
      task.updatedAt = new Date();

      // 从队列中移除
      this.syncQueue = this.syncQueue.filter(t => t.id !== taskId);

      console.debug('[DataSyncManager] Task completed:', taskId);

      return {
        success: true,
        taskId,
        metadata,
      };
    } catch (error) {
      const err = error as Error;
      task.error = err;
      task.retryCount++;
      task.updatedAt = new Date();

      console.error('[DataSyncManager] Task failed:', taskId, err);

      // 检查是否需要重试
      if (task.retryCount < task.maxRetries) {
        task.status = 'pending';
        console.debug('[DataSyncManager] Will retry task:', taskId, `(${task.retryCount}/${task.maxRetries})`);

        // 延迟重试
        setTimeout(() => {
          this.scheduleProcessing();
        }, this.RETRY_DELAY * task.retryCount);
      } else {
        task.status = 'failed';
        console.error('[DataSyncManager] Task failed permanently:', taskId);
      }

      return {
        success: false,
        taskId,
        error: err,
      };
    }
  }

  /**
   * 同步文档数据
   */
  private async syncDocumentData(document: KBDocument): Promise<Record<string, any>> {
    console.debug('[DataSyncManager] Syncing document:', document.id);

    // 1. 同步到知识图谱
    const graphNodeId = await this.kgSync.syncDocumentToGraph({
      documentId: document.id,
      title: document.title,
      content: document.content,
      tags: document.tags,
      createNode: true,
      updateExisting: true,
    });

    // 2. 记录学习事件
    await this.learningTracker.trackEvent({
      userId: 'default', // TODO: 从用户上下文获取
      documentId: document.id,
      graphNodeId,
      action: document.createdAt.getTime() === document.updatedAt.getTime() ? 'create' : 'edit',
      metadata: {
        title: document.title,
        tags: document.tags,
        wordCount: document.content.split(/\s+/).length,
      },
    });

    // 3. 如果有关联的技能节点，更新技能节点
    if (document.skillNodeIds && document.skillNodeIds.length > 0) {
      for (const skillNodeId of document.skillNodeIds) {
        await this.learningTracker.trackEvent({
          userId: 'default',
          documentId: document.id,
          skillNodeId,
          action: 'review',
        });
      }
    }

    return {
      graphNodeId,
      syncedAt: new Date().toISOString(),
    };
  }

  /**
   * 同步技能节点数据
   */
  private async syncSkillNodeData(skillNode: SkillNode): Promise<Record<string, any>> {
    console.debug('[DataSyncManager] Syncing skill node:', skillNode.id);

    // 1. 如果有关联的知识图谱节点，更新图谱
    if (skillNode.graphNodeId) {
      const graphNode = await this.kgSync.getNode(skillNode.graphNodeId);
      if (graphNode) {
        graphNode.status = this.mapSkillStatusToGraphStatus(skillNode.status);
        graphNode.mastery = skillNode.progress / 100;
        graphNode.updatedAt = new Date();
        await this.kgSync.upsertNode(graphNode);
      }
    }

    // 2. 记录学习事件
    const action = this.mapSkillStatusToAction(skillNode.status);
    await this.learningTracker.trackEvent({
      userId: 'default',
      skillNodeId: skillNode.id,
      graphNodeId: skillNode.graphNodeId,
      action,
      metadata: {
        title: skillNode.title,
        progress: skillNode.progress,
        type: skillNode.type,
      },
    });

    // 3. 如果技能完成，记录完成事件
    if (skillNode.status === 'completed' && skillNode.completedAt) {
      await this.learningTracker.trackEvent({
        userId: 'default',
        skillNodeId: skillNode.id,
        action: 'complete',
        metadata: {
          title: skillNode.title,
          exp: skillNode.exp,
          estimatedHours: skillNode.estimatedHours,
          actualHours: skillNode.actualHours,
        },
      });
    }

    return {
      syncedAt: new Date().toISOString(),
    };
  }

  /**
   * 同步图谱数据
   */
  private async syncGraphData(data: any): Promise<Record<string, any>> {
    console.debug('[DataSyncManager] Syncing graph data');

    // TODO: 实现图谱数据同步逻辑

    return {
      syncedAt: new Date().toISOString(),
    };
  }

  /**
   * 映射技能状态到图谱状态
   */
  private mapSkillStatusToGraphStatus(status: string): 'unlearned' | 'learning' | 'mastered' | 'review' {
    switch (status) {
      case 'locked':
        return 'unlearned';
      case 'available':
        return 'unlearned';
      case 'in_progress':
        return 'learning';
      case 'completed':
        return 'mastered';
      default:
        return 'unlearned';
    }
  }

  /**
   * 映射技能状态到学习动作
   */
  private mapSkillStatusToAction(status: string): 'create' | 'edit' | 'view' | 'delete' | 'complete' | 'review' | 'practice' {
    switch (status) {
      case 'in_progress':
        return 'edit';
      case 'completed':
        return 'complete';
      default:
        return 'view';
    }
  }

  /**
   * 调度处理
   */
  private scheduleProcessing(): void {
    if (this.isProcessing) return;

    setTimeout(() => {
      this.processBatch();
    }, 100);
  }

  /**
   * 批量处理任务
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      const pendingTasks = this.syncQueue
        .filter(t => t.status === 'pending')
        .slice(0, this.BATCH_SIZE);

      if (pendingTasks.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.debug('[DataSyncManager] Processing batch:', pendingTasks.length, 'tasks');

      // 并行处理任务
      await Promise.all(
        pendingTasks.map(task => this.processTask(task.id))
      );

      // 如果还有待处理的任务，继续处理
      if (this.syncQueue.some(t => t.status === 'pending')) {
        this.isProcessing = false;
        this.scheduleProcessing();
      } else {
        this.isProcessing = false;
      }
    } catch (error) {
      console.error('[DataSyncManager] Batch processing error:', error);
      this.isProcessing = false;
    }
  }

  /**
   * 保存未完成的任务
   */
  private savePendingTasks(): void {
    if (typeof window === 'undefined') return;

    const pendingTasks = this.syncQueue.filter(
      t => t.status === 'pending' || t.status === 'processing'
    );

    if (pendingTasks.length > 0) {
      localStorage.setItem('edunexus_pending_sync_tasks', JSON.stringify(pendingTasks));
      console.debug('[DataSyncManager] Saved pending tasks:', pendingTasks.length);
    }
  }

  /**
   * 恢复未完成的任务
   */
  private async restorePendingTasks(): Promise<void> {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem('edunexus_pending_sync_tasks');
    if (!saved) return;

    try {
      const tasks = JSON.parse(saved) as SyncTask[];
      tasks.forEach(task => {
        task.status = 'pending';
        task.createdAt = new Date(task.createdAt);
        task.updatedAt = new Date(task.updatedAt);
        this.syncQueue.push(task);
      });

      localStorage.removeItem('edunexus_pending_sync_tasks');
      console.debug('[DataSyncManager] Restored pending tasks:', tasks.length);

      // 开始处理
      this.scheduleProcessing();
    } catch (error) {
      console.error('[DataSyncManager] Failed to restore pending tasks:', error);
    }
  }

  /**
   * 获取同步状态
   */
  getSyncStatus(): {
    queueLength: number;
    isProcessing: boolean;
    pendingCount: number;
    processingCount: number;
    completedCount: number;
    failedCount: number;
  } {
    return {
      queueLength: this.syncQueue.length,
      isProcessing: this.isProcessing,
      pendingCount: this.syncQueue.filter(t => t.status === 'pending').length,
      processingCount: this.syncQueue.filter(t => t.status === 'processing').length,
      completedCount: this.syncQueue.filter(t => t.status === 'completed').length,
      failedCount: this.syncQueue.filter(t => t.status === 'failed').length,
    };
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.syncQueue = [];
    console.debug('[DataSyncManager] Queue cleared');
  }

  /**
   * 重试失败的任务
   */
  retryFailedTasks(): void {
    const failedTasks = this.syncQueue.filter(t => t.status === 'failed');
    failedTasks.forEach(task => {
      task.status = 'pending';
      task.retryCount = 0;
      task.error = undefined;
      task.updatedAt = new Date();
    });

    if (failedTasks.length > 0) {
      console.debug('[DataSyncManager] Retrying failed tasks:', failedTasks.length);
      this.scheduleProcessing();
    }
  }

  /**
   * 获取任务详情
   */
  getTask(taskId: string): SyncTask | undefined {
    return this.syncQueue.find(t => t.id === taskId);
  }

  /**
   * 取消任务
   */
  cancelTask(taskId: string): boolean {
    const index = this.syncQueue.findIndex(t => t.id === taskId);
    if (index !== -1 && this.syncQueue[index].status === 'pending') {
      this.syncQueue.splice(index, 1);
      console.debug('[DataSyncManager] Task cancelled:', taskId);
      return true;
    }
    return false;
  }
}

// 单例实例
let syncManagerInstance: DataSyncManager | null = null;

/**
 * 获取数据同步管理器实例
 */
export function getDataSyncManager(): DataSyncManager {
  if (!syncManagerInstance) {
    syncManagerInstance = new DataSyncManager();
  }
  return syncManagerInstance;
}

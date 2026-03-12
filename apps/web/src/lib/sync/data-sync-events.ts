/**
 * 数据同步事件系统 - 统一的事件总线
 * 用于知识库、资源、学习路径等模块之间的数据联动
 */

// 事件类型定义
export enum SyncEventType {
  // 知识库事件
  KB_DOCUMENT_CREATED = 'kb:document:created',
  KB_DOCUMENT_UPDATED = 'kb:document:updated',
  KB_DOCUMENT_DELETED = 'kb:document:deleted',

  // 知识图谱事件
  KG_NODE_CREATED = 'kg:node:created',
  KG_NODE_UPDATED = 'kg:node:updated',
  KG_NODE_DELETED = 'kg:node:deleted',
  KG_EDGE_CREATED = 'kg:edge:created',
  KG_EDGE_DELETED = 'kg:edge:deleted',

  // 资源事件
  RESOURCE_CREATED = 'resource:created',
  RESOURCE_UPDATED = 'resource:updated',
  RESOURCE_DELETED = 'resource:deleted',
  RESOURCE_BOOKMARKED = 'resource:bookmarked',

  // 学习路径事件
  PATH_CREATED = 'path:created',
  PATH_UPDATED = 'path:updated',
  PATH_DELETED = 'path:deleted',
  PATH_PROGRESS_UPDATED = 'path:progress:updated',

  // 工作区事件
  WORKSPACE_PROJECT_CREATED = 'workspace:project:created',
  WORKSPACE_PROJECT_UPDATED = 'workspace:project:updated',
}

// 事件数据接口
export interface SyncEventData {
  type: SyncEventType;
  payload: any;
  timestamp: number;
  source: string; // 事件来源模块
}

// 事件监听器类型
export type SyncEventListener = (data: SyncEventData) => void | Promise<void>;

/**
 * 数据同步事件管理器
 */
class DataSyncEventManager {
  private listeners: Map<SyncEventType, Set<SyncEventListener>> = new Map();
  private eventQueue: SyncEventData[] = [];
  private isProcessing = false;

  /**
   * 订阅事件
   */
  on(eventType: SyncEventType, listener: SyncEventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    // 返回取消订阅函数
    return () => this.off(eventType, listener);
  }

  /**
   * 取消订阅
   */
  off(eventType: SyncEventType, listener: SyncEventListener): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
    }
  }

  /**
   * 发布事件
   */
  emit(eventType: SyncEventType, payload: any, source: string): void {
    const eventData: SyncEventData = {
      type: eventType,
      payload,
      timestamp: Date.now(),
      source,
    };

    this.eventQueue.push(eventData);
    this.processQueue();
  }

  /**
   * 处理事件队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()!;
      await this.dispatchEvent(event);
    }

    this.isProcessing = false;
  }

  /**
   * 分发事件给监听器
   */
  private async dispatchEvent(event: SyncEventData): Promise<void> {
    const listeners = this.listeners.get(event.type);
    if (!listeners || listeners.size === 0) {
      return;
    }

    const promises: Promise<void>[] = [];
    listeners.forEach((listener) => {
      try {
        const result = listener(event);
        if (result instanceof Promise) {
          promises.push(result);
        }
      } catch (error) {
        console.error(`[DataSync] Error in listener for ${event.type}:`, error);
      }
    });

    // 等待所有异步监听器完成
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
  }

  /**
   * 清除所有监听器
   */
  clear(): void {
    this.listeners.clear();
    this.eventQueue = [];
  }

  /**
   * 获取事件统计
   */
  getStats(): { eventType: SyncEventType; listenerCount: number }[] {
    return Array.from(this.listeners.entries()).map(([eventType, listeners]) => ({
      eventType,
      listenerCount: listeners.size,
    }));
  }
}

// 单例实例
let eventManagerInstance: DataSyncEventManager | null = null;

/**
 * 获取事件管理器实例
 */
export function getDataSyncEventManager(): DataSyncEventManager {
  if (!eventManagerInstance) {
    eventManagerInstance = new DataSyncEventManager();
  }
  return eventManagerInstance;
}

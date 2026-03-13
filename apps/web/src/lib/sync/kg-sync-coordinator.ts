/**
 * 知识图谱同步协调器
 * 监听各模块事件，自动同步到知识图谱
 */

import { getDataSyncEventManager, SyncEventType, type SyncEventData } from './data-sync-events';
import { getKGSyncService } from '../graph/kg-sync-service';
import { extractKeywords } from '../kb/content-extractor';

// 防抖延迟（毫秒）
const DEBOUNCE_DELAY = 1500;

/**
 * 知识图谱同步协调器
 */
class KGSyncCoordinator {
  private unsubscribers: Array<() => void> = [];
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private initialized = false;

  /**
   * 初始化协调器，注册所有事件监听
   */
  initialize(): void {
    if (this.initialized) return;

    const eventManager = getDataSyncEventManager();

    // 监听知识库文档事件
    this.unsubscribers.push(
      eventManager.on(SyncEventType.KB_DOCUMENT_CREATED, this.handleDocumentCreated.bind(this))
    );
    this.unsubscribers.push(
      eventManager.on(SyncEventType.KB_DOCUMENT_UPDATED, this.handleDocumentUpdated.bind(this))
    );
    this.unsubscribers.push(
      eventManager.on(SyncEventType.KB_DOCUMENT_DELETED, this.handleDocumentDeleted.bind(this))
    );

    // 监听资源事件
    this.unsubscribers.push(
      eventManager.on(SyncEventType.RESOURCE_CREATED, this.handleResourceCreated.bind(this))
    );
    this.unsubscribers.push(
      eventManager.on(SyncEventType.RESOURCE_UPDATED, this.handleResourceUpdated.bind(this))
    );
    this.unsubscribers.push(
      eventManager.on(SyncEventType.RESOURCE_DELETED, this.handleResourceDeleted.bind(this))
    );

    // 监听学习路径事件
    this.unsubscribers.push(
      eventManager.on(SyncEventType.PATH_CREATED, this.handlePathCreated.bind(this))
    );
    this.unsubscribers.push(
      eventManager.on(SyncEventType.PATH_UPDATED, this.handlePathUpdated.bind(this))
    );
    this.unsubscribers.push(
      eventManager.on(SyncEventType.PATH_PROGRESS_UPDATED, this.handlePathProgressUpdated.bind(this))
    );

    this.initialized = true;
    console.debug('[KGCoordinator] Initialized, listening for sync events');
  }

  /**
   * 销毁协调器
   */
  destroy(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
    this.initialized = false;
  }

  /**
   * 防抖执行
   */
  private debounce(key: string, fn: () => Promise<void>): void {
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(key);
      try {
        await fn();
      } catch (error) {
        console.error(`[KGCoordinator] Error in debounced task ${key}:`, error);
      }
    }, DEBOUNCE_DELAY);

    this.debounceTimers.set(key, timer);
  }

  // ==================== 知识库文档处理 ====================

  private async handleDocumentCreated(event: SyncEventData): Promise<void> {
    const { id, title, content, tags } = event.payload;
    this.debounce(`doc_create_${id}`, async () => {
      const kgService = getKGSyncService();
      await kgService.syncDocumentToGraph({
        documentId: id,
        title,
        content: content || '',
        tags: tags || [],
        createNode: true,
        updateExisting: false,
      });
      console.debug('[KGCoordinator] Synced new document to graph:', id);
    });
  }

  private async handleDocumentUpdated(event: SyncEventData): Promise<void> {
    const { id, title, content, tags } = event.payload;
    this.debounce(`doc_update_${id}`, async () => {
      const kgService = getKGSyncService();
      await kgService.syncDocumentToGraph({
        documentId: id,
        title,
        content: content || '',
        tags: tags || [],
        createNode: true,
        updateExisting: true,
      });
      console.debug('[KGCoordinator] Synced updated document to graph:', id);
    });
  }

  private async handleDocumentDeleted(event: SyncEventData): Promise<void> {
    const { id } = event.payload;
    const kgService = getKGSyncService();
    await kgService.removeDocumentFromGraph(id);
    console.debug('[KGCoordinator] Removed document from graph:', id);
  }

  // ==================== 资源处理 ====================

  private async handleResourceCreated(event: SyncEventData): Promise<void> {
    const { id, title, description, tags } = event.payload;
    this.debounce(`res_create_${id}`, async () => {
      const kgService = getKGSyncService();
      const content = `${title}\n${description || ''}`;
      const keywords = extractKeywords(content, 10);

      const nodeId = `res_${id}`;
      const existingNode = await kgService.getNode(nodeId);
      if (!existingNode) {
        await kgService.upsertNode({
          id: nodeId,
          name: title,
          type: 'concept',
          status: 'learning',
          importance: 0.4,
          mastery: 0,
          connections: 0,
          noteCount: 0,
          practiceCount: 0,
          practiceCompleted: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          documentIds: [],
          keywords: [...keywords, ...(tags || [])],
        });
        console.debug('[KGCoordinator] Created resource node in graph:', nodeId);
      }
    });
  }

  private async handleResourceUpdated(event: SyncEventData): Promise<void> {
    const { id, title, description, tags } = event.payload;
    this.debounce(`res_update_${id}`, async () => {
      const kgService = getKGSyncService();
      const nodeId = `res_${id}`;
      const existingNode = await kgService.getNode(nodeId);
      if (existingNode) {
        const content = `${title}\n${description || ''}`;
        const keywords = extractKeywords(content, 10);
        await kgService.upsertNode({
          ...existingNode,
          name: title,
          keywords: [...keywords, ...(tags || [])],
          updatedAt: new Date(),
        });
        console.debug('[KGCoordinator] Updated resource node in graph:', nodeId);
      }
    });
  }

  private async handleResourceDeleted(event: SyncEventData): Promise<void> {
    const { id } = event.payload;
    const kgService = getKGSyncService();
    const nodeId = `res_${id}`;
    await kgService.deleteNode(nodeId);
    console.debug('[KGCoordinator] Deleted resource node from graph:', nodeId);
  }

  // ==================== 学习路径处理 ====================

  private async handlePathCreated(event: SyncEventData): Promise<void> {
    const { id, title, description, category } = event.payload;
    this.debounce(`path_create_${id}`, async () => {
      const kgService = getKGSyncService();
      const nodeId = `path_${id}`;
      const existingNode = await kgService.getNode(nodeId);
      if (!existingNode) {
        const content = `${title}\n${description || ''}`;
        const keywords = extractKeywords(content, 10);
        await kgService.upsertNode({
          id: nodeId,
          name: title,
          type: 'skill',
          status: 'learning',
          importance: 0.6,
          mastery: 0,
          connections: 0,
          noteCount: 0,
          practiceCount: 0,
          practiceCompleted: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
          documentIds: [],
          keywords: [...keywords, ...(category ? [category] : [])],
        });
        console.debug('[KGCoordinator] Created path node in graph:', nodeId);
      }
    });
  }

  private async handlePathUpdated(event: SyncEventData): Promise<void> {
    const { id, title, description, category } = event.payload;
    this.debounce(`path_update_${id}`, async () => {
      const kgService = getKGSyncService();
      const nodeId = `path_${id}`;
      const existingNode = await kgService.getNode(nodeId);
      if (existingNode) {
        const content = `${title}\n${description || ''}`;
        const keywords = extractKeywords(content, 10);
        await kgService.upsertNode({
          ...existingNode,
          name: title,
          keywords: [...keywords, ...(category ? [category] : [])],
          updatedAt: new Date(),
        });
        console.debug('[KGCoordinator] Updated path node in graph:', nodeId);
      }
    });
  }

  private async handlePathProgressUpdated(event: SyncEventData): Promise<void> {
    const { pathId, progress, completedNodes } = event.payload;
    this.debounce(`path_progress_${pathId}`, async () => {
      const kgService = getKGSyncService();
      const nodeId = `path_${pathId}`;
      const existingNode = await kgService.getNode(nodeId);
      if (existingNode) {
        const mastery = Math.round((progress || 0)) / 100;
        await kgService.upsertNode({
          ...existingNode,
          mastery,
          practiceCompleted: completedNodes?.length || 0,
          status: mastery >= 0.8 ? 'mastered' : mastery > 0 ? 'learning' : 'unlearned',
          updatedAt: new Date(),
        });
        console.debug('[KGCoordinator] Updated path progress in graph:', nodeId, 'mastery:', mastery);
      }
    });
  }
}

// 单例实例
let coordinatorInstance: KGSyncCoordinator | null = null;

/**
 * 获取知识图谱同步协调器实例
 */
export function getKGSyncCoordinator(): KGSyncCoordinator {
  if (!coordinatorInstance) {
    coordinatorInstance = new KGSyncCoordinator();
  }
  return coordinatorInstance;
}

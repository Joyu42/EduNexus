/**
 * 知识图谱同步服务 - 处理笔记与知识图谱的双向同步
 */

import type { GraphNode, GraphEdge, NodeType } from './types';
import type { KBDocument } from '../client/kb-storage';
import { extractTags, extractKeywords, extractWikiLinks } from '../kb/content-extractor';

// IndexedDB 配置
const DB_NAME = 'EduNexusKG';
const DB_VERSION = 1;
const STORE_NODES = 'nodes';
const STORE_EDGES = 'edges';

/**
 * 初始化知识图谱数据库
 */
function openKGDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建节点存储
      if (!db.objectStoreNames.contains(STORE_NODES)) {
        const nodeStore = db.createObjectStore(STORE_NODES, { keyPath: 'id' });
        nodeStore.createIndex('type', 'type', { unique: false });
        nodeStore.createIndex('status', 'status', { unique: false });
        nodeStore.createIndex('keywords', 'keywords', { unique: false, multiEntry: true });
      }

      // 创建边存储
      if (!db.objectStoreNames.contains(STORE_EDGES)) {
        const edgeStore = db.createObjectStore(STORE_EDGES, { keyPath: 'id' });
        edgeStore.createIndex('source', 'source', { unique: false });
        edgeStore.createIndex('target', 'target', { unique: false });
      }
    };
  });
}

/**
 * 知识图谱同步选项
 */
export interface SyncToKGOptions {
  documentId: string;
  title: string;
  content: string;
  tags: string[];
  createNode?: boolean; // 是否创建新节点
  updateExisting?: boolean; // 是否更新已存在的节点
}

/**
 * 知识图谱存储管理器
 */
export class KGSyncService {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = await openKGDatabase();
  }

  /**
   * 同步文档到知识图谱
   */
  async syncDocumentToGraph(options: SyncToKGOptions): Promise<string> {
    if (!this.db) await this.initialize();

    console.debug('[KGSync] Syncing document to graph:', options.documentId);

    // 提取内容特征
    const tags = extractTags(options.content);
    const keywords = extractKeywords(options.content, 15);
    const wikiLinks = extractWikiLinks(options.content);

    // 查找或创建节点
    const nodeId = `kg_${options.documentId}`;
    let node = await this.getNode(nodeId);

    if (!node && options.createNode !== false) {
      // 创建新节点
      node = {
        id: nodeId,
        name: options.title,
        type: 'concept' as NodeType,
        status: 'learning',
        importance: 0.5,
        mastery: 0,
        connections: 0,
        noteCount: 1,
        practiceCount: 0,
        practiceCompleted: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        documentIds: [options.documentId],
        keywords,
      };
      await this.upsertNode(node);
      console.debug('[KGSync] Created new node:', nodeId);
    } else if (node && options.updateExisting !== false) {
      // 更新现有节点
      node.name = options.title;
      node.keywords = keywords;
      node.updatedAt = new Date();
      if (!node.documentIds.includes(options.documentId)) {
        node.documentIds.push(options.documentId);
        node.noteCount = node.documentIds.length;
      }
      await this.upsertNode(node);
      console.debug('[KGSync] Updated existing node:', nodeId);
    }

    // 基于标签创建关联
    await this.createTagBasedConnections(nodeId, tags);

    // 基于双链创建关联
    await this.createWikiLinkConnections(nodeId, wikiLinks);

    // 基于关键词创建关联
    await this.createKeywordBasedConnections(nodeId, keywords);

    return nodeId;
  }

  /**
   * 获取节点
   */
  async getNode(nodeId: string): Promise<GraphNode | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NODES], 'readonly');
      const store = transaction.objectStore(STORE_NODES);
      const request = store.get(nodeId);

      request.onsuccess = () => {
        const node = request.result;
        if (node) {
          resolve({
            ...node,
            createdAt: new Date(node.createdAt),
            updatedAt: new Date(node.updatedAt),
            lastReviewedAt: node.lastReviewedAt ? new Date(node.lastReviewedAt) : undefined,
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 创建或更新节点
   */
  async upsertNode(node: GraphNode): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NODES], 'readwrite');
      const store = transaction.objectStore(STORE_NODES);
      const request = store.put(node);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 根据标签查找节点
   */
  async findNodesByTag(tag: string): Promise<GraphNode[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NODES], 'readonly');
      const store = transaction.objectStore(STORE_NODES);
      const request = store.getAll();

      request.onsuccess = () => {
        const nodes = request.result.filter((node: any) =>
          node.keywords?.includes(tag) || node.name.includes(tag)
        );
        resolve(nodes.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          updatedAt: new Date(n.updatedAt),
        })));
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 根据关键词查找相似节点
   */
  async findSimilarNodes(keywords: string[], limit: number = 5): Promise<GraphNode[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NODES], 'readonly');
      const store = transaction.objectStore(STORE_NODES);
      const request = store.getAll();

      request.onsuccess = () => {
        const nodes = request.result;

        // 计算相似度
        const scored = nodes.map((node: any) => {
          const nodeKeywords = node.keywords || [];
          const intersection = keywords.filter(k => nodeKeywords.includes(k));
          const score = intersection.length / Math.max(keywords.length, nodeKeywords.length);
          return { node, score };
        });

        // 排序并返回前 N 个
        const topNodes = scored
          .filter(s => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .map(s => ({
            ...s.node,
            createdAt: new Date(s.node.createdAt),
            updatedAt: new Date(s.node.updatedAt),
          }));

        resolve(topNodes);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 创建或更新边
   */
  async upsertEdge(edge: GraphEdge & { id?: string }): Promise<void> {
    if (!this.db) await this.initialize();

    const edgeId = edge.id || `edge_${typeof edge.source === 'string' ? edge.source : edge.source.id}_${typeof edge.target === 'string' ? edge.target : edge.target.id}`;
    const edgeData = {
      id: edgeId,
      source: typeof edge.source === 'string' ? edge.source : edge.source.id,
      target: typeof edge.target === 'string' ? edge.target : edge.target.id,
      type: edge.type,
      strength: edge.strength,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_EDGES], 'readwrite');
      const store = transaction.objectStore(STORE_EDGES);
      const request = store.put(edgeData);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 基于标签创建连接
   */
  private async createTagBasedConnections(nodeId: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagNodes = await this.findNodesByTag(tag);
      for (const tagNode of tagNodes) {
        if (tagNode.id !== nodeId) {
          await this.upsertEdge({
            source: nodeId,
            target: tagNode.id,
            type: 'related',
            strength: 0.6,
          });
          console.debug('[KGSync] Created tag-based connection:', nodeId, '->', tagNode.id);
        }
      }
    }
  }

  /**
   * 基于双链创建连接
   */
  private async createWikiLinkConnections(nodeId: string, wikiLinks: string[]): Promise<void> {
    for (const link of wikiLinks) {
      // 查找匹配的节点
      const nodes = await this.findNodesByTag(link);
      for (const node of nodes) {
        if (node.id !== nodeId) {
          await this.upsertEdge({
            source: nodeId,
            target: node.id,
            type: 'related',
            strength: 0.8, // 双链的权重更高
          });
          console.debug('[KGSync] Created wiki-link connection:', nodeId, '->', node.id);
        }
      }
    }
  }

  /**
   * 基于关键词创建连接
   */
  private async createKeywordBasedConnections(nodeId: string, keywords: string[]): Promise<void> {
    const similarNodes = await this.findSimilarNodes(keywords, 3);
    for (const node of similarNodes) {
      if (node.id !== nodeId) {
        await this.upsertEdge({
          source: nodeId,
          target: node.id,
          type: 'related',
          strength: 0.4,
        });
        console.debug('[KGSync] Created keyword-based connection:', nodeId, '->', node.id);
      }
    }
  }

  /**
   * 删除文档关联
   */
  async removeDocumentFromGraph(documentId: string): Promise<void> {
    if (!this.db) await this.initialize();

    const nodeId = `kg_${documentId}`;
    const node = await this.getNode(nodeId);

    if (node) {
      // 移除文档关联
      node.documentIds = node.documentIds.filter(id => id !== documentId);
      node.noteCount = node.documentIds.length;

      if (node.documentIds.length === 0) {
        // 如果没有关联文档了，删除节点
        await this.deleteNode(nodeId);
        console.debug('[KGSync] Deleted node (no documents):', nodeId);
      } else {
        // 更新节点
        await this.upsertNode(node);
        console.debug('[KGSync] Updated node (removed document):', nodeId);
      }
    }
  }

  /**
   * 删除节点
   */
  async deleteNode(nodeId: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NODES, STORE_EDGES], 'readwrite');

      // 删除节点
      const nodeStore = transaction.objectStore(STORE_NODES);
      nodeStore.delete(nodeId);

      // 删除相关的边
      const edgeStore = transaction.objectStore(STORE_EDGES);
      const sourceIndex = edgeStore.index('source');
      const targetIndex = edgeStore.index('target');

      sourceIndex.openCursor(IDBKeyRange.only(nodeId)).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      targetIndex.openCursor(IDBKeyRange.only(nodeId)).onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * 获取节点的所有关联文档
   */
  async getNodeDocuments(nodeId: string): Promise<string[]> {
    const node = await this.getNode(nodeId);
    return node?.documentIds || [];
  }

  /**
   * 获取所有节点
   */
  async getAllNodes(): Promise<GraphNode[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NODES], 'readonly');
      const store = transaction.objectStore(STORE_NODES);
      const request = store.getAll();

      request.onsuccess = () => {
        const nodes = request.result.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
          updatedAt: new Date(n.updatedAt),
          lastReviewedAt: n.lastReviewedAt ? new Date(n.lastReviewedAt) : undefined,
        }));
        resolve(nodes);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取所有边
   */
  async getAllEdges(): Promise<GraphEdge[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_EDGES], 'readonly');
      const store = transaction.objectStore(STORE_EDGES);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// 单例实例
let kgSyncInstance: KGSyncService | null = null;

/**
 * 获取知识图谱同步服务实例
 */
export function getKGSyncService(): KGSyncService {
  if (!kgSyncInstance) {
    kgSyncInstance = new KGSyncService();
  }
  return kgSyncInstance;
}

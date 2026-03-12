/**
 * 知识库本地存储模块
 * 支持 IndexedDB 存储和 File System Access API
 */

import { getDataSyncEventManager, SyncEventType } from '../sync/data-sync-events';

// 文档类型定义
export type KBDocument = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  parentId?: string;
  vaultId: string;
  version?: number; // 版本号，用于冲突检测
  // 数据联动字段
  graphNodeId?: string;      // 关联的知识星图节点
  skillNodeIds?: string[];   // 关联的技能节点
  relatedDocs?: string[];    // 相关文档
  extractedKeywords?: string[]; // 提取的关键词
  lastSyncedAt?: Date;       // 最后同步时间
};

// 知识库（Vault）类型定义
export type KBVault = {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
  lastAccessedAt: Date;
  isDefault: boolean;
};

// 存储键常量
const STORAGE_KEYS = {
  VAULTS: "edunexus_kb_vaults",
  CURRENT_VAULT: "edunexus_kb_current_vault",
  DOCUMENTS_PREFIX: "edunexus_kb_docs_",
} as const;

// IndexedDB 配置
const DB_NAME = "EduNexusKB";
const DB_VERSION = 1;
const STORE_DOCUMENTS = "documents";
const STORE_VAULTS = "vaults";

/**
 * 初始化 IndexedDB
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建文档存储
      if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
        const docStore = db.createObjectStore(STORE_DOCUMENTS, { keyPath: "id" });
        docStore.createIndex("vaultId", "vaultId", { unique: false });
        docStore.createIndex("title", "title", { unique: false });
        docStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      // 创建知识库存储
      if (!db.objectStoreNames.contains(STORE_VAULTS)) {
        db.createObjectStore(STORE_VAULTS, { keyPath: "id" });
      }
    };
  });
}

/**
 * 知识库管理类
 */
export class KBStorageManager {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = await openDatabase();
  }

  // ==================== 知识库（Vault）管理 ====================

  /**
   * 获取所有知识库
   */
  async getAllVaults(): Promise<KBVault[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_VAULTS], "readonly");
      const store = transaction.objectStore(STORE_VAULTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const vaults = request.result.map((v: any) => ({
          ...v,
          createdAt: new Date(v.createdAt),
          lastAccessedAt: new Date(v.lastAccessedAt),
        }));
        resolve(vaults);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 创建新知识库
   */
  async createVault(name: string, path: string): Promise<KBVault> {
    if (!this.db) await this.initialize();

    const vault: KBVault = {
      id: `vault_${Date.now()}`,
      name,
      path,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      isDefault: false,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_VAULTS], "readwrite");
      const store = transaction.objectStore(STORE_VAULTS);
      const request = store.add(vault);

      request.onsuccess = () => resolve(vault);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 更新知识库
   */
  async updateVault(vault: KBVault): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_VAULTS], "readwrite");
      const store = transaction.objectStore(STORE_VAULTS);
      const request = store.put(vault);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除知识库
   */
  async deleteVault(vaultId: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_VAULTS, STORE_DOCUMENTS], "readwrite");

      // 删除知识库
      const vaultStore = transaction.objectStore(STORE_VAULTS);
      vaultStore.delete(vaultId);

      // 删除该知识库下的所有文档
      const docStore = transaction.objectStore(STORE_DOCUMENTS);
      const index = docStore.index("vaultId");
      const request = index.openCursor(IDBKeyRange.only(vaultId));

      request.onsuccess = (event) => {
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
   * 设置当前知识库
   */
  setCurrentVault(vaultId: string): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_VAULT, vaultId);
  }

  /**
   * 获取当前知识库
   */
  getCurrentVaultId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_VAULT);
  }

  // ==================== 文档管理 ====================

  /**
   * 获取知识库下的所有文档
   */
  async getDocumentsByVault(vaultId: string): Promise<KBDocument[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_DOCUMENTS], "readonly");
      const store = transaction.objectStore(STORE_DOCUMENTS);
      const index = store.index("vaultId");
      const request = index.getAll(vaultId);

      request.onsuccess = () => {
        const docs = request.result.map((d: any) => ({
          ...d,
          createdAt: new Date(d.createdAt),
          updatedAt: new Date(d.updatedAt),
        }));
        resolve(docs);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 创建文档
   */
  async createDocument(
    vaultId: string,
    title: string,
    content: string = "",
    tags: string[] = []
  ): Promise<KBDocument> {
    if (!this.db) await this.initialize();

    const doc: KBDocument = {
      id: `doc_${Date.now()}`,
      title,
      content,
      tags,
      vaultId,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1, // 初始版本号
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_DOCUMENTS], "readwrite");
      const store = transaction.objectStore(STORE_DOCUMENTS);
      const request = store.add(doc);

      request.onsuccess = () => {
        // 发布文档创建事件
        const eventManager = getDataSyncEventManager();
        eventManager.emit(SyncEventType.KB_DOCUMENT_CREATED, {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          tags: doc.tags,
          vaultId: doc.vaultId,
        }, 'kb-storage');
        resolve(doc);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 更新文档
   */
  async updateDocument(doc: KBDocument): Promise<void> {
    if (!this.db) await this.initialize();

    const updatedDoc = {
      ...doc,
      updatedAt: new Date(),
      version: (doc.version || 0) + 1, // 增加版本号
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_DOCUMENTS], "readwrite");
      const store = transaction.objectStore(STORE_DOCUMENTS);
      const request = store.put(updatedDoc);

      request.onsuccess = () => {
        // 发布文档更新事件
        const eventManager = getDataSyncEventManager();
        eventManager.emit(SyncEventType.KB_DOCUMENT_UPDATED, {
          id: updatedDoc.id,
          title: updatedDoc.title,
          content: updatedDoc.content,
          tags: updatedDoc.tags,
          vaultId: updatedDoc.vaultId,
        }, 'kb-storage');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 删除文档
   */
  async deleteDocument(docId: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_DOCUMENTS], "readwrite");
      const store = transaction.objectStore(STORE_DOCUMENTS);
      const request = store.delete(docId);

      request.onsuccess = () => {
        // 发布文档删除事件
        const eventManager = getDataSyncEventManager();
        eventManager.emit(SyncEventType.KB_DOCUMENT_DELETED, {
          id: docId,
        }, 'kb-storage');
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 导出文档为 Markdown 文件
   */
  exportDocumentAsMarkdown(doc: KBDocument): void {
    const blob = new Blob([doc.content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.title}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * 导出知识库所有文档
   */
  async exportVaultAsZip(vaultId: string): Promise<void> {
    // 这里需要使用 JSZip 库，暂时简化实现
    const docs = await this.getDocumentsByVault(vaultId);

    // 简化版：逐个导出
    for (const doc of docs) {
      this.exportDocumentAsMarkdown(doc);
    }
  }

  /**
   * 导入 Markdown 文件
   */
  async importMarkdownFile(vaultId: string, file: File): Promise<KBDocument> {
    const content = await file.text();
    const title = file.name.replace(/\.md$/, "");

    return this.createDocument(vaultId, title, content);
  }

  /**
   * 批量导入文件
   */
  async importMultipleFiles(vaultId: string, files: FileList): Promise<KBDocument[]> {
    const docs: KBDocument[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.endsWith(".md")) {
        const doc = await this.importMarkdownFile(vaultId, file);
        docs.push(doc);
      }
    }

    return docs;
  }
}

// 单例实例
let storageInstance: KBStorageManager | null = null;

/**
 * 获取存储管理器实例
 */
export function getKBStorage(): KBStorageManager {
  if (!storageInstance) {
    storageInstance = new KBStorageManager();
  }
  return storageInstance;
}

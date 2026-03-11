/**
 * 文档版本历史管理
 */

import { KBDocument } from "./kb-storage";

export type DocumentVersion = {
  id: string;
  docId: string;
  version: number;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  author?: string;
  changeDescription?: string;
};

const DB_NAME = "EduNexusKB";
const DB_VERSION = 2; // 增加版本号
const STORE_VERSIONS = "versions";

/**
 * 初始化版本历史数据库
 */
function openVersionDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建版本存储
      if (!db.objectStoreNames.contains(STORE_VERSIONS)) {
        const versionStore = db.createObjectStore(STORE_VERSIONS, {
          keyPath: "id",
        });
        versionStore.createIndex("docId", "docId", { unique: false });
        versionStore.createIndex("version", "version", { unique: false });
        versionStore.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

/**
 * 版本历史管理类
 */
export class VersionHistoryManager {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = await openVersionDatabase();
  }

  /**
   * 保存文档版本
   */
  async saveVersion(
    doc: KBDocument,
    changeDescription?: string
  ): Promise<DocumentVersion> {
    if (!this.db) await this.initialize();

    const version: DocumentVersion = {
      id: `version_${doc.id}_${Date.now()}`,
      docId: doc.id,
      version: doc.version || 1,
      title: doc.title,
      content: doc.content,
      tags: [...doc.tags],
      createdAt: new Date(),
      changeDescription,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_VERSIONS], "readwrite");
      const store = transaction.objectStore(STORE_VERSIONS);
      const request = store.add(version);

      request.onsuccess = () => resolve(version);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取文档的所有版本
   */
  async getVersions(docId: string): Promise<DocumentVersion[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_VERSIONS], "readonly");
      const store = transaction.objectStore(STORE_VERSIONS);
      const index = store.index("docId");
      const request = index.getAll(docId);

      request.onsuccess = () => {
        const versions = request.result.map((v: any) => ({
          ...v,
          createdAt: new Date(v.createdAt),
        }));
        // 按版本号降序排序
        versions.sort((a, b) => b.version - a.version);
        resolve(versions);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取特定版本
   */
  async getVersion(versionId: string): Promise<DocumentVersion | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_VERSIONS], "readonly");
      const store = transaction.objectStore(STORE_VERSIONS);
      const request = store.get(versionId);

      request.onsuccess = () => {
        if (request.result) {
          resolve({
            ...request.result,
            createdAt: new Date(request.result.createdAt),
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 恢复到特定版本
   */
  async restoreVersion(versionId: string): Promise<DocumentVersion | null> {
    const version = await this.getVersion(versionId);
    return version;
  }

  /**
   * 比较两个版本
   */
  compareVersions(
    version1: DocumentVersion,
    version2: DocumentVersion
  ): {
    titleChanged: boolean;
    contentChanged: boolean;
    tagsChanged: boolean;
    contentDiff: string;
  } {
    return {
      titleChanged: version1.title !== version2.title,
      contentChanged: version1.content !== version2.content,
      tagsChanged: JSON.stringify(version1.tags) !== JSON.stringify(version2.tags),
      contentDiff: this.generateDiff(version1.content, version2.content),
    };
  }

  /**
   * 生成简单的文本差异
   */
  private generateDiff(text1: string, text2: string): string {
    const lines1 = text1.split("\n");
    const lines2 = text2.split("\n");

    const diff: string[] = [];
    const maxLen = Math.max(lines1.length, lines2.length);

    for (let i = 0; i < maxLen; i++) {
      const line1 = lines1[i] || "";
      const line2 = lines2[i] || "";

      if (line1 !== line2) {
        if (line1 && !line2) {
          diff.push(`- ${line1}`);
        } else if (!line1 && line2) {
          diff.push(`+ ${line2}`);
        } else {
          diff.push(`- ${line1}`);
          diff.push(`+ ${line2}`);
        }
      } else {
        diff.push(`  ${line1}`);
      }
    }

    return diff.join("\n");
  }

  /**
   * 删除文档的所有版本
   */
  async deleteVersions(docId: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_VERSIONS], "readwrite");
      const store = transaction.objectStore(STORE_VERSIONS);
      const index = store.index("docId");
      const request = index.openCursor(IDBKeyRange.only(docId));

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
   * 清理旧版本（保留最近 N 个版本）
   */
  async cleanupOldVersions(docId: string, keepCount: number = 10): Promise<void> {
    const versions = await this.getVersions(docId);

    if (versions.length <= keepCount) {
      return;
    }

    const toDelete = versions.slice(keepCount);

    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_VERSIONS], "readwrite");
      const store = transaction.objectStore(STORE_VERSIONS);

      toDelete.forEach((version) => {
        store.delete(version.id);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

// 单例实例
let versionHistoryInstance: VersionHistoryManager | null = null;

export function getVersionHistoryManager(): VersionHistoryManager {
  if (!versionHistoryInstance) {
    versionHistoryInstance = new VersionHistoryManager();
  }
  return versionHistoryInstance;
}

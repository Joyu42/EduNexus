/**
 * IndexedDB 性能优化工具
 * 提供批量操作、缓存和事务优化
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt?: number;
}

/**
 * IndexedDB 优化包装器
 */
export class OptimizedIndexedDB<T extends DBSchema> {
  private db: IDBPDatabase<T> | null = null;
  private dbName: string;
  private version: number;
  private cache: Map<string, CacheEntry<any>> = new Map();
  private pendingWrites: Map<string, any> = new Map();
  private writeTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 100; // 批量写入延迟
  private readonly CACHE_TTL = 5000; // 缓存过期时间 5 秒

  constructor(dbName: string, version: number) {
    this.dbName = dbName;
    this.version = version;
  }

  /**
   * 初始化数据库
   */
  async init(upgrade?: (db: IDBPDatabase<T>) => void): Promise<void> {
    if (this.db) return;

    this.db = await openDB<T>(this.dbName, this.version, {
      upgrade,
    });
  }

  /**
   * 获取数据（带缓存）
   */
  async get<K extends keyof T>(
    storeName: K,
    key: IDBValidKey,
    useCache: boolean = true
  ): Promise<T[K]['value'] | undefined> {
    const cacheKey = `${String(storeName)}-${key}`;

    // 检查缓存
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && (!cached.expiresAt || cached.expiresAt > Date.now())) {
        return cached.data;
      }
    }

    // 从数据库读取
    if (!this.db) await this.init();
    const data = await this.db!.get(storeName as any, key as any);

    // 更新缓存
    if (data && useCache) {
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.CACHE_TTL,
      });
    }

    return data;
  }

  /**
   * 批量获取数据
   */
  async getAll<K extends keyof T>(
    storeName: K,
    query?: IDBValidKey | IDBKeyRange,
    count?: number
  ): Promise<T[K]['value'][]> {
    if (!this.db) await this.init();
    return this.db!.getAll(storeName as any, query as any, count);
  }

  /**
   * 设置数据（批量写入优化）
   */
  async set<K extends keyof T>(
    storeName: K,
    key: IDBValidKey,
    value: T[K]['value'],
    immediate: boolean = false
  ): Promise<void> {
    const cacheKey = `${String(storeName)}-${key}`;

    // 更新缓存
    this.cache.set(cacheKey, {
      data: value,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL,
    });

    if (immediate) {
      // 立即写入
      if (!this.db) await this.init();
      await this.db!.put(storeName as any, value, key as any);
    } else {
      // 批量写入
      this.pendingWrites.set(cacheKey, { storeName, key, value });
      this.scheduleBatchWrite();
    }
  }

  /**
   * 批量设置数据
   */
  async setMany<K extends keyof T>(
    storeName: K,
    items: Array<{ key: IDBValidKey; value: T[K]['value'] }>
  ): Promise<void> {
    if (!this.db) await this.init();

    const tx = this.db!.transaction(storeName as any, 'readwrite');
    const store = tx.objectStore(storeName as any);

    await Promise.all([
      ...items.map(({ key, value }) => {
        const cacheKey = `${String(storeName)}-${key}`;
        this.cache.set(cacheKey, {
          data: value,
          timestamp: Date.now(),
          expiresAt: Date.now() + this.CACHE_TTL,
        });
        return store.put(value, key as any);
      }),
      tx.done,
    ]);
  }

  /**
   * 删除数据
   */
  async delete<K extends keyof T>(storeName: K, key: IDBValidKey): Promise<void> {
    const cacheKey = `${String(storeName)}-${key}`;
    this.cache.delete(cacheKey);
    this.pendingWrites.delete(cacheKey);

    if (!this.db) await this.init();
    await this.db!.delete(storeName as any, key as any);
  }

  /**
   * 批量删除数据
   */
  async deleteMany<K extends keyof T>(
    storeName: K,
    keys: IDBValidKey[]
  ): Promise<void> {
    if (!this.db) await this.init();

    const tx = this.db!.transaction(storeName as any, 'readwrite');
    const store = tx.objectStore(storeName as any);

    await Promise.all([
      ...keys.map((key) => {
        const cacheKey = `${String(storeName)}-${key}`;
        this.cache.delete(cacheKey);
        this.pendingWrites.delete(cacheKey);
        return store.delete(key as any);
      }),
      tx.done,
    ]);
  }

  /**
   * 清空存储
   */
  async clear<K extends keyof T>(storeName: K): Promise<void> {
    // 清除相关缓存
    const prefix = `${String(storeName)}-`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
    for (const key of this.pendingWrites.keys()) {
      if (key.startsWith(prefix)) {
        this.pendingWrites.delete(key);
      }
    }

    if (!this.db) await this.init();
    await this.db!.clear(storeName as any);
  }

  /**
   * 计划批量写入
   */
  private scheduleBatchWrite(): void {
    if (this.writeTimer) return;

    this.writeTimer = setTimeout(() => {
      this.flushWrites();
    }, this.BATCH_DELAY);
  }

  /**
   * 执行批量写入
   */
  private async flushWrites(): Promise<void> {
    if (this.pendingWrites.size === 0) return;

    const writes = Array.from(this.pendingWrites.values());
    this.pendingWrites.clear();
    this.writeTimer = null;

    if (!this.db) await this.init();

    // 按 storeName 分组
    const grouped = writes.reduce((acc, { storeName, key, value }) => {
      if (!acc[storeName]) acc[storeName] = [];
      acc[storeName].push({ key, value });
      return acc;
    }, {} as Record<string, Array<{ key: IDBValidKey; value: any }>>);

    // 批量写入每个 store
    await Promise.all(
      Object.entries(grouped).map(([storeName, items]) =>
        this.setMany(storeName as any, items as any)
      )
    );
  }

  /**
   * 强制刷新所有待写入数据
   */
  async flush(): Promise<void> {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    await this.flushWrites();
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 清除过期缓存
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 关闭数据库
   */
  async close(): Promise<void> {
    await this.flush();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.cache.clear();
  }
}

/**
 * 创建优化的 IndexedDB 实例
 */
export function createOptimizedDB<T extends DBSchema>(
  dbName: string,
  version: number
): OptimizedIndexedDB<T> {
  return new OptimizedIndexedDB<T>(dbName, version);
}

/**
 * Offline Storage
 * Handles offline data storage using IndexedDB
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineAction {
  id?: number;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
}

interface EduNexusDB extends DBSchema {
  'offline-actions': {
    key: number;
    value: OfflineAction;
    indexes: { 'by-timestamp': number };
  };
  'cached-data': {
    key: string;
    value: {
      key: string;
      data: any;
      timestamp: number;
      expiresAt?: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

export class OfflineStorage {
  private db: IDBPDatabase<EduNexusDB> | null = null;
  private dbName = 'edunexus-offline';
  private dbVersion = 1;

  /**
   * Initialize database
   */
  async init(): Promise<void> {
    if (this.db) {
      return;
    }

    try {
      this.db = await openDB<EduNexusDB>(this.dbName, this.dbVersion, {
        upgrade(db) {
          // Offline actions store
          if (!db.objectStoreNames.contains('offline-actions')) {
            const actionsStore = db.createObjectStore('offline-actions', {
              keyPath: 'id',
              autoIncrement: true,
            });
            actionsStore.createIndex('by-timestamp', 'timestamp');
          }

          // Cached data store
          if (!db.objectStoreNames.contains('cached-data')) {
            const dataStore = db.createObjectStore('cached-data', {
              keyPath: 'key',
            });
            dataStore.createIndex('by-timestamp', 'timestamp');
          }
        },
      });

      console.log('Offline storage initialized');
    } catch (error) {
      console.error('Failed to initialize offline storage:', error);
    }
  }

  /**
   * Add offline action
   */
  async addOfflineAction(action: Omit<OfflineAction, 'id' | 'timestamp'>): Promise<number | null> {
    await this.init();
    if (!this.db) return null;

    try {
      const id = await this.db.add('offline-actions', {
        ...action,
        timestamp: Date.now(),
      });

      console.log('Offline action added:', id);
      return id;
    } catch (error) {
      console.error('Failed to add offline action:', error);
      return null;
    }
  }

  /**
   * Get all offline actions
   */
  async getOfflineActions(): Promise<OfflineAction[]> {
    await this.init();
    if (!this.db) return [];

    try {
      return await this.db.getAll('offline-actions');
    } catch (error) {
      console.error('Failed to get offline actions:', error);
      return [];
    }
  }

  /**
   * Remove offline action
   */
  async removeOfflineAction(id: number): Promise<boolean> {
    await this.init();
    if (!this.db) return false;

    try {
      await this.db.delete('offline-actions', id);
      console.log('Offline action removed:', id);
      return true;
    } catch (error) {
      console.error('Failed to remove offline action:', error);
      return false;
    }
  }

  /**
   * Clear all offline actions
   */
  async clearOfflineActions(): Promise<boolean> {
    await this.init();
    if (!this.db) return false;

    try {
      await this.db.clear('offline-actions');
      console.log('All offline actions cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear offline actions:', error);
      return false;
    }
  }

  /**
   * Set cached data
   */
  async setCachedData(key: string, data: any, expiresIn?: number): Promise<boolean> {
    await this.init();
    if (!this.db) return false;

    try {
      const timestamp = Date.now();
      const expiresAt = expiresIn ? timestamp + expiresIn : undefined;

      await this.db.put('cached-data', {
        key,
        data,
        timestamp,
        expiresAt,
      });

      console.log('Cached data set:', key);
      return true;
    } catch (error) {
      console.error('Failed to set cached data:', error);
      return false;
    }
  }

  /**
   * Get cached data
   */
  async getCachedData<T = any>(key: string): Promise<T | null> {
    await this.init();
    if (!this.db) return null;

    try {
      const cached = await this.db.get('cached-data', key);

      if (!cached) {
        return null;
      }

      // Check if expired
      if (cached.expiresAt && Date.now() > cached.expiresAt) {
        await this.db.delete('cached-data', key);
        return null;
      }

      return cached.data as T;
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }

  /**
   * Remove cached data
   */
  async removeCachedData(key: string): Promise<boolean> {
    await this.init();
    if (!this.db) return false;

    try {
      await this.db.delete('cached-data', key);
      console.log('Cached data removed:', key);
      return true;
    } catch (error) {
      console.error('Failed to remove cached data:', error);
      return false;
    }
  }

  /**
   * Clear all cached data
   */
  async clearCachedData(): Promise<boolean> {
    await this.init();
    if (!this.db) return false;

    try {
      await this.db.clear('cached-data');
      console.log('All cached data cleared');
      return true;
    } catch (error) {
      console.error('Failed to clear cached data:', error);
      return false;
    }
  }

  /**
   * Clear expired cached data
   */
  async clearExpiredData(): Promise<number> {
    await this.init();
    if (!this.db) return 0;

    try {
      const allData = await this.db.getAll('cached-data');
      const now = Date.now();
      let cleared = 0;

      for (const item of allData) {
        if (item.expiresAt && now > item.expiresAt) {
          await this.db.delete('cached-data', item.key);
          cleared++;
        }
      }

      console.log(`Cleared ${cleared} expired items`);
      return cleared;
    } catch (error) {
      console.error('Failed to clear expired data:', error);
      return 0;
    }
  }

  /**
   * Get storage size estimate
   */
  async getStorageEstimate(): Promise<{ usage: number; quota: number } | null> {
    if (!('storage' in navigator && 'estimate' in navigator.storage)) {
      return null;
    }

    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    } catch (error) {
      console.error('Failed to get storage estimate:', error);
      return null;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      console.log('Offline storage closed');
    }
  }
}

// Singleton instance
export const offlineStorage = new OfflineStorage();

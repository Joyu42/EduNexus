/**
 * Cache Manager
 * Handles cache operations and strategies
 */

export interface CacheOptions {
  cacheName?: string;
  maxAge?: number;
  maxItems?: number;
}

export class CacheManager {
  private defaultCacheName = 'edunexus-dynamic';

  /**
   * Add item to cache
   */
  async add(request: Request | string, options?: CacheOptions): Promise<void> {
    const cacheName = options?.cacheName || this.defaultCacheName;
    const cache = await caches.open(cacheName);

    try {
      await cache.add(request);
      await this.enforceQuota(cacheName, options);
    } catch (error) {
      console.error('Failed to add to cache:', error);
    }
  }

  /**
   * Put item in cache
   */
  async put(
    request: Request | string,
    response: Response,
    options?: CacheOptions
  ): Promise<void> {
    const cacheName = options?.cacheName || this.defaultCacheName;
    const cache = await caches.open(cacheName);

    try {
      await cache.put(request, response);
      await this.enforceQuota(cacheName, options);
    } catch (error) {
      console.error('Failed to put in cache:', error);
    }
  }

  /**
   * Get item from cache
   */
  async get(request: Request | string, options?: CacheOptions): Promise<Response | undefined> {
    const cacheName = options?.cacheName || this.defaultCacheName;
    const cache = await caches.open(cacheName);

    try {
      const response = await cache.match(request);

      if (response && options?.maxAge) {
        const cachedTime = response.headers.get('sw-cache-time');
        if (cachedTime) {
          const age = Date.now() - parseInt(cachedTime, 10);
          if (age > options.maxAge) {
            await cache.delete(request);
            return undefined;
          }
        }
      }

      return response;
    } catch (error) {
      console.error('Failed to get from cache:', error);
      return undefined;
    }
  }

  /**
   * Delete item from cache
   */
  async delete(request: Request | string, options?: CacheOptions): Promise<boolean> {
    const cacheName = options?.cacheName || this.defaultCacheName;
    const cache = await caches.open(cacheName);

    try {
      return await cache.delete(request);
    } catch (error) {
      console.error('Failed to delete from cache:', error);
      return false;
    }
  }

  /**
   * Clear specific cache
   */
  async clear(cacheName?: string): Promise<boolean> {
    const name = cacheName || this.defaultCacheName;

    try {
      return await caches.delete(name);
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return false;
    }
  }

  /**
   * Clear all caches
   */
  async clearAll(): Promise<void> {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
      console.log('All caches cleared');
    } catch (error) {
      console.error('Failed to clear all caches:', error);
    }
  }

  /**
   * Get cache size
   */
  async getSize(cacheName?: string): Promise<number> {
    const name = cacheName || this.defaultCacheName;

    try {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      return keys.length;
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }

  /**
   * Get all cache names
   */
  async getCacheNames(): Promise<string[]> {
    try {
      return await caches.keys();
    } catch (error) {
      console.error('Failed to get cache names:', error);
      return [];
    }
  }

  /**
   * Enforce cache quota (max items and max age)
   */
  private async enforceQuota(cacheName: string, options?: CacheOptions): Promise<void> {
    if (!options?.maxItems) {
      return;
    }

    try {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();

      if (keys.length > options.maxItems) {
        // Delete oldest items
        const itemsToDelete = keys.length - options.maxItems;
        for (let i = 0; i < itemsToDelete; i++) {
          await cache.delete(keys[i]);
        }
      }
    } catch (error) {
      console.error('Failed to enforce cache quota:', error);
    }
  }

  /**
   * Preload resources
   */
  async preload(urls: string[], cacheName?: string): Promise<void> {
    const name = cacheName || this.defaultCacheName;

    try {
      const cache = await caches.open(name);
      await cache.addAll(urls);
      console.log(`Preloaded ${urls.length} resources`);
    } catch (error) {
      console.error('Failed to preload resources:', error);
    }
  }

  /**
   * Check if resource is cached
   */
  async has(request: Request | string, cacheName?: string): Promise<boolean> {
    const name = cacheName || this.defaultCacheName;

    try {
      const cache = await caches.open(name);
      const response = await cache.match(request);
      return !!response;
    } catch (error) {
      console.error('Failed to check cache:', error);
      return false;
    }
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

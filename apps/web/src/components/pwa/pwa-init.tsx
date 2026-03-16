'use client';

import { useEffect } from 'react';
import { swManager } from '@/lib/pwa/service-worker-manager';
import { offlineStorage } from '@/lib/pwa/offline-storage';

export function PWAInit() {
  useEffect(() => {
    // Initialize PWA features
    const initPWA = async () => {
      // Skip service worker in development
      if (process.env.NODE_ENV === 'development') {
        console.log('PWA: Skipping service worker registration in development');
        return;
      }

      // Register service worker
      await swManager.register();

      // Initialize offline storage
      await offlineStorage.init();

      // Clear expired data periodically
      const clearExpiredInterval = setInterval(() => {
        offlineStorage.clearExpiredData();
      }, 60 * 60 * 1000); // Every hour

      // Log PWA status
      const version = await swManager.getVersion();
      console.log('PWA initialized, version:', version);

      return () => {
        clearInterval(clearExpiredInterval);
      };
    };

    initPWA();
  }, []);

  return null;
}

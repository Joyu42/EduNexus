/**
 * PWA Utilities
 * Helper functions for PWA features
 */

/**
 * Check if app is installed (running as PWA)
 */
export function isInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
}

/**
 * Check if app is running in browser
 */
export function isInBrowser(): boolean {
  return !isInstalled();
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Check if device is offline
 */
export function isOffline(): boolean {
  return !navigator.onLine;
}

/**
 * Get device type
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;

  if (width < 768) {
    return 'mobile';
  } else if (width < 1024) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * Check if device is mobile
 */
export function isMobile(): boolean {
  return getDeviceType() === 'mobile';
}

/**
 * Check if device is tablet
 */
export function isTablet(): boolean {
  return getDeviceType() === 'tablet';
}

/**
 * Check if device is desktop
 */
export function isDesktop(): boolean {
  return getDeviceType() === 'desktop';
}

/**
 * Get platform
 */
export function getPlatform(): string {
  return navigator.platform;
}

/**
 * Check if iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * Check if Android
 */
export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

/**
 * Check if Safari
 */
export function isSafari(): boolean {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

/**
 * Check if Chrome
 */
export function isChrome(): boolean {
  return /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
}

/**
 * Check if Firefox
 */
export function isFirefox(): boolean {
  return /Firefox/.test(navigator.userAgent);
}

/**
 * Get browser name
 */
export function getBrowserName(): string {
  if (isChrome()) return 'Chrome';
  if (isSafari()) return 'Safari';
  if (isFirefox()) return 'Firefox';
  return 'Unknown';
}

/**
 * Check if service worker is supported
 */
export function isServiceWorkerSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Check if background sync is supported
 */
export function isBackgroundSyncSupported(): boolean {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}

/**
 * Check if IndexedDB is supported
 */
export function isIndexedDBSupported(): boolean {
  return 'indexedDB' in window;
}

/**
 * Check if Cache API is supported
 */
export function isCacheSupported(): boolean {
  return 'caches' in window;
}

/**
 * Get network information
 */
export function getNetworkInfo(): {
  type?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
} | null {
  const connection = (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  if (!connection) {
    return null;
  }

  return {
    type: connection.type,
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData,
  };
}

/**
 * Check if connection is slow
 */
export function isSlowConnection(): boolean {
  const networkInfo = getNetworkInfo();

  if (!networkInfo) {
    return false;
  }

  return networkInfo.effectiveType === 'slow-2g' ||
    networkInfo.effectiveType === '2g' ||
    networkInfo.saveData === true;
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Get storage usage percentage
 */
export async function getStorageUsagePercentage(): Promise<number> {
  if (!('storage' in navigator && 'estimate' in navigator.storage)) {
    return 0;
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 1;

    return Math.round((usage / quota) * 100);
  } catch (error) {
    console.error('Failed to get storage usage:', error);
    return 0;
  }
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (!('storage' in navigator && 'persist' in navigator.storage)) {
    return false;
  }

  try {
    const isPersisted = await navigator.storage.persist();
    console.log('Persistent storage:', isPersisted);
    return isPersisted;
  } catch (error) {
    console.error('Failed to request persistent storage:', error);
    return false;
  }
}

/**
 * Check if storage is persisted
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (!('storage' in navigator && 'persisted' in navigator.storage)) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch (error) {
    console.error('Failed to check storage persistence:', error);
    return false;
  }
}

/**
 * Share content using Web Share API
 */
export async function share(data: {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}): Promise<boolean> {
  if (!('share' in navigator)) {
    console.warn('Web Share API not supported');
    return false;
  }

  try {
    await navigator.share(data);
    return true;
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Share failed:', error);
    }
    return false;
  }
}

/**
 * Check if Web Share API is supported
 */
export function isShareSupported(): boolean {
  return 'share' in navigator;
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!('clipboard' in navigator)) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    return false;
  }
}

/**
 * Vibrate device
 */
export function vibrate(pattern: number | number[]): boolean {
  if (!('vibrate' in navigator)) {
    return false;
  }

  return navigator.vibrate(pattern);
}

/**
 * Wake lock (keep screen on)
 */
export async function requestWakeLock(): Promise<WakeLockSentinel | null> {
  if (!('wakeLock' in navigator)) {
    return null;
  }

  try {
    const wakeLock = await (navigator as any).wakeLock.request('screen');
    console.log('Wake lock acquired');
    return wakeLock;
  } catch (error) {
    console.error('Wake lock failed:', error);
    return null;
  }
}

/**
 * Get app badge count
 */
export async function getBadgeCount(): Promise<number> {
  if (!('getExperimentalBadge' in navigator)) {
    return 0;
  }

  try {
    return await (navigator as any).getExperimentalBadge();
  } catch (error) {
    return 0;
  }
}

/**
 * Set app badge count
 */
export async function setBadgeCount(count: number): Promise<boolean> {
  if (!('setAppBadge' in navigator)) {
    return false;
  }

  try {
    await (navigator as any).setAppBadge(count);
    return true;
  } catch (error) {
    console.error('Set badge failed:', error);
    return false;
  }
}

/**
 * Clear app badge
 */
export async function clearBadge(): Promise<boolean> {
  if (!('clearAppBadge' in navigator)) {
    return false;
  }

  try {
    await (navigator as any).clearAppBadge();
    return true;
  } catch (error) {
    console.error('Clear badge failed:', error);
    return false;
  }
}

'use client';

/**
 * 同步状态指示器组件
 */

import { useEffect, useState } from 'react';
import { Cloud, CloudOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDataSync } from '@/lib/hooks/use-data-sync';

interface SyncStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function SyncStatusIndicator({ className, showDetails = false }: SyncStatusIndicatorProps) {
  const { syncState, retryFailed } = useDataSync();
  const [isOnline, setIsOnline] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 确定状态
  const getStatus = () => {
    if (!isOnline) return 'offline';
    if (syncState.failedCount > 0) return 'error';
    if (syncState.isSyncing || syncState.pendingCount > 0) return 'syncing';
    return 'synced';
  };

  const status = getStatus();

  const statusConfig: Record<string, {
    icon: typeof Cloud;
    text: string;
    color: string;
    bgColor: string;
    animate?: boolean;
  }> = {
    offline: {
      icon: CloudOff,
      text: '离线',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
    },
    syncing: {
      icon: Loader2,
      text: '同步中',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      animate: true,
    },
    synced: {
      icon: CheckCircle2,
      text: '已同步',
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    error: {
      icon: AlertCircle,
      text: '同步失败',
      color: 'text-red-500',
      bgColor: 'bg-red-50',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors',
        config.bgColor,
        className
      )}
    >
      <Icon
        className={cn(
          'w-4 h-4',
          config.color,
          config.animate && 'animate-spin'
        )}
      />
      <div className="flex flex-col">
        <span className={cn('text-sm font-medium', config.color)}>
          {config.text}
        </span>
        {showDetails && (
          <>
            {syncState.pendingCount > 0 && (
              <span className="text-xs text-gray-500">
                {syncState.pendingCount} 个任务待同步
              </span>
            )}
            {syncState.failedCount > 0 && (
              <button
                onClick={retryFailed}
                className="text-xs text-red-600 hover:underline"
              >
                {syncState.failedCount} 个任务失败，点击重试
              </button>
            )}
            {syncState.lastSyncTime && status === 'synced' && (
              <span className="text-xs text-gray-500" suppressHydrationWarning>
                {isMounted ? syncState.lastSyncTime.toLocaleTimeString() : ""}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

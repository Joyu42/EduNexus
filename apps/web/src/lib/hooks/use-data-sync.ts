/**
 * 数据同步 Hook - 简化数据同步的使用
 */

import { useState, useEffect, useCallback } from 'react';
import { getDataSyncManager } from '../client/data-sync-manager';
import type { SyncResult, SyncOptions } from '../client/data-sync-manager';
import type { KBDocument } from '../client/kb-storage';
import type { SkillNode } from '../path/skill-tree-types';

/**
 * 同步状态
 */
export interface SyncState {
  isSyncing: boolean;
  queueLength: number;
  pendingCount: number;
  failedCount: number;
  lastSyncTime?: Date;
  error?: Error;
}

/**
 * 使用数据同步
 */
export function useDataSync() {
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    queueLength: 0,
    pendingCount: 0,
    failedCount: 0,
  });

  const syncManager = getDataSyncManager();

  // 更新同步状态
  const updateSyncState = useCallback(() => {
    const status = syncManager.getSyncStatus();
    setSyncState({
      isSyncing: status.isProcessing,
      queueLength: status.queueLength,
      pendingCount: status.pendingCount,
      failedCount: status.failedCount,
      lastSyncTime: new Date(),
    });
  }, [syncManager]);

  // 定期更新状态
  useEffect(() => {
    const interval = setInterval(updateSyncState, 1000);
    return () => clearInterval(interval);
  }, [updateSyncState]);

  /**
   * 同步文档
   */
  const syncDocument = useCallback(
    async (document: KBDocument, options?: SyncOptions): Promise<SyncResult> => {
      try {
        const result = await syncManager.syncDocument(document, options);
        updateSyncState();
        return result;
      } catch (error) {
        const err = error as Error;
        setSyncState(prev => ({ ...prev, error: err }));
        throw error;
      }
    },
    [syncManager, updateSyncState]
  );

  /**
   * 同步技能节点
   */
  const syncSkillNode = useCallback(
    async (skillNode: SkillNode, options?: SyncOptions): Promise<SyncResult> => {
      try {
        const result = await syncManager.syncSkillNode(skillNode, options);
        updateSyncState();
        return result;
      } catch (error) {
        const err = error as Error;
        setSyncState(prev => ({ ...prev, error: err }));
        throw error;
      }
    },
    [syncManager, updateSyncState]
  );

  /**
   * 重试失败的任务
   */
  const retryFailed = useCallback(() => {
    syncManager.retryFailedTasks();
    updateSyncState();
  }, [syncManager, updateSyncState]);

  /**
   * 清空队列
   */
  const clearQueue = useCallback(() => {
    syncManager.clearQueue();
    updateSyncState();
  }, [syncManager, updateSyncState]);

  return {
    syncState,
    syncDocument,
    syncSkillNode,
    retryFailed,
    clearQueue,
  };
}

/**
 * 自动同步文档 Hook
 */
export function useAutoSyncDocument(document: KBDocument | null, enabled: boolean = true) {
  const { syncDocument } = useDataSync();
  const [lastSyncedVersion, setLastSyncedVersion] = useState<number | undefined>();

  useEffect(() => {
    if (!enabled || !document) return;

    // 检查是否需要同步
    if (document.version !== lastSyncedVersion) {
      syncDocument(document, { immediate: false })
        .then(() => {
          setLastSyncedVersion(document.version);
          console.debug('[useAutoSyncDocument] Synced document:', document.id);
        })
        .catch(error => {
          console.error('[useAutoSyncDocument] Sync failed:', error);
        });
    }
  }, [document, enabled, lastSyncedVersion, syncDocument]);
}

/**
 * 自动同步技能节点 Hook
 */
export function useAutoSyncSkillNode(skillNode: SkillNode | null, enabled: boolean = true) {
  const { syncSkillNode } = useDataSync();
  const [lastSyncedTime, setLastSyncedTime] = useState<string | undefined>();

  useEffect(() => {
    if (!enabled || !skillNode) return;

    // 检查是否需要同步
    if (skillNode.updatedAt !== lastSyncedTime) {
      syncSkillNode(skillNode, { immediate: false })
        .then(() => {
          setLastSyncedTime(skillNode.updatedAt);
          console.debug('[useAutoSyncSkillNode] Synced skill node:', skillNode.id);
        })
        .catch(error => {
          console.error('[useAutoSyncSkillNode] Sync failed:', error);
        });
    }
  }, [skillNode, enabled, lastSyncedTime, syncSkillNode]);
}

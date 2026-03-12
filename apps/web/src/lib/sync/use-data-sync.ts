/**
 * React Hooks for Data Sync System
 * 简化在组件中使用数据同步系统
 */

import { useEffect, useCallback, useRef } from 'react';
import { getDataSyncEventManager, SyncEventType, type SyncEventData, type SyncEventListener } from './data-sync-events';
import { getKGSyncCoordinator } from './kg-sync-coordinator';

/**
 * 订阅数据同步事件
 * @param eventType 事件类型
 * @param listener 监听器函数
 */
export function useDataSyncEvent(
  eventType: SyncEventType,
  listener: SyncEventListener
): void {
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    const eventManager = getDataSyncEventManager();
    const wrappedListener: SyncEventListener = (data) => {
      listenerRef.current(data);
    };

    const unsubscribe = eventManager.on(eventType, wrappedListener);
    return unsubscribe;
  }, [eventType]);
}

/**
 * 订阅多个数据同步事件
 * @param eventTypes 事件类型数组
 * @param listener 监听器函数
 */
export function useDataSyncEvents(
  eventTypes: SyncEventType[],
  listener: SyncEventListener
): void {
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    const eventManager = getDataSyncEventManager();
    const wrappedListener: SyncEventListener = (data) => {
      listenerRef.current(data);
    };

    const unsubscribers = eventTypes.map((eventType) =>
      eventManager.on(eventType, wrappedListener)
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [eventTypes.join(',')]);
}

/**
 * 发布数据同步事件
 * @returns emit 函数
 */
export function useDataSyncEmit(): (
  eventType: SyncEventType,
  payload: any,
  source: string
) => void {
  const eventManager = getDataSyncEventManager();
  return useCallback(
    (eventType: SyncEventType, payload: any, source: string) => {
      eventManager.emit(eventType, payload, source);
    },
    []
  );
}

/**
 * 初始化知识图谱同步协调器
 * 在应用根组件中使用
 */
export function useKGSyncCoordinator(): void {
  useEffect(() => {
    const coordinator = getKGSyncCoordinator();
    coordinator.initialize();

    return () => {
      coordinator.destroy();
    };
  }, []);
}

/**
 * 监听知识库文档变化并自动刷新
 * @param onRefresh 刷新回调
 */
export function useKBDocumentSync(onRefresh: () => void): void {
  useDataSyncEvents(
    [
      SyncEventType.KB_DOCUMENT_CREATED,
      SyncEventType.KB_DOCUMENT_UPDATED,
      SyncEventType.KB_DOCUMENT_DELETED,
    ],
    useCallback(() => {
      onRefresh();
    }, [onRefresh])
  );
}

/**
 * 监听资源变化并自动刷新
 * @param onRefresh 刷新回调
 */
export function useResourceSync(onRefresh: () => void): void {
  useDataSyncEvents(
    [
      SyncEventType.RESOURCE_CREATED,
      SyncEventType.RESOURCE_UPDATED,
      SyncEventType.RESOURCE_DELETED,
    ],
    useCallback(() => {
      onRefresh();
    }, [onRefresh])
  );
}

/**
 * 监听学习路径变化并自动刷新
 * @param onRefresh 刷新回调
 */
export function usePathSync(onRefresh: () => void): void {
  useDataSyncEvents(
    [
      SyncEventType.PATH_CREATED,
      SyncEventType.PATH_UPDATED,
      SyncEventType.PATH_DELETED,
      SyncEventType.PATH_PROGRESS_UPDATED,
    ],
    useCallback(() => {
      onRefresh();
    }, [onRefresh])
  );
}

/**
 * 监听知识图谱变化并自动刷新
 * @param onRefresh 刷新回调
 */
export function useKGSync(onRefresh: () => void): void {
  useDataSyncEvents(
    [
      SyncEventType.KG_NODE_CREATED,
      SyncEventType.KG_NODE_UPDATED,
      SyncEventType.KG_NODE_DELETED,
      SyncEventType.KG_EDGE_CREATED,
      SyncEventType.KG_EDGE_DELETED,
    ],
    useCallback(() => {
      onRefresh();
    }, [onRefresh])
  );
}

import { useEffect, useCallback, useRef } from 'react';
import { getDataSyncEventManager, SyncEventType, type SyncEventData, type SyncEventListener } from './data-sync-events';

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

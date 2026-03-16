/**
 * 数据同步系统 - 统一导出
 */

export {
  SyncEventType,
  getDataSyncEventManager,
  type SyncEventData,
  type SyncEventListener,
} from './data-sync-events';

export {
  useDataSyncEvent,
  useDataSyncEvents,
  useKBDocumentSync,
  usePathSync,
} from './use-data-sync';

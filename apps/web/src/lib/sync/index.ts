/**
 * 数据同步系统 - 统一导出
 */

// 事件系统
export {
  SyncEventType,
  getDataSyncEventManager,
  type SyncEventData,
  type SyncEventListener,
} from './data-sync-events';

// 知识图谱同步协调器
export { getKGSyncCoordinator } from './kg-sync-coordinator';

// React Hooks
export {
  useDataSyncEvent,
  useDataSyncEvents,
  useDataSyncEmit,
  useKGSyncCoordinator,
  useKBDocumentSync,
  useResourceSync,
  usePathSync,
  useKGSync,
} from './use-data-sync';

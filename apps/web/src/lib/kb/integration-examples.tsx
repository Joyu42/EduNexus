/**
 * 知识宝库集成示例
 *
 * 展示如何在知识宝库页面中集成数据同步功能
 */

import { useEffect, useState } from 'react';
import { useDataSync } from '@/lib/hooks/use-data-sync';
import { getKBStorage, type KBDocument } from '@/lib/client/kb-storage';
import { SyncStatusIndicator } from '@/components/sync-status-indicator';

/**
 * 使用示例 1: 在文档编辑器中自动同步
 */
export function DocumentEditorExample() {
  const { syncDocument } = useDataSync();
  const [document, setDocument] = useState<KBDocument | null>(null);

  // 当文档更新时自动同步
  useEffect(() => {
    if (!document) return;

    // 使用防抖，避免频繁同步
    const timer = setTimeout(() => {
      syncDocument(document, { immediate: false });
    }, 2000);

    return () => clearTimeout(timer);
  }, [document, syncDocument]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1>文档编辑器</h1>
        <SyncStatusIndicator showDetails />
      </div>
      {/* 编辑器内容 */}
    </div>
  );
}

/**
 * 使用示例 2: 在文档保存时立即同步
 */
export function DocumentSaveExample() {
  const { syncDocument } = useDataSync();
  const storage = getKBStorage();
  const [document, setDocument] = useState<KBDocument | null>(null);

  const handleSave = async (doc: KBDocument) => {
    try {
      // 1. 保存到本地存储
      await storage.updateDocument(doc);

      // 2. 立即同步到知识图谱和学习记录
      const result = await syncDocument(doc, {
        immediate: true,
        retryOnError: true,
        maxRetries: 3,
      });

      if (result.success) {
        console.log('文档已保存并同步');
      } else {
        console.error('同步失败:', result.error);
      }
    } catch (error) {
      console.error('保存失败:', error);
    }
  };

  return (
    <button onClick={() => document && handleSave(document)}>
      保存文档
    </button>
  );
}

/**
 * 使用示例 3: 批量导入文档时同步
 */
export function BatchImportExample() {
  const { syncDocument } = useDataSync();
  const storage = getKBStorage();

  const handleBatchImport = async (files: FileList) => {
    const vaultId = storage.getCurrentVaultId();
    if (!vaultId) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith('.md')) continue;

      try {
        // 1. 导入文档
        const document = await storage.importMarkdownFile(vaultId, file);

        // 2. 异步同步（不阻塞导入流程）
        syncDocument(document, { immediate: false });

        console.log(`已导入: ${file.name}`);
      } catch (error) {
        console.error(`导入失败: ${file.name}`, error);
      }
    }
  };

  return (
    <input
      type="file"
      multiple
      accept=".md"
      onChange={(e) => e.target.files && handleBatchImport(e.target.files)}
    />
  );
}

/**
 * 使用示例 4: 显示文档的关联信息
 */
export function DocumentRelationsExample({ documentId }: { documentId: string }) {
  const [relations, setRelations] = useState<{
    graphNode: any;
    relatedDocs: KBDocument[];
    skillNodes: any[];
  }>({
    graphNode: null,
    relatedDocs: [],
    skillNodes: [],
  });

  useEffect(() => {
    loadRelations();
  }, [documentId]);

  const loadRelations = async () => {
    const storage = getKBStorage();
    // const kgSync = getKGSyncService(); // TODO: Implement KG sync service

    // 获取文档 - TODO: Add getDocument method to KBStorageManager
    // const doc = await storage.getDocument(documentId);
    // if (!doc) return;

    // 获取关联的知识图谱节点
    // if (doc.graphNodeId) {
    //   const graphNode = await kgSync.getNode(doc.graphNodeId);
    //   setRelations(prev => ({ ...prev, graphNode }));
    // }

    // 获取相关文档
    // if (doc.relatedDocs) {
    //   const relatedDocs = await Promise.all(
    //     doc.relatedDocs.map((id: string) => storage.getDocument(id))
    //   );
    //   setRelations(prev => ({ ...prev, relatedDocs: relatedDocs.filter(Boolean) as KBDocument[] }));
    // }
  };

  return (
    <div className="space-y-4">
      {relations.graphNode && (
        <div>
          <h3>知识图谱节点</h3>
          <p>{relations.graphNode.name}</p>
          <p>掌握度: {(relations.graphNode.mastery * 100).toFixed(0)}%</p>
        </div>
      )}

      {relations.relatedDocs.length > 0 && (
        <div>
          <h3>相关文档</h3>
          <ul>
            {relations.relatedDocs.map((doc: KBDocument) => (
              <li key={doc.id}>{doc.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * 使用示例 5: 监听同步状态
 */
export function SyncMonitorExample() {
  const { syncState, retryFailed, clearQueue } = useDataSync();

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">同步状态监控</h3>

      <div className="space-y-2 text-sm">
        <div>队列长度: {syncState.queueLength}</div>
        <div>待处理: {syncState.pendingCount}</div>
        <div>失败: {syncState.failedCount}</div>
        <div>正在同步: {syncState.isSyncing ? '是' : '否'}</div>

        {syncState.lastSyncTime && (
          <div>最后同步: {syncState.lastSyncTime.toLocaleString()}</div>
        )}

        {syncState.error && (
          <div className="text-red-500">错误: {syncState.error.message}</div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        {syncState.failedCount > 0 && (
          <button
            onClick={retryFailed}
            className="px-3 py-1 bg-blue-500 text-white rounded"
          >
            重试失败任务
          </button>
        )}

        <button
          onClick={clearQueue}
          className="px-3 py-1 bg-gray-500 text-white rounded"
        >
          清空队列
        </button>
      </div>
    </div>
  );
}

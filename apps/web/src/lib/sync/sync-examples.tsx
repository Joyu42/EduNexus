/**
 * 数据同步系统使用示例
 * 展示如何在组件中使用数据同步功能
 */

'use client';

import { useEffect, useState } from 'react';
import {
  useKGSyncCoordinator,
  useKBDocumentSync,
  useResourceSync,
  usePathSync,
  useKGSync,
  useDataSyncEmit,
  SyncEventType,
} from '@/lib/sync';

/**
 * 示例 1: 在应用根组件中初始化同步协调器
 */
export function AppSyncProvider({ children }: { children: React.ReactNode }) {
  // 初始化知识图谱同步协调器
  useKGSyncCoordinator();

  return <>{children}</>;
}

/**
 * 示例 2: 知识库编辑器 - 监听文档变化
 */
export function KBEditorExample() {
  const [documents, setDocuments] = useState<any[]>([]);
  const emit = useDataSyncEmit();

  // 监听文档变化并自动刷新
  useKBDocumentSync(() => {
    console.log('Documents changed, refreshing...');
    loadDocuments();
  });

  const loadDocuments = async () => {
    // 加载文档逻辑
    // const docs = await getKBStorage().getDocumentsByVault(vaultId);
    // setDocuments(docs);
  };

  const handleCreateDocument = async (title: string, content: string) => {
    // 创建文档
    // const doc = await getKBStorage().createDocument(vaultId, title, content);

    // 事件会自动发布，无需手动调用
    // 因为 kb-storage 已经集成了事件发布
  };

  return (
    <div>
      <h2>Knowledge Base Editor</h2>
      {/* 编辑器 UI */}
    </div>
  );
}

/**
 * 示例 3: 资源管理器 - 监听资源变化
 */
export function ResourceManagerExample() {
  const [resources, setResources] = useState<any[]>([]);

  // 监听资源变化并自动刷新
  useResourceSync(() => {
    console.log('Resources changed, refreshing...');
    loadResources();
  });

  const loadResources = async () => {
    // 加载资源逻辑
    // const res = await getAllResources();
    // setResources(res);
  };

  return (
    <div>
      <h2>Resource Manager</h2>
      {/* 资源列表 UI */}
    </div>
  );
}

/**
 * 示例 4: 学习路径 - 监听路径和进度变化
 */
export function LearningPathExample() {
  const [paths, setPaths] = useState<any[]>([]);

  // 监听路径变化并自动刷新
  usePathSync(() => {
    console.log('Paths changed, refreshing...');
    loadPaths();
  });

  const loadPaths = async () => {
    // 加载路径逻辑
    // const paths = await getAllPaths();
    // setPaths(paths);
  };

  return (
    <div>
      <h2>Learning Paths</h2>
      {/* 路径列表 UI */}
    </div>
  );
}

/**
 * 示例 5: 知识图谱可视化 - 监听图谱变化
 */
export function KnowledgeGraphExample() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);

  // 监听知识图谱变化并自动刷新
  useKGSync(() => {
    console.log('Knowledge graph changed, refreshing...');
    loadGraph();
  });

  const loadGraph = async () => {
    // 加载图谱数据
    // const kgService = getKGSyncService();
    // const nodes = await kgService.getAllNodes();
    // const edges = await kgService.getAllEdges();
    // setNodes(nodes);
    // setEdges(edges);
  };

  useEffect(() => {
    loadGraph();
  }, []);

  return (
    <div>
      <h2>Knowledge Graph</h2>
      <p>Nodes: {nodes.length}</p>
      <p>Edges: {edges.length}</p>
      {/* 图谱可视化 UI */}
    </div>
  );
}

/**
 * 示例 6: 手动发布事件
 */
export function ManualEventExample() {
  const emit = useDataSyncEmit();

  const handleCustomAction = () => {
    // 手动发布自定义事件
    emit(
      SyncEventType.KB_DOCUMENT_UPDATED,
      {
        id: 'doc_123',
        title: 'Updated Document',
        content: 'New content',
        tags: ['tag1', 'tag2'],
      },
      'custom-component'
    );
  };

  return (
    <div>
      <button onClick={handleCustomAction}>
        Trigger Custom Event
      </button>
    </div>
  );
}

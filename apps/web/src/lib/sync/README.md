# 数据同步系统

统一的数据同步和事件系统，实现知识图谱与其他界面的数据联动。

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                    数据同步事件系统                          │
│                  (data-sync-events.ts)                      │
│                                                             │
│  - 事件总线 (Event Bus)                                     │
│  - 发布/订阅模式                                            │
│  - 异步事件队列                                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                 知识图谱同步协调器                           │
│                (kg-sync-coordinator.ts)                     │
│                                                             │
│  - 监听各模块事件                                           │
│  - 自动同步到知识图谱                                       │
│  - 防抖优化                                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  知识库存储  │  资源存储    │  学习路径    │  工作区      │
│ (kb-storage) │(resource-    │(path-storage)│(workspace)   │
│              │ storage)     │              │              │
│  - 创建文档  │  - 创建资源  │  - 创建路径  │  - 创建项目  │
│  - 更新文档  │  - 更新资源  │  - 更新进度  │  - 更新项目  │
│  - 删除文档  │  - 删除资源  │  - 删除路径  │              │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

## 核心功能

### 1. 事件类型

```typescript
enum SyncEventType {
  // 知识库事件
  KB_DOCUMENT_CREATED = 'kb:document:created',
  KB_DOCUMENT_UPDATED = 'kb:document:updated',
  KB_DOCUMENT_DELETED = 'kb:document:deleted',

  // 知识图谱事件
  KG_NODE_CREATED = 'kg:node:created',
  KG_NODE_UPDATED = 'kg:node:updated',
  KG_NODE_DELETED = 'kg:node:deleted',

  // 资源事件
  RESOURCE_CREATED = 'resource:created',
  RESOURCE_UPDATED = 'resource:updated',
  RESOURCE_DELETED = 'resource:deleted',

  // 学习路径事件
  PATH_CREATED = 'path:created',
  PATH_UPDATED = 'path:updated',
  PATH_DELETED = 'path:deleted',
  PATH_PROGRESS_UPDATED = 'path:progress:updated',
}
```

### 2. 自动同步机制

当在任何模块中创建/修改内容时，系统会：

1. **发布事件** - 存储模块自动发布相应事件
2. **协调器监听** - 知识图谱同步协调器监听事件
3. **同步到图谱** - 自动创建/更新知识图谱节点
4. **通知订阅者** - 其他订阅该事件的组件收到通知

### 3. 防抖优化

- 使用 1.5 秒防抖延迟
- 避免频繁更新导致的性能问题
- 合并短时间内的多次更新

## 使用指南

### 步骤 1: 在应用根组件初始化

```tsx
// app/layout.tsx 或 app/page.tsx
import { AppSyncProvider } from '@/lib/sync/sync-examples';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AppSyncProvider>
          {children}
        </AppSyncProvider>
      </body>
    </html>
  );
}
```

或者直接使用 Hook：

```tsx
import { useKGSyncCoordinator } from '@/lib/sync';

export default function App() {
  useKGSyncCoordinator(); // 初始化同步协调器

  return <div>{/* 应用内容 */}</div>;
}
```

### 步骤 2: 在组件中监听数据变化

#### 监听知识库文档变化

```tsx
import { useKBDocumentSync } from '@/lib/sync';

function KBEditor() {
  const [documents, setDocuments] = useState([]);

  // 当文档创建/更新/删除时自动刷新
  useKBDocumentSync(() => {
    loadDocuments();
  });

  const loadDocuments = async () => {
    const docs = await getKBStorage().getDocumentsByVault(vaultId);
    setDocuments(docs);
  };

  return <div>{/* 编辑器 UI */}</div>;
}
```

#### 监听资源变化

```tsx
import { useResourceSync } from '@/lib/sync';

function ResourceList() {
  const [resources, setResources] = useState([]);

  useResourceSync(() => {
    loadResources();
  });

  const loadResources = async () => {
    const res = await getAllResources();
    setResources(res);
  };

  return <div>{/* 资源列表 UI */}</div>;
}
```

#### 监听学习路径变化

```tsx
import { usePathSync } from '@/lib/sync';

function PathList() {
  const [paths, setPaths] = useState([]);

  usePathSync(() => {
    loadPaths();
  });

  const loadPaths = async () => {
    const paths = await getAllPaths();
    setPaths(paths);
  };

  return <div>{/* 路径列表 UI */}</div>;
}
```

#### 监听知识图谱变化

```tsx
import { useKGSync } from '@/lib/sync';

function KnowledgeGraph() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useKGSync(() => {
    loadGraph();
  });

  const loadGraph = async () => {
    const kgService = getKGSyncService();
    const nodes = await kgService.getAllNodes();
    const edges = await kgService.getAllEdges();
    setNodes(nodes);
    setEdges(edges);
  };

  return <div>{/* 图谱可视化 */}</div>;
}
```

### 步骤 3: 正常使用存储 API

存储模块已经集成了事件发布，无需手动调用：

```tsx
// 创建文档 - 自动发布 KB_DOCUMENT_CREATED 事件
const doc = await getKBStorage().createDocument(
  vaultId,
  'New Document',
  'Content'
);

// 更新文档 - 自动发布 KB_DOCUMENT_UPDATED 事件
await getKBStorage().updateDocument({
  ...doc,
  content: 'Updated content',
});

// 删除文档 - 自动发布 KB_DOCUMENT_DELETED 事件
await getKBStorage().deleteDocument(doc.id);
```

## 高级用法

### 订阅特定事件

```tsx
import { useDataSyncEvent, SyncEventType } from '@/lib/sync';

function MyComponent() {
  useDataSyncEvent(SyncEventType.KB_DOCUMENT_CREATED, (event) => {
    console.log('New document created:', event.payload);
  });

  return <div>...</div>;
}
```

### 订阅多个事件

```tsx
import { useDataSyncEvents, SyncEventType } from '@/lib/sync';

function MyComponent() {
  useDataSyncEvents(
    [
      SyncEventType.KB_DOCUMENT_CREATED,
      SyncEventType.KB_DOCUMENT_UPDATED,
    ],
    (event) => {
      console.log('Document event:', event.type, event.payload);
    }
  );

  return <div>...</div>;
}
```

### 手动发布事件

```tsx
import { useDataSyncEmit, SyncEventType } from '@/lib/sync';

function MyComponent() {
  const emit = useDataSyncEmit();

  const handleCustomAction = () => {
    emit(
      SyncEventType.KB_DOCUMENT_UPDATED,
      {
        id: 'doc_123',
        title: 'Updated',
        content: 'New content',
      },
      'my-component'
    );
  };

  return <button onClick={handleCustomAction}>Update</button>;
}
```

## 数据流示例

### 场景 1: 创建知识库文档

```
1. 用户在编辑器中创建文档
   ↓
2. 调用 getKBStorage().createDocument()
   ↓
3. kb-storage 保存文档到 IndexedDB
   ↓
4. kb-storage 发布 KB_DOCUMENT_CREATED 事件
   ↓
5. KGSyncCoordinator 监听到事件
   ↓
6. 提取文档关键词和标签
   ↓
7. 在知识图谱中创建节点
   ↓
8. 基于关键词创建关联边
   ↓
9. 发布 KG_NODE_CREATED 事件
   ↓
10. 知识图谱可视化组件自动刷新
```

### 场景 2: 更新学习路径进度

```
1. 用户完成路径中的一个节点
   ↓
2. 调用 updateNodeCompletion()
   ↓
3. path-storage 更新进度到 IndexedDB
   ↓
4. path-storage 发布 PATH_PROGRESS_UPDATED 事件
   ↓
5. KGSyncCoordinator 监听到事件
   ↓
6. 更新知识图谱中对应节点的 mastery
   ↓
7. 发布 KG_NODE_UPDATED 事件
   ↓
8. 知识图谱和路径列表组件自动刷新
```

## 性能优化

### 1. 防抖机制

- 短时间内的多次更新会被合并
- 默认延迟 1.5 秒
- 避免频繁的数据库操作

### 2. 异步处理

- 事件处理是异步的
- 不会阻塞主线程
- 支持并发处理多个事件

### 3. 选择性订阅

- 只订阅需要的事件
- 避免不必要的组件刷新
- 使用 useCallback 优化监听器

## 故障排查

### 问题 1: 数据没有同步

**检查清单：**
- [ ] 是否在根组件初始化了 `useKGSyncCoordinator()`
- [ ] 存储模块是否正确导入了事件管理器
- [ ] 浏览器控制台是否有错误信息
- [ ] 检查 IndexedDB 中的数据

### 问题 2: 组件没有自动刷新

**检查清单：**
- [ ] 是否正确使用了 `useKBDocumentSync` 等 Hook
- [ ] 刷新回调函数是否正确实现
- [ ] 是否使用了 `useCallback` 包装回调

### 问题 3: 性能问题

**优化建议：**
- 增加防抖延迟时间
- 减少订阅的事件类型
- 使用 React.memo 优化组件
- 检查是否有循环触发事件

## 相关文件

- `lib/sync/data-sync-events.ts` - 事件系统核心
- `lib/sync/kg-sync-coordinator.ts` - 知识图谱同步协调器
- `lib/sync/use-data-sync.ts` - React Hooks
- `lib/sync/sync-examples.tsx` - 使用示例
- `lib/client/kb-storage.ts` - 知识库存储（已集成）
- `lib/resources/resource-storage.ts` - 资源存储（已集成）
- `lib/path/path-storage.ts` - 学习路径存储（已集成）
- `lib/graph/kg-sync-service.ts` - 知识图谱同步服务

## 未来扩展

- [ ] 支持远程同步（WebSocket）
- [ ] 添加冲突解决机制
- [ ] 支持事件重放和撤销
- [ ] 添加事件持久化
- [ ] 支持跨标签页同步

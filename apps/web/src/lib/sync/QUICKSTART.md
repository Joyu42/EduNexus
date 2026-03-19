# 数据同步系统快速入门

## 5 分钟快速开始

### 1. 在应用根组件初始化（1 分钟）

在 `app/layout.tsx` 或主应用组件中添加：

```tsx
import { useKGSyncCoordinator } from '@/lib/sync';

export default function RootLayout({ children }) {
  useKGSyncCoordinator(); // 一行代码初始化

  return <html><body>{children}</body></html>;
}
```

### 2. 在组件中监听数据变化（2 分钟）

#### 知识库编辑器

```tsx
import { useKBDocumentSync } from '@/lib/sync';

function KBEditor() {
  const [documents, setDocuments] = useState([]);

  useKBDocumentSync(() => {
    // 文档变化时自动调用
    loadDocuments();
  });

  return <div>...</div>;
}
```

#### 资源列表

```tsx
import { useResourceSync } from '@/lib/sync';

function ResourceList() {
  const [resources, setResources] = useState([]);

  useResourceSync(() => {
    // 资源变化时自动调用
    loadResources();
  });

  return <div>...</div>;
}
```

#### 学习路径

```tsx
import { usePathSync } from '@/lib/sync';

function PathList() {
  const [paths, setPaths] = useState([]);

  usePathSync(() => {
    // 路径变化时自动调用
    loadPaths();
  });

  return <div>...</div>;
}
```

### 3. 正常使用存储 API（2 分钟）

**无需任何额外代码！** 存储模块已经集成了事件发布：

```tsx
// 创建文档 - 自动触发同步
const doc = await getKBStorage().createDocument(
  vaultId,
  'New Document',
  'Content'
);

// 更新文档 - 自动触发同步
await getKBStorage().updateDocument({
  ...doc,
  content: 'Updated content',
});

// 删除文档 - 自动触发同步
await getKBStorage().deleteDocument(doc.id);
```

## 完成！

现在你的应用已经具备：

✅ 知识库文档自动同步到知识图谱
✅ 资源自动创建图谱节点
✅ 学习路径进度自动更新图谱
✅ 所有界面自动刷新

## 验证同步是否工作

1. 打开浏览器控制台
2. 创建一个知识库文档
3. 查看控制台输出：

```
[KGCoordinator] Initialized, listening for sync events
[KGSync] Syncing document to graph: doc_123
[KGSync] Created new node: kg_doc_123
[KGCoordinator] Synced new document to graph: doc_123
```

## 下一步

- 查看 [完整文档](./README.md)
- 查看 [使用示例](./sync-examples.tsx)
- 自定义事件监听
- 添加更多同步规则

## 常见问题

**Q: 为什么我的组件没有自动刷新？**
A: 确保在根组件调用了 `useKGSyncCoordinator()`

**Q: 如何禁用某个模块的同步？**
A: 不要在该模块的组件中使用对应的 Hook

**Q: 同步会影响性能吗？**
A: 不会，系统使用了防抖机制（1.5秒延迟）和异步处理

**Q: 可以自定义同步规则吗？**
A: 可以，修改 `kg-sync-coordinator.ts` 中的处理函数

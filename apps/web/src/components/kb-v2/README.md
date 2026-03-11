# 知识库 V2 系统

## 概述

知识库 V2 是 EduNexus 的下一代知识管理系统，提供了强大的文档编辑、AI 辅助和知识组织功能。

## 核心功能

### 1. 富文本编辑器
- 基于 Tiptap 的现代化编辑器
- 支持 Markdown 语法
- 实时自动保存（2秒防抖）
- 完整的格式化工具栏

### 2. 知识库管理
- 多知识库支持
- 文档分类和标签
- 快速搜索和过滤
- 文档导入/导出

### 3. AI 功能
- **AI 摘要**：自动生成文档摘要
- **AI 思维导图**：可视化文档结构
- **AI 问答**：基于文档内容的智能问答

### 4. 文档大纲
- 自动提取文档标题结构
- 可点击导航
- 层级显示

### 5. 快捷键支持
- `Ctrl+B`：切换左侧边栏
- `Ctrl+\`：切换右侧面板
- `Ctrl+S`：手动保存
- `Ctrl+N`：新建文档
- `Ctrl+K`：搜索

## 技术栈

- **编辑器**：Tiptap + ProseMirror
- **存储**：IndexedDB (本地优先)
- **UI**：Radix UI + Tailwind CSS
- **动画**：Framer Motion
- **图表**：ReactFlow (思维导图)

## 组件结构

```
kb-v2/
├── page.tsx              # 主页面
├── kb-layout.tsx         # 布局容器
├── kb-sidebar.tsx        # 左侧边栏（文档列表）
├── kb-editor.tsx         # 编辑器
├── kb-right-panel.tsx    # 右侧面板（大纲、AI）
├── editor-toolbar.tsx    # 编辑器工具栏
├── ai-mindmap.tsx        # AI 思维导图
├── ai-summary.tsx        # AI 摘要
└── ai-chat.tsx           # AI 问答
```

## 数据模型

### KBDocument
```typescript
{
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  vaultId: string;
  version: number;
}
```

### KBVault
```typescript
{
  id: string;
  name: string;
  path: string;
  createdAt: Date;
  lastAccessedAt: Date;
  isDefault: boolean;
}
```

## API 端点

- `POST /api/kb/mindmap` - 生成思维导图
- `POST /api/kb/summary` - 生成摘要
- `POST /api/kb/chat` - AI 问答

## 性能优化

1. **防抖保存**：编辑器内容变化后 2 秒自动保存
2. **懒加载**：AI 组件仅在激活标签页时加载
3. **虚拟滚动**：大量文档列表使用虚拟滚动
4. **IndexedDB**：本地存储，快速访问

## 使用示例

```tsx
import KnowledgeBaseV2Page from '@/app/kb-v2/page';

// 在路由中使用
export default function Page() {
  return <KnowledgeBaseV2Page />;
}
```

## 未来计划

- [ ] 协作编辑
- [ ] 版本历史
- [ ] 文档模板
- [ ] 双向链接
- [ ] 知识图谱集成
- [ ] 移动端优化
- [ ] 离线支持
- [ ] 云同步

## 注意事项

1. 所有数据存储在浏览器 IndexedDB 中
2. 定期导出重要文档作为备份
3. AI 功能需要配置 API 密钥
4. 大文档可能影响性能，建议拆分

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT

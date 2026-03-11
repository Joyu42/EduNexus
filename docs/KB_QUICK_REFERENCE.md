# 知识库快速参考

## 🚀 快速开始

```bash
# 创建新文档
Ctrl+N

# 保存文档
Ctrl+S

# 搜索文档
Ctrl+F

# 查看快捷键
Ctrl+/
```

## ⌨️ 常用快捷键

### 全局
- `Ctrl+N` - 新建文档
- `Ctrl+S` - 保存文档
- `Ctrl+F` - 搜索
- `Ctrl+/` - 快捷键面板
- `Esc` - 取消/关闭

### 编辑器
- `Ctrl+B` - **粗体**
- `Ctrl+I` - *斜体*
- `Ctrl+E` - `代码`
- `Ctrl+Z` - 撤销
- `Ctrl+Y` - 重做
- `/` - 斜杠命令

### 导航
- `Ctrl+1-4` - 切换视图
- `↑↓` - 文档导航
- `Enter` - 打开文档

### AI 功能
- `Ctrl+Shift+A` - AI 助手
- `Ctrl+Shift+S` - 生成摘要
- `Ctrl+Shift+M` - 思维导图

## 📝 斜杠命令

```
/h1     # 一级标题
/h2     # 二级标题
/h3     # 三级标题
/ul     # 无序列表
/ol     # 有序列表
/task   # 任务列表
/code   # 代码块
/quote  # 引用
/table  # 表格
/hr     # 分隔线
```

## 🏷️ 标签使用

```typescript
// 添加标签
doc.tags = ["项目", "重要", "2024"];

// 按标签筛选
searchEngine.search(vaultId, {
  tags: ["项目"],
});

// 热门标签
tagManager.getPopularTags(10);
```

## 🔍 搜索技巧

### 基本搜索
```typescript
// 搜索标题和内容
searchEngine.search(vaultId, {
  query: "关键词",
});
```

### 高级搜索
```typescript
// 组合筛选
searchEngine.search(vaultId, {
  query: "关键词",
  tags: ["标签1", "标签2"],
  dateFrom: new Date("2024-01-01"),
  dateTo: new Date("2024-12-31"),
  sortBy: "relevance",
  sortOrder: "desc",
});
```

## 💾 导出文档

```typescript
// Markdown
exportAsMarkdown(doc);

// HTML
exportAsHTML(doc);

// PDF
exportAsPDF(doc);

// 批量导出
exportMultipleDocuments(docs, "markdown");
```

## 📚 版本历史

```typescript
// 保存版本
versionManager.saveVersion(doc, "重要更新");

// 查看历史
const versions = await versionManager.getVersions(docId);

// 比较版本
const diff = versionManager.compareVersions(v1, v2);

// 恢复版本
const restored = await versionManager.restoreVersion(versionId);
```

## ⭐ 收藏和最近

```typescript
// 添加收藏
favoriteManager.addFavorite(docId);

// 切换收藏
favoriteManager.toggleFavorite(docId);

// 记录访问
recentManager.addRecentDocument(docId, title);

// 获取最近
const recent = recentManager.getRecentDocuments();
```

## 🎨 主题切换

```typescript
// 设置主题
setTheme("light");   // 浅色
setTheme("dark");    // 深色
setTheme("system");  // 跟随系统
```

## 📦 组件使用

### Tiptap 编辑器
```tsx
<TiptapEditor
  content={content}
  onChange={setContent}
  placeholder="开始写作..."
  editable={true}
/>
```

### 文档侧边栏
```tsx
<DocumentSidebar
  currentVaultId={vaultId}
  onSelectDocument={handleSelect}
  selectedDocId={docId}
/>
```

### 增强搜索栏
```tsx
<EnhancedSearchBar
  value={query}
  onChange={setQuery}
  onSearch={handleSearch}
  vaultId={vaultId}
/>
```

### 快捷键面板
```tsx
<ShortcutsPanel
  open={show}
  onOpenChange={setShow}
/>
```

## 🔧 API 参考

### KBStorage
```typescript
const storage = getKBStorage();

// 文档操作
await storage.createDocument(vaultId, title, content, tags);
await storage.updateDocument(doc);
await storage.deleteDocument(docId);
const docs = await storage.getDocumentsByVault(vaultId);

// 知识库操作
await storage.createVault(name, path);
await storage.deleteVault(vaultId);
const vaults = await storage.getAllVaults();
```

### TagManager
```typescript
const tagManager = getTagManager();

// 标签操作
const tag = tagManager.createTag(name);
tagManager.updateTag(tagId, updates);
tagManager.deleteTag(tagId);
const tags = tagManager.getAllTags();
const popular = tagManager.getPopularTags(10);
await tagManager.updateTagCounts();
```

### SearchEngine
```typescript
const searchEngine = getEnhancedSearchEngine();

// 搜索
const results = await searchEngine.search(vaultId, options);
const suggestions = await searchEngine.getSearchSuggestions(vaultId, query);

// 历史
const history = searchEngine.getSearchHistory();
searchEngine.addSearchHistory(query, count);
searchEngine.clearSearchHistory();
```

## 💡 最佳实践

### 文档组织
1. 使用清晰的标题层级
2. 每个文档 3-5 个标签
3. 定期整理和归档
4. 保持文档简洁

### 搜索优化
1. 使用精确关键词
2. 利用标签筛选
3. 查看搜索历史
4. 保存常用搜索

### 备份策略
1. 定期导出重要文档
2. 使用版本历史
3. 多格式备份
4. 云存储同步

### 性能优化
1. 控制文档大小（< 10MB）
2. 定期清理历史
3. 使用标签而非文件夹
4. 压缩图片

## 🐛 故障排查

### 编辑器问题
```bash
# 检查扩展
console.log(editor.extensionManager.extensions);

# 检查内容
console.log(editor.getHTML());

# 重置编辑器
editor.commands.clearContent();
```

### 搜索问题
```bash
# 检查索引
const index = getSearchIndex();
console.log(index);

# 重建索引
await searchIndex.rebuild();

# 清除缓存
localStorage.clear();
```

### 存储问题
```bash
# 检查 IndexedDB
indexedDB.databases().then(console.log);

# 清除数据库
indexedDB.deleteDatabase("EduNexusKB");

# 重新初始化
await storage.initialize();
```

## 📞 获取帮助

- 📖 [完整文档](./KB_USER_GUIDE.md)
- 🔧 [集成指南](./KB_INTEGRATION_GUIDE.md)
- 📋 [功能清单](./KB_FEATURES.md)
- 💬 技术支持

---

**快速、简洁、高效** 🚀

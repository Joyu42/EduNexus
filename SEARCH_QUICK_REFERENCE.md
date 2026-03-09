# 搜索功能快速参考

## 搜索语法速查表

| 语法 | 说明 | 示例 |
|------|------|------|
| `关键词` | 基础搜索 | `机器学习` |
| `"精确短语"` | 精确匹配 | `"深度学习入门"` |
| `词1 AND 词2` | 同时包含 | `Python AND 数据分析` |
| `词1 OR 词2` | 包含任一 | `机器学习 OR 深度学习` |
| `NOT 词` | 排除 | `机器学习 NOT 入门` |
| `-词` | 排除（简写） | `机器学习 -入门` |
| `tag:标签` | 标签过滤 | `tag:AI` |

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `↑` | 上一个建议 |
| `↓` | 下一个建议 |
| `Enter` | 选择建议/执行搜索 |
| `Esc` | 关闭建议列表 |

## 高亮颜色

| 顺序 | 颜色 |
|------|------|
| 第 1 个关键词 | 🟨 黄色 |
| 第 2 个关键词 | 🟦 蓝色 |
| 第 3 个关键词 | 🟩 绿色 |
| 第 4 个关键词 | 🟪 紫色 |
| 第 5 个关键词 | 🩷 粉色 |

## API 使用

### 搜索索引
```typescript
import { getSearchIndex } from "@/lib/client/search-index";

const searchIndex = getSearchIndex();
const results = searchIndex.search(documents, query, {
  maxResults: 100,
  minScore: 1,
});
```

### 搜索历史
```typescript
import { getSearchHistory } from "@/lib/client/search-history";

const history = getSearchHistory();
history.addSearch(query, resultCount);
const recent = history.getRecentHistory(10);
history.clearHistory();
```

## 组件使用

### SearchBar
```tsx
<SearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  onSearch={handleSearch}
  suggestions={titleSuggestions}
  tags={allTags}
  showHistory={true}
  showSyntaxHelp={true}
/>
```

### SearchResults
```tsx
<SearchResults
  results={searchResults}
  searchQuery={searchQuery}
  onSelectDocument={setSelectedDoc}
  selectedDocId={selectedDoc?.id}
  sortBy="relevance"
/>
```

## 搜索示例

### 简单搜索
```
机器学习
```

### 精确匹配
```
"Python 数据分析"
```

### 多条件组合
```
"机器学习" AND Python tag:AI -入门
```

### 标签搜索
```
tag:教程 tag:Python
```

### 排除不需要的内容
```
深度学习 -TensorFlow -PyTorch
```

## 常见问题

**Q: 如何清除搜索历史？**
A: 点击搜索框，在历史记录面板点击"清除"按钮。

**Q: 如何使用键盘导航？**
A: 输入搜索词后，使用 ↑↓ 键选择建议，Enter 确认，Esc 关闭。

**Q: 支持多少个关键词高亮？**
A: 支持无限个关键词，颜色会循环使用 5 种颜色。

**Q: 搜索历史保存在哪里？**
A: 保存在浏览器的 localStorage 中，最多保存 20 条。

**Q: 如何查看搜索语法帮助？**
A: 点击搜索框右侧的 ❓ 图标。

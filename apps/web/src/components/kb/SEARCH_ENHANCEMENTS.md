# 知识库搜索功能增强

## 新增功能

### 1. 搜索结果高亮

- **多关键词高亮**：支持同时高亮多个搜索关键词，每个关键词使用不同颜色
- **上下文显示**：在搜索结果中显示匹配内容的上下文（前后各 50 字符）
- **智能片段提取**：自动提取最相关的内容片段（最多 2 个）

**颜色方案**：
- 第 1 个关键词：黄色高亮
- 第 2 个关键词：蓝色高亮
- 第 3 个关键词：绿色高亮
- 第 4 个关键词：紫色高亮
- 第 5 个关键词：粉色高亮

### 2. 搜索历史记录

- **自动保存**：最近 20 条搜索记录自动保存到 localStorage
- **快速访问**：点击历史记录快速重新搜索
- **结果计数**：显示每次搜索的结果数量
- **一键清除**：支持清除所有历史记录

**使用方式**：
- 点击搜索框时自动显示历史记录
- 点击任意历史记录项快速搜索
- 点击"清除"按钮删除所有历史

### 3. 搜索建议（自动补全）

- **标题建议**：基于文档标题的智能补全
- **标签建议**：基于文档标签的快速过滤
- **历史建议**：基于搜索历史的推荐
- **键盘导航**：支持上下箭头键选择建议项

**键盘快捷键**：
- `↑` / `↓`：在建议列表中导航
- `Enter`：选择当前建议或执行搜索
- `Esc`：关闭建议列表

### 4. 高级搜索语法

支持以下搜索语法：

#### 精确匹配
```
"精确短语"
```
使用双引号包裹，精确匹配整个短语。

#### 逻辑运算符

**AND（同时包含）**：
```
关键词1 AND 关键词2
```
搜索同时包含两个关键词的文档。

**OR（包含任一）**：
```
关键词1 OR 关键词2
```
搜索包含任一关键词的文档。

#### 排除词

**NOT 运算符**：
```
关键词 NOT 排除词
```

**减号语法**：
```
关键词 -排除词
```
搜索包含关键词但不包含排除词的文档。

#### 标签过滤
```
tag:标签名
```
只搜索包含指定标签的文档。

#### 组合使用
```
"机器学习" AND Python tag:AI -入门
```
搜索包含"机器学习"和"Python"、标签为"AI"、但不包含"入门"的文档。

## 技术实现

### 文件结构

```
apps/web/src/
├── lib/client/
│   ├── search-index.ts          # 搜索索引（已增强）
│   └── search-history.ts        # 搜索历史管理（新增）
└── components/kb/
    ├── search-bar.tsx           # 搜索栏（已增强）
    └── search-results.tsx       # 搜索结果（已增强）
```

### 核心模块

#### SearchHistoryManager
管理搜索历史的保存、读取和清除。

**主要方法**：
- `addSearch(query, resultCount)`：添加搜索记录
- `getHistory()`：获取所有历史
- `getRecentHistory(limit)`：获取最近 N 条
- `searchHistory(query)`：搜索历史记录
- `clearHistory()`：清除所有历史

#### SearchIndexManager
增强的搜索索引管理器，支持高级搜索语法。

**新增功能**：
- `parseAdvancedQuery()`：解析高级搜索语法
- 多关键词高亮支持
- 精确短语匹配
- 标签过滤
- 排除词支持

### 性能优化

1. **索引缓存**：搜索索引缓存 5 分钟，避免频繁重建
2. **增量更新**：只在必要时重建索引
3. **结果限制**：默认最多返回 100 个结果
4. **懒加载**：建议列表按需加载

## 使用示例

### 基础搜索
```typescript
import { getSearchIndex } from "@/lib/client/search-index";

const searchIndex = getSearchIndex();
const results = searchIndex.search(documents, "机器学习", {
  maxResults: 50,
  minScore: 1,
});
```

### 高级搜索
```typescript
// 精确匹配
const results1 = searchIndex.search(documents, '"深度学习入门"');

// 逻辑运算
const results2 = searchIndex.search(documents, 'Python AND 数据分析');

// 标签过滤
const results3 = searchIndex.search(documents, 'tag:AI tag:教程');

// 排除词
const results4 = searchIndex.search(documents, '机器学习 -入门');
```

### 搜索历史
```typescript
import { getSearchHistory } from "@/lib/client/search-history";

const history = getSearchHistory();

// 添加搜索记录
history.addSearch("机器学习", 15);

// 获取历史
const recentSearches = history.getRecentHistory(10);

// 清除历史
history.clearHistory();
```

## 注意事项

1. **浏览器兼容性**：搜索历史使用 localStorage，需要浏览器支持
2. **性能考虑**：大量文档时建议限制搜索结果数量
3. **中文分词**：当前使用简单的字符分词，可根据需要升级为专业分词库
4. **正则表达式**：高级语法中的特殊字符会被自动转义

## 未来改进

- [ ] 支持更多搜索运算符（如通配符 `*`）
- [ ] 添加搜索结果导出功能
- [ ] 支持保存常用搜索
- [ ] 添加搜索统计和分析
- [ ] 集成专业中文分词库（如 jieba）
- [ ] 支持拼音搜索
- [ ] 添加搜索结果预览

# 知识库功能集成指南

## 概述

本文档说明如何将新开发的知识库功能集成到现有的 `apps/web/src/app/kb/page.tsx` 中。

## 集成步骤

### 1. 导入新组件

在 `page.tsx` 顶部添加以下导入：

```typescript
// 编辑器相关
import { TiptapEditor } from "@/components/kb/tiptap-editor";

// 文档管理
import { DocumentSidebar } from "@/components/kb/document-sidebar";
import {
  getTagManager,
  getFavoriteManager,
  getRecentManager,
} from "@/lib/client/document-manager";

// 搜索功能
import { EnhancedSearchBar } from "@/components/kb/enhanced-search-bar";
import {
  getEnhancedSearchEngine,
  type SearchOptions,
} from "@/lib/client/enhanced-search";

// 导出功能
import {
  exportAsMarkdown,
  exportAsHTML,
  exportAsPDF,
} from "@/lib/client/document-export";

// 版本历史
import { getVersionHistoryManager } from "@/lib/client/version-history";

// 快捷键和主题
import { ShortcutsPanel, useShortcuts } from "@/components/kb/shortcuts-panel";
import { ThemeToggle } from "@/components/theme-toggle";
```

### 2. 替换编辑器

将现有的 `Textarea` 编辑器替换为 `TiptapEditor`：

```typescript
// 旧代码
<Textarea
  ref={textareaRef}
  value={editContent}
  onChange={(e) => setEditContent(e.target.value)}
  className="..."
/>

// 新代码
<TiptapEditor
  content={editContent}
  onChange={setEditContent}
  placeholder="开始写作..."
  editable={isEditing}
/>
```

### 3. 添加文档侧边栏

在主布局中添加侧边栏：

```typescript
<div className="flex gap-4">
  {/* 左侧：文档侧边栏 */}
  <div className="w-80 flex-shrink-0">
    <DocumentSidebar
      currentVaultId={currentVaultId}
      onSelectDocument={handleSelectDocument}
      selectedDocId={selectedDoc?.id}
    />
  </div>

  {/* 右侧：主内容区 */}
  <div className="flex-1">
    {/* 现有内容 */}
  </div>
</div>
```

### 4. 集成增强搜索

替换现有的搜索栏：

```typescript
// 旧代码
<SearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  onSearch={handleSearch}
/>

// 新代码
<EnhancedSearchBar
  value={searchQuery}
  onChange={setSearchQuery}
  onSearch={handleEnhancedSearch}
  vaultId={currentVaultId}
  placeholder="搜索文档..."
/>
```

实现增强搜索处理函数：

```typescript
const handleEnhancedSearch = async () => {
  if (!currentVaultId) return;

  const searchEngine = getEnhancedSearchEngine();
  const options: SearchOptions = {
    query: searchQuery,
    tags: selectedTags,
    dateFrom: dateFrom,
    dateTo: dateTo,
    sortBy: sortBy,
    sortOrder: sortOrder,
  };

  const results = await searchEngine.search(currentVaultId, options);
  setSearchResults(results);
};
```

### 5. 添加导出功能

在文档操作菜单中添加导出选项：

```typescript
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="sm">
      <Download className="w-4 h-4 mr-2" />
      导出
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => exportAsMarkdown(selectedDoc)}>
      导出为 Markdown
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => exportAsHTML(selectedDoc)}>
      导出为 HTML
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => exportAsPDF(selectedDoc)}>
      导出为 PDF
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

### 6. 集成版本历史

添加版本历史功能：

```typescript
const versionManager = getVersionHistoryManager();

// 保存版本
const handleSaveWithVersion = async () => {
  await storage.updateDocument(selectedDoc);
  await versionManager.saveVersion(selectedDoc, "手动保存");
};

// 查看版本历史
const handleViewHistory = async () => {
  const versions = await versionManager.getVersions(selectedDoc.id);
  setVersionHistory(versions);
  setShowVersionDialog(true);
};

// 恢复版本
const handleRestoreVersion = async (versionId: string) => {
  const version = await versionManager.restoreVersion(versionId);
  if (version) {
    setEditContent(version.content);
    setEditTitle(version.title);
  }
};
```

### 7. 添加快捷键支持

使用 `useShortcuts` Hook：

```typescript
const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);

useShortcuts({
  "ctrl+n": handleNewDocument,
  "ctrl+s": handleSaveDocument,
  "ctrl+f": () => searchInputRef.current?.focus(),
  "ctrl+/": () => setShowShortcutsPanel(true),
  "ctrl+1": () => setViewMode("list"),
  "ctrl+2": () => setViewMode("card"),
  "ctrl+3": () => setViewMode("timeline"),
  "ctrl+4": () => setViewMode("kanban"),
  "ctrl+shift+a": () => setShowAIAssistant(true),
  "ctrl+shift+s": handleGenerateSummary,
  "ctrl+shift+m": handleGenerateMindMap,
});

// 渲染快捷键面板
<ShortcutsPanel
  open={showShortcutsPanel}
  onOpenChange={setShowShortcutsPanel}
/>
```

### 8. 添加主题切换

在顶部工具栏添加主题切换按钮：

```typescript
<div className="flex items-center gap-2">
  {/* 其他按钮 */}
  <ThemeToggle />
</div>
```

### 9. 集成标签、收藏、最近访问

```typescript
const tagManager = getTagManager();
const favoriteManager = getFavoriteManager();
const recentManager = getRecentManager();

// 添加标签
const handleAddTag = (tagName: string) => {
  const tag = tagManager.createTag(tagName);
  const updatedDoc = {
    ...selectedDoc,
    tags: [...selectedDoc.tags, tag.name],
  };
  storage.updateDocument(updatedDoc);
  tagManager.updateTagCounts();
};

// 切换收藏
const handleToggleFavorite = () => {
  const isFavorite = favoriteManager.toggleFavorite(selectedDoc.id);
  setIsFavorite(isFavorite);
};

// 记录访问
const handleOpenDocument = (doc: KBDocument) => {
  setSelectedDoc(doc);
  recentManager.addRecentDocument(doc.id, doc.title);
};
```

## 完整示例

以下是一个简化的集成示例：

```typescript
"use client";

import { useState, useEffect } from "react";
import { TiptapEditor } from "@/components/kb/tiptap-editor";
import { DocumentSidebar } from "@/components/kb/document-sidebar";
import { EnhancedSearchBar } from "@/components/kb/enhanced-search-bar";
import { ShortcutsPanel, useShortcuts } from "@/components/kb/shortcuts-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { getKBStorage } from "@/lib/client/kb-storage";
import { getEnhancedSearchEngine } from "@/lib/client/enhanced-search";
import { exportAsMarkdown, exportAsHTML, exportAsPDF } from "@/lib/client/document-export";
import { getVersionHistoryManager } from "@/lib/client/version-history";
import { getRecentManager } from "@/lib/client/document-manager";

export default function KnowledgeBasePage() {
  const [currentVaultId, setCurrentVaultId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showShortcutsPanel, setShowShortcutsPanel] = useState(false);

  const storage = getKBStorage();
  const searchEngine = getEnhancedSearchEngine();
  const versionManager = getVersionHistoryManager();
  const recentManager = getRecentManager();

  // 快捷键
  useShortcuts({
    "ctrl+n": handleNewDocument,
    "ctrl+s": handleSaveDocument,
    "ctrl+f": () => searchInputRef.current?.focus(),
    "ctrl+/": () => setShowShortcutsPanel(true),
  });

  // 打开文档
  const handleSelectDocument = async (docId: string) => {
    const docs = await storage.getDocumentsByVault(currentVaultId);
    const doc = docs.find((d) => d.id === docId);
    if (doc) {
      setSelectedDoc(doc);
      setEditContent(doc.content);
      recentManager.addRecentDocument(doc.id, doc.title);
    }
  };

  // 保存文档
  const handleSaveDocument = async () => {
    if (!selectedDoc) return;

    const updatedDoc = {
      ...selectedDoc,
      content: editContent,
    };

    await storage.updateDocument(updatedDoc);
    await versionManager.saveVersion(updatedDoc);
  };

  // 搜索
  const handleSearch = async () => {
    const results = await searchEngine.search(currentVaultId, {
      query: searchQuery,
    });
    setSearchResults(results);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between p-4 border-b">
        <EnhancedSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          vaultId={currentVaultId}
        />
        <div className="flex items-center gap-2">
          <Button onClick={handleSaveDocument}>保存</Button>
          <ThemeToggle />
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧边栏 */}
        <div className="w-80 border-r overflow-y-auto">
          <DocumentSidebar
            currentVaultId={currentVaultId}
            onSelectDocument={handleSelectDocument}
            selectedDocId={selectedDoc?.id}
          />
        </div>

        {/* 编辑器 */}
        <div className="flex-1 overflow-y-auto">
          {selectedDoc ? (
            <TiptapEditor
              content={editContent}
              onChange={setEditContent}
              placeholder="开始写作..."
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              选择或创建一个文档
            </div>
          )}
        </div>
      </div>

      {/* 快捷键面板 */}
      <ShortcutsPanel
        open={showShortcutsPanel}
        onOpenChange={setShowShortcutsPanel}
      />
    </div>
  );
}
```

## 样式调整

### 深色主题支持

在 `globals.css` 中添加深色主题样式：

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    /* 其他颜色变量 */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* 其他颜色变量 */
  }
}

/* Tiptap 编辑器深色主题 */
.dark .ProseMirror {
  color: #e5e7eb;
}

.dark .ProseMirror code {
  background-color: #374151;
  color: #f3f4f6;
}

.dark .ProseMirror pre {
  background-color: #1f2937;
}
```

## 性能优化

### 1. 懒加载组件

```typescript
import dynamic from "next/dynamic";

const TiptapEditor = dynamic(
  () => import("@/components/kb/tiptap-editor").then((mod) => mod.TiptapEditor),
  { ssr: false }
);
```

### 2. 防抖搜索

```typescript
import { useMemo } from "react";
import debounce from "lodash/debounce";

const debouncedSearch = useMemo(
  () => debounce(handleSearch, 300),
  [handleSearch]
);
```

### 3. 虚拟滚动

对于大量文档，使用虚拟滚动：

```typescript
import { useVirtualizer } from "@tanstack/react-virtual";

const rowVirtualizer = useVirtualizer({
  count: documents.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 60,
});
```

## 测试

### 单元测试

```typescript
import { render, screen } from "@testing-library/react";
import { TiptapEditor } from "@/components/kb/tiptap-editor";

describe("TiptapEditor", () => {
  it("renders editor", () => {
    render(<TiptapEditor content="" onChange={() => {}} />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("handles content change", () => {
    const onChange = jest.fn();
    render(<TiptapEditor content="" onChange={onChange} />);
    // 测试内容变化
  });
});
```

### 集成测试

```typescript
describe("Knowledge Base Integration", () => {
  it("creates and saves document", async () => {
    // 测试创建和保存文档流程
  });

  it("searches documents", async () => {
    // 测试搜索功能
  });

  it("exports document", async () => {
    // 测试导出功能
  });
});
```

## 故障排查

### 常见问题

1. **Tiptap 编辑器不显示**
   - 检查是否正确导入所有扩展
   - 确保 lowlight 正确初始化
   - 查看浏览器控制台错误

2. **搜索不工作**
   - 确认 IndexedDB 已初始化
   - 检查搜索索引是否构建
   - 验证搜索查询格式

3. **导出失败**
   - 检查浏览器是否允许下载
   - 确认文档内容格式正确
   - 查看控制台错误信息

4. **版本历史丢失**
   - 确认 IndexedDB 版本号正确
   - 检查数据库升级逻辑
   - 验证版本保存时机

## 下一步

1. 测试所有功能
2. 优化性能
3. 添加更多 AI 功能
4. 实现协作功能
5. 添加移动端支持

## 参考资源

- [Tiptap 文档](https://tiptap.dev/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Radix UI](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)

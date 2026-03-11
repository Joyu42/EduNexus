# 集成新 AI 写作助手到知识库页面

## 快速集成步骤

### 步骤 1：导入新组件

在 `apps/web/src/app/kb/page.tsx` 中，替换旧的 AI 助手导入：

```tsx
// 旧的导入（注释掉或删除）
// import { AIAssistant } from "@/components/kb/ai-assistant";

// 新的导入
import { AIWritingAssistant } from "@/components/kb/ai-writing-assistant";
```

### 步骤 2：添加文本选择状态

在组件中添加文本选择相关的状态：

```tsx
// 在现有状态后添加
const [selectedText, setSelectedText] = useState("");
const [selectionPosition, setSelectionPosition] = useState({ top: 0, left: 0 });
```

### 步骤 3：添加文本选择处理函数

```tsx
// 处理文本选择
const handleTextSelection = useCallback(() => {
  const selection = window.getSelection();
  const text = selection?.toString() || "";

  if (text && text.trim().length > 0) {
    const range = selection?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();

    setSelectedText(text);
    setSelectionPosition({
      top: (rect?.top || 0) + window.scrollY,
      left: (rect?.left || 0) + window.scrollX,
    });
  } else {
    setSelectedText("");
  }
}, []);

// 监听文本选择事件
useEffect(() => {
  document.addEventListener("mouseup", handleTextSelection);
  document.addEventListener("keyup", handleTextSelection);

  return () => {
    document.removeEventListener("mouseup", handleTextSelection);
    document.removeEventListener("keyup", handleTextSelection);
  };
}, [handleTextSelection]);
```

### 步骤 4：添加插入和替换文本的处理函数

```tsx
// 插入文本到编辑器
const handleInsertText = useCallback((text: string) => {
  if (!currentDoc) return;

  // 在光标位置插入文本
  const newContent = currentDoc.content + "\n\n" + text;

  // 更新文档内容
  setCurrentDoc({
    ...currentDoc,
    content: newContent,
  });

  // 保存到存储
  const storage = getKBStorage();
  storage.updateDocument(currentDoc.id, { content: newContent });
}, [currentDoc]);

// 替换选中的文本
const handleReplaceText = useCallback((text: string) => {
  if (!currentDoc || !selectedText) return;

  // 替换选中的文本
  const newContent = currentDoc.content.replace(selectedText, text);

  // 更新文档内容
  setCurrentDoc({
    ...currentDoc,
    content: newContent,
  });

  // 保存到存储
  const storage = getKBStorage();
  storage.updateDocument(currentDoc.id, { content: newContent });

  // 清除选择
  setSelectedText("");
}, [currentDoc, selectedText]);
```

### 步骤 5：替换旧的 AI 助手组件

找到页面中的旧 AI 助手组件，替换为新组件：

```tsx
{/* 旧的 AI 助手（注释掉或删除）
<AIAssistant
  documentId={currentDoc?.id}
  documentTitle={currentDoc?.title}
  documentContent={currentDoc?.content}
  selectedText={selectedText}
  onInsertText={handleInsertText}
/>
*/}

{/* 新的 AI 写作助手 */}
<AIWritingAssistant
  documentId={currentDoc?.id}
  documentTitle={currentDoc?.title}
  documentContent={currentDoc?.content}
  selectedText={selectedText}
  selectionPosition={selectionPosition}
  onInsertText={handleInsertText}
  onReplaceText={handleReplaceText}
/>
```

## 完整示例代码

```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { AIWritingAssistant } from "@/components/kb/ai-writing-assistant";
import { getKBStorage, type KBDocument } from "@/lib/client/kb-storage";

export default function KBPage() {
  const [currentDoc, setCurrentDoc] = useState<KBDocument | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectionPosition, setSelectionPosition] = useState({ top: 0, left: 0 });

  // 处理文本选择
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    const text = selection?.toString() || "";

    if (text && text.trim().length > 0) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();

      setSelectedText(text);
      setSelectionPosition({
        top: (rect?.top || 0) + window.scrollY,
        left: (rect?.left || 0) + window.scrollX,
      });
    } else {
      setSelectedText("");
    }
  }, []);

  // 监听文本选择事件
  useEffect(() => {
    document.addEventListener("mouseup", handleTextSelection);
    document.addEventListener("keyup", handleTextSelection);

    return () => {
      document.removeEventListener("mouseup", handleTextSelection);
      document.removeEventListener("keyup", handleTextSelection);
    };
  }, [handleTextSelection]);

  // 插入文本
  const handleInsertText = useCallback((text: string) => {
    if (!currentDoc) return;

    const newContent = currentDoc.content + "\n\n" + text;

    setCurrentDoc({
      ...currentDoc,
      content: newContent,
    });

    const storage = getKBStorage();
    storage.updateDocument(currentDoc.id, { content: newContent });
  }, [currentDoc]);

  // 替换文本
  const handleReplaceText = useCallback((text: string) => {
    if (!currentDoc || !selectedText) return;

    const newContent = currentDoc.content.replace(selectedText, text);

    setCurrentDoc({
      ...currentDoc,
      content: newContent,
    });

    const storage = getKBStorage();
    storage.updateDocument(currentDoc.id, { content: newContent });

    setSelectedText("");
  }, [currentDoc, selectedText]);

  return (
    <div className="h-screen">
      {/* 你的页面内容 */}

      {/* AI 写作助手 */}
      <AIWritingAssistant
        documentId={currentDoc?.id}
        documentTitle={currentDoc?.title}
        documentContent={currentDoc?.content}
        selectedText={selectedText}
        selectionPosition={selectionPosition}
        onInsertText={handleInsertText}
        onReplaceText={handleReplaceText}
      />
    </div>
  );
}
```

## 注意事项

1. **保持旧组件**：建议先保留旧的 `ai-assistant.tsx`，测试新组件无误后再删除
2. **API 兼容性**：新组件使用 `/api/kb/ai/stream` 端点，确保该端点可用
3. **样式冲突**：如果有样式冲突，检查全局 CSS
4. **性能优化**：文本选择使用了防抖，可根据需要调整延迟时间

## 测试清单

- [ ] 浮动按钮显示正常
- [ ] 点击浮动按钮打开助手
- [ ] 快捷键 Ctrl/Cmd+J 工作正常
- [ ] 快速操作按钮可点击
- [ ] 选中文本时浮动工具栏出现
- [ ] 流式输出正常显示
- [ ] 插入文本功能正常
- [ ] 替换文本功能正常
- [ ] 全屏模式切换正常
- [ ] 模板选择器工作正常

## 故障排除

### 问题：浮动工具栏不显示

**解决方案**：
1. 检查 `selectedText` 是否有值
2. 检查 `selectionPosition` 是否正确
3. 确认事件监听器已添加

### 问题：插入/替换不工作

**解决方案**：
1. 检查 `handleInsertText` 和 `handleReplaceText` 是否正确实现
2. 确认 `currentDoc` 有值
3. 检查存储更新逻辑

### 问题：流式输出失败

**解决方案**：
1. 检查 `/api/kb/ai/stream` 端点是否存在
2. 查看浏览器控制台错误
3. 确认 AI 配置正确

## 下一步

1. 测试所有功能
2. 根据需要调整样式
3. 添加自定义操作或模板
4. 优化性能
5. 收集用户反馈

---

**集成完成后，你将拥有一个现代化、美观、易用的 AI 写作助手！** ✨

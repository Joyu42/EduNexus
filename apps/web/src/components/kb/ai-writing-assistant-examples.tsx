/**
 * AI 写作助手集成示例
 *
 * 本文件展示如何在知识库页面中集成新的 AI 写作助手
 */

import { useState, useEffect, useRef } from "react";
import { AIWritingAssistant } from "@/components/kb/ai-writing-assistant";

export function KBPageWithAIAssistant() {
  // 文档状态
  const [currentDoc, setCurrentDoc] = useState<any>(null);
  const [content, setContent] = useState("");

  // 文本选择状态
  const [selectedText, setSelectedText] = useState("");
  const [selectionPosition, setSelectionPosition] = useState({ top: 0, left: 0 });

  // 编辑器引用
  const editorRef = useRef<HTMLTextAreaElement>(null);

  /**
   * 处理文本选择
   * 当用户在编辑器中选中文字时，记录选中的文本和位置
   */
  const handleTextSelection = () => {
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
  };

  /**
   * 监听文本选择事件
   */
  useEffect(() => {
    document.addEventListener("mouseup", handleTextSelection);
    document.addEventListener("keyup", handleTextSelection);

    return () => {
      document.removeEventListener("mouseup", handleTextSelection);
      document.removeEventListener("keyup", handleTextSelection);
    };
  }, []);

  /**
   * 插入文本到光标位置
   */
  const handleInsertText = (text: string) => {
    if (!editorRef.current) return;

    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = content;

    // 在光标位置插入文本
    const newContent =
      currentContent.substring(0, start) +
      "\n\n" +
      text +
      "\n\n" +
      currentContent.substring(end);

    setContent(newContent);

    // 更新光标位置
    setTimeout(() => {
      const newPosition = start + text.length + 4;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  };

  /**
   * 替换选中的文本
   */
  const handleReplaceText = (text: string) => {
    if (!editorRef.current) return;

    const textarea = editorRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = content;

    // 替换选中的文本
    const newContent =
      currentContent.substring(0, start) +
      text +
      currentContent.substring(end);

    setContent(newContent);
    setSelectedText("");

    // 更新光标位置
    setTimeout(() => {
      const newPosition = start + text.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  };

  return (
    <div className="flex h-screen">
      {/* 主编辑区域 */}
      <div className="flex-1 p-6">
        <textarea
          ref={editorRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-full p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="开始写作..."
        />
      </div>

      {/* AI 写作助手 */}
      <AIWritingAssistant
        documentId={currentDoc?.id}
        documentTitle={currentDoc?.title}
        documentContent={content}
        selectedText={selectedText}
        selectionPosition={selectionPosition}
        onInsertText={handleInsertText}
        onReplaceText={handleReplaceText}
      />
    </div>
  );
}

/**
 * 高级集成示例：使用富文本编辑器
 */
export function KBPageWithRichEditor() {
  const [currentDoc, setCurrentDoc] = useState<any>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectionPosition, setSelectionPosition] = useState({ top: 0, left: 0 });

  // 假设使用某个富文本编辑器（如 TipTap, Slate 等）
  const editorInstance = useRef<any>(null);

  /**
   * 插入文本到富文本编辑器
   */
  const handleInsertText = (text: string) => {
    if (!editorInstance.current) return;

    // 根据你使用的编辑器调整实现
    // 示例：TipTap
    editorInstance.current
      .chain()
      .focus()
      .insertContent(text)
      .run();
  };

  /**
   * 替换富文本编辑器中的选中文本
   */
  const handleReplaceText = (text: string) => {
    if (!editorInstance.current) return;

    // 根据你使用的编辑器调整实现
    // 示例：TipTap
    editorInstance.current
      .chain()
      .focus()
      .deleteSelection()
      .insertContent(text)
      .run();

    setSelectedText("");
  };

  return (
    <div className="flex h-screen">
      {/* 富文本编辑器 */}
      <div className="flex-1 p-6">
        {/* 你的富文本编辑器组件 */}
      </div>

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

/**
 * 最小集成示例
 * 如果你只需要基本功能，不需要文本选择和插入
 */
export function MinimalIntegration() {
  const [currentDoc, setCurrentDoc] = useState<any>(null);

  return (
    <div className="h-screen">
      {/* 你的页面内容 */}

      {/* AI 写作助手 - 最小配置 */}
      <AIWritingAssistant
        documentId={currentDoc?.id}
        documentTitle={currentDoc?.title}
        documentContent={currentDoc?.content}
      />
    </div>
  );
}

/**
 * 自定义触发方式示例
 */
export function CustomTriggerExample() {
  const [showAI, setShowAI] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<any>(null);

  return (
    <div className="h-screen">
      {/* 自定义触发按钮 */}
      <button
        onClick={() => setShowAI(true)}
        className="fixed top-4 right-4 px-4 py-2 bg-purple-500 text-white rounded-lg"
      >
        打开 AI 助手
      </button>

      {/* 只在需要时显示 AI 助手 */}
      {showAI && (
        <AIWritingAssistant
          documentId={currentDoc?.id}
          documentTitle={currentDoc?.title}
          documentContent={currentDoc?.content}
        />
      )}
    </div>
  );
}

/**
 * 处理编辑器特定事件的示例
 */
export function EditorEventsExample() {
  const [currentDoc, setCurrentDoc] = useState<any>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectionPosition, setSelectionPosition] = useState({ top: 0, left: 0 });
  const editorRef = useRef<HTMLDivElement>(null);

  /**
   * 处理编辑器内的文本选择
   * 只在编辑器内部选择时触发
   */
  const handleEditorSelection = (e: React.MouseEvent) => {
    if (!editorRef.current?.contains(e.target as Node)) {
      return;
    }

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
    }
  };

  return (
    <div className="h-screen">
      <div
        ref={editorRef}
        onMouseUp={handleEditorSelection}
        className="p-6"
      >
        {/* 编辑器内容 */}
      </div>

      <AIWritingAssistant
        documentId={currentDoc?.id}
        documentTitle={currentDoc?.title}
        documentContent={currentDoc?.content}
        selectedText={selectedText}
        selectionPosition={selectionPosition}
      />
    </div>
  );
}

/**
 * 性能优化示例
 * 使用防抖和节流优化性能
 */
export function OptimizedIntegration() {
  const [currentDoc, setCurrentDoc] = useState<any>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectionPosition, setSelectionPosition] = useState({ top: 0, left: 0 });

  // 防抖定时器
  const debounceTimer = useRef<NodeJS.Timeout>();

  /**
   * 防抖处理文本选择
   */
  const handleTextSelection = () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
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
    }, 300); // 300ms 防抖
  };

  useEffect(() => {
    document.addEventListener("mouseup", handleTextSelection);
    return () => {
      document.removeEventListener("mouseup", handleTextSelection);
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return (
    <div className="h-screen">
      {/* 你的页面内容 */}

      <AIWritingAssistant
        documentId={currentDoc?.id}
        documentTitle={currentDoc?.title}
        documentContent={currentDoc?.content}
        selectedText={selectedText}
        selectionPosition={selectionPosition}
      />
    </div>
  );
}

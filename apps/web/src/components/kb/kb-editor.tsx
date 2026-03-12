"use client";

import { useEffect, useState, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { FileText } from "lucide-react";
import { EditorToolbar } from "./editor-toolbar";
import { MarkdownShortcuts } from "@/lib/tiptap/markdown-shortcuts";
import { HeadingWithId } from "@/lib/tiptap/heading-with-id";
import type { KBDocument } from "@/lib/client/kb-storage";
import { useKBDocumentSync } from "@/lib/sync";

interface KBEditorProps {
  document: KBDocument | null;
  onUpdate: (doc: KBDocument) => Promise<void>;
  onDocumentChange?: () => void; // 新增：文档列表刷新回调
}

export function KBEditor({ document, onUpdate, onDocumentChange }: KBEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 监听文档变化，自动刷新文档列表
  useKBDocumentSync(() => {
    if (onDocumentChange) {
      onDocumentChange();
    }
  });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false, // 禁用默认的 heading，使用自定义的
      }),
      HeadingWithId.configure({
        levels: [1, 2, 3, 4, 5, 6],
        HTMLAttributes: {
          class: 'scroll-mt-20', // 为滚动定位添加偏移
        },
      }),
      Placeholder.configure({
        placeholder: "输入 / 查看命令菜单...",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-4 cursor-pointer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto",
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      MarkdownShortcuts,
    ],
    content: document?.content || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-full p-8 prose-headings:font-bold prose-a:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-muted",
      },
    },
    onUpdate: ({ editor }) => {
      // 更新字数统计
      const text = editor.getText();
      setWordCount(text.length);

      // 防抖保存
      if (document) {
        const content = editor.getHTML();
        handleSave(content);
      }
    },
  });

  // 当文档切换时更新编辑器内容
  useEffect(() => {
    if (editor && document) {
      editor.commands.setContent(document.content || "");
      // 更新字数统计
      const text = editor.getText();
      setWordCount(text.length);
    }
  }, [document?.id, editor]);

  // 保存文档（防抖）
  const handleSave = async (content: string) => {
    if (!document) return;

    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 设置新的定时器，2秒后保存
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await onUpdate({
          ...document,
          content,
          updatedAt: new Date(),
        });
        setLastSaved(new Date());
      } catch (error) {
        console.error("Failed to save document:", error);
      } finally {
        setIsSaving(false);
      }
    }, 2000);
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-background to-muted/30">
        <div className="text-center max-w-md px-8">
          <div className="mb-6">
            <FileText className="h-20 w-20 mx-auto text-muted-foreground/50" />
          </div>
          <h2 className="text-2xl font-bold mb-3">欢迎使用知识宝库</h2>
          <p className="text-muted-foreground mb-6">
            选择左侧的文档开始编辑，或创建一个新文档开始你的知识管理之旅。
          </p>
          <div className="space-y-2 text-sm text-muted-foreground text-left bg-muted/50 rounded-lg p-4">
            <p className="font-semibold mb-2">✨ 功能特性：</p>
            <ul className="space-y-1 ml-4">
              <li>• 富文本编辑器，支持 Markdown</li>
              <li>• AI 智能摘要和思维导图</li>
              <li>• 实时自动保存</li>
              <li>• 文档大纲导航</li>
              <li>• 标签和分类管理</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      {editor && (
        <EditorToolbar
          editor={editor}
          isSaving={isSaving}
          lastSaved={lastSaved}
          wordCount={wordCount}
        />
      )}

      {/* 标题 */}
      <div className="px-8 pt-8 pb-4">
        <input
          type="text"
          value={document.title}
          onChange={(e) => {
            onUpdate({
              ...document,
              title: e.target.value,
            });
          }}
          className="text-4xl font-bold w-full bg-transparent border-none outline-none placeholder:text-muted-foreground"
          placeholder="无标题"
        />
      </div>

      {/* 编辑器 */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { EditorToolbar } from "./editor-toolbar";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import type { KBDocument } from "@/lib/client/kb-storage";
import { useKBDocumentSync } from "@/lib/sync";

interface KBEditorProps {
  document: KBDocument | null;
  onUpdate: (doc: KBDocument) => Promise<void>;
  onDocumentChange?: () => void;
}

export function KBEditor({ document, onUpdate, onDocumentChange }: KBEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [mode, setMode] = useState<"source" | "render">("source");
  const [content, setContent] = useState("");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useKBDocumentSync(() => {
    if (onDocumentChange) {
      onDocumentChange();
    }
  });

  useEffect(() => {
    setMode("source");
    setContent(document?.content || "");
    setWordCount((document?.content || "").replace(/<[^>]+>/g, "").length);
  }, [document?.id]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleSave = (nextContent: string) => {
    if (!document) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        await onUpdate({
          ...document,
          content: nextContent,
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
              <li>• Markdown 源码编辑与渲染预览</li>
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
      <EditorToolbar
        mode={mode}
        onModeChange={setMode}
        isSaving={isSaving}
        lastSaved={lastSaved}
        wordCount={wordCount}
      />

      <div className="px-8 pt-8 pb-4">
        <input
          type="text"
          value={document.title}
          onChange={(e) => {
            void onUpdate({
              ...document,
              title: e.target.value,
            });
          }}
          className="text-4xl font-bold w-full bg-transparent border-none outline-none placeholder:text-muted-foreground"
          placeholder="无标题"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {mode === "source" ? (
          <textarea
            aria-label="Markdown source"
            value={content}
            onChange={(event) => {
              const nextContent = event.target.value;
              setContent(nextContent);
              setWordCount(nextContent.length);
              handleSave(nextContent);
            }}
            className="min-h-full w-full resize-none rounded-xl border border-border bg-background p-6 font-mono text-sm leading-6 outline-none focus:ring-2 focus:ring-primary/20"
          />
        ) : (
          <MarkdownRenderer content={content} className="prose prose-sm sm:prose lg:prose-lg max-w-none" />
        )}
      </div>
    </div>
  );
}

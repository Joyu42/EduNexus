"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { EditorToolbar } from "./editor-toolbar";
import { KBMarkdownPreview } from "./kb-markdown-preview";
import type { KBDocument } from "@/lib/client/kb-storage";
import { useKBDocumentSync } from "@/lib/sync";
import type { SaveStatus } from "@/lib/hooks/use-auto-save";

interface KBEditorProps {
  document: KBDocument | null;
  onUpdate: (doc: KBDocument) => Promise<void>;
  onDocumentChange?: () => void;
  onDraftChange?: (draft: { title: string; content: string }) => void;
  mode?: "source" | "render";
  onModeChange?: (mode: "source" | "render") => void;
}

export function KBEditor({
  document,
  onUpdate,
  onDocumentChange,
  onDraftChange,
  mode: controlledMode,
  onModeChange,
}: KBEditorProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(document ? "saved" : "idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<Error | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [internalMode, setInternalMode] = useState<"source" | "render">("source");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const draftRef = useRef({ title: "", content: "" });
  const mode = controlledMode ?? internalMode;
  const setMode = onModeChange ?? setInternalMode;

  useKBDocumentSync(() => {
    if (onDocumentChange) {
      onDocumentChange();
    }
  });

  useEffect(() => {
    setMode("source");
    const nextTitle = document?.title || "";
    const nextContent = document?.content || "";
    setTitle(nextTitle);
    setContent(nextContent);
    setCharCount(nextContent.replace(/<[^>]+>/g, "").length);
    setLastSaved(document?.updatedAt || null);
    setSaveStatus(document ? "saved" : "idle");
    setSaveError(null);
    draftRef.current = { title: nextTitle, content: nextContent };
    pendingSaveRef.current = false;
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, [document?.id]);

  useEffect(() => {
    draftRef.current = { title, content };
    onDraftChange?.({ title, content });
  }, [title, content]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const queueSave = useCallback(() => {
    if (!document) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      saveTimeoutRef.current = null;

      if (isSavingRef.current) {
        pendingSaveRef.current = true;
        return;
      }

      isSavingRef.current = true;
      pendingSaveRef.current = false;
      setSaveStatus("saving");
      setSaveError(null);
      try {
        await onUpdate({
          ...document,
          title: draftRef.current.title,
          content: draftRef.current.content,
          updatedAt: new Date(),
        });
        setLastSaved(new Date());
        setSaveStatus("saved");
      } catch (error) {
        const nextError = error instanceof Error ? error : new Error(String(error));
        console.error("Failed to save document:", nextError);
        setSaveStatus("error");
        setSaveError(nextError);
      } finally {
        isSavingRef.current = false;

        if (pendingSaveRef.current && !saveTimeoutRef.current) {
          pendingSaveRef.current = false;
          queueSave();
        }
      }
    }, 2000);
  }, [document, onUpdate]);

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
          status={saveStatus}
          lastSaved={lastSaved}
          error={saveError}
          wordCount={charCount}
        />

      <div className="px-8 pt-8 pb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => {
            const nextTitle = e.target.value;
            setTitle(nextTitle);
            draftRef.current = { ...draftRef.current, title: nextTitle };
            setSaveStatus("idle");
            setSaveError(null);
            queueSave();
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
              setCharCount(nextContent.length);
              draftRef.current = { ...draftRef.current, content: nextContent };
              setSaveStatus("idle");
              setSaveError(null);
              queueSave();
            }}
            className="min-h-full w-full resize-none rounded-xl border border-border bg-background p-6 font-mono text-sm leading-6 outline-none focus:ring-2 focus:ring-primary/20"
          />
        ) : (
            <KBMarkdownPreview content={content} className="prose prose-sm sm:prose lg:prose-lg max-w-none" />
          )}
        </div>
      </div>
  );
}

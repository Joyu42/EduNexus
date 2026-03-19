"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import type { CollabCursor, CollabOperation } from "@/lib/collab/collab-types";

interface CollabEditorProps {
  sessionId: string;
  initialContent: string;
  language?: string;
  readOnly?: boolean;
  onEdit?: (operation: CollabOperation) => void;
  onCursorChange?: (position: { line: number; column: number }) => void;
  cursors?: CollabCursor[];
}

export function CollabEditor({
  sessionId,
  initialContent,
  language = "markdown",
  readOnly = false,
  onEdit,
  onCursorChange,
  cursors = [],
}: CollabEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [content, setContent] = useState(initialContent);
  const decorationsRef = useRef<string[]>([]);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  // 渲染其他用户的光标
  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const newDecorations: editor.IModelDeltaDecoration[] = [];

    cursors.forEach((cursor) => {
      const { position, color, userName } = cursor;

      // 光标装饰
      newDecorations.push({
        range: {
          startLineNumber: position.line + 1,
          startColumn: position.column + 1,
          endLineNumber: position.line + 1,
          endColumn: position.column + 1,
        },
        options: {
          className: "collab-cursor",
          stickiness: 1,
          beforeContentClassName: "collab-cursor-label",
          glyphMarginClassName: "collab-cursor-glyph",
          glyphMarginHoverMessage: { value: userName },
        },
      });

      // 选区装饰
      if (cursor.selection) {
        newDecorations.push({
          range: {
            startLineNumber: cursor.selection.start.line + 1,
            startColumn: cursor.selection.start.column + 1,
            endLineNumber: cursor.selection.end.line + 1,
            endColumn: cursor.selection.end.column + 1,
          },
          options: {
            className: "collab-selection",
            inlineClassName: `collab-selection-inline`,
          },
        });
      }
    });

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
  }, [cursors]);

  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // 监听内容变化
    editor.onDidChangeModelContent((e) => {
      if (readOnly) return;

      const model = editor.getModel();
      if (!model) return;

      e.changes.forEach((change) => {
        const operation: CollabOperation = {
          type: change.text ? "insert" : "delete",
          position: {
            line: change.range.startLineNumber - 1,
            column: change.range.startColumn - 1,
          },
          content: change.text || undefined,
          length: change.rangeLength || undefined,
          userId: "current_user",
          timestamp: new Date().toISOString(),
        };

        onEdit?.(operation);
      });

      setContent(model.getValue());
    });

    // 监听光标位置变化
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange?.({
        line: e.position.lineNumber - 1,
        column: e.position.column - 1,
      });
    });
  };

  return (
    <div className="h-full w-full relative">
      <Editor
        height="100%"
        language={language}
        value={content}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: "on",
          theme: "vs-dark",
        }}
      />
      <style jsx global>{`
        .collab-cursor {
          border-left: 2px solid var(--cursor-color, #4ecdc4);
          position: relative;
        }
        .collab-cursor-label::before {
          content: attr(data-user);
          position: absolute;
          top: -20px;
          left: 0;
          background: var(--cursor-color, #4ecdc4);
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
          white-space: nowrap;
          z-index: 10;
        }
        .collab-selection {
          background: var(--selection-color, rgba(78, 205, 196, 0.2));
        }
      `}</style>
    </div>
  );
}

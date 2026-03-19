"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import { useEffect, useState } from "react";
import { TiptapToolbar } from "./tiptap-toolbar";
import { SlashCommandMenu } from "./slash-command-menu";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

// 创建 lowlight 实例
const lowlight = createLowlight(common);

// 斜杠命令扩展
const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("slashCommand"),
        props: {
          handleKeyDown: (view, event) => {
            if (event.key === "/") {
              // 触发斜杠命令菜单
              const { state } = view;
              const { selection } = state;
              const { from } = selection;
              const textBefore = state.doc.textBetween(
                Math.max(0, from - 1),
                from,
                "\n"
              );

              // 只在行首或空格后触发
              if (textBefore === "" || textBefore === " ") {
                return false;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});

type TiptapEditorProps = {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editable?: boolean;
};

export function TiptapEditor({
  content,
  onChange,
  placeholder = "开始写作...",
  editable = true,
}: TiptapEditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashMenuPosition, setSlashMenuPosition] = useState({ x: 0, y: 0 });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // 使用 CodeBlockLowlight 替代
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-primary underline hover:text-primary/80",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg shadow-md",
        },
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: "border-collapse table-auto w-full border-border",
        },
      }),
      TableRow,
      TableCell.configure({
        HTMLAttributes: {
          class: "border border-border px-4 py-2",
        },
      }),
      TableHeader.configure({
        HTMLAttributes: {
          class: "border border-border px-4 py-2 bg-muted/50 font-bold",
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: "list-none pl-0",
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: "flex items-start gap-2",
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: "bg-muted text-foreground rounded-lg p-4 font-mono text-sm",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      SlashCommand,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert focus:outline-none max-w-none p-6 min-h-[500px]",
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const handleSlashCommand = (command: string) => {
    if (!editor) return;

    switch (command) {
      case "heading1":
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case "heading2":
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case "heading3":
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case "bulletList":
        editor.chain().focus().toggleBulletList().run();
        break;
      case "orderedList":
        editor.chain().focus().toggleOrderedList().run();
        break;
      case "taskList":
        editor.chain().focus().toggleTaskList().run();
        break;
      case "codeBlock":
        editor.chain().focus().toggleCodeBlock().run();
        break;
      case "blockquote":
        editor.chain().focus().toggleBlockquote().run();
        break;
      case "table":
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run();
        break;
      case "horizontalRule":
        editor.chain().focus().setHorizontalRule().run();
        break;
    }

    setShowSlashMenu(false);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="relative border border-border rounded-xl bg-card/50 overflow-hidden shadow-sm backdrop-blur-sm">
      <TiptapToolbar editor={editor} />
      <div className="scrollbar-thin overflow-y-auto max-h-[calc(100vh-160px)]">
        <EditorContent editor={editor} />
      </div>
      {showSlashMenu && (
        <SlashCommandMenu
          position={slashMenuPosition}
          onSelect={handleSlashCommand}
          onClose={() => setShowSlashMenu(false)}
        />
      )}
    </div>
  );
}

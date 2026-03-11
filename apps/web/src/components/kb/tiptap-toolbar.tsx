"use client";

import { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Link2,
  List,
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Table,
  CheckSquare,
  Minus,
  Undo,
  Redo,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";

type TiptapToolbarProps = {
  editor: Editor;
};

export function TiptapToolbar({ editor }: TiptapToolbarProps) {
  const tools = [
    {
      group: "历史",
      items: [
        {
          icon: Undo,
          label: "撤销",
          action: () => editor.chain().focus().undo().run(),
          shortcut: "Ctrl+Z",
          disabled: !editor.can().undo(),
          isActive: false,
        },
        {
          icon: Redo,
          label: "重做",
          action: () => editor.chain().focus().redo().run(),
          shortcut: "Ctrl+Y",
          disabled: !editor.can().redo(),
          isActive: false,
        },
      ],
    },
    {
      group: "标题",
      items: [
        {
          icon: Heading1,
          label: "一级标题",
          action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
          isActive: editor.isActive("heading", { level: 1 }),
          disabled: false,
          shortcut: undefined,
        },
        {
          icon: Heading2,
          label: "二级标题",
          action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          isActive: editor.isActive("heading", { level: 2 }),
          disabled: false,
          shortcut: undefined,
        },
        {
          icon: Heading3,
          label: "三级标题",
          action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          isActive: editor.isActive("heading", { level: 3 }),
          disabled: false,
          shortcut: undefined,
        },
      ],
    },
    {
      group: "格式",
      items: [
        {
          icon: Bold,
          label: "粗体",
          action: () => editor.chain().focus().toggleBold().run(),
          shortcut: "Ctrl+B",
          isActive: editor.isActive("bold"),
          disabled: false,
        },
        {
          icon: Italic,
          label: "斜体",
          action: () => editor.chain().focus().toggleItalic().run(),
          shortcut: "Ctrl+I",
          isActive: editor.isActive("italic"),
          disabled: false,
        },
        {
          icon: Strikethrough,
          label: "删除线",
          action: () => editor.chain().focus().toggleStrike().run(),
          isActive: editor.isActive("strike"),
          disabled: false,
          shortcut: undefined,
        },
        {
          icon: Code,
          label: "行内代码",
          action: () => editor.chain().focus().toggleCode().run(),
          shortcut: "Ctrl+E",
          isActive: editor.isActive("code"),
          disabled: false,
        },
      ],
    },
    {
      group: "列表",
      items: [
        {
          icon: List,
          label: "无序列表",
          action: () => editor.chain().focus().toggleBulletList().run(),
          isActive: editor.isActive("bulletList"),
          disabled: false,
          shortcut: undefined,
        },
        {
          icon: ListOrdered,
          label: "有序列表",
          action: () => editor.chain().focus().toggleOrderedList().run(),
          isActive: editor.isActive("orderedList"),
          disabled: false,
          shortcut: undefined,
        },
        {
          icon: CheckSquare,
          label: "任务列表",
          action: () => editor.chain().focus().toggleTaskList().run(),
          isActive: editor.isActive("taskList"),
          disabled: false,
          shortcut: undefined,
        },
      ],
    },
    {
      group: "插入",
      items: [
        {
          icon: Link2,
          label: "链接",
          action: () => {
            const url = window.prompt("输入链接地址:");
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          },
          isActive: editor.isActive("link"),
          disabled: false,
          shortcut: undefined,
        },
        {
          icon: Image,
          label: "图片",
          action: () => {
            const url = window.prompt("输入图片地址:");
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          },
          isActive: false,
          disabled: false,
          shortcut: undefined,
        },
        {
          icon: Quote,
          label: "引用",
          action: () => editor.chain().focus().toggleBlockquote().run(),
          isActive: editor.isActive("blockquote"),
          disabled: false,
          shortcut: undefined,
        },
        {
          icon: Code,
          label: "代码块",
          action: () => editor.chain().focus().toggleCodeBlock().run(),
          isActive: editor.isActive("codeBlock"),
          disabled: false,
          shortcut: undefined,
        },
        {
          icon: Table,
          label: "表格",
          action: () =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run(),
          isActive: false,
          disabled: false,
          shortcut: undefined,
        },
        {
          icon: Minus,
          label: "分隔线",
          action: () => editor.chain().focus().setHorizontalRule().run(),
          isActive: false,
          disabled: false,
          shortcut: undefined,
        },
      ],
    },
  ];

  return (
    <div className="flex items-center gap-1 p-2 bg-amber-50/50 border-b border-amber-200 flex-wrap">
      <TooltipProvider>
        {tools.map((group, groupIndex) => (
          <div key={groupIndex} className="flex items-center gap-1">
            {group.items.map((tool, toolIndex) => (
              <Tooltip key={toolIndex}>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={tool.isActive ? "default" : "ghost"}
                    onClick={tool.action}
                    disabled={tool.disabled}
                    className={`h-8 w-8 p-0 ${
                      tool.isActive
                        ? "bg-amber-200 hover:bg-amber-300"
                        : "hover:bg-amber-100"
                    }`}
                  >
                    <tool.icon className="w-4 h-4 text-amber-700" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {tool.label}
                    {tool.shortcut && (
                      <span className="ml-2 text-amber-500">
                        {tool.shortcut}
                      </span>
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
            {groupIndex < tools.length - 1 && (
              <Separator
                orientation="vertical"
                className="h-6 mx-1 bg-amber-200"
              />
            )}
          </div>
        ))}
      </TooltipProvider>
    </div>
  );
}

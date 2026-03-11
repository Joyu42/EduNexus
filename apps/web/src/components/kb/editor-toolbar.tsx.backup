"use client";

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
  AlignLeft,
} from "lucide-react";

type EditorToolbarProps = {
  onInsert: (text: string) => void;
  onFormat: (format: string) => void;
  disabled?: boolean;
};

export function EditorToolbar({ onInsert, onFormat, disabled }: EditorToolbarProps) {
  const tools = [
    {
      group: "标题",
      items: [
        { icon: Heading1, label: "一级标题", action: () => onInsert("# ") },
        { icon: Heading2, label: "二级标题", action: () => onInsert("## ") },
        { icon: Heading3, label: "三级标题", action: () => onInsert("### ") },
      ],
    },
    {
      group: "格式",
      items: [
        { icon: Bold, label: "粗体", action: () => onInsert("****"), shortcut: "Ctrl+B" },
        { icon: Italic, label: "斜体", action: () => onInsert("**"), shortcut: "Ctrl+I" },
        {
          icon: Strikethrough,
          label: "删除线",
          action: () => onInsert("~~~~"),
        },
        { icon: Code, label: "行内代码", action: () => onInsert("``") },
      ],
    },
    {
      group: "列表",
      items: [
        { icon: List, label: "无序列表", action: () => onInsert("- ") },
        { icon: ListOrdered, label: "有序列表", action: () => onInsert("1. ") },
        { icon: CheckSquare, label: "任务列表", action: () => onInsert("- [ ] ") },
      ],
    },
    {
      group: "插入",
      items: [
        { icon: Link2, label: "链接", action: () => onInsert("[](url)") },
        { icon: Image, label: "图片", action: () => onInsert("![](url)") },
        { icon: Quote, label: "引用", action: () => onInsert("> ") },
        { icon: Minus, label: "分隔线", action: () => onInsert("\n---\n") },
        {
          icon: Code,
          label: "代码块",
          action: () => onInsert("```\n\n```"),
        },
        {
          icon: Table,
          label: "表格",
          action: () =>
            onInsert(
              "\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n"
            ),
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
                    variant="ghost"
                    onClick={tool.action}
                    disabled={disabled}
                    className="h-8 w-8 p-0 hover:bg-amber-100"
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
              <Separator orientation="vertical" className="h-6 mx-1 bg-amber-200" />
            )}
          </div>
        ))}
      </TooltipProvider>
    </div>
  );
}

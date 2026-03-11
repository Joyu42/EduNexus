"use client";

import { useState, useEffect, useRef } from "react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Table,
  Minus,
  Image,
  Link2,
} from "lucide-react";
import { Card } from "@/components/ui/card";

type SlashCommand = {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
};

const commands: SlashCommand[] = [
  {
    id: "heading1",
    label: "一级标题",
    description: "大标题",
    icon: Heading1,
    keywords: ["h1", "heading", "标题", "一级"],
  },
  {
    id: "heading2",
    label: "二级标题",
    description: "中标题",
    icon: Heading2,
    keywords: ["h2", "heading", "标题", "二级"],
  },
  {
    id: "heading3",
    label: "三级标题",
    description: "小标题",
    icon: Heading3,
    keywords: ["h3", "heading", "标题", "三级"],
  },
  {
    id: "bulletList",
    label: "无序列表",
    description: "创建无序列表",
    icon: List,
    keywords: ["list", "bullet", "列表", "无序"],
  },
  {
    id: "orderedList",
    label: "有序列表",
    description: "创建有序列表",
    icon: ListOrdered,
    keywords: ["list", "ordered", "numbered", "列表", "有序", "数字"],
  },
  {
    id: "taskList",
    label: "任务列表",
    description: "创建待办事项",
    icon: CheckSquare,
    keywords: ["task", "todo", "checkbox", "任务", "待办"],
  },
  {
    id: "codeBlock",
    label: "代码块",
    description: "插入代码块",
    icon: Code,
    keywords: ["code", "代码"],
  },
  {
    id: "blockquote",
    label: "引用",
    description: "插入引用块",
    icon: Quote,
    keywords: ["quote", "引用"],
  },
  {
    id: "table",
    label: "表格",
    description: "插入表格",
    icon: Table,
    keywords: ["table", "表格"],
  },
  {
    id: "horizontalRule",
    label: "分隔线",
    description: "插入水平分隔线",
    icon: Minus,
    keywords: ["hr", "line", "分隔", "横线"],
  },
];

type SlashCommandMenuProps = {
  position: { x: number; y: number };
  onSelect: (command: string) => void;
  onClose: () => void;
  query?: string;
};

export function SlashCommandMenu({
  position,
  onSelect,
  onClose,
  query = "",
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState(query);
  const menuRef = useRef<HTMLDivElement>(null);

  const filteredCommands = commands.filter((cmd) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredCommands.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].id);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, filteredCommands, onSelect, onClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <Card
      ref={menuRef}
      className="absolute z-50 w-80 max-h-96 overflow-y-auto shadow-lg"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <div className="p-2">
        <input
          type="text"
          placeholder="搜索命令..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
          autoFocus
        />
      </div>
      <div className="py-1">
        {filteredCommands.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-500 text-center">
            未找到匹配的命令
          </div>
        ) : (
          filteredCommands.map((cmd, index) => (
            <button
              key={cmd.id}
              onClick={() => onSelect(cmd.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-amber-50 transition-colors ${
                index === selectedIndex ? "bg-amber-100" : ""
              }`}
            >
              <cmd.icon className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">
                  {cmd.label}
                </div>
                <div className="text-xs text-gray-500">{cmd.description}</div>
              </div>
            </button>
          ))
        )}
      </div>
    </Card>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Command, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

type Shortcut = {
  keys: string[];
  description: string;
  category: string;
};

const shortcuts: Shortcut[] = [
  // 全局快捷键
  {
    keys: ["Ctrl", "K"],
    description: "打开命令面板",
    category: "全局",
  },
  {
    keys: ["Ctrl", "N"],
    description: "新建文档",
    category: "全局",
  },
  {
    keys: ["Ctrl", "S"],
    description: "保存文档",
    category: "全局",
  },
  {
    keys: ["Ctrl", "F"],
    description: "搜索",
    category: "全局",
  },
  {
    keys: ["Ctrl", "P"],
    description: "快速打开文档",
    category: "全局",
  },
  {
    keys: ["Ctrl", "/"],
    description: "显示快捷键",
    category: "全局",
  },
  {
    keys: ["Esc"],
    description: "关闭对话框/取消",
    category: "全局",
  },

  // 编辑器快捷键
  {
    keys: ["Ctrl", "B"],
    description: "粗体",
    category: "编辑器",
  },
  {
    keys: ["Ctrl", "I"],
    description: "斜体",
    category: "编辑器",
  },
  {
    keys: ["Ctrl", "E"],
    description: "行内代码",
    category: "编辑器",
  },
  {
    keys: ["Ctrl", "Z"],
    description: "撤销",
    category: "编辑器",
  },
  {
    keys: ["Ctrl", "Y"],
    description: "重做",
    category: "编辑器",
  },
  {
    keys: ["Ctrl", "Shift", "K"],
    description: "删除当前行",
    category: "编辑器",
  },
  {
    keys: ["/"],
    description: "斜杠命令",
    category: "编辑器",
  },

  // 导航快捷键
  {
    keys: ["Ctrl", "1"],
    description: "切换到列表视图",
    category: "导航",
  },
  {
    keys: ["Ctrl", "2"],
    description: "切换到卡片视图",
    category: "导航",
  },
  {
    keys: ["Ctrl", "3"],
    description: "切换到时间线视图",
    category: "导航",
  },
  {
    keys: ["Ctrl", "4"],
    description: "切换到看板视图",
    category: "导航",
  },
  {
    keys: ["↑", "↓"],
    description: "在文档列表中导航",
    category: "导航",
  },
  {
    keys: ["Enter"],
    description: "打开选中的文档",
    category: "导航",
  },

  // AI 功能快捷键
  {
    keys: ["Ctrl", "Shift", "A"],
    description: "打开 AI 助手",
    category: "AI 功能",
  },
  {
    keys: ["Ctrl", "Shift", "S"],
    description: "生成摘要",
    category: "AI 功能",
  },
  {
    keys: ["Ctrl", "Shift", "M"],
    description: "生成思维导图",
    category: "AI 功能",
  },
];

type ShortcutsPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShortcutsPanel({ open, onOpenChange }: ShortcutsPanelProps) {
  const categories = Array.from(new Set(shortcuts.map((s) => s.category)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Command className="w-5 h-5" />
            键盘快捷键
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {categories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {category}
              </h3>
              <div className="space-y-2">
                {shortcuts
                  .filter((s) => s.category === category)
                  .map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                    >
                      <span className="text-sm text-gray-700">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center">
                            <Badge
                              variant="outline"
                              className="font-mono text-xs px-2 py-1"
                            >
                              {key}
                            </Badge>
                            {keyIndex < shortcut.keys.length - 1 && (
                              <span className="mx-1 text-gray-400">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-800">
            <strong>提示:</strong> 按 <Badge variant="outline" className="mx-1">Ctrl</Badge> +
            <Badge variant="outline" className="mx-1">/</Badge> 随时打开此面板
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 快捷键 Hook
 */
export function useShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      // 构建快捷键字符串
      const parts: string[] = [];
      if (ctrl) parts.push("ctrl");
      if (shift) parts.push("shift");
      if (alt) parts.push("alt");
      parts.push(key);

      const shortcut = parts.join("+");

      // 执行对应的处理函数
      if (handlers[shortcut]) {
        e.preventDefault();
        handlers[shortcut]();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handlers]);
}

"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Wand2,
  Languages,
  CheckCircle2,
  FileText,
  Zap,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FloatingAction = {
  id: string;
  icon: React.ReactNode;
  label: string;
  action: string;
  prompt: (text: string) => string;
};

type AIFloatingToolbarProps = {
  selectedText: string;
  position: { top: number; left: number };
  onAction: (action: string, prompt: string) => void;
  onClose: () => void;
};

export function AIFloatingToolbar({
  selectedText,
  position,
  onAction,
  onClose,
}: AIFloatingToolbarProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 延迟显示以实现动画效果
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const actions: FloatingAction[] = [
    {
      id: "continue",
      icon: <Sparkles className="w-3.5 h-3.5" />,
      label: "续写",
      action: "continue",
      prompt: (text) => `请根据以下内容继续写作：\n\n${text}`,
    },
    {
      id: "rewrite",
      icon: <Wand2 className="w-3.5 h-3.5" />,
      label: "改写",
      action: "rewrite",
      prompt: (text) => `请用不同的方式改写以下内容：\n\n${text}`,
    },
    {
      id: "polish",
      icon: <Sparkles className="w-3.5 h-3.5" />,
      label: "润色",
      action: "polish",
      prompt: (text) => `请润色以下文字，提升语言质量：\n\n${text}`,
    },
    {
      id: "translate",
      icon: <Languages className="w-3.5 h-3.5" />,
      label: "翻译",
      action: "translate",
      prompt: (text) => `请将以下内容翻译成英文：\n\n${text}`,
    },
    {
      id: "summarize",
      icon: <FileText className="w-3.5 h-3.5" />,
      label: "总结",
      action: "summarize",
      prompt: (text) => `请总结以下内容的核心要点：\n\n${text}`,
    },
    {
      id: "expand",
      icon: <Zap className="w-3.5 h-3.5" />,
      label: "扩展",
      action: "expand",
      prompt: (text) => `请扩展以下内容，增加更多细节：\n\n${text}`,
    },
  ];

  const handleAction = (action: FloatingAction) => {
    onAction(action.action, action.prompt(selectedText));
  };

  return (
    <div
      className={cn(
        "fixed z-50 transition-all duration-200",
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-2"
      )}
      style={{
        top: `${position.top - 60}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="bg-white rounded-lg shadow-2xl border border-purple-200 p-2 flex items-center gap-1">
        {/* AI 标识 */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-purple-50 to-pink-50 rounded-md mr-1">
          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-medium text-purple-900">AI 助手</span>
        </div>

        {/* 操作按钮 */}
        {actions.map((action) => (
          <Button
            key={action.id}
            size="sm"
            variant="ghost"
            onClick={() => handleAction(action)}
            className="h-8 px-3 text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-50"
          >
            {action.icon}
            <span className="ml-1.5">{action.label}</span>
          </Button>
        ))}

        {/* 关闭按钮 */}
        <div className="w-px h-6 bg-purple-200 mx-1" />
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="h-8 w-8 p-0 text-purple-600 hover:text-purple-900 hover:bg-purple-50"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* 箭头 */}
      <div className="absolute left-4 -bottom-2 w-4 h-4 bg-white border-r border-b border-purple-200 transform rotate-45" />
    </div>
  );
}

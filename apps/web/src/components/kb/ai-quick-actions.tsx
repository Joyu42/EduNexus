"use client";

import {
  Sparkles,
  FileText,
  Wand2,
  Lightbulb,
  Languages,
  ListChecks,
  Zap,
  BookOpen,
  Mail,
  FileEdit,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ActionType =
  | "continue"
  | "rewrite"
  | "polish"
  | "fix"
  | "summarize"
  | "expand"
  | "outline"
  | "brainstorm"
  | "explain"
  | "translate"
  | "qa";

type QuickAction = {
  id: ActionType;
  icon: React.ReactNode;
  label: string;
  prompt: string;
  color: string;
  description: string;
};

type AIQuickActionsProps = {
  onAction: (action: ActionType, prompt: string) => void;
  selectedText?: string;
  hasMessages: boolean;
};

export function AIQuickActions({
  onAction,
  selectedText,
  hasMessages,
}: AIQuickActionsProps) {
  const actions: QuickAction[] = [
    {
      id: "continue",
      icon: <Sparkles className="w-4 h-4" />,
      label: "续写",
      prompt: selectedText
        ? `请根据以下内容继续写作：\n\n${selectedText}`
        : "请根据文档内容继续写作",
      color: "purple",
      description: "根据上下文继续写作",
    },
    {
      id: "rewrite",
      icon: <Wand2 className="w-4 h-4" />,
      label: "改写",
      prompt: selectedText
        ? `请用不同的方式改写以下内容：\n\n${selectedText}`
        : "请帮我改写这段内容",
      color: "blue",
      description: "用不同方式表达",
    },
    {
      id: "polish",
      icon: <Sparkles className="w-4 h-4" />,
      label: "润色",
      prompt: selectedText
        ? `请润色以下文字，提升语言质量：\n\n${selectedText}`
        : "请帮我润色这段文字",
      color: "pink",
      description: "提升文字质量",
    },
    {
      id: "fix",
      icon: <CheckCircle2 className="w-4 h-4" />,
      label: "修正",
      prompt: selectedText
        ? `请检查并修正以下内容的语法和拼写错误：\n\n${selectedText}`
        : "请检查文档的语法和拼写错误",
      color: "green",
      description: "语法和拼写检查",
    },
    {
      id: "summarize",
      icon: <FileText className="w-4 h-4" />,
      label: "总结",
      prompt: selectedText
        ? `请总结以下内容的核心要点：\n\n${selectedText}`
        : "请为这篇文档生成摘要",
      color: "indigo",
      description: "提取核心要点",
    },
    {
      id: "expand",
      icon: <Zap className="w-4 h-4" />,
      label: "扩展",
      prompt: selectedText
        ? `请扩展以下内容，增加更多细节和例子：\n\n${selectedText}`
        : "请帮我扩展这部分内容",
      color: "orange",
      description: "增加细节和例子",
    },
    {
      id: "outline",
      icon: <ListChecks className="w-4 h-4" />,
      label: "大纲",
      prompt: selectedText
        ? `请为以下内容生成结构化大纲：\n\n${selectedText}`
        : "请为文档生成结构化大纲",
      color: "cyan",
      description: "生成结构化大纲",
    },
    {
      id: "brainstorm",
      icon: <Lightbulb className="w-4 h-4" />,
      label: "头脑风暴",
      prompt: selectedText
        ? `请围绕以下主题进行头脑风暴：\n\n${selectedText}`
        : "请帮我进行头脑风暴，生成创意想法",
      color: "yellow",
      description: "生成创意想法",
    },
    {
      id: "explain",
      icon: <BookOpen className="w-4 h-4" />,
      label: "解释",
      prompt: selectedText
        ? `请用通俗易懂的方式解释：\n\n${selectedText}`
        : "请解释这个概念",
      color: "teal",
      description: "通俗易懂的解释",
    },
    {
      id: "translate",
      icon: <Languages className="w-4 h-4" />,
      label: "翻译",
      prompt: selectedText
        ? `请将以下内容翻译成英文：\n\n${selectedText}`
        : "请翻译这段文字",
      color: "violet",
      description: "多语言翻译",
    },
  ];

  // 如果已有对话，只显示精简版
  if (hasMessages) {
    return null;
  }

  const getColorClasses = (color: string) => {
    const colorMap: Record<string, string> = {
      purple: "bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700 hover:border-purple-300",
      blue: "bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700 hover:border-blue-300",
      pink: "bg-pink-50 hover:bg-pink-100 border-pink-200 text-pink-700 hover:border-pink-300",
      green: "bg-green-50 hover:bg-green-100 border-green-200 text-green-700 hover:border-green-300",
      indigo: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700 hover:border-indigo-300",
      orange: "bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 hover:border-orange-300",
      cyan: "bg-cyan-50 hover:bg-cyan-100 border-cyan-200 text-cyan-700 hover:border-cyan-300",
      yellow: "bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700 hover:border-yellow-300",
      teal: "bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-700 hover:border-teal-300",
      violet: "bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-700 hover:border-violet-300",
    };
    return colorMap[color] || colorMap.purple;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-purple-700">快速操作</p>
        {selectedText && (
          <p className="text-xs text-purple-600">
            已选择 {selectedText.length} 个字符
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.id, action.prompt)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-lg border",
              "transition-all duration-200",
              "hover:scale-105 hover:shadow-md",
              "group",
              getColorClasses(action.color)
            )}
            title={action.description}
          >
            <div className="transition-transform group-hover:scale-110">
              {action.icon}
            </div>
            <span className="text-xs font-medium">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

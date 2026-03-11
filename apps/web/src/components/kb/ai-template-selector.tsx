"use client";

import { useState } from "react";
import {
  FileText,
  Mail,
  BookOpen,
  ClipboardList,
  Briefcase,
  GraduationCap,
  Newspaper,
  MessageSquare,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Template = {
  id: string;
  category: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  prompt: string;
  action: string;
};

type AITemplateSelectorProps = {
  onSelectTemplate: (template: Template) => void;
};

export function AITemplateSelector({
  onSelectTemplate,
}: AITemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const templates: Template[] = [
    // 写作辅助
    {
      id: "meeting-notes",
      category: "写作辅助",
      icon: <ClipboardList className="w-5 h-5" />,
      title: "会议纪要",
      description: "生成结构化的会议记录",
      prompt: "请帮我生成一份会议纪要模板，包括：会议主题、参会人员、讨论要点、决策事项、待办任务等部分。",
      action: "template",
    },
    {
      id: "email-draft",
      category: "写作辅助",
      icon: <Mail className="w-5 h-5" />,
      title: "邮件草稿",
      description: "撰写专业的商务邮件",
      prompt: "请帮我撰写一封专业的商务邮件，包括：称呼、正文、结尾等部分。请根据我的需求调整内容。",
      action: "template",
    },
    {
      id: "report-template",
      category: "写作辅助",
      icon: <FileText className="w-5 h-5" />,
      title: "报告模板",
      description: "创建专业的工作报告",
      prompt: "请帮我生成一份工作报告模板，包括：摘要、背景、分析、结论、建议等部分。",
      action: "template",
    },
    {
      id: "study-notes",
      category: "写作辅助",
      icon: <BookOpen className="w-5 h-5" />,
      title: "学习笔记",
      description: "整理结构化的学习笔记",
      prompt: "请帮我生成一份学习笔记模板，包括：主题、核心概念、详细说明、示例、总结等部分。",
      action: "template",
    },

    // 内容生成
    {
      id: "article-outline",
      category: "内容生成",
      icon: <Newspaper className="w-5 h-5" />,
      title: "文章大纲",
      description: "生成文章结构框架",
      prompt: "请根据主题生成一个详细的文章大纲，包括引言、主体部分（3-5个要点）、结论等。",
      action: "outline",
    },
    {
      id: "blog-post",
      category: "内容生成",
      icon: <MessageSquare className="w-5 h-5" />,
      title: "博客文章",
      description: "撰写吸引人的博客内容",
      prompt: "请帮我撰写一篇博客文章，要求：标题吸引人、内容有价值、结构清晰、语言生动。",
      action: "generate",
    },
    {
      id: "tutorial",
      category: "内容生成",
      icon: <GraduationCap className="w-5 h-5" />,
      title: "教程指南",
      description: "创建步骤清晰的教程",
      prompt: "请帮我创建一份教程指南，包括：目标、前置知识、详细步骤、注意事项、总结等。",
      action: "generate",
    },
    {
      id: "case-study",
      category: "内容生成",
      icon: <Briefcase className="w-5 h-5" />,
      title: "案例分析",
      description: "撰写深入的案例研究",
      prompt: "请帮我撰写一份案例分析，包括：背景介绍、问题分析、解决方案、效果评估、经验总结等。",
      action: "generate",
    },

    // 学习辅助
    {
      id: "concept-explanation",
      category: "学习辅助",
      icon: <BookOpen className="w-5 h-5" />,
      title: "概念解释",
      description: "深入浅出地解释概念",
      prompt: "请用通俗易懂的语言解释这个概念，包括：定义、原理、应用场景、示例等。",
      action: "explain",
    },
    {
      id: "comparison",
      category: "学习辅助",
      icon: <Search className="w-5 h-5" />,
      title: "对比分析",
      description: "比较不同概念或方法",
      prompt: "请对比分析这些概念或方法，包括：相同点、不同点、优缺点、适用场景等。",
      action: "compare",
    },
    {
      id: "qa-generation",
      category: "学习辅助",
      icon: <MessageSquare className="w-5 h-5" />,
      title: "问答生成",
      description: "生成学习问答题",
      prompt: "请根据内容生成一系列问答题，帮助理解和记忆关键知识点。",
      action: "qa",
    },
    {
      id: "summary-points",
      category: "学习辅助",
      icon: <ClipboardList className="w-5 h-5" />,
      title: "要点总结",
      description: "提取核心知识点",
      prompt: "请提取并总结核心知识点，以清单形式呈现，便于快速复习。",
      action: "summarize",
    },
  ];

  const categories = ["all", ...Array.from(new Set(templates.map((t) => t.category)))];

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      searchQuery === "" ||
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b border-purple-200 bg-white">
        <h3 className="text-sm font-semibold text-purple-900 mb-3">
          写作模板
        </h3>
        <Input
          type="text"
          placeholder="搜索模板..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm border-purple-200 focus:border-purple-400"
        />
      </div>

      {/* 分类标签 */}
      <div className="p-4 border-b border-purple-200 bg-purple-50/30">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                selectedCategory === category
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                  : "bg-white text-purple-700 border border-purple-200 hover:border-purple-300 hover:bg-purple-50"
              )}
            >
              {category === "all" ? "全部" : category}
            </button>
          ))}
        </div>
      </div>

      {/* 模板列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-purple-600">未找到匹配的模板</p>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              className={cn(
                "w-full text-left p-4 rounded-lg border border-purple-200",
                "bg-white hover:bg-purple-50 hover:border-purple-300",
                "transition-all duration-200 hover:shadow-md",
                "group"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0 text-purple-600 group-hover:from-purple-200 group-hover:to-pink-200 transition-all">
                  {template.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-purple-900 mb-1">
                    {template.title}
                  </h4>
                  <p className="text-xs text-purple-600 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="mt-2">
                    <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                      {template.category}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

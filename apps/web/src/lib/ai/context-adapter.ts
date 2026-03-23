/**
 * AI 助手上下文适配器
 * 根据当前页面路由返回不同的功能和提示
 */

import type { KBDocument } from "@/lib/client/kb-storage";

export interface AIContext {
  mode: 'writing' | 'learning' | 'practice' | 'words' | 'general';
  title: string;
  placeholder: string;
  systemPrompt: string;
  quickActions: QuickAction[];
}

export interface QuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

/**
 * 根据路由获取 AI 上下文
 */
export function getAIContext(pathname: string, currentDocument?: KBDocument | null): AIContext {
  // 知识库页面 - 写作辅助
  if (pathname.startsWith('/kb')) {
    const hasDocument = currentDocument && currentDocument.content;
    const documentContext = hasDocument
      ? `\n\n当前文档：《${currentDocument.title}》\n内容：${currentDocument.content.substring(0, 1000)}${currentDocument.content.length > 1000 ? '...' : ''}`
      : '';

    return {
      mode: 'writing',
      title: '写作助手',
      placeholder: hasDocument ? '需要帮助完善你的笔记吗？' : '选择一个文档开始编辑',
      systemPrompt: `你是一个专业的写作助手，帮助用户完善知识笔记、优化表达、补充内容。${documentContext}`,
      quickActions: [
        { id: 'expand', label: '扩展内容', icon: '📝', prompt: '帮我扩展这段内容，添加更多细节和例子' },
        { id: 'summarize', label: '总结要点', icon: '📋', prompt: '帮我总结这段内容的核心要点' },
        { id: 'improve', label: '优化表达', icon: '✨', prompt: '帮我优化这段文字的表达，使其更清晰易懂' },
        { id: 'structure', label: '整理结构', icon: '🗂️', prompt: '帮我整理这段内容的结构，使其更有条理' },
      ],
    };
  }

  // Words 页面 - 英语学习助手
  if (pathname.startsWith('/words')) {
    return {
      mode: 'words',
      title: '单词学习助手',
      placeholder: '想了解进度，或开始 CET4/CET6 学习/复习吗？',
      systemPrompt:
        '你正处于 EduNexus 的 Words 模块，需要结合真实学习进度给出行动建议：\n' +
        '- 当用户询问英语进度、最近学习情况或要求汇报时，务必调用 `query_words_progress`，并引用返回的日期、区间和数据。\n' +
        '- 当用户想开始学习 CET4/CET6 或说“学单词”时，根据对话内容使用 `recommend_words_action`，明确指向 `/words/learn/cet4`、`/words/learn/cet6` 或 `/words`。\n' +
        '- 当用户提到复习或待复习，优先推荐 `/words/review`。\n' +
        '- 任何建议必须引用真实数据或返回的 route，保持语气具体且可执行。',
      quickActions: [
        { id: 'words-progress', label: '汇报我的英语学习进度', icon: '📊', prompt: '向我汇报我的英语学习进度' },
        { id: 'words-cet4', label: '开始学习 CET-4', icon: '📘', prompt: '带我开始学习 CET4 单词' },
        { id: 'words-cet6', label: '开始学习 CET-6', icon: '📙', prompt: '带我开始学习 CET6 单词' },
        { id: 'words-review', label: '进入今日复习', icon: '🔁', prompt: '带我进入今日复习' },
      ],
    };
  }

  // 工作区页面 - 学习辅助
  if (pathname.startsWith('/workspace')) {
    return {
      mode: 'learning',
      title: '学习助手',
      placeholder: '有什么学习问题吗？',
      systemPrompt: '你是一个耐心的学习助手，帮助用户理解概念、解答疑问、提供学习建议。',
      quickActions: [
        { id: 'explain', label: '解释概念', icon: '💡', prompt: '请详细解释这个概念' },
        { id: 'example', label: '举例说明', icon: '📚', prompt: '请给我一些实际的例子来说明' },
        { id: 'compare', label: '对比分析', icon: '⚖️', prompt: '请帮我对比分析这些概念的异同' },
        { id: 'practice', label: '练习建议', icon: '🎯', prompt: '请给我一些练习建议来巩固这个知识点' },
      ],
    };
  }

  // 练习页面 - 答题辅助
  if (pathname.startsWith('/practice') || pathname.includes('/practice')) {
    return {
      mode: 'practice',
      title: '答题助手',
      placeholder: '需要解题思路吗？',
      systemPrompt: '你是一个引导式的答题助手，不直接给出答案，而是引导用户思考和解决问题。',
      quickActions: [
        { id: 'hint', label: '给个提示', icon: '💭', prompt: '给我一个解题提示，但不要直接告诉我答案' },
        { id: 'approach', label: '解题思路', icon: '🧭', prompt: '这道题应该从哪个角度思考？' },
        { id: 'check', label: '检查答案', icon: '✅', prompt: '帮我检查一下我的答案思路是否正确' },
        { id: 'similar', label: '类似题目', icon: '🔄', prompt: '给我一个类似的题目来练习' },
      ],
    };
  }

  // 其他页面 - 通用问答
  return {
    mode: 'general',
    title: 'AI 助手',
    placeholder: '有什么可以帮你的？',
    systemPrompt: '你是一个友好的 AI 助手，帮助用户解答各种问题。',
    quickActions: [
      { id: 'ask', label: '提问', icon: '❓', prompt: '我想问一个问题' },
      { id: 'search', label: '搜索', icon: '🔍', prompt: '帮我搜索相关内容' },
      { id: 'suggest', label: '建议', icon: '💡', prompt: '给我一些建议' },
      { id: 'help', label: '帮助', icon: '🆘', prompt: '我需要帮助' },
    ],
  };
}

/**
 * 获取上下文相关的系统提示
 */
export function getContextualSystemPrompt(context: AIContext, userMessage: string): string {
  return `${context.systemPrompt}

当前模式: ${context.title}
用户消息: ${userMessage}

请根据当前模式提供最合适的帮助。`;
}

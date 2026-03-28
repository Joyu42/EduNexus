/**
 * AI 服务集成示例
 *
 * 展示如何集成真实的 AI 模型（OpenAI、Anthropic、本地模型）
 */

import { AI_CONFIG } from './ai-config';

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/**
 * 调用 OpenAI API
 */
async function callOpenAI(messages: Message[]): Promise<string> {
  const { openai } = AI_CONFIG;

  if (!openai.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openai.apiKey}`,
    },
    body: JSON.stringify({
      model: openai.model,
      messages,
      max_tokens: openai.maxTokens,
      temperature: openai.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 调用 Anthropic Claude API
 */
async function callAnthropic(messages: Message[]): Promise<string> {
  const { anthropic } = AI_CONFIG;

  if (!anthropic.apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  // 提取系统消息和用户消息
  const systemMessage = messages.find((m) => m.role === 'system')?.content || '';
  const conversationMessages = messages.filter((m) => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropic.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: anthropic.model,
      system: systemMessage,
      messages: conversationMessages,
      max_tokens: anthropic.maxTokens,
      temperature: anthropic.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * 调用本地模型（Ollama）
 */
async function callLocalModel(messages: Message[]): Promise<string> {
  const { local } = AI_CONFIG;

  const response = await fetch(`${local.baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: local.model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Local model API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.message.content;
}

/**
 * 调用 ModelScope API
 */
export type ModelScopeConfig = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
};

async function callModelscope(messages: Message[], config?: ModelScopeConfig): Promise<string> {
  const { modelscope } = AI_CONFIG;

  const apiKey = config?.apiKey ?? modelscope.apiKey;
  if (!apiKey) {
    throw new Error('ModelScope API key not configured');
  }

  const baseUrl = config?.baseUrl ?? modelscope.baseUrl;
  const model = config?.model ?? modelscope.model;
  const maxTokens = config?.maxTokens ?? modelscope.maxTokens;
  const temperature = config?.temperature ?? modelscope.temperature;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`ModelScope API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 模拟 AI 响应（用于开发和测试）
 */
async function callMockModel(userInput: string): Promise<string> {
  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 500));

  const input = userInput.toLowerCase();

  if (input.includes('摘要') || input.includes('总结')) {
    return `基于文档内容，我为你生成了以下摘要：

这篇文档主要介绍了知识管理系统的核心功能，包括 Markdown 编辑、双链笔记、标签系统和实时预览等特性。

主要要点：
- 支持完整的 Markdown 语法
- 通过双链建立文档之间的关联
- 使用标签进行内容分类
- 提供实时预览功能`;
  }

  if (input.includes('扩展') || input.includes('详细')) {
    return `我可以帮你扩展这部分内容。以下是一些建议：

1. 添加具体示例：通过实际案例说明概念
2. 补充背景信息：解释为什么这个功能重要
3. 提供使用场景：说明在什么情况下使用
4. 增加技术细节：深入解释实现原理

你希望我重点扩展哪个方面？`;
  }

  if (input.includes('解释') || input.includes('什么是')) {
    return `让我为你解释这个概念：

双链笔记（Bidirectional Links）是一种知识管理方法，它允许在文档之间建立双向链接。

这种方法的优势：
- 发现知识之间的隐藏联系
- 构建知识网络而非孤立的笔记
- 促进创造性思维和灵感涌现`;
  }

  if (input.includes('改进') || input.includes('优化')) {
    return `我建议从以下几个方面改进这段文字：

1. 结构优化：使用更清晰的段落划分
2. 语言精炼：去除冗余表达，使用更准确的词汇
3. 逻辑增强：确保论点之间的连贯性
4. 可读性提升：添加过渡句，改善阅读体验`;
  }

  return `我理解你的问题。基于当前文档内容，我建议：

1. 明确你的写作目标和受众
2. 保持内容的逻辑性和连贯性
3. 使用清晰的标题和段落结构
4. 适当添加示例和说明

如果你有更具体的需求，请告诉我，我会提供更有针对性的帮助。`;
}

/**
 * 统一的 AI 调用接口
 */
export type AIConfigOverride = {
  apiKey?: string;
  apiEndpoint?: string;
  modelName?: string;
};

export async function callAI(messages: Message[], config?: AIConfigOverride): Promise<string> {
  const { provider } = AI_CONFIG;

  try {
    switch (provider) {
      case 'openai':
        return await callOpenAI(messages);
      case 'anthropic':
        return await callAnthropic(messages);
      case 'local':
        return await callLocalModel(messages);
      case 'modelscope':
        return await callModelscope(messages, {
          apiKey: config?.apiKey,
          baseUrl: config?.apiEndpoint,
          model: config?.modelName,
        });
      case 'mock':
        const userMessage = messages.find((m) => m.role === 'user')?.content || '';
        return await callMockModel(userMessage);
      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  } catch (error) {
    console.error('AI call failed:', error);
    throw error;
  }
}

/**
 * 流式调用 AI（用于实时响应）
 */
export async function* streamAI(messages: Message[]): AsyncGenerator<string> {
  const { provider } = AI_CONFIG;

  // 目前只实现模拟流式响应
  // 真实的流式响应需要根据不同的 AI 提供商实现
  if (provider === 'mock') {
    const response = await callMockModel(
      messages.find((m) => m.role === 'user')?.content || ''
    );
    const words = response.split(' ');

    for (const word of words) {
      yield word + ' ';
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  } else {
    // 对于其他提供商，暂时使用非流式响应
    const response = await callAI(messages);
    yield response;
  }
}

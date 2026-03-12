/**
 * 学习工作区 Agent（简化版本）
 *
 * 直接使用 ModelScope API，不依赖 LangChain Agent
 */

import { ChatOpenAI } from "@langchain/openai";
import { getAllTools, getToolsDescription } from "./tools-real";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import OpenAI from "openai";

/**
 * Agent 配置
 */
export interface AgentConfig {
  modelName?: string;
  temperature?: number;
  maxIterations?: number;
  socraticMode?: boolean;
  apiKey?: string;
  apiEndpoint?: string;
  systemPrompt?: string;
}

/**
 * Agent 状态
 */
export interface AgentState {
  messages: BaseMessage[];
  currentTopic?: string;
  userLevel?: "beginner" | "intermediate" | "advanced";
  learningGoal?: string;
  sessionContext: Record<string, any>;
}

/**
 * 执行 Agent 对话（简化版本，支持多模态）
 */
export async function runAgentConversation(
  input: string,
  chatHistory: BaseMessage[] = [],
  config: AgentConfig = {},
  images?: string[]
): Promise<{
  output: string;
  intermediateSteps: any[];
  thinking?: string;
}> {
  try {
    const {
      modelName = "Qwen/Qwen3.5-122B-A10B",
      temperature = 0.7,
      socraticMode = true,
      apiKey,
      apiEndpoint,
      systemPrompt: customSystemPrompt,
    } = config;

    // 如果没有提供 API 配置，抛出错误
    if (!apiKey || !apiEndpoint) {
      throw new Error("请先在设置中配置 API 密钥和端点。\n\n1. 点击右上角设置图标\n2. 配置 ModelScope API 密钥\n3. 配置 API 端点（默认：https://api-inference.modelscope.cn/v1）");
    }

    // 创建 ModelScope 客户端
    const client = new OpenAI({
      apiKey,
      baseURL: apiEndpoint,
    });

    const toolsDesc = getToolsDescription();

    // 使用自定义系统提示词，如果没有则使用默认的
    const systemPrompt = customSystemPrompt || `你是 EduNexus 的智能学习助手。

## 你的角色
- 学习引导者：通过提问引导学生思考
- 知识导航员：帮助学生找到学习路径
- 个性化教练：根据学生水平调整策略

## 工作模式
${socraticMode ? `
### 苏格拉底模式（当前启用）
1. 不要直接给答案，而是通过问题引导思考
2. 鼓励学生自己探索和发现
3. 提供提示和线索
4. 当学生真正卡住时，才提供更直接的帮助
` : `
### 直接教学模式
1. 可以直接解释概念和提供答案
2. 提供详细的步骤和示例
3. 主动推荐学习资源
`}

## 可用工具
${toolsDesc}

## 回复格式
- 使用 Markdown 格式
- 代码块使用语法高亮
- 重要概念用**粗体**标注
- 提供具体例子和类比

## 注意事项
- 始终保持友好和鼓励的语气
- 根据学生的理解程度调整解释深度
- 主动关联相关知识点`;

    // 构建消息历史
    const messages: any[] = [
      { role: "system" as const, content: systemPrompt },
      ...chatHistory.slice(-6).map(msg => ({
        role: msg._getType() === "human" ? "user" as const : "assistant" as const,
        content: msg.content as string,
      })),
    ];

    // 如果有图片，构建多模态消息
    if (images && images.length > 0) {
      const userContent: any[] = [
        { type: "text", text: input },
        ...images.map(img => ({
          type: "image_url",
          image_url: { url: img }
        }))
      ];
      messages.push({ role: "user" as const, content: userContent });
    } else {
      messages.push({ role: "user" as const, content: input });
    }

    // 调用模型
    const completion = await client.chat.completions.create({
      model: modelName,
      messages,
      temperature,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content || "抱歉，我无法生成回复。";

    return {
      output: response,
      intermediateSteps: [],
      thinking: undefined,
    };
  } catch (error) {
    console.error("Agent execution error:", error);
    throw error;
  }
}

/**
 * 流式执行 Agent
 */
export async function* streamAgentConversation(
  input: string,
  chatHistory: BaseMessage[] = [],
  config: AgentConfig = {}
): AsyncGenerator<{
  type: "thinking" | "action" | "observation" | "output";
  content: string;
}> {
  try {
    const result = await runAgentConversation(input, chatHistory, config);
    yield {
      type: "output",
      content: result.output,
    };
  } catch (error) {
    console.error("Agent streaming error:", error);
    yield {
      type: "output",
      content: "抱歉，处理请求时出现错误。请稍后重试。",
    };
  }
}

/**
 * 创建对话历史
 */
export function createChatHistory(messages: Array<{ role: string; content: string }>): BaseMessage[] {
  return messages.map((msg) => {
    if (msg.role === "user") {
      return new HumanMessage(msg.content);
    } else {
      return new AIMessage(msg.content);
    }
  });
}

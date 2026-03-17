/**
 * 学习工作区 Agent（简化版本）
 *
 * 直接使用 ModelScope API，不依赖 LangChain Agent
 */

import { getAllTools, getToolsDescription } from "./tools-real";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import OpenAI from "openai";
import { z } from "zod";
import type { DynamicStructuredTool } from "@langchain/core/tools";
import { getGraphView } from "@/lib/server/graph-service";
import { searchDocuments } from "@/lib/server/document-service";
import { loadDb } from "@/lib/server/store";

/**
 * Agent 配置
 */
export interface AgentConfig {
  userId?: string;
  modelName?: string;
  temperature?: number;
  maxIterations?: number;
  socraticMode?: boolean;
  apiKey?: string;
  apiEndpoint?: string;
  systemPrompt?: string;
  taskContext?: {
    source?: string;
    pathId?: string;
    pathTitle?: string;
    pathTaskCount?: number;
    taskId?: string;
    taskTitle?: string;
    taskDescription?: string;
    taskEstimatedTime?: string;
    taskDependencies?: string[];
    taskStatus?: string;
    taskProgress?: number;
  };
  pathTasks?: Array<{
    id: string;
    title: string;
    description?: string;
    estimatedTime?: string;
    status?: string;
    progress?: number;
    dependencies?: string[];
  }>;
  graphContext?: {
    taskNode?: {
      id: string;
      label: string;
      domain?: string;
      mastery?: number;
      risk?: number;
    } | null;
    relatedNodes?: Array<{
      id: string;
      label: string;
      domain?: string;
      mastery?: number;
      risk?: number;
    }>;
    relatedEdges?: Array<{
      source: string;
      target: string;
      weight?: number;
    }>;
  };
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

const TOOL_CALL_LIMIT = 4;

function buildOpenAIToolSpecs(tools: DynamicStructuredTool[]) {
  return tools.map((tool) => {
    const shape = (tool.schema as z.ZodObject<any>).shape;
    const properties = Object.fromEntries(
      Object.entries(shape).map(([key, value]) => {
        const field = value as z.ZodTypeAny;
        const isOptional = field.isOptional();
        const base = isOptional ? (field as any).unwrap() : field;

        if (base instanceof z.ZodEnum) {
          return [
            key,
            {
              type: "string",
              enum: [...base.options],
              description: base.description || undefined,
            },
          ];
        }

        if (base instanceof z.ZodNumber) {
          return [
            key,
            {
              type: "number",
              description: base.description || undefined,
            },
          ];
        }

        return [
          key,
          {
            type: "string",
            description: base.description || undefined,
          },
        ];
      })
    );

    const required = Object.entries(shape)
      .filter(([, value]) => !(value as z.ZodTypeAny).isOptional())
      .map(([key]) => key);

    return {
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: "object",
          properties,
          ...(required.length > 0 ? { required } : {}),
          additionalProperties: false,
        },
      },
    };
  });
}

function parseToolArgs(raw: string) {
  if (!raw || !raw.trim()) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`工具参数不是合法 JSON: ${raw}`);
  }
}

async function runToolCallingLoop(input: {
  client: OpenAI;
  modelName: string;
  temperature: number;
  messages: any[];
  tools: DynamicStructuredTool[];
}) {
  const toolMap = new Map(input.tools.map((tool) => [tool.name, tool]));
  const toolSpecs = buildOpenAIToolSpecs(input.tools);
  const intermediateSteps: Array<{
    type: "tool_call" | "tool_result";
    tool: string;
    content: string;
    args?: unknown;
  }> = [];

  let finalResponse = "抱歉，我无法生成回复。";

  for (let round = 0; round < TOOL_CALL_LIMIT; round += 1) {
    const completion = await input.client.chat.completions.create({
      model: input.modelName,
      messages: input.messages,
      temperature: input.temperature,
      max_tokens: 2000,
      tools: toolSpecs,
      tool_choice: "auto",
    });

    const assistantMessage = completion.choices[0]?.message;
    if (!assistantMessage) {
      break;
    }

    const assistantContent = typeof assistantMessage.content === "string"
      ? assistantMessage.content
      : assistantMessage.content ?? "";

    input.messages.push({
      role: "assistant",
      content: assistantContent || "",
      ...(assistantMessage.tool_calls ? { tool_calls: assistantMessage.tool_calls } : {}),
    });

    const toolCalls = assistantMessage.tool_calls || [];
    if (toolCalls.length === 0) {
      finalResponse = assistantContent || finalResponse;
      break;
    }

    for (const call of toolCalls) {
      const toolName = call.function?.name;
      const argsRaw = call.function?.arguments || "{}";
      if (!toolName) {
        continue;
      }

      const args = parseToolArgs(argsRaw);
      intermediateSteps.push({
        type: "tool_call",
        tool: toolName,
        args,
        content: argsRaw,
      });

      const tool = toolMap.get(toolName);
      const toolResult = tool
        ? await tool.invoke(args)
        : JSON.stringify({ error: `未找到工具 ${toolName}` });

      const toolResultText = typeof toolResult === "string"
        ? toolResult
        : JSON.stringify(toolResult, null, 2);

      intermediateSteps.push({
        type: "tool_result",
        tool: toolName,
        content: toolResultText,
      });

      input.messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: toolResultText,
      });
    }
  }

  return {
    output: finalResponse,
    intermediateSteps,
  };
}

async function getPrivateDataContext(input: {
  userId?: string;
  userInput: string;
  taskContext?: AgentConfig["taskContext"];
  graphContext?: AgentConfig["graphContext"];
}) {
  const userId = typeof input.userId === "string" && input.userId.trim() ? input.userId.trim() : "";
  if (!userId) {
    return "";
  }

  const query = input.userInput.trim();
  if (!query) {
    return "";
  }

  const [searchResult, graphView, db] = await Promise.all([
    searchDocuments(query, userId),
    getGraphView(userId),
    loadDb(),
  ]);

  const topCandidates = searchResult.slice(0, 5);
  const graphNodes = graphView.nodes.slice(0, 15);
  const graphEdges = graphView.edges
    .filter((edge) => graphNodes.some((node) => node.id === edge.source || node.id === edge.target))
    .slice(0, 20);

  const activePlan = input.taskContext?.pathId?.startsWith("plan_")
    ? db.plans.find((plan) => plan.planId === input.taskContext?.pathId)
    : null;

  const planTaskSummary = activePlan
    ? activePlan.tasks.slice(0, 10).map((task, index) => `${index + 1}. ${task.title}（优先级：${task.priority}，截止：${task.dueDate}）`).join("\n")
    : "";

  const graphTaskNode = input.graphContext?.taskNode;
  const graphRelatedNodes = Array.isArray(input.graphContext?.relatedNodes)
    ? input.graphContext?.relatedNodes ?? []
    : [];
  const graphRelatedEdges = Array.isArray(input.graphContext?.relatedEdges)
    ? input.graphContext?.relatedEdges ?? []
    : [];
  const graphTaskSummary = graphTaskNode
    ? [
        `- 当前任务知识节点：${graphTaskNode.label}（id=${graphTaskNode.id}${graphTaskNode.domain ? `，domain=${graphTaskNode.domain}` : ""}${typeof graphTaskNode.mastery === "number" ? `，mastery=${Math.round(graphTaskNode.mastery * 100)}%` : ""}${typeof graphTaskNode.risk === "number" ? `，risk=${Math.round(graphTaskNode.risk * 100)}%` : ""}）`,
        graphRelatedNodes.length > 0
          ? `- 关联节点（Top ${graphRelatedNodes.length}）：\n${graphRelatedNodes
              .map((node, index) => `${index + 1}. ${node.label}（id=${node.id}${node.domain ? `，domain=${node.domain}` : ""}${typeof node.mastery === "number" ? `，mastery=${Math.round(node.mastery * 100)}%` : ""}${typeof node.risk === "number" ? `，risk=${Math.round(node.risk * 100)}%` : ""}）`)
              .join("\n")}`
          : "- 关联节点：无",
        graphRelatedEdges.length > 0
          ? `- 关联边（Top ${graphRelatedEdges.length}）：\n${graphRelatedEdges
              .map((edge) => `${edge.source} -> ${edge.target}${typeof edge.weight === "number" ? `（weight=${edge.weight}）` : ""}`)
              .join("\n")}`
          : "- 关联边：无",
      ].join("\n")
    : "";

  return [
    "## 项目私有知识上下文（实时检索）",
    `- 检索词：${query}`,
    topCandidates.length > 0
      ? `- 命中知识条目（Top ${topCandidates.length}）：\n${topCandidates
          .map((candidate, index) => `${index + 1}. ${candidate.docId}\n   片段：${candidate.snippet}`)
          .join("\n")}`
      : "- 命中知识条目：无（知识库未检索到直接匹配）",
    graphNodes.length > 0
      ? `- 知识星图节点样本（${graphNodes.length}）：\n${graphNodes
          .map((node) => `${node.id}｜${node.label}｜domain=${node.domain}｜mastery=${Math.round((node.mastery ?? 0) * 100)}%`)
          .join("\n")}`
      : "- 知识星图节点：无",
    graphEdges.length > 0
      ? `- 星图关系样本（${graphEdges.length}）：\n${graphEdges
          .map((edge) => `${edge.source} -> ${edge.target}（weight=${edge.weight}）`)
          .join("\n")}`
      : "- 星图关系：无",
    activePlan
      ? `- 当前服务端学习计划：${activePlan.planId}，目标：${activePlan.goal}\n${planTaskSummary ? `  任务：\n${planTaskSummary}` : ""}`
      : "- 当前服务端学习计划：无（或当前上下文不是 plan_*）",
    graphTaskSummary || "- 当前任务知识图谱上下文：无",
    "请基于以上项目私有数据优先回答，明确指出引用了哪些 docId / 节点 / 任务。",
  ]
    .filter(Boolean)
    .join("\n");
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
      taskContext,
      graphContext,
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

    const taskContextDetails = [
      taskContext?.taskDescription ? `- 任务描述：${taskContext.taskDescription}` : null,
      taskContext?.taskEstimatedTime ? `- 预计时长：${taskContext.taskEstimatedTime}` : null,
      taskContext?.taskDependencies && taskContext.taskDependencies.length > 0
        ? `- 前置任务：${taskContext.taskDependencies.join("、")}`
        : null,
      taskContext?.pathTaskCount && taskContext.pathTaskCount > 0
        ? `- 路径任务总数：${taskContext.pathTaskCount}`
        : null,
    ].filter(Boolean).join("\n");

    const taskContextPrompt = taskContext?.taskTitle
      ? `\n\n## 当前学习任务上下文\n- 来源：${taskContext.source || "path"}\n- 学习路径：${taskContext.pathTitle || taskContext.pathId || "未命名路径"}\n- 当前任务：${taskContext.taskTitle}\n- 任务状态：${taskContext.taskStatus || "in_progress"}\n- 当前进度：${Math.round(taskContext.taskProgress ?? 0)}%${taskContextDetails ? `\n${taskContextDetails}` : ""}\n\n请优先围绕该任务推进学习：\n1. 先给出 2-3 个最小可执行步骤\n2. 每次只推进一步并检查理解\n3. 避免偏离当前任务主题`
      : "";

    const privateDataContext = await getPrivateDataContext({
      userId: config.userId,
      userInput: input,
      taskContext,
      graphContext,
    });

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
- 主动关联相关知识点${taskContextPrompt}${privateDataContext ? `\n\n${privateDataContext}` : ""}`;

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

    const tools = getAllTools({ userId: config.userId });

    const result = await runToolCallingLoop({
      client,
      modelName,
      temperature,
      messages,
      tools,
    });

    return {
      output: result.output,
      intermediateSteps: result.intermediateSteps,
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

    for (const step of result.intermediateSteps) {
      if (step.type === "tool_call") {
        const argsText = typeof step.args === "undefined"
          ? "{}"
          : JSON.stringify(step.args, null, 2);
        yield {
          type: "action",
          content: `调用工具 ${step.tool}，参数：\n${argsText}`,
        };
      } else {
        yield {
          type: "observation",
          content: `工具 ${step.tool} 返回：\n${step.content}`,
        };
      }
    }

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

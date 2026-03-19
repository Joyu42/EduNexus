/**
 * 知识库智能问答 API
 * POST /api/kb/qa
 */

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getModelscopeClient } from "@/lib/server/modelscope";
import { buildWorkspaceGraphContext } from "@/lib/server/workspace-graph-context";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, documents, history, config, taskContext } = body;

    if (!question) {
      return NextResponse.json(
        { success: false, error: "缺少问题" },
        { status: 400 }
      );
    }

    let client: OpenAI;
    try {
      client = getModelscopeClient();
    } catch {
      if (!config?.apiKey || !config?.apiEndpoint) {
        throw new Error("知识库问答缺少可用模型配置：请在设置中配置 API，或在服务端设置 MODELSCOPE_API_KEY。");
      }
      client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.apiEndpoint,
      });
    }
    const model = config?.modelName || process.env.MODELSCOPE_CHAT_MODEL || "Qwen/Qwen3.5-122B-A10B";

    // 准备上下文
    const context = documents
      ? documents
          .slice(0, 5)
          .map(
            (doc: any) =>
              `【${doc.title}】\n${doc.content.slice(0, 500)}...\n`
          )
          .join("\n")
      : "";

    const graphContext = await buildWorkspaceGraphContext({
      taskId: typeof taskContext?.taskId === "string" ? taskContext.taskId : undefined,
      taskTitle: typeof taskContext?.taskTitle === "string" ? taskContext.taskTitle : undefined,
    });

    const taskContextBlock = taskContext?.taskTitle
      ? `\n\n当前学习任务：\n- 路径：${taskContext.pathTitle || taskContext.pathId || "未命名路径"}\n- 任务：${taskContext.taskTitle}\n- 进度：${Math.round(taskContext.taskProgress ?? 0)}%\n请回答时优先贴合该任务。`
      : "";

    const graphContextBlock = graphContext.taskNode
      ? `\n\n当前任务知识图谱上下文：\n- 任务节点：${graphContext.taskNode.label}（id=${graphContext.taskNode.id}${graphContext.taskNode.domain ? `，domain=${graphContext.taskNode.domain}` : ""}${typeof graphContext.taskNode.mastery === "number" ? `，mastery=${Math.round(graphContext.taskNode.mastery * 100)}%` : ""}${typeof graphContext.taskNode.risk === "number" ? `，risk=${Math.round(graphContext.taskNode.risk * 100)}%` : ""}）${graphContext.relatedNodes.length > 0 ? `\n- 关联节点：\n${graphContext.relatedNodes
          .slice(0, 12)
          .map((node, index) => `${index + 1}. ${node.label}（id=${node.id}${node.domain ? `，domain=${node.domain}` : ""}${typeof node.mastery === "number" ? `，mastery=${Math.round(node.mastery * 100)}%` : ""}${typeof node.risk === "number" ? `，risk=${Math.round(node.risk * 100)}%` : ""}）`)
          .join("\n")}` : "\n- 关联节点：无"}${graphContext.relatedEdges.length > 0 ? `\n- 关联边：\n${graphContext.relatedEdges
          .slice(0, 20)
          .map((edge) => `${edge.source} -> ${edge.target}${typeof edge.weight === "number" ? `（weight=${edge.weight}）` : ""}`)
          .join("\n")}` : "\n- 关联边：无"}\n请结合任务节点在知识图谱中的关系回答。`
      : "";

    // 构建消息
    const messages: any[] = [
      {
        role: "system",
        content: `你是一个基于知识库的智能问答助手。请根据提供的知识库内容回答用户的问题。

知识库内容：
${context}${taskContextBlock}${graphContextBlock}

要求：
- 优先使用知识库中的信息回答
- 如果知识库中没有相关信息，请明确说明
- 引用具体的文档片段
- 保持回答简洁准确`,
      },
    ];

    // 添加历史对话
    if (history && Array.isArray(history)) {
      history.slice(-4).forEach((msg: any) => {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      });
    }

    // 添加当前问题
    messages.push({
      role: "user",
      content: question,
    });

    // 调用模型
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 1500,
    });

    const answer = completion.choices[0]?.message?.content || "抱歉，我无法回答这个问题。";

    return NextResponse.json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error("智能问答失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "问答失败",
      },
      { status: 500 }
    );
  }
}

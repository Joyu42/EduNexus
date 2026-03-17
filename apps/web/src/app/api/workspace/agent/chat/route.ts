import { NextResponse } from "next/server";
import { runAgentConversation, createChatHistory } from "@/lib/agent/learning-agent";
import { buildWorkspaceGraphContext } from "@/lib/server/workspace-graph-context";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 最长执行时间 60 秒

/**
 * Agent 对话 API
 * POST /api/workspace/agent/chat
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, images, history = [], config = {}, taskContext } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid message" },
        { status: 400 }
      );
    }

    // 转换历史消息格式
    const chatHistory = createChatHistory(history);

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const graphContext = await buildWorkspaceGraphContext({
      userId,
      taskId: typeof taskContext?.taskId === "string" ? taskContext.taskId : undefined,
      taskTitle: typeof taskContext?.taskTitle === "string" ? taskContext.taskTitle : undefined,
    });

    const mergedConfig = {
      ...config,
      userId,
      taskContext,
      graphContext,
    };

    // 执行 Agent 对话（支持多模态）
    const result = await runAgentConversation(message, chatHistory, mergedConfig, images);

    return NextResponse.json({
      success: true,
      response: result.output,
      thinking: result.thinking,
      steps: result.intermediateSteps,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Agent chat error:", error);

    // 返回详细错误信息
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      response: "抱歉，处理你的请求时出现了错误。请检查：\n\n1. 是否已在设置中配置 API 密钥\n2. API 密钥是否有效\n3. 网络连接是否正常\n\n错误详情：" + (error instanceof Error ? error.message : "未知错误"),
    }, { status: 500 });
  }
}

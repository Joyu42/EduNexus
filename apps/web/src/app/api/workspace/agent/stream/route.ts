import { streamAgentConversation, createChatHistory } from "@/lib/agent/learning-agent";
import { streamLangGraphAgent } from "@/lib/server/langgraph-agent";
import { buildWorkspaceGraphContext } from "@/lib/server/workspace-graph-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Agent 流式对话 API
 * POST /api/workspace/agent/stream
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, userInput, history = [], config = {}, sessionId, currentLevel, taskContext } = body;
    const effectiveInput = typeof message === "string" && message.trim() ? message : userInput;

    if (!effectiveInput || typeof effectiveInput !== "string") {
      return new Response("Invalid message", { status: 400 });
    }

    const normalizedLevel =
      typeof currentLevel === "number"
        ? currentLevel
        : typeof currentLevel === "string" && currentLevel.trim()
        ? Number(currentLevel)
        : undefined;
    const levelForStream =
      typeof normalizedLevel === "number" && Number.isFinite(normalizedLevel)
        ? Math.max(1, Math.min(4, Math.round(normalizedLevel)))
        : undefined;
    const shouldUseLangGraph = Boolean(sessionId) || typeof levelForStream === "number";

    // 转换历史消息格式
    const chatHistory = createChatHistory(history);

    const graphContext = await buildWorkspaceGraphContext({
      taskId: typeof taskContext?.taskId === "string" ? taskContext.taskId : undefined,
      taskTitle: typeof taskContext?.taskTitle === "string" ? taskContext.taskTitle : undefined,
    });

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (shouldUseLangGraph) {
            for await (const chunk of streamLangGraphAgent({
              sessionId: typeof sessionId === "string" && sessionId.trim() ? sessionId : undefined,
              userInput: effectiveInput,
              currentLevel: levelForStream,
            })) {
              const data = JSON.stringify(chunk) + "\n";
              controller.enqueue(encoder.encode(data));
            }
          } else {
            const mergedConfig = {
              ...config,
              taskContext,
              graphContext,
            };
            for await (const chunk of streamAgentConversation(effectiveInput, chatHistory, mergedConfig)) {
              const data = JSON.stringify(chunk) + "\n";
              controller.enqueue(encoder.encode(data));
            }
          }
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          const errorData = JSON.stringify({
            type: "error",
            content: "处理请求时出现错误",
          }) + "\n";
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Agent stream error:", error);
    return new Response("Internal server error", { status: 500 });
  }
}

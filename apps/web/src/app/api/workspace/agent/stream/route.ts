import { fail } from "@/lib/server/response";
import { workspaceAgentRunSchema } from "@/lib/server/schema";
import {
  streamLangGraphAgent,
  type AgentRunOutput,
  type AgentStreamEvent
} from "@/lib/server/langgraph-agent";
import {
  appendSessionMessage,
  getSession,
  updateSessionLevel
} from "@/lib/server/session-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = workspaceAgentRunSchema.safeParse(json);
    if (!parsed.success) {
      return fail({
        code: "INVALID_REQUEST",
        message: "请求参数不合法。",
        details: parsed.error.flatten()
      });
    }

    const sessionId = parsed.data.sessionId?.trim();
    if (sessionId) {
      const session = await getSession(sessionId);
      if (!session) {
        return fail(
          {
            code: "SESSION_NOT_FOUND",
            message: "未找到对应会话。"
          },
          404
        );
      }
    }
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let finalResult: AgentRunOutput | null = null;
        try {
          for await (const event of streamLangGraphAgent({
            sessionId,
            userInput: parsed.data.userInput,
            currentLevel: parsed.data.currentLevel ?? 1
          })) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(event satisfies AgentStreamEvent)}\n\n`)
            );
            if (event.type === "done") {
              finalResult = event.value;
            }
          }

          if (sessionId && finalResult) {
            await appendSessionMessage(sessionId, {
              role: "user",
              content: parsed.data.userInput
            });
            await appendSessionMessage(sessionId, {
              role: "assistant",
              content: `[LangGraph-Stream:${finalResult.mode}] ${finalResult.guidance}`
            });
            await updateSessionLevel(sessionId, finalResult.nextLevel);
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "error",
                value:
                  error instanceof Error
                    ? error.message
                    : "建立 LangGraph 流式输出失败。"
              })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive"
      }
    });
  } catch (error) {
    return fail(
      {
        code: "WORKSPACE_AGENT_STREAM_FAILED",
        message: "建立 LangGraph 流式输出失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

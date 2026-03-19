import { fail, ok } from "@/lib/server/response";
import { workspaceAgentRunSchema } from "@/lib/server/schema";
import { runLangGraphAgent } from "@/lib/server/langgraph-agent";
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

    const result = await runLangGraphAgent({
      sessionId,
      userInput: parsed.data.userInput,
      currentLevel: parsed.data.currentLevel ?? 1
    });

    if (sessionId) {
      await appendSessionMessage(sessionId, {
        role: "user",
        content: parsed.data.userInput
      });
      await appendSessionMessage(sessionId, {
        role: "assistant",
        content: `[LangGraph:${result.mode}] ${result.guidance}`
      });
      await updateSessionLevel(sessionId, result.nextLevel);
    }

    return ok({
      intent: result.intent,
      nextLevel: result.nextLevel,
      guidance: result.guidance,
      mode: result.mode,
      contextRefs: result.contextRefs,
      trace: result.trace,
      citations: result.contextRefs.map((docId) => ({
        sourceId: docId,
        chunkRef: "summary"
      }))
    });
  } catch (error) {
    return fail(
      {
        code: "WORKSPACE_AGENT_RUN_FAILED",
        message: "执行 LangGraph Agent 失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

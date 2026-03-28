import { fail } from "@/lib/server/response";
import { getSession, mockSseStream } from "@/lib/server/session-service";
import { getCurrentUserId } from "@/lib/server/auth-utils";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await context.params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: 'UNAUTHORIZED', message: '请先登录' }, 401);
    }
    const session = await getSession(sessionId, userId);
    if (!session) {
      return fail(
        {
          code: "SESSION_NOT_FOUND",
          message: "会话不存在。"
        },
        404
      );
    }

    const { searchParams } = new URL(request.url);
    const prompt = searchParams.get("prompt")?.trim();

    const stream = mockSseStream({
      sessionId,
      intro: "我们开始逐步拆解你的解题路径。",
      content:
        prompt && prompt.length > 0
          ? `请围绕“${prompt}”先写出已知条件，再选择一个可验证的中间步骤，最后做一次结果检验。`
          : "请先写出已知条件，再整理目标量，最后说明你将使用的公式。"
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
        code: "STREAM_FAILED",
        message: "建立流式输出失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

import { appendMessageSchema } from "@/lib/server/schema";
import { appendSessionMessage } from "@/lib/server/session-service";
import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const json = await request.json().catch(() => ({}));
    const parsed = appendMessageSchema.safeParse(json);
    if (!parsed.success) {
      return fail({
        code: "INVALID_REQUEST",
        message: "请求参数不合法。",
        details: parsed.error.flatten()
      });
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "请先登录" }, 401);
    }

    const session = await appendSessionMessage(id, parsed.data, userId);
    if (!session) {
      return fail(
        {
          code: "SESSION_NOT_FOUND",
          message: "未找到对应会话。"
        },
        404
      );
    }

    return ok({
      session: {
        id: session.id,
        updatedAt: session.updatedAt,
        messageCount: session.messages.length
      }
    });
  } catch (error) {
    return fail(
      {
        code: "SESSION_APPEND_MESSAGE_FAILED",
        message: "追加会话消息失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

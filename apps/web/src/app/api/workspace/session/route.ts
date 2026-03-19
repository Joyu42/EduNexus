import { createSessionSchema } from "@/lib/server/schema";
import { createSession } from "@/lib/server/session-service";
import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = createSessionSchema.safeParse(json);
    if (!parsed.success) {
      return fail({
        code: "INVALID_REQUEST",
        message: "请求参数不合法。",
        details: parsed.error.flatten()
      });
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: 'UNAUTHORIZED', message: '请先登录' }, 401);
    }
    const session = await createSession({
      title: parsed.data.title
    }, userId);

    return ok({ session });
  } catch (error) {
    return fail(
      {
        code: "SESSION_CREATE_FAILED",
        message: "创建学习会话失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

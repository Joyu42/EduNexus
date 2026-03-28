import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
    }
    return ok({ tags: [] });
  } catch (error) {
    return fail(
      {
        code: "KB_TAGS_FAILED",
        message: "获取标签聚合失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

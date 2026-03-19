import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
    }

    return ok({ nodes: [], edges: [] });
  } catch (error) {
    return fail(
      {
        code: "KB_BACKLINK_GRAPH_FAILED",
        message: "获取反链图摘要失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

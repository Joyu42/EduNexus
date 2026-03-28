import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";

export const runtime = "nodejs";

export async function POST() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
    }
    // This is a no-op now
    return ok({ message: "索引重建任务已启动（空操作）。" });
  } catch (error) {
    return fail(
      {
        code: "KB_INDEX_REBUILD_FAILED",
        message: "重建知识库索引失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

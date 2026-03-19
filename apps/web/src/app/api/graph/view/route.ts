import { fail, ok } from "@/lib/server/response";
import { getGraphView } from "@/lib/server/graph-service";
import { getCurrentUserId } from "@/lib/server/auth-utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "用户未登录。"
        },
        401
      );
    }
    
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain") ?? undefined;
    const graph = await getGraphView(userId, { domain });
    return ok(graph);
  } catch (error) {
    return fail(
      {
        code: "GRAPH_VIEW_FAILED",
        message: "获取图谱视图失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

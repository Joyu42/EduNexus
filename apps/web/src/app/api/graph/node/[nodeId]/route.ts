import { fail, ok } from "@/lib/server/response";
import { getGraphNodeDetail } from "@/lib/server/graph-service";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ nodeId: string }> }
) {
  try {
    const params = await context.params;
    const detail = await getGraphNodeDetail(params.nodeId);
    if (!detail) {
      return fail(
        {
          code: "NODE_NOT_FOUND",
          message: "未找到对应知识节点。"
        },
        404
      );
    }
    return ok(detail);
  } catch (error) {
    return fail(
      {
        code: "GRAPH_NODE_FAILED",
        message: "获取节点详情失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

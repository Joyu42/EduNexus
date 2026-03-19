import { fail, ok } from "@/lib/server/response";
import { getGraphView } from "@/lib/server/graph-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get("domain") ?? undefined;
    const owner = searchParams.get("owner") ?? undefined;
    const graph = await getGraphView({ domain, owner });
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

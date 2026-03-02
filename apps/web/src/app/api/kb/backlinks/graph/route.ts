import { getBacklinkGraph } from "@/lib/server/kb-lite";
import { fail, ok } from "@/lib/server/response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const focusDocId = searchParams.get("focusDocId")?.trim() || undefined;
    const limitRaw = searchParams.get("limit");
    const limit = limitRaw ? Number(limitRaw) : undefined;

    const graph = await getBacklinkGraph({
      focusDocId,
      limit: Number.isFinite(limit) ? limit : undefined
    });
    return ok(graph);
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

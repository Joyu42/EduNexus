import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { searchDocuments } from "@/lib/server/document-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!q) {
      return fail({
        code: "INVALID_REQUEST",
        message: "缺少查询参数 q。"
      });
    }

    const results = await searchDocuments(q, userId);

    const candidates = results.map(r => ({
      docId: r.docId,
      score: 1, // dummy score
      snippet: r.snippet,
    })).slice(0, limit);

    return ok({
      candidates,
      meta: {
        total: candidates.length,
        limit,
      }
    });
  } catch (error) {
    return fail(
      {
        code: "KB_SEARCH_FAILED",
        message: "知识库检索失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

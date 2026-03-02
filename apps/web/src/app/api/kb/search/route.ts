import { fail, ok } from "@/lib/server/response";
import { searchVault } from "@/lib/server/kb-lite";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const type = searchParams.get("type")?.trim() || undefined;
    const domain = searchParams.get("domain")?.trim() || undefined;
    const tag = searchParams.get("tag")?.trim() || undefined;
    if (!q) {
      return fail({
        code: "INVALID_REQUEST",
        message: "缺少查询参数 q。"
      });
    }

    const result = await searchVault(q, { type, domain, tag });
    return ok(result);
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

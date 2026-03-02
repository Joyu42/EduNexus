import { getVaultTagStats } from "@/lib/server/kb-lite";
import { fail, ok } from "@/lib/server/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tags = await getVaultTagStats();
    return ok({ tags });
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

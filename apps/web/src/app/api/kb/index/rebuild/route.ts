import { rebuildVaultIndex } from "@/lib/server/kb-lite";
import { fail, ok } from "@/lib/server/response";

export const runtime = "nodejs";

export async function POST() {
  try {
    const summary = await rebuildVaultIndex();
    return ok(summary);
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

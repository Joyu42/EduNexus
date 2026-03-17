import { fail, ok } from "@/lib/server/response";
import { loadDb } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { sessions, plans, syncedPaths } = await loadDb();
    return ok({
      totalSessions: sessions.length,
      totalPlans: plans.length,
      totalSyncedPaths: syncedPaths.length,
    });
  } catch (error) {
    return fail(
      {
        code: "ANALYTICS_STATS_FAILED",
        message: "获取统计数据失败。",
        details: error instanceof Error ? error.message : error,
      },
      500
    );
  }
}

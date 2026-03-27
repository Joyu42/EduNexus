import { generateAnalyticsInsights } from "@/lib/analytics/insight-generator";
import { buildAnalyticsReport, type AnalyticsRange } from "@/lib/analytics/report-builder";
import { listAnalyticsEvents, listAnalyticsSnapshots } from "@/lib/server/analytics-service";
import { fail, ok } from "@/lib/server/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeRange(value: string | null): AnalyticsRange | null {
  if (value === null || value === "") {
    return "weekly";
  }
  if (value === "weekly" || value === "monthly") {
    return value;
  }
  return null;
}

export async function GET(request: Request) {
  const range = normalizeRange(new URL(request.url).searchParams.get("range"));
  if (!range) {
    return fail(
      {
        code: "INVALID_RANGE",
        message: "range 仅支持 weekly 或 monthly。"
      },
      400
    );
  }

  try {
    const [events, snapshots] = await Promise.all([listAnalyticsEvents(), listAnalyticsSnapshots()]);
    const report = buildAnalyticsReport({ range, events, snapshots });
    const insights = generateAnalyticsInsights(report);

    const response = ok({ insights });
    response.headers.set("Cache-Control", "private, max-age=60");
    return response;
  } catch (error) {
    return fail(
      {
        code: "ANALYTICS_INSIGHTS_FAILED",
        message: "生成分析洞察失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

import { fail, ok } from "@/lib/server/response";
import { pathReplanSchema } from "@/lib/server/schema";
import { replanLearningPlan } from "@/lib/server/path-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = pathReplanSchema.safeParse(json);
    if (!parsed.success) {
      return fail({
        code: "INVALID_REQUEST",
        message: "请求参数不合法。",
        details: parsed.error.flatten()
      });
    }

    const replanned = await replanLearningPlan({
      planId: parsed.data.planId,
      reason: parsed.data.reason,
      availableHoursPerDay: parsed.data.availableHoursPerDay
    });

    if (!replanned) {
      return fail(
        {
          code: "PLAN_NOT_FOUND",
          message: "未找到对应计划，请先生成路径。"
        },
        404
      );
    }

    return ok(replanned);
  } catch (error) {
    return fail(
      {
        code: "PATH_REPLAN_FAILED",
        message: "重排学习计划失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

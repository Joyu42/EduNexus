import { fail, ok } from "@/lib/server/response";
import { pathGenerateSchema } from "@/lib/server/schema";
import { createLearningPlan } from "@/lib/server/path-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = pathGenerateSchema.safeParse(json);
    if (!parsed.success) {
      return fail({
        code: "INVALID_REQUEST",
        message: "请求参数不合法。",
        details: parsed.error.flatten()
      });
    }

    const result = await createLearningPlan({
      goalType: parsed.data.goalType,
      goal: parsed.data.goal,
      days: parsed.data.days ?? 7,
      focusNodeId: parsed.data.focusNodeId,
      focusNodeLabel: parsed.data.focusNodeLabel,
      focusNodeRisk: parsed.data.focusNodeRisk,
      relatedNodes: parsed.data.relatedNodes ?? []
    });

    return ok(result);
  } catch (error) {
    return fail(
      {
        code: "PATH_GENERATE_FAILED",
        message: "生成学习路径失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

import { fail, ok } from "@/lib/server/response";
import { lessonPlanGenerateSchema } from "@/lib/server/schema";
import { generateLessonPlan } from "@/lib/server/teacher-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = lessonPlanGenerateSchema.safeParse(json);
    if (!parsed.success) {
      return fail({
        code: "INVALID_REQUEST",
        message: "请求参数不合法。",
        details: parsed.error.flatten()
      });
    }

    const plan = await generateLessonPlan(parsed.data);
    return ok(plan);
  } catch (error) {
    return fail(
      {
        code: "TEACHER_PLAN_FAILED",
        message: "生成备课草案失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

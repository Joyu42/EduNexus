import { fail, ok } from "@/lib/server/response";
import { pathFocusFeedbackSchema } from "@/lib/server/schema";
import { applyPathFocusFeedback } from "@/lib/server/learning-update";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = pathFocusFeedbackSchema.safeParse(json);
    if (!parsed.success) {
      return fail({
        code: "INVALID_REQUEST",
        message: "请求参数不合法。",
        details: parsed.error.flatten()
      });
    }

    const updated = await applyPathFocusFeedback({
      nodeId: parsed.data.nodeId,
      nodeLabel: parsed.data.nodeLabel,
      relatedNodes: parsed.data.relatedNodes ?? [],
      quality: parsed.data.quality
    });

    return ok({
      ...updated,
      planId: parsed.data.planId ?? null,
      taskId: parsed.data.taskId
    });
  } catch (error) {
    return fail(
      {
        code: "PATH_FOCUS_FEEDBACK_FAILED",
        message: "写入图谱焦点反馈失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

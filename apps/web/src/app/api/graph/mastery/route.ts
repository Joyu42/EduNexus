import type { MasteryStage } from "@/lib/graph/types";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { setMasteryStage, setNeedsReview } from "@/lib/server/learning-update";
import { fail, ok } from "@/lib/server/response";

const VALID_STAGES: MasteryStage[] = ["seen", "understood", "applied", "mastered"];

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "未登录" }, 401);
    }

    const body = (await request.json()) as { nodeId?: unknown; action?: unknown };
    const nodeId = typeof body.nodeId === "string" ? body.nodeId.trim() : "";
    const action = typeof body.action === "string" ? body.action : "";

    if (!nodeId || !action) {
      return fail({ code: "INVALID_INPUT", message: "缺少参数" }, 400);
    }

    if (action === "setNeedsReview") {
      await setNeedsReview(nodeId, true);
      return ok({ success: true });
    }

    if (action === "clearNeedsReview") {
      await setNeedsReview(nodeId, false);
      return ok({ success: true });
    }

    if (!VALID_STAGES.includes(action as MasteryStage)) {
      return fail({ code: "INVALID_INPUT", message: "无效的掌握阶段" }, 400);
    }

    await setMasteryStage(nodeId, action as MasteryStage);
    await setNeedsReview(nodeId, false);

    return ok({ success: true, masteryStage: action });
  } catch {
    return fail({ code: "MASTERY_UPDATE_FAILED", message: "更新失败" }, 500);
  }
}

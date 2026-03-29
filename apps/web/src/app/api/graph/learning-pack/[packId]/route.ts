import { fail, ok } from "@/lib/server/response";
import { auth } from "@/auth";
import { z } from "zod";
import {
  updatePackFull,
  deleteLearningPack,
} from "@/lib/server/learning-pack-store";

export const runtime = "nodejs";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  topic: z.string().min(1).optional(),
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    estimatedTime: z.string(),
    progress: z.number(),
    status: z.string(),
    dependencies: z.array(z.string()),
    resources: z.array(z.any()),
    notes: z.string(),
    createdAt: z.string().optional(),
  })).optional(),
  milestones: z.array(z.any()).optional(),
}).refine((data) => data.title !== undefined || data.topic !== undefined || data.tasks !== undefined, {
  message: "At least one of title, topic, or tasks must be provided",
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ packId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
    }
    const { packId } = await params;
    const userId = session.user.id;

    const json = await request.json().catch(() => ({}));
    const parsed = updateSchema.safeParse(json);
    if (!parsed.success) {
      return fail({
        code: "INVALID_REQUEST",
        message: "请求参数不合法。",
        details: parsed.error.flatten(),
      });
    }

    await updatePackFull(packId, userId, {
      title: parsed.data.title,
      topic: parsed.data.topic,
      tasks: parsed.data.tasks,
    });
    return ok({ success: true, packId });
  } catch (error) {
    if (error instanceof Error && error.message === "Pack not found") {
      return fail({ code: "NOT_FOUND", message: "学习包不存在。" }, 404);
    }
    return fail(
      { code: "UPDATE_FAILED", message: "更新学习包失败。", details: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ packId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
    }
    const { packId } = await params;
    const userId = session.user.id;

    await deleteLearningPack(packId, userId);
    return ok({ success: true, packId });
  } catch (error) {
    if (error instanceof Error && error.message === "Pack not found") {
      return fail({ code: "NOT_FOUND", message: "学习包不存在。" }, 404);
    }
    return fail(
      { code: "DELETE_FAILED", message: "删除学习包失败。", details: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}

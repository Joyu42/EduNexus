import { fail, ok } from "@/lib/server/response";
import { auth } from "@/auth";
import { z } from "zod";
import {
  getAllPacks,
  putAllPacks,
  updatePackTitleTopic,
  deleteLearningPack,
} from "@/lib/server/learning-pack-store";

export const runtime = "nodejs";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  topic: z.string().min(1).optional(),
}).refine((data) => data.title !== undefined || data.topic !== undefined, {
  message: "At least one of title or topic must be provided",
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

    await updatePackTitleTopic(packId, userId, parsed.data);
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

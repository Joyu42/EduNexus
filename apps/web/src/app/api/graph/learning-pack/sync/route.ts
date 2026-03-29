import { fail, ok } from "@/lib/server/response";
import { auth } from "@/auth";
import { z } from "zod";
import {
  getPackById,
  setPackKbDocument,
  reorderLearningPackModules,
} from "@/lib/server/learning-pack-store";

export const runtime = "nodejs";

const syncTaskSchema = z.object({
  taskId: z.string().min(1),
  documentBinding: z.object({
    documentId: z.string()
  }).optional().nullable(),
});

const syncPackSchema = z.object({
  packId: z.string().min(1),
  tasks: z.array(syncTaskSchema),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
    }

    const json = await request.json().catch(() => ({}));
    const parsed = syncPackSchema.safeParse(json);
    if (!parsed.success) {
      return fail({
        code: "INVALID_REQUEST",
        message: "请求参数不合法。",
        details: parsed.error.flatten(),
      });
    }

    const { packId, tasks } = parsed.data;
    const userId = session.user.id;

    const pack = await getPackById(packId, userId);
    if (!pack) {
      return fail({ code: "NOT_FOUND", message: "学习包不存在。" }, 404);
    }

    // Bind/unbind documents
    for (const task of tasks) {
      const docId = task.documentBinding?.documentId || "";
      await setPackKbDocument(packId, task.taskId, docId, userId);
    }

    // Reorder modules
    const orderedModuleIds = tasks.map((t) => t.taskId);
    await reorderLearningPackModules(packId, orderedModuleIds, userId);

    return ok({ success: true, packId });
  } catch (error) {
    return fail(
      {
        code: "PACK_SYNC_FAILED",
        message: "学习包同步失败。",
        details: error instanceof Error ? error.message : error,
      },
      500
    );
  }
}

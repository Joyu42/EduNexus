import { fail, ok } from "@/lib/server/response";
import { auth } from "@/auth";
import { z } from "zod";
import {
  getAllPacks,
  putAllPacks,
  LearningPackDocumentBindingConflictError,
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

    const packs = await getAllPacks();
    const packIndex = packs.findIndex((pack) => pack.packId === packId && pack.userId === userId);
    if (packIndex < 0) {
      return fail({ code: "NOT_FOUND", message: "学习包不存在。" }, 404);
    }

    const nextPacks = packs.map((pack, index) =>
      index === packIndex
        ? {
            ...pack,
            modules: pack.modules.map((module) => ({ ...module })),
          }
        : pack
    );
    const targetPack = nextPacks[packIndex];
    const bindingByModuleId = new Map(
      tasks.map((task) => [task.taskId, task.documentBinding?.documentId.trim() ?? ""])
    );

    for (const module of targetPack.modules) {
      const nextDocId = bindingByModuleId.get(module.moduleId);
      if (nextDocId !== undefined) {
        module.kbDocumentId = nextDocId;
      }
    }

    const orderedModuleIds = tasks.map((t) => t.taskId);
    const orderedSet = new Set(orderedModuleIds);
    const orderedModules = orderedModuleIds.flatMap((moduleId, order) => {
      const module = targetPack.modules.find((item) => item.moduleId === moduleId);
      return module ? [{ ...module, order }] : [];
    });
    const reorderedModules = targetPack.modules
      .filter((module) => !orderedSet.has(module.moduleId))
      .map((module, index) => ({ ...module, order: orderedModules.length + index }));

    targetPack.modules = [...orderedModules, ...reorderedModules];
    targetPack.updatedAt = new Date().toISOString();

    const seenDocBindings = new Map<string, { packId: string; moduleId: string }>();
    for (const pack of nextPacks) {
      if (pack.userId !== userId) continue;

      for (const module of pack.modules) {
        const docId = module.kbDocumentId.trim();
        if (!docId) continue;

        const existing = seenDocBindings.get(docId);
        if (existing && (existing.packId !== pack.packId || existing.moduleId !== module.moduleId)) {
          throw new LearningPackDocumentBindingConflictError();
        }
        seenDocBindings.set(docId, { packId: pack.packId, moduleId: module.moduleId });
      }
    }

    await putAllPacks(nextPacks);

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

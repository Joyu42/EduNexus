import { auth } from "@/auth";
import { z } from "zod";
import { upsertLearningPack } from "@/lib/server/learning-pack-store";
import { ok, fail } from "@/lib/server/response";

export const runtime = "nodejs";

const createSchema = z.object({
  packId: z.string().min(1),
  title: z.string().min(1),
  topic: z.string().optional().default(""),
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional().default(""),
    estimatedTime: z.string().optional().default(""),
    progress: z.number().optional().default(0),
    status: z.string().optional().default("not_started"),
    dependencies: z.array(z.string()).optional().default([]),
    resources: z.array(z.any()).optional().default([]),
    notes: z.string().optional().default(""),
    createdAt: z.string().optional(),
  })).optional().default([]),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
    }
    const userId = session.user.id;
    const json = await request.json().catch(() => ({}));
    const parsed = createSchema.safeParse(json);
    if (!parsed.success) {
      return fail({
        code: "INVALID_REQUEST",
        message: "请求参数不合法。",
        details: parsed.error.flatten(),
      });
    }
    const { packId, title, topic, tasks } = parsed.data;

    const now = new Date().toISOString();
    const modules = (tasks ?? []).map((task, index) => ({
      moduleId: `lp_module_${packId}_${task.id}`,
      title: task.title,
      kbDocumentId: "",
      stage: "seen" as const,
      order: index,
      studyMinutes: 0,
      lastStudiedAt: null,
    }));

    await upsertLearningPack({
      packId,
      userId,
      title,
      topic,
      modules,
      activeModuleId: modules[0]?.moduleId ?? null,
      stage: "seen",
      totalStudyMinutes: 0,
      createdAt: now,
      updatedAt: now,
    });

    return ok({ success: true, packId });
  } catch (error) {
    return fail(
      { code: "CREATE_FAILED", message: "创建学习包失败。", details: error instanceof Error ? error.message : String(error) },
      500
    );
  }
}

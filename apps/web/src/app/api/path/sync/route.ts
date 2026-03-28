import { fail, ok } from "@/lib/server/response";
import { deleteSyncedPath, upsertSyncedPath } from "@/lib/server/path-sync-service";
import { auth } from "@/auth";
import { z } from "zod";

const taskSchema = z.object({
  taskId: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  estimatedTime: z.string().max(80).optional(),
  status: z.enum(["not_started", "in_progress", "completed"]).optional(),
  progress: z.number().min(0).max(100).optional(),
  dependencies: z.array(z.string().min(1).max(120)).max(20).optional(),
});

const pathSyncSchema = z.object({
  pathId: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  status: z.enum(["not_started", "in_progress", "completed"]),
  progress: z.number().min(0).max(100),
  tags: z.array(z.string().min(1).max(80)).max(30).optional(),
  tasks: z.array(taskSchema).max(300).optional(),
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
    }

    const json = await request.json().catch(() => ({}));
    const parsed = pathSyncSchema.safeParse(json);
    if (!parsed.success) {
      return fail({
        code: "INVALID_REQUEST",
        message: "请求参数不合法。",
        details: parsed.error.flatten(),
      });
    }

    const synced = await upsertSyncedPath({
      ...parsed.data,
      userId: session.user.id,
    });
    return ok({
      pathId: synced.pathId,
      taskCount: synced.tasks.length,
      updatedAt: synced.updatedAt,
    });
  } catch (error) {
    return fail(
      {
        code: "PATH_SYNC_FAILED",
        message: "同步学习路径到服务端图谱失败。",
        details: error instanceof Error ? error.message : error,
      },
      500
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
    }

    const { searchParams } = new URL(request.url);
    const pathId = (searchParams.get("pathId") ?? "").trim();
    if (!pathId) {
      return fail({
        code: "INVALID_REQUEST",
        message: "缺少 pathId。",
      });
    }

    await deleteSyncedPath(pathId, session.user.id);
    return ok({ pathId });
  } catch (error) {
    return fail(
      {
        code: "PATH_SYNC_DELETE_FAILED",
        message: "删除服务端学习路径同步数据失败。",
        details: error instanceof Error ? error.message : error,
      },
      500
    );
  }
}

import { fail, ok } from "@/lib/server/response";
import { updateSessionSchema } from "@/lib/server/schema";
import {
  deleteSession,
  getSession,
  renameSession
} from "@/lib/server/session-service";
import { getCurrentUserId } from "@/lib/server/auth-utils";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: 'UNAUTHORIZED', message: '请先登录' }, 401);
    }
    const session = await getSession(id, userId);
    if (!session) {
      return fail(
        {
          code: "SESSION_NOT_FOUND",
          message: "未找到对应会话。"
        },
        404
      );
    }
    return ok({
      id: session.id,
      title: session.title,
      userId: session.userId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      lastLevel: session.lastLevel,
      messages: session.messages
    });
  } catch (error) {
    return fail(
      {
        code: "SESSION_DETAIL_FAILED",
        message: "获取会话详情失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const json = await request.json().catch(() => ({}));
    const parsed = updateSessionSchema.safeParse(json);
    if (!parsed.success) {
      return fail({
        code: "INVALID_REQUEST",
        message: "请求参数不合法。",
        details: parsed.error.flatten()
      });
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: 'UNAUTHORIZED', message: '请先登录' }, 401);
    }
    const renamed = await renameSession(id, parsed.data.title, userId);
    if (!renamed) {
      return fail(
        {
          code: "SESSION_NOT_FOUND",
          message: "未找到对应会话。"
        },
        404
      );
    }

    return ok({
      id: renamed.id,
      title: renamed.title,
      updatedAt: renamed.updatedAt
    });
  } catch (error) {
    return fail(
      {
        code: "SESSION_RENAME_FAILED",
        message: "重命名会话失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: 'UNAUTHORIZED', message: '请先登录' }, 401);
    }
    const removed = await deleteSession(id, userId);
    if (!removed) {
      return fail(
        {
          code: "SESSION_NOT_FOUND",
          message: "未找到对应会话。"
        },
        404
      );
    }
    return ok({
      deleted: true,
      id
    });
  } catch (error) {
    return fail(
      {
        code: "SESSION_DELETE_FAILED",
        message: "删除会话失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { loadDb } from "@/lib/server/store";
import {
  createResourceNote,
  deleteResourceNote,
  listResourceNotes,
  updateResourceNote
} from "@/lib/server/resources-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeContent(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再查看笔记。"
        },
        401
      );
    }

    const { searchParams } = new URL(request.url);
    const resourceId = normalizeId(searchParams.get("resourceId"));

    const notes = resourceId
      ? await listResourceNotes(userId, resourceId)
      : await listResourceNotes(userId);

    return ok({ notes });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_NOTES_LIST_FAILED",
        message: "获取笔记列表失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再创建笔记。"
        },
        401
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(
        {
          code: "RESOURCE_NOTE_CREATE_INVALID_JSON",
          message: "请求体必须是 JSON。"
        },
        400
      );
    }

    const payload = (body ?? {}) as Record<string, unknown>;
    const resourceId = normalizeId(payload.resourceId);
    const content = normalizeContent(payload.content);

    if (!resourceId || !content) {
      return fail(
        {
          code: "RESOURCE_NOTE_CREATE_VALIDATION_FAILED",
          message: "resourceId 和 content 都是必填字段。",
          details: {
            resourceId: Boolean(resourceId),
            content: Boolean(content)
          }
        },
        400
      );
    }

    const db = await loadDb();
    const resource = db.publicResources?.find?.((item: { id?: string }) => item.id === resourceId);
    if (!resource) {
      return fail(
        {
          code: "RESOURCE_NOT_FOUND",
          message: "未找到对应资源。"
        },
        404
      );
    }

    const note = await createResourceNote({
      userId,
      resourceId,
      content
    });

    return ok({ note });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_NOTE_CREATE_FAILED",
        message: "创建笔记失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再更新笔记。"
        },
        401
      );
    }

    const { searchParams } = new URL(request.url);
    const noteId = normalizeId(searchParams.get("noteId"));
    if (!noteId) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "noteId 不能为空。"
        },
        400
      );
    }

    const all = await listResourceNotes();
    const existing = all.find((note: { id: string }) => note.id === noteId);
    if (!existing) {
      return fail(
        {
          code: "RESOURCE_NOTE_NOT_FOUND",
          message: "未找到对应笔记。"
        },
        404
      );
    }

    if (existing.userId !== userId) {
      return fail(
        {
          code: "FORBIDDEN",
          message: "无权限更新该笔记。"
        },
        403
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(
        {
          code: "RESOURCE_NOTE_UPDATE_INVALID_JSON",
          message: "请求体必须是 JSON。"
        },
        400
      );
    }

    const payload = (body ?? {}) as Record<string, unknown>;
    const content = normalizeContent(payload.content);
    if (!content) {
      return fail(
        {
          code: "RESOURCE_NOTE_UPDATE_VALIDATION_FAILED",
          message: "content 不能为空。"
        },
        400
      );
    }

    const note = await updateResourceNote(noteId, { content });
    if (!note) {
      return fail(
        {
          code: "RESOURCE_NOTE_NOT_FOUND",
          message: "未找到对应笔记。"
        },
        404
      );
    }

    return ok({ note });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_NOTE_UPDATE_FAILED",
        message: "更新笔记失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再删除笔记。"
        },
        401
      );
    }

    const { searchParams } = new URL(request.url);
    const noteId = normalizeId(searchParams.get("noteId"));
    if (!noteId) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "noteId 不能为空。"
        },
        400
      );
    }

    const all = await listResourceNotes();
    const existing = all.find((note: { id: string }) => note.id === noteId);
    if (!existing) {
      return fail(
        {
          code: "RESOURCE_NOTE_NOT_FOUND",
          message: "未找到对应笔记。"
        },
        404
      );
    }

    if (existing.userId !== userId) {
      return fail(
        {
          code: "FORBIDDEN",
          message: "无权限删除该笔记。"
        },
        403
      );
    }

    const deleted = await deleteResourceNote(noteId);
    if (!deleted) {
      return fail(
        {
          code: "RESOURCE_NOTE_NOT_FOUND",
          message: "未找到对应笔记。"
        },
        404
      );
    }

    return ok({ deleted: true });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_NOTE_DELETE_FAILED",
        message: "删除笔记失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

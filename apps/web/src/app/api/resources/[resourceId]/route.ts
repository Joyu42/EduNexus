import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { getUserById } from "@/lib/server/user-service";
import {
  deleteResource,
  deleteResourceBookmark,
  deleteResourceNote,
  deleteResourceRating,
  listResources,
  listResourceBookmarks,
  listResourceNotes,
  listResourceRatings,
  updateResource
} from "@/lib/server/resources-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(_request: Request, context: { params: Promise<{ resourceId: string }> }) {
  try {
    const { resourceId } = await context.params;
    const id = normalizeId(resourceId);
    if (!id) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "resourceId 不能为空。"
        },
        400
      );
    }

    const resources = await listResources();
    const resource = resources.find((item) => item.id === id);
    if (!resource) {
      return fail(
        {
          code: "RESOURCE_NOT_FOUND",
          message: "未找到对应资源。"
        },
        404
      );
    }

    const creator = await getUserById(resource.createdBy);
    const createdByName = creator?.name ?? creator?.email ?? "未知用户";

    return ok({ resource: { ...resource, createdByName } });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_DETAIL_FAILED",
        message: "获取资源详情失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ resourceId: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再更新资源。"
        },
        401
      );
    }

    const { resourceId } = await context.params;
    const id = normalizeId(resourceId);
    if (!id) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "resourceId 不能为空。"
        },
        400
      );
    }

    const resources = await listResources();
    const existing = resources.find((item) => item.id === id);
    if (!existing) {
      return fail(
        {
          code: "RESOURCE_NOT_FOUND",
          message: "未找到对应资源。"
        },
        404
      );
    }

    if (existing.createdBy !== userId) {
      return fail(
        {
          code: "FORBIDDEN",
          message: "仅资源创建者可以更新该资源。"
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
          code: "RESOURCE_UPDATE_INVALID_JSON",
          message: "请求体必须是 JSON。"
        },
        400
      );
    }

    const payload = (body ?? {}) as Record<string, unknown>;

    const input: { title?: string; description?: string; url?: string } = {};
    if (typeof payload.title === "string") {
      const title = payload.title.trim();
      if (!title) {
        return fail(
          {
            code: "RESOURCE_UPDATE_VALIDATION_FAILED",
            message: "title 不能为空。"
          },
          400
        );
      }
      input.title = title;
    }
    if (typeof payload.description === "string") {
      input.description = payload.description.trim();
    }
    if (typeof payload.url === "string") {
      input.url = payload.url.trim();
    }

    if (!input.title && input.description === undefined && input.url === undefined) {
      return fail(
        {
          code: "RESOURCE_UPDATE_VALIDATION_FAILED",
          message: "至少提供一个可更新字段：title/description/url。"
        },
        400
      );
    }

    const resource = await updateResource(id, input);
    if (!resource) {
      return fail(
        {
          code: "RESOURCE_NOT_FOUND",
          message: "未找到对应资源。"
        },
        404
      );
    }

    return ok({ resource });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_UPDATE_FAILED",
        message: "更新资源失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ resourceId: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再删除资源。"
        },
        401
      );
    }

    const { resourceId } = await context.params;
    const id = normalizeId(resourceId);
    if (!id) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "resourceId 不能为空。"
        },
        400
      );
    }

    const resources = await listResources();
    const existing = resources.find((item) => item.id === id);
    if (!existing) {
      return fail(
        {
          code: "RESOURCE_NOT_FOUND",
          message: "未找到对应资源。"
        },
        404
      );
    }

    if (existing.createdBy !== userId) {
      return fail(
        {
          code: "FORBIDDEN",
          message: "仅资源创建者可以删除该资源。"
        },
        403
      );
    }

    const [bookmarks, notes, ratings] = await Promise.all([
      listResourceBookmarks(undefined, id),
      listResourceNotes(undefined, id),
      listResourceRatings(undefined, id)
    ]);

    await Promise.all([
      ...bookmarks.map((bookmark) => deleteResourceBookmark(bookmark.id)),
      ...notes.map((note) => deleteResourceNote(note.id)),
      ...ratings.map((rating) => deleteResourceRating(rating.id))
    ]);

    const deleted = await deleteResource(id);
    if (!deleted) {
      return fail(
        {
          code: "RESOURCE_NOT_FOUND",
          message: "未找到对应资源。"
        },
        404
      );
    }

    return ok({ deleted: true });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_DELETE_FAILED",
        message: "删除资源失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { loadDb } from "@/lib/server/store";
import {
  createResourceBookmark,
  deleteResourceBookmark,
  listResourceBookmarks
} from "@/lib/server/resources-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再查看收藏。"
        },
        401
      );
    }

    const bookmarks = await listResourceBookmarks(userId);
    return ok({ bookmarks });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_BOOKMARKS_LIST_FAILED",
        message: "获取资源收藏失败。",
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
          message: "请先登录后再收藏资源。"
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
          code: "RESOURCE_BOOKMARK_CREATE_INVALID_JSON",
          message: "请求体必须是 JSON。"
        },
        400
      );
    }

    const payload = (body ?? {}) as Record<string, unknown>;
    const resourceId = normalizeId(payload.resourceId);
    if (!resourceId) {
      return fail(
        {
          code: "RESOURCE_BOOKMARK_CREATE_VALIDATION_FAILED",
          message: "resourceId 为必填字段。"
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

    const existing = await listResourceBookmarks(userId, resourceId);
    if (existing.length > 0) {
      return fail(
        {
          code: "RESOURCE_BOOKMARK_ALREADY_EXISTS",
          message: "不能重复收藏同一个资源。"
        },
        409
      );
    }

    const bookmark = await createResourceBookmark({
      userId,
      resourceId
    });

    return ok({ bookmark });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_BOOKMARK_CREATE_FAILED",
        message: "创建收藏失败。",
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
          message: "请先登录后再取消收藏。"
        },
        401
      );
    }

    const { searchParams } = new URL(request.url);
    const bookmarkId = normalizeId(searchParams.get("bookmarkId"));
    if (!bookmarkId) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "bookmarkId 不能为空。"
        },
        400
      );
    }

    const all = await listResourceBookmarks();
    const existing = all.find((bookmark: { id: string }) => bookmark.id === bookmarkId);
    if (!existing) {
      return fail(
        {
          code: "RESOURCE_BOOKMARK_NOT_FOUND",
          message: "未找到对应收藏。"
        },
        404
      );
    }

    if (existing.userId !== userId) {
      return fail(
        {
          code: "FORBIDDEN",
          message: "无权限删除该收藏。"
        },
        403
      );
    }

    const deleted = await deleteResourceBookmark(bookmarkId);
    if (!deleted) {
      return fail(
        {
          code: "RESOURCE_BOOKMARK_NOT_FOUND",
          message: "未找到对应收藏。"
        },
        404
      );
    }

    return ok({ deleted: true });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_BOOKMARK_DELETE_FAILED",
        message: "删除收藏失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

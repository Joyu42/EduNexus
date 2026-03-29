import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import {
  deleteGroupResource,
  getGroupResource,
  isActiveMember,
  isActiveOwner,
  updateGroupResource
} from "@/lib/server/groups-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function ensureGroupExists(groupId: string) {
  const { loadDb } = await import("@/lib/server/store");
  const db = await loadDb();
  return db.publicGroups.find((item) => item.id === groupId) ?? null;
}

export async function GET(_request: Request, context: { params: Promise<{ groupId: string; resourceId: string }> }) {
  try {
    const { groupId, resourceId } = await context.params;
    const id = normalizeId(groupId);
    const rid = normalizeId(resourceId);

    if (!id || !rid) {
      return fail({ code: "INVALID_REQUEST", message: "groupId 或 resourceId 不能为空。" }, 400);
    }

    const group = await ensureGroupExists(id);
    if (!group) {
      return fail({ code: "GROUP_NOT_FOUND", message: "未找到对应小组。" }, 404);
    }

    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "请先登录。" }, 401);
    }

    const membership = await isActiveMember(id, userId);
    if (!membership) {
      return fail({ code: "FORBIDDEN", message: "需要小组成员才能查看资源。" }, 403);
    }

    const groupResource = await getGroupResource(rid);
    if (!groupResource || groupResource.groupId !== id) {
      return fail({ code: "RESOURCE_NOT_FOUND", message: "未找到对应资源。" }, 404);
    }

    return ok({ groupResource });
  } catch (error) {
    return fail(
      {
        code: "GROUP_RESOURCE_GET_FAILED",
        message: "获取小组资源失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function PUT(request: Request, context: { params: Promise<{ groupId: string; resourceId: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "请先登录。" }, 401);
    }

    const { groupId, resourceId } = await context.params;
    const id = normalizeId(groupId);
    const rid = normalizeId(resourceId);

    if (!id || !rid) {
      return fail({ code: "INVALID_REQUEST", message: "groupId 或 resourceId 不能为空。" }, 400);
    }

    const group = await ensureGroupExists(id);
    if (!group) {
      return fail({ code: "GROUP_NOT_FOUND", message: "未找到对应小组。" }, 404);
    }

    const membership = await isActiveMember(id, userId);
    if (!membership) {
      return fail({ code: "FORBIDDEN", message: "需要小组成员才能更新资源。" }, 403);
    }

    const groupResource = await getGroupResource(rid);
    if (!groupResource || groupResource.groupId !== id) {
      return fail({ code: "RESOURCE_NOT_FOUND", message: "未找到对应资源。" }, 404);
    }

    const isOwner = await isActiveOwner(id, userId);
    if (groupResource.createdBy !== userId && !isOwner) {
      return fail({ code: "FORBIDDEN", message: "无权更新此资源。" }, 403);
    }

    const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const title = typeof json.title === "string" ? json.title.trim() : undefined;
    const description = typeof json.description === "string" ? json.description : undefined;
    const url = typeof json.url === "string" ? json.url.trim() : undefined;

    const updated = await updateGroupResource(rid, { title, description, url });
    return ok({ groupResource: updated });
  } catch (error) {
    return fail(
      {
        code: "GROUP_RESOURCE_UPDATE_FAILED",
        message: "更新小组资源失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ groupId: string; resourceId: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "请先登录。" }, 401);
    }

    const { groupId, resourceId } = await context.params;
    const id = normalizeId(groupId);
    const rid = normalizeId(resourceId);

    if (!id || !rid) {
      return fail({ code: "INVALID_REQUEST", message: "groupId 或 resourceId 不能为空。" }, 400);
    }

    const group = await ensureGroupExists(id);
    if (!group) {
      return fail({ code: "GROUP_NOT_FOUND", message: "未找到对应小组。" }, 404);
    }

    const membership = await isActiveMember(id, userId);
    if (!membership) {
      return fail({ code: "FORBIDDEN", message: "需要小组成员才能删除资源。" }, 403);
    }

    const groupResource = await getGroupResource(rid);
    if (!groupResource || groupResource.groupId !== id) {
      return fail({ code: "RESOURCE_NOT_FOUND", message: "未找到对应资源。" }, 404);
    }

    const isOwner = await isActiveOwner(id, userId);
    if (groupResource.createdBy !== userId && !isOwner) {
      return fail({ code: "FORBIDDEN", message: "无权删除此资源。" }, 403);
    }

    await deleteGroupResource(rid);
    return ok({ success: true });
  } catch (error) {
    return fail(
      {
        code: "GROUP_RESOURCE_DELETE_FAILED",
        message: "删除小组资源失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

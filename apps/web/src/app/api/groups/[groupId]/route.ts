import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { loadDb } from "@/lib/server/store";
import {
  deleteGroup,
  deleteGroupMember,
  deleteGroupPost,
  deleteGroupSharedResource,
  deleteGroupTask,
  listGroupMembers,
  listGroupPosts,
  listGroupSharedResources,
  listGroupTasks,
  syncGroupMemberCount,
  updateGroup
} from "@/lib/server/groups-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(_request: Request, context: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await context.params;
    const id = normalizeId(groupId);
    if (!id) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "groupId 不能为空。"
        },
        400
      );
    }

    const db = await loadDb();
    const group = db.publicGroups.find((item) => item.id === id);
    if (!group) {
      return fail(
        {
          code: "GROUP_NOT_FOUND",
          message: "未找到对应小组。"
        },
        404
      );
    }

    const activeMemberCount = db.groupMembers.filter(
      (member) => member.groupId === id && member.status === "active"
    ).length;

    return ok({ group: { ...group, memberCount: activeMemberCount } });
  } catch (error) {
    return fail(
      {
        code: "GROUP_DETAIL_FAILED",
        message: "获取小组详情失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ groupId: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再更新小组。"
        },
        401
      );
    }

    const { groupId } = await context.params;
    const id = normalizeId(groupId);
    if (!id) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "groupId 不能为空。"
        },
        400
      );
    }

    const db = await loadDb();
    const existing = db.publicGroups.find((item) => item.id === id);
    if (!existing) {
      return fail(
        {
          code: "GROUP_NOT_FOUND",
          message: "未找到对应小组。"
        },
        404
      );
    }

    if (existing.createdBy !== userId) {
      return fail(
        {
          code: "FORBIDDEN",
          message: "仅小组创建者可以更新该小组。"
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
          code: "GROUP_UPDATE_INVALID_JSON",
          message: "请求体必须是 JSON。"
        },
        400
      );
    }

    const payload = (body ?? {}) as Record<string, unknown>;
    const input: { name?: string; description?: string } = {};

    if (typeof payload.name === "string") {
      const name = payload.name.trim();
      if (!name) {
        return fail(
          {
            code: "GROUP_UPDATE_VALIDATION_FAILED",
            message: "name 不能为空。"
          },
          400
        );
      }
      input.name = name;
    }

    if (typeof payload.description === "string") {
      input.description = payload.description.trim();
    }

    if (input.name === undefined && input.description === undefined) {
      return fail(
        {
          code: "GROUP_UPDATE_VALIDATION_FAILED",
          message: "至少提供一个可更新字段：name/description。"
        },
        400
      );
    }

    const group = await updateGroup(id, input);
    if (!group) {
      return fail(
        {
          code: "GROUP_NOT_FOUND",
          message: "未找到对应小组。"
        },
        404
      );
    }

    const withSyncedMemberCount = await syncGroupMemberCount(id);
    return ok({ group: withSyncedMemberCount ?? group });
  } catch (error) {
    return fail(
      {
        code: "GROUP_UPDATE_FAILED",
        message: "更新小组失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ groupId: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再删除小组。"
        },
        401
      );
    }

    const { groupId } = await context.params;
    const id = normalizeId(groupId);
    if (!id) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "groupId 不能为空。"
        },
        400
      );
    }

    const db = await loadDb();
    const existing = db.publicGroups.find((item) => item.id === id);
    if (!existing) {
      return fail(
        {
          code: "GROUP_NOT_FOUND",
          message: "未找到对应小组。"
        },
        404
      );
    }

    if (existing.createdBy !== userId) {
      return fail(
        {
          code: "FORBIDDEN",
          message: "仅小组创建者可以删除该小组。"
        },
        403
      );
    }

    const [members, posts, tasks, sharedResources] = await Promise.all([
      listGroupMembers(id),
      listGroupPosts(id),
      listGroupTasks(id),
      listGroupSharedResources(id)
    ]);

    await Promise.all([
      ...members.map((member) => deleteGroupMember(member.id)),
      ...posts.map((post) => deleteGroupPost(post.id)),
      ...tasks.map((task) => deleteGroupTask(task.id)),
      ...sharedResources.map((resource) => deleteGroupSharedResource(resource.id))
    ]);

    const deleted = await deleteGroup(id);
    if (!deleted) {
      return fail(
        {
          code: "GROUP_NOT_FOUND",
          message: "未找到对应小组。"
        },
        404
      );
    }

    return ok({ deleted: true });
  } catch (error) {
    return fail(
      {
        code: "GROUP_DELETE_FAILED",
        message: "删除小组失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

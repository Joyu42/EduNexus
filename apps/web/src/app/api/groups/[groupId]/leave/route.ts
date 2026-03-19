import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { loadDb } from "@/lib/server/store";
import { deleteGroupMember, listGroupMembers, syncGroupMemberCount } from "@/lib/server/groups-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(_request: Request, context: { params: Promise<{ groupId: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再离开小组。"
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

    const members = await listGroupMembers(id);
    const member = members.find((item) => item.userId === userId && item.status === "active");
    if (!member) {
      return fail(
        {
          code: "GROUP_NOT_JOINED",
          message: "你尚未加入该小组。"
        },
        409
      );
    }

    if (group.createdBy === userId) {
      const hasSomeoneToTransfer = members.some(
        (item) => item.userId !== userId && item.status === "active" && (item.role === "admin" || item.role === "member")
      );
      if (!hasSomeoneToTransfer) {
        return fail(
          {
            code: "GROUP_OWNER_CANNOT_LEAVE",
            message: "所有者无法离开小组"
          },
          409
        );
      }
    }

    const deleted = await deleteGroupMember(member.id);
    if (!deleted) {
      return fail(
        {
          code: "GROUP_LEAVE_FAILED",
          message: "离开小组失败。"
        },
        500
      );
    }

    await syncGroupMemberCount(id);

    return ok({ left: true });
  } catch (error) {
    return fail(
      {
        code: "GROUP_LEAVE_FAILED",
        message: "离开小组失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

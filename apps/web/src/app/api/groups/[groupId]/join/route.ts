import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { loadDb } from "@/lib/server/store";
import { createGroupMember, listGroupMembers, syncGroupMemberCount } from "@/lib/server/groups-service";

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
          message: "请先登录后再加入小组。"
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
    const alreadyJoined = members.some((member) => member.userId === userId && member.status === "active");
    if (alreadyJoined) {
      return fail(
        {
          code: "GROUP_ALREADY_JOINED",
          message: "你已加入该小组。"
        },
        409
      );
    }

    const member = await createGroupMember({ groupId: id, userId });
    await syncGroupMemberCount(id);

    return ok({ member });
  } catch (error) {
    return fail(
      {
        code: "GROUP_JOIN_FAILED",
        message: "加入小组失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

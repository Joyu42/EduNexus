import { fail, ok } from "@/lib/server/response";
import { loadDb } from "@/lib/server/store";
import { listGroupMembers } from "@/lib/server/groups-service";

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

    const members = await listGroupMembers(id);
    return ok({ members });
  } catch (error) {
    return fail(
      {
        code: "GROUP_MEMBERS_LIST_FAILED",
        message: "获取小组成员失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

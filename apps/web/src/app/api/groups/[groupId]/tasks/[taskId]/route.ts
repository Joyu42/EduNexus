import { NextResponse } from "next/server";
import { fail } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { updateGroupTask, isActiveMember, listGroupTasks } from "@/lib/server/groups-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, context: { params: Promise<{ groupId: string; taskId: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录。"
        },
        401
      );
    }

    const { groupId, taskId } = await context.params;
    const gId = normalizeId(groupId);
    const tId = normalizeId(taskId);
    if (!gId || !tId) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "groupId 和 taskId 不能为空。"
        },
        400
      );
    }

    const isMember = await isActiveMember(gId, userId);
    if (!isMember) {
      return fail(
        {
          code: "FORBIDDEN",
          message: "只有小组成员才能更新任务。"
        },
        403
      );
    }

    const tasks = await listGroupTasks(gId);
    const taskExists = tasks.some((t) => t.id === tId);
    if (!taskExists) {
      return fail(
        {
          code: "NOT_FOUND",
          message: "未找到该任务或该任务不属于当前小组。"
        },
        404
      );
    }

    const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const status = typeof json.status === "string" ? json.status : undefined;

    if (!status || !["todo", "in_progress", "done"].includes(status)) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "无效的任务状态。"
        },
        400
      );
    }

    const result = await updateGroupTask(tId, { status: status as "todo" | "in_progress" | "done" });
    if (!result) {
      return fail(
        {
          code: "NOT_FOUND",
          message: "未找到该任务。"
        },
        404
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { task: result }
      },
      { status: 200 }
    );
  } catch (error) {
    return fail(
      {
        code: "GROUP_TASK_UPDATE_FAILED",
        message: "更新小组任务失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

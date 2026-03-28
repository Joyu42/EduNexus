import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { createGroupTask, isActiveOwner, listGroupTasks } from "@/lib/server/groups-service";
import { loadDb } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function ensureGroupExists(groupId: string) {
  const db = await loadDb();
  return db.publicGroups.find((item) => item.id === groupId) ?? null;
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

    const group = await ensureGroupExists(id);
    if (!group) {
      return fail(
        {
          code: "GROUP_NOT_FOUND",
          message: "未找到对应小组。"
        },
        404
      );
    }

    const tasks = await listGroupTasks(id);
    return ok({ tasks });
  } catch (error) {
    return fail(
      {
        code: "GROUP_TASKS_LIST_FAILED",
        message: "获取小组任务失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function POST(request: Request, context: { params: Promise<{ groupId: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再创建任务。"
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

    const group = await ensureGroupExists(id);
    if (!group) {
      return fail(
        {
          code: "GROUP_NOT_FOUND",
          message: "未找到对应小组。"
        },
        404
      );
    }

    const owned = await isActiveOwner(id, userId);
    if (!owned) {
      return fail(
        {
          code: "FORBIDDEN",
          message: "只有组长才能创建任务。"
        },
        403
      );
    }

    const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const title = typeof json.title === "string" ? json.title.trim() : "";
    const description = typeof json.description === "string" ? json.description.trim() : undefined;
    const dueDateRaw = typeof json.dueDate === "string" ? json.dueDate.trim() : "";
    const dueDate = dueDateRaw ? dueDateRaw : undefined;

    if (!title) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "任务标题不能为空。"
        },
        400
      );
    }

    const task = await createGroupTask({
      groupId: id,
      title,
      description,
      dueDate
    });

    return NextResponse.json(
      {
        success: true,
        data: { task }
      },
      { status: 201 }
    );
  } catch (error) {
    return fail(
      {
        code: "GROUP_TASK_CREATE_FAILED",
        message: "创建小组任务失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

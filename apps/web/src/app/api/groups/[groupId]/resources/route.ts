import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { createGroupResource, isActiveMember, listGroupResources } from "@/lib/server/groups-service";

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

export async function GET(_request: Request, context: { params: Promise<{ groupId: string }> }) {
  try {
    const { groupId } = await context.params;
    const id = normalizeId(groupId);
    if (!id) {
      return fail({ code: "INVALID_REQUEST", message: "groupId 不能为空。" }, 400);
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

    const groupResources = await listGroupResources(id);
    return ok({ groupResources });
  } catch (error) {
    return fail(
      {
        code: "GROUP_RESOURCES_LIST_FAILED",
        message: "获取小组资源失败。",
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
      return fail({ code: "UNAUTHORIZED", message: "请先登录。" }, 401);
    }

    const { groupId } = await context.params;
    const id = normalizeId(groupId);
    if (!id) {
      return fail({ code: "INVALID_REQUEST", message: "groupId 不能为空。" }, 400);
    }

    const group = await ensureGroupExists(id);
    if (!group) {
      return fail({ code: "GROUP_NOT_FOUND", message: "未找到对应小组。" }, 404);
    }

    const membership = await isActiveMember(id, userId);
    if (!membership) {
      return fail({ code: "FORBIDDEN", message: "需要小组成员才能创建资源。" }, 403);
    }

    const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const title = typeof json.title === "string" ? json.title.trim() : "";
    const description = typeof json.description === "string" ? json.description : "";
    const url = typeof json.url === "string" ? json.url.trim() : "";

    if (!title) {
      return fail({ code: "INVALID_REQUEST", message: "title 不能为空。" }, 400);
    }
    if (!url) {
      return fail({ code: "INVALID_REQUEST", message: "url 不能为空。" }, 400);
    }

    const groupResource = await createGroupResource({
      groupId: id,
      title,
      description,
      url,
      createdBy: userId
    });

    return NextResponse.json({ success: true, data: { groupResource } }, { status: 201 });
  } catch (error) {
    return fail(
      {
        code: "GROUP_RESOURCE_CREATE_FAILED",
        message: "创建小组资源失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

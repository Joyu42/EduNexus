import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { loadDb } from "@/lib/server/store";
import { createGroupSharedResource, listGroupSharedResources } from "@/lib/server/groups-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function ensureGroupExists(groupId: string) {
  const db = await loadDb();
  return db.publicGroups.find((item) => item.id === groupId) ?? null;
}

async function ensureResourceExists(resourceId: string) {
  const db = await loadDb();
  return db.publicResources.find((item) => item.id === resourceId) ?? null;
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

    const sharedResources = await listGroupSharedResources(id);
    return ok({ sharedResources });
  } catch (error) {
    return fail(
      {
        code: "GROUP_SHARED_RESOURCES_LIST_FAILED",
        message: "获取小组共享资源失败。",
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
          message: "请先登录后再分享资源。"
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

    const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const resourceId = typeof json.resourceId === "string" ? json.resourceId.trim() : "";
    if (!resourceId) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "resourceId 不能为空。"
        },
        400
      );
    }

    const resource = await ensureResourceExists(resourceId);
    if (!resource) {
      return fail(
        {
          code: "RESOURCE_NOT_FOUND",
          message: "未找到对应资源。"
        },
        404
      );
    }

    const sharedResource = await createGroupSharedResource({
      groupId: id,
      resourceId,
      sharedBy: userId
    });

    return NextResponse.json(
      {
        success: true,
        data: { sharedResource }
      },
      { status: 201 }
    );
  } catch (error) {
    return fail(
      {
        code: "GROUP_SHARED_RESOURCE_CREATE_FAILED",
        message: "分享小组资源失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { loadDb } from "@/lib/server/store";
import { createGroupPost, listGroupMembers, listGroupPosts } from "@/lib/server/groups-service";

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

    const posts = await listGroupPosts(id);
    return ok({ posts });
  } catch (error) {
    return fail(
      {
        code: "GROUP_POSTS_LIST_FAILED",
        message: "获取小组帖子失败。",
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
          message: "请先登录后再发布帖子。"
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

    const members = await listGroupMembers(id);
    const joined = members.some((member) => member.userId === userId && member.status === "active");
    if (!joined) {
      return fail(
        {
          code: "FORBIDDEN",
          message: "加入小组后才能发布帖子。"
        },
        403
      );
    }

    const json = await request.json().catch(() => ({}));
    const title = typeof json.title === "string" ? json.title.trim() : "";
    const content = typeof json.content === "string" ? json.content.trim() : "";
    if (!title || !content) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "帖子标题和正文不能为空。"
        },
        400
      );
    }

    const post = await createGroupPost({
      groupId: id,
      authorId: userId,
      title,
      content
    });

    return NextResponse.json(
      {
        success: true,
        data: { post }
      },
      { status: 201 }
    );
  } catch (error) {
    return fail(
      {
        code: "GROUP_POST_CREATE_FAILED",
        message: "发布小组帖子失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

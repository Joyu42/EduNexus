import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { loadDb, saveDb } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function createId(prefix: string): string {
  const token = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${token}`;
}

export async function GET(_request: Request) {
  try {
    const db = await loadDb();
    return ok({ posts: db.publicPosts });
  } catch (error) {
    return fail(
      {
        code: "COMMUNITY_POSTS_LIST_FAILED",
        message: "获取社区帖子失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "FORBIDDEN",
          message: "匿名用户不能发布社区帖子。"
        },
        403
      );
    }

    const json = await request.json().catch(() => ({}));
    const title = typeof json.title === "string" ? json.title.trim() : "";
    const content = typeof json.content === "string" ? json.content.trim() : "";
    const authorName = typeof json.authorName === "string" ? json.authorName.trim() : "";

    if (!title || !content) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "帖子标题和正文不能为空。"
        },
        400
      );
    }

    const db = await loadDb();
    const now = new Date().toISOString();
    const post = {
      id: createId("post"),
      title,
      content,
      authorId: userId,
      authorName: authorName || "已登录用户",
      createdAt: now,
      updatedAt: now
    };

    await saveDb({
      ...db,
      publicPosts: [post, ...db.publicPosts]
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
        code: "COMMUNITY_POST_CREATE_FAILED",
        message: "发布社区帖子失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

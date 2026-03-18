import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/server/response";
import { createPost } from "@/lib/server/community-service";
import { loadDb } from "@/lib/server/store";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { getUserById } from "@/lib/server/user-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
          code: "UNAUTHORIZED",
          message: "请先登录后再发布帖子。"
        },
        401
      );
    }

    const user = await getUserById(userId);
    if (!user?.name) {
      return fail(
        {
          code: "PROFILE_INCOMPLETE",
          message: "请先在配置中心设置用户名后再发布。"
        },
        400
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

    const post = await createPost({
      title,
      content,
      authorId: userId,
      authorName: user.name
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

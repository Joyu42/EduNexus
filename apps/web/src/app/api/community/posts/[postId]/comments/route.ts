import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/server/auth-utils";
import { getUserById } from "@/lib/server/user-service";
import { createCommunityComment, listCommunityComments } from "@/lib/server/community-service";
import { fail, ok } from "@/lib/server/response";
import { loadDb } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getPostById(postId: string) {
  const db = await loadDb();
  return db.publicPosts.find((item) => item.id === postId) ?? null;
}

async function getCommentById(commentId: string) {
  const db = await loadDb();
  return db.communityComments.find((item) => item.id === commentId) ?? null;
}

export async function GET(_request: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await context.params;
    const id = normalizeId(postId);
    if (!id) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "postId 不能为空。"
        },
        400
      );
    }

    const post = await getPostById(id);
    if (!post) {
      return fail(
        {
          code: "COMMUNITY_POST_NOT_FOUND",
          message: "未找到对应帖子。"
        },
        404
      );
    }

    const comments = await listCommunityComments(id);

    const commentsWithAuthorName = await Promise.all(
      comments.map(async (comment) => {
        const author = await getUserById(comment.authorId);
        const authorName = author?.name ?? author?.email ?? "未知用户";
        return { ...comment, authorName };
      })
    );

    return ok({ comments: commentsWithAuthorName });
  } catch (error) {
    return fail(
      {
        code: "COMMUNITY_COMMENTS_LIST_FAILED",
        message: "获取评论失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function POST(request: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再发表评论。"
        },
        401
      );
    }

    const { postId } = await context.params;
    const id = normalizeId(postId);
    if (!id) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "postId 不能为空。"
        },
        400
      );
    }

    const post = await getPostById(id);
    if (!post) {
      return fail(
        {
          code: "COMMUNITY_POST_NOT_FOUND",
          message: "未找到对应帖子。"
        },
        404
      );
    }

    const json = await request.json().catch(() => ({}));
    const content = typeof json.content === "string" ? json.content.trim() : "";
    const parentId = normalizeId(json.parentId);

    if (!content) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "评论内容不能为空。"
        },
        400
      );
    }

    if (parentId) {
      const parent = await getCommentById(parentId);
      if (!parent || parent.postId !== id) {
        return fail(
          {
            code: "COMMUNITY_COMMENT_NOT_FOUND",
            message: "未找到要回复的评论。"
          },
          404
        );
      }

      if (parent.parentCommentId) {
        return fail(
          {
            code: "INVALID_REQUEST",
            message: "仅支持一层评论回复。"
          },
          400
        );
      }
    }

    const comment = await createCommunityComment({
      postId: id,
      authorId: userId,
      content,
      parentCommentId: parentId ? parentId : null
    });

    return NextResponse.json(
      {
        success: true,
        data: { comment }
      },
      { status: 201 }
    );
  } catch (error) {
    return fail(
      {
        code: "COMMUNITY_COMMENT_CREATE_FAILED",
        message: "发表评论失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

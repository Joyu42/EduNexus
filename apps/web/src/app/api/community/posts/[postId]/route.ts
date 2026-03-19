import { fail, ok } from "@/lib/server/response";
import {
  deleteCommunityComment,
  deleteCommunityPost,
  deleteCommunityReaction,
  listCommunityComments,
  listCommunityReactions
} from "@/lib/server/community-service";
import { getCurrentUserId } from "@/lib/server/auth-utils";
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

    return ok({ post });
  } catch (error) {
    return fail(
      {
        code: "COMMUNITY_POST_GET_FAILED",
        message: "获取帖子详情失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ postId: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再删除帖子。"
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

    if (post.authorId !== userId) {
      return fail(
        {
          code: "FORBIDDEN",
          message: "只有帖子创建者可以删除该帖子。"
        },
        403
      );
    }

    const comments = await listCommunityComments(id);
    const postReactions = await listCommunityReactions("post", id);
    const commentReactionsList = await Promise.all(
      comments.map((comment) => listCommunityReactions("comment", comment.id))
    );
    const commentReactions = commentReactionsList.flat();

    await Promise.all([
      ...postReactions.map((reaction) => deleteCommunityReaction(reaction.id)),
      ...commentReactions.map((reaction) => deleteCommunityReaction(reaction.id)),
      ...comments.map((comment) => deleteCommunityComment(comment.id))
    ]);

    const deleted = await deleteCommunityPost(id);
    if (!deleted) {
      return fail(
        {
          code: "COMMUNITY_POST_DELETE_FAILED",
          message: "删除帖子失败。"
        },
        500
      );
    }

    return ok({ deleted: true });
  } catch (error) {
    return fail(
      {
        code: "COMMUNITY_POST_DELETE_FAILED",
        message: "删除帖子失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

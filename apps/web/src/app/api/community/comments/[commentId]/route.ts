import { getCurrentUserId } from "@/lib/server/auth-utils";
import { deleteCommunityComment, listCommunityComments, updateCommunityComment } from "@/lib/server/community-service";
import { fail, ok } from "@/lib/server/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, context: { params: Promise<{ commentId: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "请先登录后再编辑评论。" }, 401);
    }

    const { commentId } = await context.params;
    const id = normalizeId(commentId);
    if (!id) {
      return fail({ code: "INVALID_REQUEST", message: "commentId 不能为空。" }, 400);
    }

    const comment = (await listCommunityComments()).find((item) => item.id === id) ?? null;
    if (!comment) {
      return fail({ code: "COMMUNITY_COMMENT_NOT_FOUND", message: "评论不存在。" }, 404);
    }
    if (comment.authorId !== userId) {
      return fail({ code: "FORBIDDEN", message: "仅评论作者可编辑。" }, 403);
    }

    const json = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const content = typeof json.content === "string" ? json.content.trim() : "";
    if (!content) {
      return fail({ code: "INVALID_REQUEST", message: "评论内容不能为空。" }, 400);
    }

    const updated = await updateCommunityComment(id, { content });
    if (!updated) {
      return fail({ code: "COMMUNITY_COMMENT_NOT_FOUND", message: "评论不存在。" }, 404);
    }
    return ok({ comment: updated });
  } catch (error) {
    return fail(
      {
        code: "COMMUNITY_COMMENT_UPDATE_FAILED",
        message: "更新评论失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ commentId: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "请先登录后再删除评论。" }, 401);
    }

    const { commentId } = await context.params;
    const id = normalizeId(commentId);
    if (!id) {
      return fail({ code: "INVALID_REQUEST", message: "commentId 不能为空。" }, 400);
    }

    const allComments = await listCommunityComments();
    const comment = allComments.find((item) => item.id === id) ?? null;
    if (!comment) {
      return fail({ code: "COMMUNITY_COMMENT_NOT_FOUND", message: "评论不存在。" }, 404);
    }
    if (comment.authorId !== userId) {
      return fail({ code: "FORBIDDEN", message: "仅评论作者可删除。" }, 403);
    }

    const replies = allComments.filter((item) => item.parentCommentId === id);
    await Promise.all(replies.map((reply) => deleteCommunityComment(reply.id)));
    const deleted = await deleteCommunityComment(id);
    if (!deleted) {
      return fail({ code: "COMMUNITY_COMMENT_DELETE_FAILED", message: "删除评论失败。" }, 500);
    }
    return ok({ deleted: true });
  } catch (error) {
    return fail(
      {
        code: "COMMUNITY_COMMENT_DELETE_FAILED",
        message: "删除评论失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

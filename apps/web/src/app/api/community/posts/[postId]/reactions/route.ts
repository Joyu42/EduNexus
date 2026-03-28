import { getCurrentUserId } from "@/lib/server/auth-utils";
import {
  createCommunityReaction,
  deleteCommunityReaction,
  listCommunityReactions
} from "@/lib/server/community-service";
import { fail, ok } from "@/lib/server/response";
import { loadDb } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const ALLOWED_REACTION_TYPES = new Set(["like", "love", "idea", "celebrate"]);

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

    const reactions = await listCommunityReactions("post", id);
    const byType: Record<string, number> = {};
    for (const reaction of reactions) {
      const type = reaction.reactionType;
      byType[type] = (byType[type] ?? 0) + 1;
    }

    return ok({ stats: { total: reactions.length, byType } });
  } catch (error) {
    return fail(
      {
        code: "COMMUNITY_REACTIONS_GET_FAILED",
        message: "获取 reactions 统计失败。",
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
          message: "请先登录后再操作。"
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
    const reactionType = typeof json.type === "string" ? json.type.trim() : "";
    if (!reactionType) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "reaction type 不能为空。"
        },
        400
      );
    }
    if (!ALLOWED_REACTION_TYPES.has(reactionType)) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "reaction type 仅支持 like/love/idea/celebrate。"
        },
        400
      );
    }

    const reactions = await listCommunityReactions("post", id);
    const existing = reactions.find((reaction) => reaction.actorId === userId) ?? null;

    if (existing && existing.reactionType !== reactionType) {
      const deleted = await deleteCommunityReaction(existing.id);
      if (deleted === false) {
        return fail(
          {
            code: "COMMUNITY_REACTION_UPDATE_FAILED",
            message: "更新 reaction 失败。"
          },
          500
        );
      }
    }

    if (existing && existing.reactionType === reactionType) {
      return ok({ reaction: existing, updated: false });
    }

    const reaction = await createCommunityReaction({
      targetType: "post",
      targetId: id,
      actorId: userId,
      reactionType
    });

    return ok({ reaction, updated: Boolean(existing) });
  } catch (error) {
    return fail(
      {
        code: "COMMUNITY_REACTION_UPSERT_FAILED",
        message: "提交 reaction 失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

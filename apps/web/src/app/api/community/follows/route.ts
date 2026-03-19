import { getCurrentUserId } from "@/lib/server/auth-utils";
import {
  createCommunityFollow,
  deleteCommunityFollow,
  listCommunityFollows
} from "@/lib/server/community-service";
import { fail, ok } from "@/lib/server/response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(_request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "请先登录" }, 401);
    }

    const follows = await listCommunityFollows(userId);
    const followeeIds = follows.map((item) => item.followeeId);
    return ok({ follows, followeeIds });
  } catch (error) {
    return fail(
      {
        code: "COMMUNITY_FOLLOWS_LIST_FAILED",
        message: "获取关注列表失败。",
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
      return fail({ code: "UNAUTHORIZED", message: "请先登录" }, 401);
    }

    const json = await request.json().catch(() => ({}));
    const targetUserId = normalizeId(json?.targetUserId);
    if (!targetUserId) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "targetUserId 不能为空。"
        },
        400
      );
    }

    if (targetUserId === userId) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "不能关注自己。"
        },
        400
      );
    }

    const existing = (await listCommunityFollows(userId, targetUserId))[0] ?? null;
    if (existing) {
      return ok({ follow: existing, created: false });
    }

    const follow = await createCommunityFollow({ followerId: userId, followeeId: targetUserId });
    return ok({ follow, created: true });
  } catch (error) {
    return fail(
      {
        code: "COMMUNITY_FOLLOW_CREATE_FAILED",
        message: "关注用户失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "请先登录" }, 401);
    }

    const url = new URL(request.url);
    const targetUserId = normalizeId(url.searchParams.get("targetUserId"));
    if (!targetUserId) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "targetUserId 不能为空。"
        },
        400
      );
    }

    if (targetUserId === userId) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "不能取消关注自己。"
        },
        400
      );
    }

    const existing = (await listCommunityFollows(userId, targetUserId))[0] ?? null;
    if (!existing) {
      return ok({ deleted: false });
    }

    const deleted = await deleteCommunityFollow(existing.id);
    if (deleted === false) {
      return fail(
        {
          code: "COMMUNITY_FOLLOW_DELETE_FAILED",
          message: "取消关注失败。"
        },
        500
      );
    }

    return ok({ deleted: true });
  } catch (error) {
    return fail(
      {
        code: "COMMUNITY_FOLLOW_DELETE_FAILED",
        message: "取消关注失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

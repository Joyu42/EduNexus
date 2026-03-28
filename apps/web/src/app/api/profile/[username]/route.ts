import { getUserByName } from "@/lib/server/user-service";
import { fail, ok } from "@/lib/server/response";
import { loadDb } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await context.params;
    const normalized = typeof username === "string" ? username.trim() : "";
    if (!normalized) {
      return fail({ code: "INVALID_REQUEST", message: "username 不能为空。" }, 400);
    }

    const user = await getUserByName(normalized);
    if (!user) {
      return fail({ code: "USER_NOT_FOUND", message: "用户不存在。" }, 404);
    }

    const db = await loadDb();
    const posts = db.publicPosts.filter((post) => post.authorId === user.id || post.authorName === normalized);
    const followers = db.communityFollows.filter((item) => item.followeeId === user.id).length;
    const following = db.communityFollows.filter((item) => item.followerId === user.id).length;

    return ok({
      profile: {
        id: user.id,
        username: user.name,
        followers,
        following,
        posts
      }
    });
  } catch (error) {
    return fail(
      {
        code: "PROFILE_GET_FAILED",
        message: "获取用户主页信息失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

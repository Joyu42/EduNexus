import { getCurrentUserId } from "@/lib/server/auth-utils";
import { createCommunityTopic, listCommunityTopics } from "@/lib/server/community-service";
import { fail, ok } from "@/lib/server/response";
import { loadDb } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeName(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

type TopicWithPostCount = Awaited<ReturnType<typeof listCommunityTopics>>[number] & {
  postCount: number;
};

export async function GET(_request: Request) {
  try {
    const topics = await listCommunityTopics();
    const db = await loadDb();
    const items: TopicWithPostCount[] = topics.map((topic) => ({
      ...topic,
      postCount: db.publicPosts.filter((post) => {
        const content = `${post.title}\n${post.content}`.toLowerCase();
        const escapedName = topic.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").toLowerCase();
        const pattern = new RegExp(`(^|\\s)#${escapedName}(\\s|$)`, "i");
        return pattern.test(content);
      }).length
    }));

    items.sort((a, b) => {
      const byCount = b.postCount - a.postCount;
      if (byCount !== 0) return byCount;
      return a.name.localeCompare(b.name, "zh-CN", { sensitivity: "base" });
    });

    return ok({ topics: items });
  } catch (error) {
    return fail(
      {
        code: "COMMUNITY_TOPICS_LIST_FAILED",
        message: "获取话题列表失败。",
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
          message: "请先登录后再创建话题。"
        },
        401
      );
    }

    const json = await request.json().catch(() => ({}));
    const name = normalizeName(json?.name);
    if (!name) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "name 不能为空。"
        },
        400
      );
    }

    const existing = (await listCommunityTopics()).find((topic) => topic.name === name) ?? null;
    if (existing) {
      return fail(
        {
          code: "TOPIC_ALREADY_EXISTS",
          message: "话题名称已存在。"
        },
        409
      );
    }

    const topic = await createCommunityTopic({
      name,
      createdBy: userId
    });

    return ok({ topic });
  } catch (error) {
    return fail(
      {
        code: "COMMUNITY_TOPIC_CREATE_FAILED",
        message: "创建话题失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

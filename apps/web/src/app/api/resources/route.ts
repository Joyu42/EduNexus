import { fail, ok } from "@/lib/server/response";
import { createResource, listResources } from "@/lib/server/resources-service";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { getUserById } from "@/lib/server/user-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const allResources = await listResources();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const sort = (searchParams.get("sort") ?? "newest").trim();
    const rawLimit = (searchParams.get("limit") ?? "").trim();
    const type = (searchParams.get("type") ?? "").trim();
    const category = (searchParams.get("category") ?? "").trim();
    const tags = (searchParams.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const limitParsed = rawLimit ? Number.parseInt(rawLimit, 10) : Number.NaN;
    const limit = Number.isFinite(limitParsed) ? Math.min(100, Math.max(1, limitParsed)) : 20;

    const keyword = q ? q.toLowerCase() : "";
    const filtered = keyword
      ? allResources.filter((resource) => {
          const title = resource.title?.toLowerCase?.() ?? "";
          const description = resource.description?.toLowerCase?.() ?? "";
          const resourceTags = Array.isArray(resource.tags) ? resource.tags : [];
          return (
            title.includes(keyword) ||
            description.includes(keyword) ||
            resourceTags.some((tag) => tag.toLowerCase().includes(keyword))
          );
        })
      : allResources;

    const typed = type
      ? filtered.filter((resource) => resource.type === type)
      : filtered;

    const categorized = category
      ? typed.filter((resource) => (resource.category ?? "") === category)
      : typed;

    const tagged = tags.length
      ? categorized.filter((resource) => {
          const resourceTags = Array.isArray(resource.tags) ? resource.tags : [];
          return tags.some((tag) => resourceTags.includes(tag));
        })
      : categorized;

    const sorted = filtered.slice();
    if (sort === "oldest") {
      sorted.sort((a, b) => {
        return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      });
    } else if (sort === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    } else {
      sorted.sort((a, b) => {
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      });
    }

    const resources = tagged.slice();

    if (sort === "oldest") {
      resources.sort((a, b) => {
        return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      });
    } else if (sort === "title") {
      resources.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    } else {
      resources.sort((a, b) => {
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      });
    }

    const limitedResources = resources.slice(0, limit);

    // Resolve createdBy userId to username for each resource
    const resourcesWithCreatorName = await Promise.all(
      limitedResources.map(async (resource) => {
        const creator = await getUserById(resource.createdBy);
        const createdByName = creator?.name ?? creator?.email ?? "未知用户";
        return { ...resource, createdByName };
      })
    );

    return ok({ resources: resourcesWithCreatorName, total: tagged.length });
  } catch (error) {
    return fail(
      {
        code: "RESOURCES_LIST_FAILED",
        message: "获取公共资源失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail(
      {
        code: "UNAUTHORIZED",
        message: "请先登录后再添加资源。"
      },
      401
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(
      {
        code: "RESOURCES_CREATE_INVALID_JSON",
        message: "请求体必须是 JSON。"
      },
      400
    );
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";

  if (!title) {
    return fail(
      {
        code: "RESOURCES_CREATE_VALIDATION_FAILED",
        message: "title 为必填字段。",
        details: {
          title: Boolean(title)
        }
      },
      400
    );
  }

    const description = typeof payload.description === "string" ? payload.description : undefined;
    const url = typeof payload.url === "string" ? payload.url : undefined;
    const type =
      payload.type === "document" ||
      payload.type === "video" ||
      payload.type === "tool" ||
      payload.type === "website" ||
      payload.type === "book"
        ? payload.type
        : undefined;
    const tags = Array.isArray(payload.tags)
      ? payload.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean)
      : undefined;
    const category = typeof payload.category === "string" ? payload.category.trim() : undefined;

    try {
      const resource = await createResource({
        title,
        description,
        url,
        createdBy: userId,
        type,
        tags,
        category
      });
    return ok({ resource });
  } catch (error) {
    return fail(
      {
        code: "RESOURCES_CREATE_FAILED",
        message: "创建公共资源失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

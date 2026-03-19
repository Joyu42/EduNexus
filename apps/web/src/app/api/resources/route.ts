import { fail, ok } from "@/lib/server/response";
import { createResource } from "@/lib/server/resources-service";
import { loadDb } from "@/lib/server/store";
import { getCurrentUserId } from "@/lib/server/auth-utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const db = await loadDb();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim();
    const sort = (searchParams.get("sort") ?? "newest").trim();
    const rawLimit = (searchParams.get("limit") ?? "").trim();

    const limitParsed = rawLimit ? Number.parseInt(rawLimit, 10) : Number.NaN;
    const limit = Number.isFinite(limitParsed) ? Math.min(100, Math.max(1, limitParsed)) : 20;

    const keyword = q ? q.toLowerCase() : "";
    const filtered = keyword
      ? db.publicResources.filter((resource) => {
          const title = resource.title?.toLowerCase?.() ?? "";
          const description = resource.description?.toLowerCase?.() ?? "";
          return title.includes(keyword) || description.includes(keyword);
        })
      : db.publicResources;

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

    const resources = sorted.slice(0, limit);
    return ok({ resources, total: filtered.length });
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

  try {
    const resource = await createResource({
      title,
      description,
      url,
      createdBy: userId
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

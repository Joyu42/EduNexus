import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { loadDb } from "@/lib/server/store";
import {
  createResourceRating,
  listResourceRatings,
  updateResourceRating
} from "@/lib/server/resources-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeId(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRating(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rating = Math.round(value);
  if (rating < 1 || rating > 5) return null;
  return rating;
}

export async function GET(_request: Request, context: { params: Promise<{ resourceId: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再查看评分。"
        },
        401
      );
    }

    const { resourceId } = await context.params;
    const id = normalizeId(resourceId);
    if (!id) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "resourceId 不能为空。"
        },
        400
      );
    }

    const ratings = await listResourceRatings(userId, id);
    return ok({ rating: ratings[0] ?? null });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_RATING_GET_FAILED",
        message: "获取评分失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function POST(request: Request, context: { params: Promise<{ resourceId: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再创建评分。"
        },
        401
      );
    }

    const { resourceId } = await context.params;
    const id = normalizeId(resourceId);
    if (!id) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "resourceId 不能为空。"
        },
        400
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(
        {
          code: "RESOURCE_RATING_CREATE_INVALID_JSON",
          message: "请求体必须是 JSON。"
        },
        400
      );
    }

    const payload = (body ?? {}) as Record<string, unknown>;
    const rating = normalizeRating(payload.rating);
    if (rating === null) {
      return fail(
        {
          code: "RESOURCE_RATING_CREATE_VALIDATION_FAILED",
          message: "rating 必须为 1-5 的数字。"
        },
        400
      );
    }

    const db = await loadDb();
    const resource = db.publicResources?.find?.((item: { id?: string }) => item.id === id);
    if (!resource) {
      return fail(
        {
          code: "RESOURCE_NOT_FOUND",
          message: "未找到对应资源。"
        },
        404
      );
    }

    const existing = await listResourceRatings(userId, id);
    if (existing.length > 0) {
      return fail(
        {
          code: "RESOURCE_RATING_ALREADY_EXISTS",
          message: "不能重复为同一个资源评分。"
        },
        409
      );
    }

    const record = await createResourceRating({
      userId,
      resourceId: id,
      rating
    });

    return ok({ rating: record });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_RATING_CREATE_FAILED",
        message: "创建评分失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ resourceId: string }> }) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail(
        {
          code: "UNAUTHORIZED",
          message: "请先登录后再更新评分。"
        },
        401
      );
    }

    const { resourceId } = await context.params;
    const id = normalizeId(resourceId);
    if (!id) {
      return fail(
        {
          code: "INVALID_REQUEST",
          message: "resourceId 不能为空。"
        },
        400
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return fail(
        {
          code: "RESOURCE_RATING_UPSERT_INVALID_JSON",
          message: "请求体必须是 JSON。"
        },
        400
      );
    }

    const payload = (body ?? {}) as Record<string, unknown>;
    const rating = normalizeRating(payload.rating);
    if (rating === null) {
      return fail(
        {
          code: "RESOURCE_RATING_UPSERT_VALIDATION_FAILED",
          message: "rating 必须为 1-5 的数字。"
        },
        400
      );
    }

    const db = await loadDb();
    const resource = db.publicResources?.find?.((item: { id?: string }) => item.id === id);
    if (!resource) {
      return fail(
        {
          code: "RESOURCE_NOT_FOUND",
          message: "未找到对应资源。"
        },
        404
      );
    }

    const existing = await listResourceRatings(userId, id);
    if (existing.length > 0) {
      const updated = await updateResourceRating(existing[0].id, { rating });
      if (updated) {
        return ok({ rating: updated });
      }
    }

    const created = await createResourceRating({ userId, resourceId: id, rating });
    return ok({ rating: created });
  } catch (error) {
    return fail(
      {
        code: "RESOURCE_RATING_UPSERT_FAILED",
        message: "更新评分失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

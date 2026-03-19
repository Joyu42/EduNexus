import { fail, ok } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { createAnalyticsEvent } from "@/lib/server/analytics-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnalyticsEventRequestBody = {
  eventType: string;
  targetId?: string;
  metadata?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
    }

    let body: AnalyticsEventRequestBody;
    try {
      body = (await request.json()) as AnalyticsEventRequestBody;
    } catch (error) {
      return fail(
        {
          code: "INVALID_JSON",
          message: "请求体不是有效的 JSON。",
          details: error instanceof Error ? error.message : error
        },
        400
      );
    }

    if (!isRecord(body)) {
      return fail({ code: "INVALID_REQUEST", message: "请求体必须是对象。" }, 400);
    }

    const eventType = normalizeString(body.eventType);
    if (!eventType) {
      return fail({ code: "INVALID_REQUEST", message: "eventType 不能为空。" }, 400);
    }
    if (eventType.length > 128) {
      return fail({ code: "INVALID_REQUEST", message: "eventType 过长。" }, 400);
    }

    const targetId = normalizeString(body.targetId);
    let metadataJson: string | undefined;
    if (body.metadata !== undefined) {
      try {
        metadataJson = JSON.stringify(body.metadata);
      } catch (error) {
        return fail(
          {
            code: "INVALID_METADATA",
            message: "metadata 无法序列化为 JSON。",
            details: error instanceof Error ? error.message : error
          },
          400
        );
      }
    }

    const payload: Record<string, string> = {};
    if (targetId) {
      payload.targetId = targetId;
    }
    if (metadataJson !== undefined) {
      payload.metadataJson = metadataJson;
    }

    const event = await createAnalyticsEvent({
      userId,
      category: "event",
      name: eventType,
      payload
    });

    return ok({ event });
  } catch (error) {
    return fail(
      {
        code: "ANALYTICS_EVENT_CREATE_FAILED",
        message: "记录分析事件失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

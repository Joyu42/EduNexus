import { z } from "zod";

import { getCurrentUserId } from "@/lib/server/auth-utils";
import { fail, ok } from "@/lib/server/response";
import { getWordsReviewSchedule, saveWordsReviewSchedule } from "@/lib/server/words-service";

const scheduleSchema = z.object({
  date: z.string().min(1),
  wordIds: z.array(z.string()),
  newCount: z.number().int().nonnegative(),
  reviewCount: z.number().int().nonnegative(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) {
    return fail({ code: "INVALID_REQUEST", message: "缺少 date 参数。" }, 400);
  }

  const schedule = await getWordsReviewSchedule(userId, date);
  return ok({ schedule });
}

export async function PUT(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail({ code: "INVALID_JSON", message: "请求体必须是合法 JSON。" }, 400);
  }

  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return fail(
      {
        code: "VALIDATION_ERROR",
        message: "复习计划参数不合法。",
        details: parsed.error.flatten().fieldErrors,
      },
      400
    );
  }

  await saveWordsReviewSchedule(userId, parsed.data);
  return ok({ saved: true });
}

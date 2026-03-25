import { z } from "zod";

import { getCurrentUserId } from "@/lib/server/auth-utils";
import { fail, ok } from "@/lib/server/response";
import { getWordsPlanSettings, saveWordsPlanSettings } from "@/lib/server/words-service";

const settingsSchema = z.object({
  dailyNewLimit: z.number().int().min(1).max(100),
  reviewFirst: z.boolean(),
  defaultRevealMode: z.enum(["hidden", "definition"]),
  selectedMajor: z.enum(["computer", "electrical", "economics", "medical"]).or(z.literal("")).optional(),
  lastSelectedBookId: z.string().optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
  }

  const settings = await getWordsPlanSettings(userId);
  return ok({ settings });
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

  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return fail(
      {
        code: "VALIDATION_ERROR",
        message: "学习设置参数不合法。",
        details: parsed.error.flatten().fieldErrors,
      },
      400
    );
  }

  await saveWordsPlanSettings(userId, {
    ...parsed.data,
    selectedMajor: parsed.data.selectedMajor ?? "",
    lastSelectedBookId: parsed.data.lastSelectedBookId ?? "",
  });
  return ok({ saved: true });
}

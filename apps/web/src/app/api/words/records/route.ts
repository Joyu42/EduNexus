import { z } from "zod";

import { getCurrentUserId } from "@/lib/server/auth-utils";
import { fail, ok } from "@/lib/server/response";
import {
  listWordsLearningRecords,
  listWordsLearningRecordsByWord,
  saveWordsLearningRecord,
} from "@/lib/server/words-service";

const learningRecordSchema = z.object({
  wordId: z.string().min(1),
  bookId: z.string().min(1),
  learnDate: z.string().min(1),
  status: z.enum(["new", "learning", "reviewing", "mastered"]),
  nextReviewDate: z.string().min(1),
  interval: z.number().int().nonnegative(),
  easeFactor: z.number().positive(),
  reviewCount: z.number().int().nonnegative(),
  successCount: z.number().int().nonnegative(),
  failureCount: z.number().int().nonnegative(),
  lastReviewedAt: z.string().min(1),
  retentionScore: z.union([z.literal(0), z.literal(1)]),
  lastStudyType: z.enum(["learn", "review", "relearn"]).optional(),
  lastGrade: z.enum(["again", "hard", "good", "easy"]).optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
  }

  const { searchParams } = new URL(request.url);
  const wordId = searchParams.get("wordId");

  const records = wordId
    ? await listWordsLearningRecordsByWord(userId, wordId)
    : await listWordsLearningRecords(userId);

  return ok({ records });
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

  const parsed = learningRecordSchema.safeParse(body);
  if (!parsed.success) {
    return fail(
      {
        code: "VALIDATION_ERROR",
        message: "学习记录参数不合法。",
        details: parsed.error.flatten().fieldErrors,
      },
      400
    );
  }

  await saveWordsLearningRecord(userId, parsed.data);
  return ok({ saved: true });
}

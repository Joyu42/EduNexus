import { fail, ok } from "@/lib/server/response";
import { unlockFinalSchema } from "@/lib/server/schema";
import { shouldUnlockFinal } from "@/lib/server/socratic";
import { searchVault } from "@/lib/server/kb-lite";
import { appendSessionMessage } from "@/lib/server/session-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = unlockFinalSchema.safeParse(json);
    if (!parsed.success) {
      return fail({
        code: "INVALID_REQUEST",
        message: "请求参数不合法。",
        details: parsed.error.flatten()
      });
    }

    const decision = shouldUnlockFinal(parsed.data.reflection);
    if (parsed.data.reflection) {
      await appendSessionMessage(parsed.data.sessionId, {
        role: "user",
        content: `反思：${parsed.data.reflection}`
      });
    }

    if (!decision.unlocked) {
      await appendSessionMessage(parsed.data.sessionId, {
        role: "assistant",
        content: decision.reason
      });
      return ok({
        unlocked: false,
        reason: decision.reason
      });
    }

    const kb = await searchVault("等差数列 公式");
    const finalAnswer =
      "示例答案：先列出已知条件，再代入等差数列求和公式 S_n = n(a_1 + a_n)/2，并在结尾做结果检验。";

    await appendSessionMessage(parsed.data.sessionId, {
      role: "assistant",
      content: finalAnswer
    });

    return ok({
      unlocked: true,
      finalAnswer,
      citations: kb.candidates.slice(0, 2).map((candidate, index) => ({
        sourceId: candidate.docId,
        chunkRef: `final_${index + 1}`
      }))
    });
  } catch (error) {
    return fail(
      {
        code: "UNLOCK_FINAL_FAILED",
        message: "解锁最终答案失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

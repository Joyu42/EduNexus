import { fail, ok } from "@/lib/server/response";
import { socraticNextSchema } from "@/lib/server/schema";
import { buildSocraticGuidance } from "@/lib/server/socratic";
import { searchVault } from "@/lib/server/kb-lite";
import { appendSessionMessage, updateSessionLevel } from "@/lib/server/session-service";
import { increaseMasteryByKeywords } from "@/lib/server/learning-update";
import { chatWithModelscope } from "@/lib/server/modelscope";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = socraticNextSchema.safeParse(json);
    if (!parsed.success) {
      return fail({
        code: "INVALID_REQUEST",
        message: "请求参数不合法。",
        details: parsed.error.flatten()
      });
    }

    const guidance = buildSocraticGuidance(parsed.data);
    await updateSessionLevel(parsed.data.sessionId, guidance.nextLevel);
    await increaseMasteryByKeywords(parsed.data.userInput);

    const kb = await searchVault(parsed.data.userInput);
    const citations = kb.candidates.slice(0, 2).map((candidate, index) => ({
      sourceId: candidate.docId,
      chunkRef: `match_${index + 1}`,
      quote: candidate.snippet
    }));

    let finalGuidance = guidance.guidance;
    if (process.env.MODELSCOPE_API_KEY) {
      try {
        const modelGuidance = await chatWithModelscope(
          [
            "请基于以下信息给出 1 段简洁的苏格拉底式学习引导，禁止直接给最终答案。",
            `当前引导层级：Level ${guidance.nextLevel}`,
            `用户输入：${parsed.data.userInput}`,
            `规则引导草稿：${guidance.guidance}`,
            `可参考来源：${citations.map((item) => `${item.sourceId}#${item.chunkRef}`).join("；") || "暂无"}`
          ].join("\n")
        );
        if (modelGuidance.trim()) {
          finalGuidance = modelGuidance.trim();
        }
      } catch {
        // 若模型调用失败，保留规则版结果，保证主流程稳定。
      }
    }

    await appendSessionMessage(parsed.data.sessionId, {
      role: "user",
      content: parsed.data.userInput
    });
    await appendSessionMessage(parsed.data.sessionId, {
      role: "assistant",
      content: finalGuidance
    });

    return ok({
      nextLevel: guidance.nextLevel,
      guidance: finalGuidance,
      canUnlockFinal: guidance.nextLevel >= 4,
      citations
    });
  } catch (error) {
    return fail(
      {
        code: "SOCRATIC_NEXT_FAILED",
        message: "生成下一层学习引导失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

import { z } from "zod";
import OpenAI from "openai";

/**

 * Learning Pack AI Planner
 *
 * Generates topic-specific learning-pack modules using an LLM with structured JSON output.
 * Falls back to template modules when AI planning is unavailable or fails.
 */

export const LearningPackPlannerModuleSchema = z.object({
  title: z.string().min(1),
  /** If set, the AI chose to reuse this existing KB document instead of creating a new one */
  existingDocId: z.string().optional(),
  order: z.number().int().min(0),
});

export type LearningPackPlannerModule = z.infer<typeof LearningPackPlannerModuleSchema>;

export const LearningPackPlannerOutputSchema = z.object({
  title: z.string().min(1),
  modules: z.array(LearningPackPlannerModuleSchema).min(1),
  confidence: z.enum(["low", "medium", "high"]).default("medium"),
  usedExistingDocs: z.boolean().default(false),
  /** True when template fallback was used instead of AI generation */
  fallbackUsed: z.boolean().default(false),
});

export type LearningPackPlannerOutput = z.infer<typeof LearningPackPlannerOutputSchema>;

const LearningPackPlannerInputInternalSchema = z.object({
  topic: z.string().min(1),
  kbContext: z
    .object({
      existingDocs: z
        .array(
          z.object({
            docId: z.string(),
            title: z.string(),
            snippet: z.string(),
          })
        )
        .default([]),
      topicMatches: z.number().default(0),
    })
    .optional(),
  apiKey: z.string(),
  apiEndpoint: z.string(),
  modelName: z.string().default("Qwen/Qwen3.5-122B-A10B"),
});

type LearningPackPlannerInput = z.infer<typeof LearningPackPlannerInputInternalSchema>;

const PLANNER_SYSTEM_PROMPT = `你是 EduNexus 的学习路径规划专家。
给定一个学习主题，你需要生成 4-7 个循序渐进的模块阶段。
每个模块需要是该主题下的关键子领域，且按学习顺序排列。

请以 JSON 格式返回：
{
  "title": "学习路线图标题",
  "modules": [
    { "title": "模块1标题", "existingDocId": null, "order": 0 },
    ...
  ],
  "confidence": "medium",
  "usedExistingDocs": false,
  "fallbackUsed": false
}

规则：
- 模块数量：4-7 个
- 每个模块 title 要体现该阶段的独特性，不要泛泛命名
- 如果知识宝库已有相关文档，在 existingDocId 中填入 docId
- 只在确实不确定时使用 "low" confidence
- 使用 fallbackUsed: false 表示这是 AI 规划结果`;

function buildFallbackPlan(topic: string): LearningPackPlannerOutput {
  const moduleTitles = [
    `${topic} 基础与环境搭建`,
    `${topic} 语法核心`,
    `${topic} 面向对象实践`,
    `${topic} 常用库与工程化`,
    `${topic} 综合项目实战`,
  ];
  const modules: LearningPackPlannerModule[] = moduleTitles.map((title, i) => ({
    title,
    order: i,
  }));
  return {
    title: `${topic} 学习路线图`,
    modules,
    confidence: "medium",
    usedExistingDocs: false,
    fallbackUsed: true,
  };
}

/**

 * Plan a learning pack for the given topic.
 *
 * Uses the LLM with structured JSON output. Falls back to template modules
 * when apiKey is absent, the LLM call fails, or the response fails Zod validation.
 *
 * @example
 * const result = await planLearningPack({
 *   topic: "java",
 *   apiKey: process.env.MODELSCOPE_API_KEY ?? "",
 *   apiEndpoint: "https://api-inference.modelscope.cn/v1",
 * });
 * // result.modules has topic-specific module titles (or fallback template)
 */
export async function planLearningPack(
  input: LearningPackPlannerInput
): Promise<LearningPackPlannerOutput> {
  // Fall back immediately when no API key is configured
  if (!input.apiKey?.trim()) {
    return buildFallbackPlan(input.topic);
  }

  const kbSection =
    input.kbContext?.existingDocs && input.kbContext.existingDocs.length > 0
      ? `\n\n## 知识宝库已有内容（优先复用）\n${input.kbContext.existingDocs
          .map((d) => `- ${d.title} (id=${d.docId})\n  摘要：${d.snippet}`)
          .join("\n")}`
      : "";

  const userPrompt = `主题：${input.topic}${kbSection}\n\n请为 "${input.topic}" 规划一个学习路线图。`;

  try {
    const client = new OpenAI({ apiKey: input.apiKey, baseURL: input.apiEndpoint });

    const completion = await client.chat.completions.create({
      model: input.modelName,
      messages: [
        { role: "system", content: PLANNER_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      // Request JSON object mode so the model always returns parseable JSON
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const result = LearningPackPlannerOutputSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    // Zod validation failed — log and fall back to template
    console.warn(
      "[learning-pack-planner] LLM output validation failed, using fallback",
      parsed
    );
    return buildFallbackPlan(input.topic);
  } catch (err) {
    // Network error, parse error, API error — fall back gracefully
    console.warn("[learning-pack-planner] AI planning threw, using fallback", err);
    return buildFallbackPlan(input.topic);
  }
}

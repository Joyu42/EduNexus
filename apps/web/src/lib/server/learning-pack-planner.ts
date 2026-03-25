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
  fallbackReason: z
    .enum(["missing_api_key", "auth", "response_format_unsupported", "invalid_response", "request_failed"])
    .optional(),
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

function buildFallbackPlan(
  topic: string,
  fallbackReason: "missing_api_key" | "auth" | "response_format_unsupported" | "invalid_response" | "request_failed"
): LearningPackPlannerOutput {
  const normalizedTopic = topic.trim();
  const topicKey = normalizedTopic.toLowerCase().replace(/\s+/g, "");

  const hashTopic = (value: string) => {
    let acc = 0;
    for (const ch of value) {
      acc = (acc + ch.charCodeAt(0)) % 997;
    }
    return acc;
  };

  const moduleTitles = (() => {
    if (topicKey === "java") {
      return [
        `${normalizedTopic} 环境搭建与工具链（JDK/IDE）`,
        `${normalizedTopic} 语法基础与面向对象`,
        `${normalizedTopic} 集合框架与泛型`,
        `${normalizedTopic} 异常处理与 I/O`,
        `${normalizedTopic} 并发编程基础`,
        `${normalizedTopic} 工程化与简单项目实战`,
      ];
    }

    if (topicKey === "python") {
      return [
        `${normalizedTopic} 环境与包管理（venv/pip）`,
        `${normalizedTopic} 语法基础与常用数据结构`,
        `${normalizedTopic} 函数、模块与面向对象`,
        `${normalizedTopic} 文件处理与标准库实践`,
        `${normalizedTopic} 数据处理入门（CSV/JSON）`,
        `${normalizedTopic} 综合小项目实战`,
      ];
    }

    if (topicKey === "javascript" || topicKey === "js") {
      return [
        `${normalizedTopic} 语法核心与作用域`,
        `${normalizedTopic} 异步编程（Promise/async）`,
        `${normalizedTopic} DOM 与浏览器事件`,
        `${normalizedTopic} 模块化与工程化（npm/bundler）`,
        `${normalizedTopic} 常用模式与调试技巧`,
      ];
    }

    if (topicKey === "typescript" || topicKey === "ts") {
      return [
        `${normalizedTopic} 基础类型与类型推导`,
        `${normalizedTopic} 接口、泛型与高级类型`,
        `${normalizedTopic} 类型体操与常见陷阱`,
        `${normalizedTopic} 工程实践（tsconfig/构建）`,
        `${normalizedTopic} 项目实战与重构`,
      ];
    }

    const defaultTemplates = [
      [
        `${normalizedTopic} 学习目标与基础概念`,
        `${normalizedTopic} 核心语法/规则`,
        `${normalizedTopic} 关键工具与工作流`,
        `${normalizedTopic} 常见问题与最佳实践`,
        `${normalizedTopic} 综合练习与小项目`,
      ],
      [
        `${normalizedTopic} 关键术语与心智模型`,
        `${normalizedTopic} 核心能力拆解与练习`,
        `${normalizedTopic} 常见用法与典型场景`,
        `${normalizedTopic} 排错与调试方法`,
        `${normalizedTopic} 综合练习与复盘`,
      ],
      [
        `${normalizedTopic} 入门路径与环境准备`,
        `${normalizedTopic} 基础用法与最小示例`,
        `${normalizedTopic} 进阶特性与边界`,
        `${normalizedTopic} 生态工具与工程实践`,
        `${normalizedTopic} 项目实战与总结`,
      ],
    ];
    const index = hashTopic(topicKey) % defaultTemplates.length;
    return defaultTemplates[index] ?? defaultTemplates[0]!;
  })();
  const modules: LearningPackPlannerModule[] = moduleTitles.map((title, i) => ({
    title,
    order: i,
  }));
  return {
    title: `${normalizedTopic} 学习路线图`,
    modules,
    confidence: "medium",
    usedExistingDocs: false,
    fallbackUsed: true,
    fallbackReason,
  };
}

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
}

function isAuthError(error: unknown): boolean {
  const message = normalizeErrorMessage(error);
  return (
    message.includes("401") ||
    message.includes("unauthorized") ||
    message.includes("authentication failed") ||
    message.includes("invalid token") ||
    message.includes("incorrect api key")
  );
}

function isResponseFormatUnsupported(error: unknown): boolean {
  const message = normalizeErrorMessage(error);
  return message.includes("response_format") || message.includes("json_object");
}

function extractFirstJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return null;
  }
  return raw.slice(start, end + 1);
}

function parsePlannerOutput(raw: string): LearningPackPlannerOutput | null {
  const direct = (() => {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  })();

  const candidate = direct ?? (() => {
    const jsonBody = extractFirstJsonObject(raw);
    if (!jsonBody) {
      return null;
    }
    try {
      return JSON.parse(jsonBody) as unknown;
    } catch {
      return null;
    }
  })();

  if (!candidate) {
    return null;
  }

  const parsed = LearningPackPlannerOutputSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
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
    return buildFallbackPlan(input.topic, "missing_api_key");
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

    const requestPayload = {
      model: input.modelName,
      messages: [
        { role: "system", content: PLANNER_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      stream: false,
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

    let raw = "";
    try {
      const completion = await client.chat.completions.create({
        ...requestPayload,
        response_format: { type: "json_object" },
      } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);
      raw = completion.choices[0]?.message?.content ?? "{}";
    } catch (error) {
      if (!isResponseFormatUnsupported(error)) {
        throw error;
      }

      const completion = await client.chat.completions.create(requestPayload);
      raw = completion.choices[0]?.message?.content ?? "{}";
    }

    const parsed = parsePlannerOutput(raw);
    if (parsed) {
      return parsed;
    }

    console.warn("[learning-pack-planner] LLM output invalid, using fallback", raw);
    return buildFallbackPlan(input.topic, "invalid_response");
  } catch (err) {
    console.warn("[learning-pack-planner] AI planning threw, using fallback", err);
    if (isAuthError(err)) {
      return buildFallbackPlan(input.topic, "auth");
    }
    if (isResponseFormatUnsupported(err)) {
      return buildFallbackPlan(input.topic, "response_format_unsupported");
    }
    return buildFallbackPlan(input.topic, "request_failed");
  }
}

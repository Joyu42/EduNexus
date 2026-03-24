import { NextResponse } from "next/server";
import { runAgentConversation, createChatHistory } from "@/lib/agent/learning-agent";
import { buildWorkspaceGraphContext } from "@/lib/server/workspace-graph-context";
import { getWordsProgressSummary } from "@/lib/server/words-service";
import { createLearningPack, setActivePack, setPackKbDocument, findPacksByTopic } from "@/lib/server/learning-pack-store";
import { createDocument, deleteDocument, listDocuments } from "@/lib/server/document-service";
import { loadDb, saveDb } from "@/lib/server/store";
import { DEMO_KB_DOCUMENTS } from "@/lib/server/demo-content";
import { auth } from "@/auth";
import { planLearningPack } from "@/lib/server/learning-pack-planner";
import { buildLearningPackKbContext } from "@/lib/server/learning-pack-kb-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 最长执行时间 60 秒

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

const DIRECT_PROGRESS_PHRASES = [
  "汇报进度",
  "学习进度",
  "最近学习情况",
  "最近7天",
  "最近七天",
  "最近一周",
];

const WORDS_TOKENS = ["英语", "单词", "词汇", "背词", "words", "english", "cet4", "cet6"];
const PROGRESS_TOKENS = [
  "进度",
  "学习进度",
  "汇报",
  "报告",
  "情况",
  "学习情况",
  "学习数据",
  "学习报告",
  "最近7天",
  "最近七天",
  "最近一周",
  "最近学习",
  "progress",
];

function isWordsContextPrompt(value?: string): boolean {
  if (typeof value !== "string") {
    return false;
  }
  const lower = value.toLowerCase();
  return lower.includes("words 模块") || lower.includes("单词学习助手") || lower.includes("/words");
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

export function isWordsProgressQuery(message: string, contextPrompt?: string): boolean {
  const text = message.toLowerCase();
  const normalized = text.replace(/\s+/g, "");
  const directIntent = DIRECT_PROGRESS_PHRASES.some((phrase) => normalized.includes(phrase));

  if (directIntent) {
    return true;
  }

  const mentionsWords = includesAny(text, WORDS_TOKENS);
  const mentionsProgress = includesAny(text, PROGRESS_TOKENS);

  if (mentionsWords && mentionsProgress) {
    return true;
  }

  if (isWordsContextPrompt(contextPrompt) && mentionsProgress) {
    return true;
  }

  return false;
}

function extractLearningTopic(message: string): string | null {
  const text = message.trim();
  if (!text) {
    return null;
  }

  const normalized = text.replace(/\s+/g, " ");
  const patterns = [
    /我想学习\s*([\w\u4e00-\u9fa5+#.-]{1,40})/i,
    /想学\s*([\w\u4e00-\u9fa5+#.-]{1,40})/i,
    /学习\s*([\w\u4e00-\u9fa5+#.-]{1,40})/i,
    /learn\s+([\w+#.-]{1,40})/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}



async function cleanupDemoScaffold(userId: string): Promise<void> {
  const demoTitles = new Set(DEMO_KB_DOCUMENTS.map((doc) => doc.title));
  const existingDocs = await listDocuments(userId);

  for (const doc of existingDocs) {
    if (demoTitles.has(doc.title)) {
      await deleteDocument(doc.id, userId);
    }
  }

  const db = await loadDb();
  db.syncedPaths = db.syncedPaths.filter(
    (path) => !(path.userId === userId && path.pathId.startsWith("demo_path_"))
  );
  await saveDb(db);
}

function buildWordsProgressReport(summary: Awaited<ReturnType<typeof getWordsProgressSummary>>) {
  const avg = summary.recentProgress.averageDailyLearnedWords.toFixed(1);
  return [
    `你的英语学习进度（截至 ${summary.date}）：`,
    `- 连续学习：${summary.streakDays} 天`,
    `- 今日待复习：${summary.dueToday} 个`,
    `- 累计已学习：${summary.learnedWords} 个单词（掌握 ${summary.masteredWords} 个）`,
    `- 最近 ${summary.recentProgress.rangeDays} 天：学习新词 ${summary.recentProgress.learnedWordsInRange} 个，平均每天 ${avg} 个`,
    `- 最近 ${summary.recentProgress.rangeDays} 天活跃学习：${summary.recentProgress.activeDays} 天`,
  ].join("\n");
}

function normalizeAgentError(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : "Unknown error";
  const lowered = message.toLowerCase();

  if (
    lowered.includes("authentication failed") ||
    lowered.includes("invalid token") ||
    lowered.includes("incorrect api key") ||
    lowered.includes("401") ||
    lowered.includes("unauthorized")
  ) {
    return {
      status: 502,
      message: "模型服务鉴权失败：请检查 ModelScope API Key 是否有效，或改用服务端环境变量密钥。",
    };
  }

  if (lowered.includes("请先在设置中配置 api 密钥") || lowered.includes("missing api key")) {
    return {
      status: 400,
      message: "缺少模型配置：请在设置中填写 API Key/Endpoint，或在服务端配置 MODELSCOPE_API_KEY。",
    };
  }

  return { status: 500, message };
}

/**
 * Agent 对话 API
 * POST /api/workspace/agent/chat
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, images, history = [], config = {}, taskContext } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid message" },
        { status: 400 }
      );
    }

    // 转换历史消息格式
    const chatHistory = createChatHistory(history);

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const isDemo = session.user.isDemo === true;

    const learningTopic = extractLearningTopic(message);
    if (learningTopic) {
      if (isDemo) {
        await cleanupDemoScaffold(userId);
      }

      const existingPacks = await findPacksByTopic(userId, learningTopic);

      if (existingPacks.length > 0) {
        const existing = existingPacks[0];
        return NextResponse.json({
          success: true,
          response: `你已有一个「${existing.title}」学习包。\n\n你可以选择继续当前进度，或者重新规划一个新路线图。`,
          learningPack: {
            packId: existing.packId,
            title: existing.title,
            topic: existing.topic,
            graphUrl: `/graph?view=path&packId=${encodeURIComponent(existing.packId)}`,
          },
          continueExistingPack: {
            packId: existing.packId,
            moduleCount: existing.modules.length,
            createdAt: existing.createdAt,
          },
          steps: [
            {
              type: "tool_result",
              tool: "find_existing_pack",
              content: JSON.stringify({
                packId: existing.packId,
                title: existing.title,
                topic: existing.topic,
                moduleCount: existing.modules.length,
              }),
            },
          ],
          timestamp: new Date().toISOString(),
        });
      }

      const plannerOutput = await planLearningPack({
        topic: learningTopic,
        apiKey: process.env.MODELSCOPE_API_KEY ?? "",
        apiEndpoint:
          process.env.MODELSCOPE_BASE_URL ?? "https://api-inference.modelscope.cn/v1",
        modelName: process.env.MODELSCOPE_CHAT_MODEL ?? "Qwen/Qwen3.5-122B-A10B",
        kbContext: await buildLearningPackKbContext(userId, learningTopic),
      });

      const modules = plannerOutput.modules.map((m) => m.title);
      const pack = await createLearningPack(userId, plannerOutput.title, learningTopic, modules);

      for (const module of pack.modules) {
        const planned = plannerOutput.modules.find((pm) => pm.title === module.title);
        if (planned?.existingDocId) {
          await setPackKbDocument(pack.packId, module.moduleId, planned.existingDocId);
        } else {
          const doc = await createDocument({
            title: module.title,
            content: `# ${module.title}\n\n## 学习目标\n- 理解 ${learningTopic} 在本模块的核心概念\n\n## 今日任务\n- 阅读并完成本节示例\n- 记录 3 个关键知识点\n\n## 练习建议\n- 写 1-2 个最小可运行示例\n`,
            authorId: userId,
          });
          await setPackKbDocument(pack.packId, module.moduleId, doc.id);
        }
      }

      await setActivePack(pack.packId, userId);

      return NextResponse.json({
        success: true,
        response: `已为你创建「${pack.title}」。\n\n我已经规划了 ${pack.modules.length} 个学习阶段，你可以直接进入知识星图开始学习。`,
        learningPack: {
          packId: pack.packId,
          title: pack.title,
          topic: pack.topic,
          graphUrl: `/graph?view=path&packId=${encodeURIComponent(pack.packId)}`,
        },
        steps: [
          {
            type: "tool_result",
            tool: "create_learning_pack",
            content: JSON.stringify({
              packId: pack.packId,
              title: pack.title,
              topic: pack.topic,
            }),
          },
        ],
        timestamp: new Date().toISOString(),
      });
    }

    const graphContext = await buildWorkspaceGraphContext({
      userId,
      taskId: typeof taskContext?.taskId === "string" ? taskContext.taskId : undefined,
      taskTitle: typeof taskContext?.taskTitle === "string" ? taskContext.taskTitle : undefined,
    });

    const contextPrompt = typeof config.contextPrompt === "string" ? config.contextPrompt : undefined;

    if (isWordsProgressQuery(message, contextPrompt)) {
      const wordsDate =
        typeof config.wordsDate === "string" && isIsoDate(config.wordsDate)
          ? config.wordsDate
          : undefined;
      const summary = await getWordsProgressSummary(userId, wordsDate);
      return NextResponse.json({
        success: true,
        response: buildWordsProgressReport(summary),
        thinking: "words-progress-direct",
        steps: [
          {
            type: "tool_result",
            tool: "query_words_progress",
            content: JSON.stringify({
              date: summary.date,
              streakDays: summary.streakDays,
              dueToday: summary.dueToday,
              learnedWords: summary.learnedWords,
              masteredWords: summary.masteredWords,
              recentProgress: summary.recentProgress,
            }),
          },
        ],
        timestamp: new Date().toISOString(),
      });
    }

    const mergedConfig = {
      ...config,
      apiKey:
        typeof config.apiKey === "string" && config.apiKey.trim()
          ? config.apiKey.trim()
          : process.env.MODELSCOPE_API_KEY ?? "",
      apiEndpoint:
        typeof config.apiEndpoint === "string" && config.apiEndpoint.trim()
          ? config.apiEndpoint.trim()
          : process.env.MODELSCOPE_BASE_URL ?? "https://api-inference.modelscope.cn/v1",
      modelName:
        typeof config.modelName === "string" && config.modelName.trim()
          ? config.modelName.trim()
          : process.env.MODELSCOPE_CHAT_MODEL ?? "Qwen/Qwen3.5-122B-A10B",
      userId,
      isDemo,
      taskContext,
      graphContext,
    };

    // 执行 Agent 对话（支持多模态）
    const result = await runAgentConversation(message, chatHistory, mergedConfig, images);

    return NextResponse.json({
      success: true,
      response: result.output,
      thinking: result.thinking,
      steps: result.intermediateSteps,
      learningPack: (result as { learningPack?: unknown }).learningPack,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Agent chat error:", error);
    const normalized = normalizeAgentError(error);

    // 返回详细错误信息
    return NextResponse.json({
      success: false,
      error: normalized.message,
      response:
        "抱歉，处理你的请求时出现了错误。请检查：\n\n1. API 密钥与端点配置\n2. 模型服务可用性\n3. 网络连接是否正常\n\n错误详情：" + normalized.message,
    }, { status: normalized.status });
  }
}

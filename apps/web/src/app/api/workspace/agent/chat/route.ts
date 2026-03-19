import { NextResponse } from "next/server";
import { runAgentConversation, createChatHistory } from "@/lib/agent/learning-agent";
import { buildWorkspaceGraphContext } from "@/lib/server/workspace-graph-context";
import { getWordsProgressSummary } from "@/lib/server/words-service";
import { auth } from "@/auth";

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

/**
 * 学习工作区 Agent 工具实现（真实版本）
 *
 * 连接真实的知识库、图谱和数据库
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { getModelscopeClient } from "@/lib/server/modelscope";
import { searchDocuments, getDocument } from "@/lib/server/document-service";
import { getGraphView } from "@/lib/server/graph-service";
import { loadDb } from "@/lib/server/store";
import { getWordsProgressSummary, listWords, listWordsLearningRecords, listWordsLearningRecordsByWord, saveWordsLearningRecord } from "@/lib/server/words-service";
import { updateWordStatus } from "@/lib/words/scheduler";
import type { WordAnswerGrade } from "@/lib/words/types";
import { DEMO_PATH_SEEDS } from "@/lib/server/demo-content";
import { saveDb } from "@/lib/server/store";

function requireUserId(userId?: string) {
  const normalized = typeof userId === "string" ? userId.trim() : "";
  if (!normalized) {
    throw new Error("缺少 userId：请先登录后再使用该工具。");
  }
  return normalized;
}

function createSearchKnowledgeBaseTool(userId?: string) {
  return new DynamicStructuredTool({
    name: "search_knowledge_base",
    description: "搜索知识库中的文档和笔记。当用户询问某个概念或需要查找相关资料时使用。",
    schema: z.object({
      query: z.string().describe("搜索查询词"),
      limit: z.number().optional().describe("返回结果数量限制，默认5"),
    }),
    func: async ({ query, limit = 5 }) => {
      try {
        const effectiveUserId = requireUserId(userId);
        const normalizedLimit = Math.max(1, Math.min(20, Math.floor(Number(limit) || 5)));
        const candidates = await searchDocuments(query, effectiveUserId);

        const selected = candidates.slice(0, normalizedLimit);
        const docs = await Promise.all(
          selected.map(async (candidate, index) => {
            const doc = await getDocument(candidate.docId, effectiveUserId);
            return {
              id: candidate.docId,
              title: doc?.title || candidate.docId,
              content: doc?.content ? doc.content.slice(0, 500) : candidate.snippet,
              relevance: Math.max(0, 1 - index * 0.05),
              updatedAt: doc?.updatedAt,
            };
          })
        );

        return JSON.stringify(
          {
            query,
            count: docs.length,
            results: docs,
          },
          null,
          2
        );
      } catch (error) {
        return JSON.stringify({
          error: "搜索失败",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}

/**
 * 查询知识图谱工具（真实实现）
 */
function createQueryKnowledgeGraphTool(userId?: string) {
  return new DynamicStructuredTool({
    name: "query_knowledge_graph",
    description: "查询知识图谱，获取概念之间的关系。当需要了解知识点之间的联系时使用。",
    schema: z.object({
      concept: z.string().describe("要查询的概念"),
      depth: z.number().optional().describe("查询深度，默认2"),
    }),
    func: async ({ concept, depth = 2 }) => {
      try {
        const effectiveUserId = requireUserId(userId);
        const normalizedDepth = Math.max(1, Math.min(4, Math.floor(Number(depth) || 2)));
        const graphView = await getGraphView(effectiveUserId);

      const lowerConcept = concept.trim().toLowerCase();
      const allNodes = graphView.nodes;
      const nodeById = new Map(allNodes.map((node) => [node.id, node]));

      const seedNodes = allNodes.filter((node) => {
        const label = (node.label || "").toLowerCase();
        const id = node.id.toLowerCase();
        return label.includes(lowerConcept) || id.includes(lowerConcept);
      });

      if (seedNodes.length === 0) {
        return JSON.stringify(
          {
            concept,
            depth: normalizedDepth,
            matched: false,
            message: "未在知识图谱中找到直接匹配节点。",
            nodes: [],
            edges: [],
            relatedConcepts: [],
          },
          null,
          2
        );
      }

      const selectedNodeIds = new Set(seedNodes.map((node) => node.id));
      let frontier = new Set(seedNodes.map((node) => node.id));

      for (let level = 0; level < normalizedDepth; level += 1) {
        const nextFrontier = new Set<string>();
        for (const edge of graphView.edges) {
          if (frontier.has(edge.source) && !selectedNodeIds.has(edge.target)) {
            selectedNodeIds.add(edge.target);
            nextFrontier.add(edge.target);
          }
          if (frontier.has(edge.target) && !selectedNodeIds.has(edge.source)) {
            selectedNodeIds.add(edge.source);
            nextFrontier.add(edge.source);
          }
        }
        frontier = nextFrontier;
        if (frontier.size === 0) break;
      }

      const nodes = Array.from(selectedNodeIds)
        .map((id) => nodeById.get(id))
        .filter((node): node is NonNullable<typeof node> => Boolean(node))
        .map((node) => ({
          id: node.id,
          label: node.label,
          domain: node.domain,
          mastery: node.mastery,
          risk: node.risk,
          type: "concept",
        }));

      const edges = graphView.edges
        .filter((edge) => selectedNodeIds.has(edge.source) && selectedNodeIds.has(edge.target))
        .map((edge) => ({
          from: edge.source,
          to: edge.target,
          relation: "related",
          strength: edge.weight,
        }));

      const prerequisites = edges
        .filter((edge) => seedNodes.some((seed) => seed.id === edge.to))
        .map((edge) => nodeById.get(edge.from)?.label || edge.from)
        .slice(0, 10);

      const applications = edges
        .filter((edge) => seedNodes.some((seed) => seed.id === edge.from))
        .map((edge) => nodeById.get(edge.to)?.label || edge.to)
        .slice(0, 10);

      const relatedConcepts = nodes
        .filter((node) => !seedNodes.some((seed) => seed.id === node.id))
        .map((node) => node.label)
        .slice(0, 12);

        return JSON.stringify(
          {
            concept,
            depth: normalizedDepth,
            matched: true,
            seeds: seedNodes.map((node) => ({ id: node.id, label: node.label })),
            nodes,
            edges,
            prerequisites,
            applications,
            relatedConcepts,
          },
          null,
          2
        );
      } catch (error) {
        return JSON.stringify({
          error: "图谱查询失败",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}

/**
 * 生成练习题工具（使用 AI 生成）
 */
export const generateExerciseTool = new DynamicStructuredTool({
  name: "generate_exercise",
  description: "根据知识点生成练习题。当用户需要练习或测试理解程度时使用。",
  schema: z.object({
    topic: z.string().describe("知识点主题"),
    difficulty: z.enum(["easy", "medium", "hard"]).describe("难度级别"),
    count: z.number().optional().describe("题目数量，默认3"),
  }),
  func: async ({ topic, difficulty, count = 3 }) => {
    try {
      const client = getModelscopeClient();

      const prompt = `请生成 ${count} 道关于"${topic}"的${difficulty === "easy" ? "简单" : difficulty === "medium" ? "中等" : "困难"}难度练习题。

要求：
1. 题目要有针对性，测试对核心概念的理解
2. 提供选项（如果是选择题）
3. 给出简短的提示
4. 不要直接给出答案

请以 JSON 格式返回，格式如下：
[
  {
    "id": 1,
    "question": "题目内容",
    "type": "选择题/填空题/简答题",
    "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
    "hint": "提示内容"
  }
]`;

      const completion = await client.chat.completions.create({
        model: process.env.MODELSCOPE_CHAT_MODEL || "Qwen/Qwen3-8B",
        messages: [
          { role: "system", content: "你是一个专业的教育内容生成助手。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content || "[]";

      // 尝试解析 JSON，如果失败则返回格式化的文本
      try {
        const exercises = JSON.parse(response);
        return JSON.stringify({ topic, difficulty, count, exercises }, null, 2);
      } catch {
        return JSON.stringify({
          topic,
          difficulty,
          count,
          exercises: response,
          note: "AI 生成的内容（非结构化）"
        }, null, 2);
      }
    } catch (error) {
      return JSON.stringify({
        error: "生成练习题失败",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

/**
 * 推荐学习路径工具（使用 AI 生成）
 */
export const recommendLearningPathTool = new DynamicStructuredTool({
  name: "recommend_learning_path",
  description: "根据当前知识点推荐学习路径。当用户不知道接下来学什么时使用。",
  schema: z.object({
    currentTopic: z.string().describe("当前学习的主题"),
    goal: z.string().optional().describe("学习目标"),
    userLevel: z.enum(["beginner", "intermediate", "advanced"]).optional().describe("用户水平"),
  }),
  func: async ({ currentTopic, goal, userLevel = "intermediate" }) => {
    try {
      const client = getModelscopeClient();

      const prompt = `用户当前正在学习"${currentTopic}"，水平是${userLevel === "beginner" ? "初学者" : userLevel === "intermediate" ? "中级" : "高级"}。
${goal ? `学习目标：${goal}` : ""}

请为用户规划一个详细的学习路径，包括：
1. 需要补充的前置知识（如果有）
2. 当前主题的学习步骤（3-5个阶段）
3. 每个阶段的时间建议
4. 推荐的学习资源
5. 实践项目建议

请以 JSON 格式返回。`;

      const completion = await client.chat.completions.create({
        model: process.env.MODELSCOPE_CHAT_MODEL || "Qwen/Qwen3-8B",
        messages: [
          { role: "system", content: "你是一个专业的学习规划师。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const response = completion.choices[0]?.message?.content || "";

      return JSON.stringify({
        currentTopic,
        goal,
        userLevel,
        path: response,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: "生成学习路径失败",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

/**
 * 解释概念工具（使用 AI）
 */
export const explainConceptTool = new DynamicStructuredTool({
  name: "explain_concept",
  description: "用简单的语言解释复杂概念。当用户表示不理解某个概念时使用。",
  schema: z.object({
    concept: z.string().describe("要解释的概念"),
    level: z.enum(["beginner", "intermediate", "advanced"]).describe("解释的深度级别"),
  }),
  func: async ({ concept, level }) => {
    try {
      const client = getModelscopeClient();

      const levelDesc = {
        beginner: "用最简单的语言，就像给小学生解释一样",
        intermediate: "用中等难度的语言，假设有一定基础",
        advanced: "用专业术语，深入技术细节"
      };

      const prompt = `请解释"${concept}"这个概念。
要求：${levelDesc[level]}

请包括：
1. 简单定义（一句话）
2. 详细解释
3. 2-3个具体例子
4. 类比说明（用日常生活中的事物类比）
5. 常见误解`;

      const completion = await client.chat.completions.create({
        model: process.env.MODELSCOPE_CHAT_MODEL || "Qwen/Qwen3-8B",
        messages: [
          { role: "system", content: "你是一个善于用简单语言解释复杂概念的老师。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 1000,
      });

      const response = completion.choices[0]?.message?.content || "";

      return JSON.stringify({
        concept,
        level,
        explanation: response,
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: "解释概念失败",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

/**
 * 苏格拉底式提问工具（使用 AI）
 */
export const socraticQuestionTool = new DynamicStructuredTool({
  name: "socratic_question",
  description: "生成苏格拉底式引导问题。当需要引导用户深入思考而不是直接给答案时使用。",
  schema: z.object({
    userQuestion: z.string().describe("用户的问题"),
    context: z.string().optional().describe("对话上下文"),
  }),
  func: async ({ userQuestion, context }) => {
    try {
      const client = getModelscopeClient();

      const prompt = `用户问了这个问题："${userQuestion}"
${context ? `对话上下文：${context}` : ""}

请不要直接回答，而是生成3-5个苏格拉底式的引导问题，帮助用户自己思考和发现答案。

要求：
1. 问题要循序渐进
2. 从简单到复杂
3. 引导用户自己得出结论
4. 每个问题后面简短说明为什么要问这个问题`;

      const completion = await client.chat.completions.create({
        model: process.env.MODELSCOPE_CHAT_MODEL || "Qwen/Qwen3-8B",
        messages: [
          { role: "system", content: "你是一个使用苏格拉底式教学法的老师。" },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const response = completion.choices[0]?.message?.content || "";

      return JSON.stringify({
        original: userQuestion,
        guidingQuestions: response,
        reasoning: "通过这些问题引导你自己找到答案",
      }, null, 2);
    } catch (error) {
      return JSON.stringify({
        error: "生成引导问题失败",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

/**
 * 检查理解程度工具（使用 AI）
 */
export const checkUnderstandingTool = new DynamicStructuredTool({
  name: "check_understanding",
  description: "通过提问检查用户对概念的理解程度。",
  schema: z.object({
    topic: z.string().describe("要检查的主题"),
    userResponse: z.string().optional().describe("用户的回答"),
  }),
  func: async ({ topic, userResponse }) => {
    try {
      const client = getModelscopeClient();

      if (!userResponse) {
        // 生成检查问题
        const prompt = `请生成3个问题来检查用户对"${topic}"的理解程度。

要求：
1. 第一个问题：基础概念理解
2. 第二个问题：实际应用
3. 第三个问题：深层理解

每个问题都要能够有效评估理解程度。`;

        const completion = await client.chat.completions.create({
          model: process.env.MODELSCOPE_CHAT_MODEL || "Qwen/Qwen3-8B",
          messages: [
            { role: "system", content: "你是一个专业的教育评估专家。" },
            { role: "user", content: prompt }
          ],
          temperature: 0.6,
          max_tokens: 600,
        });

        const questions = completion.choices[0]?.message?.content || "";

        return JSON.stringify({
          topic,
          questions,
          note: "请回答这些问题，我会评估你的理解程度",
        }, null, 2);
      } else {
        // 评估用户回答
        const prompt = `主题：${topic}
用户的回答：${userResponse}

请评估用户的理解程度：
1. 理解程度评分（0-100）
2. 理解正确的部分
3. 理解不足或错误的部分
4. 改进建议`;

        const completion = await client.chat.completions.create({
          model: process.env.MODELSCOPE_CHAT_MODEL || "Qwen/Qwen3-8B",
          messages: [
            { role: "system", content: "你是一个专业的教育评估专家。" },
            { role: "user", content: prompt }
          ],
          temperature: 0.5,
          max_tokens: 800,
        });

        const feedback = completion.choices[0]?.message?.content || "";

        return JSON.stringify({
          topic,
          userResponse,
          feedback,
        }, null, 2);
      }
    } catch (error) {
      return JSON.stringify({
        error: "检查理解失败",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

/**
 * 查询学习进度工具
 */
function createQueryLearningProgressTool(userId?: string, isDemoUser?: boolean) {
  return new DynamicStructuredTool({
    name: "query_learning_progress",
    description: "查询学习进度和学习路径信息。当用户询问学习进度、学习路径、任务完成情况时使用。",
    schema: z.object({
      pathId: z.string().optional().describe("学习路径ID，不提供则返回所有路径"),
    }),
    func: async ({ pathId }) => {
      try {
        const effectiveUserId = requireUserId(userId);
        const normalizedPathId = typeof pathId === "string" ? pathId.trim() : "";
        const shouldFilterByPathId = normalizedPathId.length > 0 && normalizedPathId !== "default";
        const db = await loadDb();
        const scopedPaths = db.syncedPaths.filter((path) => path.userId === effectiveUserId);
        const paths = shouldFilterByPathId
          ? scopedPaths.filter((path) => path.pathId === normalizedPathId)
          : scopedPaths;

        const result = paths.map((path) => ({
          pathId: path.pathId,
          title: path.title,
          description: path.description,
          status: path.status,
          progress: path.progress,
          tags: path.tags,
          totalTasks: path.tasks.length,
          completedTasks: path.tasks.filter((task) => task.status === "completed").length,
          tasks: path.tasks.map((task) => ({
            taskId: task.taskId,
            title: task.title,
            description: task.description,
            status: task.status,
            progress: task.progress,
            estimatedTime: task.estimatedTime,
            dependencies: task.dependencies,
          })),
        }));

        if (result.length === 0) {
          return JSON.stringify(
            {
              count: 0,
              paths: [],
              reason: "NO_SYNCED_PATHS",
              message: "当前用户还没有可用的服务端学习路径同步记录。",
              nextAction: "先在学习路径页面创建/编辑路径，等待自动同步后再查询学习进度。",
            },
            null,
            2
          );
        }

        return JSON.stringify({ count: result.length, paths: result }, null, 2);
      } catch (error) {
        return JSON.stringify({
          error: "查询学习进度失败",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}

function createQueryWordsProgressTool(userId?: string) {
  return new DynamicStructuredTool({
    name: "query_words_progress",
    description:
      "查询当前登录用户的英语单词学习进度，包括连续学习天数、今日待复习、今日学习/复习情况和词库进度。",
    schema: z.object({
      date: z.string().optional().describe("可选日期，格式 YYYY-MM-DD，不传则使用今天"),
      rangeDays: z.number().optional().describe("最近统计区间天数，默认 7 天，最大 30 天"),
    }),
    func: async ({ date, rangeDays }) => {
      try {
        const effectiveUserId = requireUserId(userId);
        const normalizedDate = typeof date === "string" && date.trim() ? date.trim() : undefined;
        const normalizedRangeDays =
          typeof rangeDays === "number" && Number.isFinite(rangeDays)
            ? Math.max(1, Math.min(30, Math.floor(rangeDays)))
            : undefined;
        const summary = await getWordsProgressSummary(
          effectiveUserId,
          normalizedDate,
          normalizedRangeDays
        );
        const topBooks = summary.bookProgress.slice(0, 3);

        return JSON.stringify(
          {
            date: summary.date,
            streakDays: summary.streakDays,
            dueToday: summary.dueToday,
            hasDueReview: summary.hasDueReview,
            learnedToday: summary.learnedToday,
            reviewedToday: summary.reviewedToday,
            relearnedToday: summary.relearnedToday,
            accuracyToday: summary.accuracyToday,
            learnedWords: summary.learnedWords,
            masteredWords: summary.masteredWords,
            totalWords: summary.totalWords,
            suggestedBookId: summary.suggestedBookId,
            recentProgress: summary.recentProgress,
            report: {
              rangeDays: summary.recentProgress.rangeDays,
              startDate: summary.recentProgress.startDate,
              endDate: summary.recentProgress.endDate,
              learnedWordsInRange: summary.recentProgress.learnedWordsInRange,
              reviewedCountInRange: summary.recentProgress.reviewedCountInRange,
              relearnedCountInRange: summary.recentProgress.relearnedCountInRange,
              averageDailyLearnedWords: summary.recentProgress.averageDailyLearnedWords,
              activeDays: summary.recentProgress.activeDays,
              learnedWords: summary.learnedWords,
              masteredWords: summary.masteredWords,
              dueToday: summary.dueToday,
              streakDays: summary.streakDays,
            },
            topBooks,
          },
          null,
          2
        );
      } catch (error) {
        return JSON.stringify({
          error: "查询英语单词进度失败",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}

function resolveWordsIntent(intent: string, userMessage?: string) {
  if (intent !== "auto") {
    return intent;
  }
  const text = (userMessage || "").toLowerCase();
  if (!text) {
    return "dashboard" as const;
  }
  if (text.includes("复习") || text.includes("review")) {
    return "review" as const;
  }
  if (
    text.includes("学习") ||
    text.includes("背单词") ||
    text.includes("学单词") ||
    text.includes("单词") ||
    text.includes("学 ") ||
    text.includes("learn")
  ) {
    return "learn" as const;
  }
  return "dashboard" as const;
}

function detectPreferredBookId(userMessage?: string): "cet4" | "cet6" | null {
  const text = (userMessage || "").toLowerCase();
  if (!text) {
    return null;
  }

  if (text.includes("cet-6") || text.includes("cet6") || text.includes("六级")) {
    return "cet6";
  }

  if (text.includes("cet-4") || text.includes("cet4") || text.includes("四级")) {
    return "cet4";
  }

  return null;
}

function createRecommendWordsActionTool(userId?: string) {
  return new DynamicStructuredTool({
    name: "recommend_words_action",
    description:
      "根据用户意图推荐英语单词学习页面路由，返回可直接跳转的 route。用于“我想学单词/复习单词/查看进度”等请求。",
    schema: z.object({
      intent: z.enum(["learn", "review", "dashboard", "auto"]).describe("意图类型"),
      userMessage: z.string().optional().describe("用户原始输入，intent=auto 时用于推断"),
    }),
    func: async ({ intent, userMessage }) => {
      try {
        const effectiveUserId = requireUserId(userId);
        const resolvedIntent = resolveWordsIntent(intent, userMessage);
        const summary = await getWordsProgressSummary(effectiveUserId);

        if (resolvedIntent === "review") {
          const route = summary.hasDueReview ? "/words/review" : "/words";
          return JSON.stringify(
            {
              action: "navigate",
              route,
              intent: resolvedIntent,
              reason: summary.hasDueReview
                ? `今天有 ${summary.dueToday} 个待复习单词，优先进入复习。`
                : "今天没有到期复习项，先前往单词首页查看任务。",
              fallbackRoute: "/words",
            },
            null,
            2
          );
        }

        if (resolvedIntent === "learn") {
          const preferredBookId = detectPreferredBookId(userMessage);
          if (preferredBookId) {
            return JSON.stringify(
              {
                action: "navigate",
                route: `/words/learn/${preferredBookId}`,
                intent: resolvedIntent,
                reason: preferredBookId === "cet6"
                  ? "已识别到六级学习需求，直接进入 CET-6 词库。"
                  : "已识别到四级学习需求，直接进入 CET-4 词库。",
                fallbackRoute: "/words",
              },
              null,
              2
            );
          }

          return JSON.stringify(
            {
              action: "navigate",
              route: "/words",
              intent: resolvedIntent,
              reason: "进入单词仪表盘后，请在 CET-4 和 CET-6 中选择想学习的词库。",
              fallbackRoute: "/words",
              choices: [
                { label: "直接开始 CET-4", route: "/words/learn/cet4" },
                { label: "直接开始 CET-6", route: "/words/learn/cet6" },
              ],
            },
            null,
            2
          );
        }

        return JSON.stringify(
          {
            action: "navigate",
            route: "/words",
            intent: resolvedIntent,
            reason: "进入单词仪表盘查看进度、词库和今日任务。",
            fallbackRoute: "/words",
          },
          null,
          2
        );
      } catch (error) {
        return JSON.stringify({
          error: "推荐英语单词学习动作失败",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
  });
}

/**
 * 获取所有工具
 */
export function getAllTools(input?: { userId?: string; isDemo?: boolean }) {
  return [
    createSearchKnowledgeBaseTool(input?.userId),
    createQueryKnowledgeGraphTool(input?.userId),
    createQueryLearningProgressTool(input?.userId, input?.isDemo),
    createQueryWordsProgressTool(input?.userId),
    createRecommendWordsActionTool(input?.userId),
    generateExerciseTool,
    recommendLearningPathTool,
    explainConceptTool,
    socraticQuestionTool,
    checkUnderstandingTool,
  ];
}

/**
 * 工具描述（用于 Agent 提示词）
 */
export function getToolsDescription() {
  const tools = getAllTools();
  return tools.map(tool => `- ${tool.name}: ${tool.description}`).join("\n");
}

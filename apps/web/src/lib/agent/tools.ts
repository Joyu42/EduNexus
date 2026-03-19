/**
 * 学习工作区 Agent 工具定义
 *
 * 提供给 Agent 使用的工具集合
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * 搜索知识宝库工具
 */
export const searchKnowledgeBaseTool = new DynamicStructuredTool({
  name: "search_knowledge_base",
  description: "搜索知识宝库中的文档和笔记。当用户询问某个概念或需要查找相关资料时使用。",
  schema: z.object({
    query: z.string().describe("搜索查询词"),
    limit: z.number().optional().describe("返回结果数量限制，默认5"),
  }),
  func: async ({ query, limit = 5 }) => {
    // TODO: 实现真实的知识库搜索
    // 这里先返回模拟数据
    const results = [
      {
        title: `关于"${query}"的笔记`,
        content: `这是关于${query}的详细说明...`,
        relevance: 0.95,
      },
      {
        title: `${query}相关概念`,
        content: `${query}的相关概念包括...`,
        relevance: 0.87,
      },
    ].slice(0, limit);

    return JSON.stringify(results, null, 2);
  },
});

/**
 * 查询知识星图工具
 */
export const queryKnowledgeGraphTool = new DynamicStructuredTool({
  name: "query_knowledge_graph",
  description: "查询知识星图，获取概念之间的关系。当需要了解知识点之间的联系时使用。",
  schema: z.object({
    concept: z.string().describe("要查询的概念"),
    depth: z.number().optional().describe("查询深度，默认2"),
  }),
  func: async ({ concept, depth = 2 }) => {
    // TODO: 实现真实的图谱查询
    const graph = {
      concept,
      related: [
        { name: "相关概念1", relation: "前置知识", strength: 0.9 },
        { name: "相关概念2", relation: "应用场景", strength: 0.8 },
      ],
      prerequisites: ["前置知识1", "前置知识2"],
      applications: ["应用1", "应用2"],
    };

    return JSON.stringify(graph, null, 2);
  },
});

/**
 * 生成练习题工具
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
    // TODO: 实现真实的题目生成
    const exercises = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      question: `关于${topic}的${difficulty}难度问题${i + 1}`,
      type: "选择题",
      options: ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
      hint: "提示：思考一下...",
    }));

    return JSON.stringify(exercises, null, 2);
  },
});

/**
 * 推荐成长地图工具
 */
export const recommendLearningPathTool = new DynamicStructuredTool({
  name: "recommend_learning_path",
  description: "根据当前知识点推荐成长地图。当用户不知道接下来学什么时使用。",
  schema: z.object({
    currentTopic: z.string().describe("当前学习的主题"),
    goal: z.string().optional().describe("学习目标"),
  }),
  func: async ({ currentTopic, goal }) => {
    // TODO: 实现真实的路径推荐
    const path = {
      current: currentTopic,
      goal: goal || "掌握该领域",
      steps: [
        {
          step: 1,
          topic: "基础概念复习",
          duration: "1-2天",
          resources: ["教程1", "视频2"],
        },
        {
          step: 2,
          topic: "进阶内容",
          duration: "3-5天",
          resources: ["教程3", "练习4"],
        },
        {
          step: 3,
          topic: "实战项目",
          duration: "1周",
          resources: ["项目5"],
        },
      ],
    };

    return JSON.stringify(path, null, 2);
  },
});

/**
 * 解释概念工具
 */
export const explainConceptTool = new DynamicStructuredTool({
  name: "explain_concept",
  description: "用简单的语言解释复杂概念。当用户表示不理解某个概念时使用。",
  schema: z.object({
    concept: z.string().describe("要解释的概念"),
    level: z.enum(["beginner", "intermediate", "advanced"]).describe("解释的深度级别"),
  }),
  func: async ({ concept, level }) => {
    // TODO: 调用 AI 模型生成解释
    const explanation = {
      concept,
      level,
      simple: `${concept}简单来说就是...`,
      detailed: `详细解释：${concept}是指...`,
      examples: ["例子1", "例子2"],
      analogies: ["类比：就像..."],
    };

    return JSON.stringify(explanation, null, 2);
  },
});

/**
 * 苏格拉底式提问工具
 */
export const socraticQuestionTool = new DynamicStructuredTool({
  name: "socratic_question",
  description: "生成苏格拉底式引导问题。当需要引导用户深入思考而不是直接给答案时使用。",
  schema: z.object({
    userQuestion: z.string().describe("用户的问题"),
    context: z.string().optional().describe("对话上下文"),
  }),
  func: async ({ userQuestion, context }) => {
    // TODO: 使用 AI 生成引导性问题
    const questions = [
      "你觉得这个问题的关键是什么？",
      "如果我们换个角度思考，会有什么不同？",
      "你能举个具体的例子来说明吗？",
      "这个概念和你之前学过的哪些知识有关？",
    ];

    return JSON.stringify({
      original: userQuestion,
      guidingQuestions: questions,
      reasoning: "通过这些问题引导你自己找到答案",
    }, null, 2);
  },
});

/**
 * 检查理解程度工具
 */
export const checkUnderstandingTool = new DynamicStructuredTool({
  name: "check_understanding",
  description: "通过提问检查用户对概念的理解程度。",
  schema: z.object({
    topic: z.string().describe("要检查的主题"),
    userResponse: z.string().optional().describe("用户的回答"),
  }),
  func: async ({ topic, userResponse }) => {
    // TODO: 分析用户回答，评估理解程度
    const assessment = {
      topic,
      questions: [
        "请用自己的话解释一下这个概念",
        "你能举个实际应用的例子吗？",
        "这个概念和其他概念有什么区别？",
      ],
      feedback: userResponse ? "你的理解基本正确，但可以更深入..." : null,
      score: userResponse ? 75 : null,
    };

    return JSON.stringify(assessment, null, 2);
  },
});

/**
 * 获取所有工具
 */
export function getAllTools() {
  return [
    searchKnowledgeBaseTool,
    queryKnowledgeGraphTool,
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

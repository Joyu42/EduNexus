/**
 * 学习计划生成服务
 * 基于用户的知识库内容生成个性化学习计划
 */

import { getModelscopeClient } from "@/lib/server/modelscope";
import type { KBDocument } from "@/lib/client/kb-storage";

export interface LearningPlan {
  title: string;
  description: string;
  totalDuration: number; // 总学习时间（小时）
  phases: LearningPhase[];
  recommendations: string[];
}

export interface LearningPhase {
  id: string;
  title: string;
  description: string;
  duration: number; // 小时
  topics: string[];
  relatedDocuments: string[]; // 文档ID
  tasks: LearningTask[];
}

export interface LearningTask {
  id: string;
  title: string;
  type: "read" | "practice" | "review" | "project";
  estimatedTime: number; // 分钟
  priority: "high" | "medium" | "low";
}

export interface KnowledgeCoverage {
  totalTopics: number;
  coveredTopics: string[];
  gaps: string[];
  recommendations: string[];
}

/**
 * 生成学习计划
 */
export async function generateLearningPlan(
  documents: KBDocument[],
  userGoal?: string
): Promise<LearningPlan> {
  const client = getModelscopeClient();
  const model = process.env.MODELSCOPE_CHAT_MODEL || "Qwen/Qwen3.5-122B-A10B";

  // 准备文档摘要
  const docSummaries = documents.slice(0, 20).map((doc) => ({
    id: doc.id,
    title: doc.title,
    tags: doc.tags,
    preview: doc.content.slice(0, 200),
  }));

  const prompt = `请基于以下知识库内容生成学习计划：

用户目标：${userGoal || "系统性学习知识库中的内容"}

知识库文档：
${JSON.stringify(docSummaries, null, 2)}

请按以下格式返回 JSON：
{
  "title": "学习计划标题",
  "description": "计划描述",
  "totalDuration": 40,
  "phases": [
    {
      "id": "phase1",
      "title": "阶段1：基础知识",
      "description": "阶段描述",
      "duration": 10,
      "topics": ["主题1", "主题2"],
      "relatedDocuments": ["doc-id-1", "doc-id-2"],
      "tasks": [
        {
          "id": "task1",
          "title": "阅读文档",
          "type": "read",
          "estimatedTime": 30,
          "priority": "high"
        }
      ]
    }
  ],
  "recommendations": ["建议1", "建议2"]
}

要求：
- 分析知识库的主题和结构
- 设计合理的学习路径
- 估算学习时间
- 提供具体的学习任务
- type 可以是 read/practice/review/project
- priority 可以是 high/medium/low

只返回 JSON，不要其他内容。`;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "你是一个专业的学习规划师，擅长设计个性化学习路径。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 3000,
    });

    const response = completion.choices[0]?.message?.content || "{}";

    // 提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;
    const result = JSON.parse(jsonStr);

    return {
      title: result.title || "学习计划",
      description: result.description || "",
      totalDuration: result.totalDuration || 0,
      phases: result.phases || [],
      recommendations: result.recommendations || [],
    };
  } catch (error) {
    console.error("生成学习计划失败:", error);
    throw new Error("生成学习计划失败，请稍后重试");
  }
}

/**
 * 分析知识覆盖度
 */
export async function analyzeKnowledgeCoverage(
  documents: KBDocument[],
  targetDomain: string
): Promise<KnowledgeCoverage> {
  const client = getModelscopeClient();
  const model = process.env.MODELSCOPE_CHAT_MODEL || "Qwen/Qwen3.5-122B-A10B";

  const docSummaries = documents.slice(0, 30).map((doc) => ({
    title: doc.title,
    tags: doc.tags,
  }));

  const prompt = `请分析以下知识库在"${targetDomain}"领域的覆盖度：

知识库文档：
${JSON.stringify(docSummaries, null, 2)}

请按以下格式返回 JSON：
{
  "totalTopics": 15,
  "coveredTopics": ["已覆盖主题1", "已覆盖主题2"],
  "gaps": ["缺失主题1", "缺失主题2"],
  "recommendations": ["建议补充的内容1", "建议补充的内容2"]
}

要求：
- 评估知识库的完整性
- 识别已覆盖的主题
- 找出知识空白
- 提供补充建议

只返回 JSON，不要其他内容。`;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "你是一个知识体系分析专家。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content || "{}";

    // 提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;
    const result = JSON.parse(jsonStr);

    return {
      totalTopics: result.totalTopics || 0,
      coveredTopics: result.coveredTopics || [],
      gaps: result.gaps || [],
      recommendations: result.recommendations || [],
    };
  } catch (error) {
    console.error("分析知识覆盖度失败:", error);
    throw new Error("分析知识覆盖度失败，请稍后重试");
  }
}

/**
 * 推荐学习顺序
 */
export async function recommendLearningOrder(
  documents: KBDocument[]
): Promise<string[]> {
  const client = getModelscopeClient();
  const model = process.env.MODELSCOPE_CHAT_MODEL || "Qwen/Qwen3.5-122B-A10B";

  const docList = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    tags: doc.tags,
  }));

  const prompt = `请为以下文档推荐学习顺序：

文档列表：
${JSON.stringify(docList, null, 2)}

请按以下格式返回 JSON：
{
  "order": ["doc-id-1", "doc-id-2", "doc-id-3"]
}

要求：
- 分析文档之间的依赖关系
- 从基础到高级排序
- 考虑知识的连贯性

只返回 JSON，不要其他内容。`;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "你是一个学习路径规划专家。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content || "{}";

    // 提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;
    const result = JSON.parse(jsonStr);

    return result.order || [];
  } catch (error) {
    console.error("推荐学习顺序失败:", error);
    throw new Error("推荐学习顺序失败，请稍后重试");
  }
}

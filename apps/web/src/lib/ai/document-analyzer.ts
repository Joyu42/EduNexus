/**
 * 文档分析服务
 * 使用 ModelScope API 进行文档分析、摘要生成、关键词提取等
 */

import { getModelscopeClient } from "@/lib/server/modelscope";

export interface DocumentSummary {
  summary: string;
  keyPoints: string[];
  outline: OutlineItem[];
  wordCount: number;
  readingTime: number;
}

export interface OutlineItem {
  level: number;
  title: string;
  id: string;
}

export interface KeywordExtractionResult {
  keywords: Array<{
    word: string;
    importance: number;
  }>;
  suggestedTags: string[];
}

export interface MindMapData {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
}

export interface MindMapNode {
  id: string;
  label: string;
  level: number;
  type: "root" | "branch" | "leaf";
}

export interface MindMapEdge {
  source: string;
  target: string;
}

/**
 * 生成文档摘要
 */
export async function generateDocumentSummary(
  content: string,
  title: string
): Promise<DocumentSummary> {
  const client = getModelscopeClient();
  const model = process.env.MODELSCOPE_CHAT_MODEL || "Qwen/Qwen3.5-122B-A10B";

  const prompt = `请分析以下文档并生成摘要：

标题：${title}

内容：
${content.slice(0, 4000)} ${content.length > 4000 ? "..." : ""}

请按以下格式返回 JSON：
{
  "summary": "200-300字的摘要",
  "keyPoints": ["关键要点1", "关键要点2", "关键要点3"],
  "outline": [
    {"level": 1, "title": "一级标题", "id": "h1"},
    {"level": 2, "title": "二级标题", "id": "h2"}
  ]
}

只返回 JSON，不要其他内容。`;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "你是一个专业的文档分析助手，擅长提取文档的核心内容和结构。",
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

    // 计算字数和阅读时间
    const wordCount = content.length;
    const readingTime = Math.ceil(wordCount / 400); // 假设每分钟阅读400字

    return {
      summary: result.summary || "",
      keyPoints: result.keyPoints || [],
      outline: result.outline || [],
      wordCount,
      readingTime,
    };
  } catch (error) {
    console.error("生成摘要失败:", error);
    throw new Error("生成摘要失败，请稍后重试");
  }
}

/**
 * 提取关键词
 */
export async function extractKeywords(
  content: string,
  title: string
): Promise<KeywordExtractionResult> {
  const client = getModelscopeClient();
  const model = process.env.MODELSCOPE_CHAT_MODEL || "Qwen/Qwen3.5-122B-A10B";

  const prompt = `请从以下文档中提取关键词：

标题：${title}

内容：
${content.slice(0, 3000)} ${content.length > 3000 ? "..." : ""}

请按以下格式返回 JSON：
{
  "keywords": [
    {"word": "关键词1", "importance": 0.95},
    {"word": "关键词2", "importance": 0.85}
  ],
  "suggestedTags": ["标签1", "标签2", "标签3"]
}

要求：
- 提取5-10个关键词
- importance 范围 0-1，表示重要性
- 按重要性降序排列
- suggestedTags 是适合作为文档标签的词

只返回 JSON，不要其他内容。`;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "你是一个专业的关键词提取助手。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content || "{}";

    // 提取 JSON
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;
    const result = JSON.parse(jsonStr);

    return {
      keywords: result.keywords || [],
      suggestedTags: result.suggestedTags || [],
    };
  } catch (error) {
    console.error("提取关键词失败:", error);
    throw new Error("提取关键词失败，请稍后重试");
  }
}

/**
 * 生成思维导图数据
 */
export async function generateMindMap(
  content: string,
  title: string
): Promise<MindMapData> {
  const client = getModelscopeClient();
  const model = process.env.MODELSCOPE_CHAT_MODEL || "Qwen/Qwen3.5-122B-A10B";

  const prompt = `请分析以下文档的结构，生成思维导图数据：

标题：${title}

内容：
${content.slice(0, 3000)} ${content.length > 3000 ? "..." : ""}

请按以下格式返回 JSON：
{
  "nodes": [
    {"id": "root", "label": "主题", "level": 0, "type": "root"},
    {"id": "n1", "label": "分支1", "level": 1, "type": "branch"},
    {"id": "n1-1", "label": "子节点", "level": 2, "type": "leaf"}
  ],
  "edges": [
    {"source": "root", "target": "n1"},
    {"source": "n1", "target": "n1-1"}
  ]
}

要求：
- 根节点使用文档标题
- 提取文档的主要结构和层次关系
- level 表示层级（0=根，1=一级分支，2=二级分支...）
- type 可以是 root/branch/leaf

只返回 JSON，不要其他内容。`;

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "你是一个专业的思维导图生成助手。",
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
      nodes: result.nodes || [],
      edges: result.edges || [],
    };
  } catch (error) {
    console.error("生成思维导图失败:", error);
    throw new Error("生成思维导图失败，请稍后重试");
  }
}

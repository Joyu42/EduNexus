/**
 * 知识库搜索索引模块
 * 提供全文搜索、中文分词、索引缓存等功能
 */

import type { KBDocument } from "./kb-storage";

// 搜索索引项
type SearchIndexItem = {
  docId: string;
  title: string;
  content: string;
  tags: string[];
  tokens: string[]; // 分词后的词条
  updatedAt: Date;
};

// 搜索结果
export type SearchResult = {
  document: KBDocument;
  score: number;
  highlights: string[];
  matchedTerms?: string[]; // 匹配的关键词
};

// 高级搜索查询解析结果
type ParsedQuery = {
  terms: string[]; // 普通搜索词
  exactPhrases: string[]; // 精确匹配短语
  excludeTerms: string[]; // 排除词
  tagFilters: string[]; // 标签过滤
  operator: "AND" | "OR"; // 逻辑运算符
};

// 简单的中文分词（基于字符和常见词）
function tokenize(text: string): string[] {
  const tokens: string[] = [];

  // 移除标点符号和特殊字符
  const cleaned = text.toLowerCase().replace(/[^\w\s\u4e00-\u9fa5]/g, " ");

  // 按空格分割（处理英文单词）
  const words = cleaned.split(/\s+/).filter(Boolean);

  words.forEach((word) => {
    // 如果是英文单词，直接添加
    if (/^[a-z0-9]+$/.test(word)) {
      tokens.push(word);
    } else {
      // 中文按字符分割
      for (let i = 0; i < word.length; i++) {
        tokens.push(word[i]);
        // 添加双字词
        if (i < word.length - 1) {
          tokens.push(word.slice(i, i + 2));
        }
        // 添加三字词
        if (i < word.length - 2) {
          tokens.push(word.slice(i, i + 3));
        }
      }
    }
  });

  return [...new Set(tokens)]; // 去重
}

/**
 * 解析高级搜索语法
 * 支持：
 * - "exact phrase" 精确匹配
 * - AND/OR 逻辑运算符
 * - NOT 或 - 排除词
 * - tag:标签名 标签过滤
 */
function parseAdvancedQuery(query: string): ParsedQuery {
  const result: ParsedQuery = {
    terms: [],
    exactPhrases: [],
    excludeTerms: [],
    tagFilters: [],
    operator: "AND",
  };

  let remaining = query;

  // 提取精确匹配短语 "..."
  const phraseRegex = /"([^"]+)"/g;
  let match;
  while ((match = phraseRegex.exec(query)) !== null) {
    result.exactPhrases.push(match[1]);
    remaining = remaining.replace(match[0], " ");
  }

  // 提取标签过滤 tag:xxx
  const tagRegex = /tag:(\S+)/gi;
  while ((match = tagRegex.exec(remaining)) !== null) {
    result.tagFilters.push(match[1]);
    remaining = remaining.replace(match[0], " ");
  }

  // 检测逻辑运算符
  if (/\bOR\b/i.test(remaining)) {
    result.operator = "OR";
    remaining = remaining.replace(/\bOR\b/gi, " ");
  }
  if (/\bAND\b/i.test(remaining)) {
    result.operator = "AND";
    remaining = remaining.replace(/\bAND\b/gi, " ");
  }

  // 提取排除词 NOT xxx 或 -xxx
  const excludeRegex = /(?:NOT\s+|-)(\S+)/gi;
  while ((match = excludeRegex.exec(remaining)) !== null) {
    result.excludeTerms.push(match[1]);
    remaining = remaining.replace(match[0], " ");
  }

  // 剩余的作为普通搜索词
  const words = remaining.split(/\s+/).filter((w) => w.trim().length > 0);
  result.terms = words;

  return result;
}

// 计算文档相关性得分
function calculateRelevance(
  doc: SearchIndexItem,
  queryTokens: string[],
  query: string,
  parsedQuery?: ParsedQuery
): number {
  let score = 0;
  const lowerQuery = query.toLowerCase();

  // 完全匹配标题（最高权重）
  if (doc.title.toLowerCase() === lowerQuery) {
    score += 100;
  }

  // 标题包含查询（高权重）
  if (doc.title.toLowerCase().includes(lowerQuery)) {
    score += 50;
  }

  // 标题词条匹配
  queryTokens.forEach((token) => {
    if (doc.title.toLowerCase().includes(token)) {
      score += 10;
    }
  });

  // 标签匹配（中等权重）
  doc.tags.forEach((tag) => {
    if (tag.toLowerCase().includes(lowerQuery)) {
      score += 20;
    }
    queryTokens.forEach((token) => {
      if (tag.toLowerCase().includes(token)) {
        score += 5;
      }
    });
  });

  // 内容词条匹配（基础权重）
  queryTokens.forEach((token) => {
    const regex = new RegExp(token, "gi");
    const matches = doc.content.match(regex);
    if (matches) {
      score += matches.length * 2;
    }
  });

  // 高级搜索语法加成
  if (parsedQuery) {
    // 精确短语匹配（高权重）
    parsedQuery.exactPhrases.forEach((phrase) => {
      const lowerPhrase = phrase.toLowerCase();
      if (doc.title.toLowerCase().includes(lowerPhrase)) {
        score += 80;
      }
      if (doc.content.toLowerCase().includes(lowerPhrase)) {
        const regex = new RegExp(phrase, "gi");
        const matches = doc.content.match(regex);
        if (matches) {
          score += matches.length * 15;
        }
      }
    });

    // 标签过滤匹配
    parsedQuery.tagFilters.forEach((tagFilter) => {
      const hasTag = doc.tags.some((tag) =>
        tag.toLowerCase().includes(tagFilter.toLowerCase())
      );
      if (hasTag) {
        score += 30;
      }
    });
  }

  // 新鲜度加成（最近更新的文档得分略高）
  const daysSinceUpdate = (Date.now() - doc.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate < 7) {
    score += 5;
  } else if (daysSinceUpdate < 30) {
    score += 2;
  }

  return score;
}

// 生成高亮片段（支持多个关键词）
function generateHighlights(
  content: string,
  query: string,
  parsedQuery?: ParsedQuery,
  maxHighlights: number = 3
): string[] {
  const highlights: string[] = [];
  const lowerContent = content.toLowerCase();

  // 收集所有需要高亮的词
  const termsToHighlight: string[] = [];

  if (parsedQuery) {
    // 添加精确短语
    termsToHighlight.push(...parsedQuery.exactPhrases);
    // 添加普通搜索词
    termsToHighlight.push(...parsedQuery.terms);
  } else {
    termsToHighlight.push(query);
  }

  // 找到所有匹配位置
  const matchPositions: Array<{ start: number; end: number; term: string }> = [];

  termsToHighlight.forEach((term) => {
    if (!term.trim()) return;

    const lowerTerm = term.toLowerCase();
    let startIndex = 0;

    while (true) {
      const index = lowerContent.indexOf(lowerTerm, startIndex);
      if (index === -1) break;

      matchPositions.push({
        start: index,
        end: index + term.length,
        term,
      });

      startIndex = index + term.length;
    }
  });

  // 按位置排序
  matchPositions.sort((a, b) => a.start - b.start);

  // 生成高亮片段（前后各50字符）
  const usedRanges = new Set<string>();

  for (const match of matchPositions) {
    if (highlights.length >= maxHighlights) break;

    const start = Math.max(0, match.start - 50);
    const end = Math.min(content.length, match.end + 50);
    const rangeKey = `${start}-${end}`;

    // 避免重复片段
    if (usedRanges.has(rangeKey)) continue;
    usedRanges.add(rangeKey);

    const snippet = content.slice(start, end);
    highlights.push(
      (start > 0 ? "..." : "") + snippet + (end < content.length ? "..." : "")
    );
  }

  return highlights;
}

/**
 * 搜索索引管理器
 */
export class SearchIndexManager {
  private index: Map<string, SearchIndexItem> = new Map();
  private lastIndexTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

  /**
   * 构建索引
   */
  buildIndex(documents: KBDocument[]): void {
    this.index.clear();

    documents.forEach((doc) => {
      const tokens = [
        ...tokenize(doc.title),
        ...tokenize(doc.content),
        ...doc.tags.flatMap((tag) => tokenize(tag)),
      ];

      this.index.set(doc.id, {
        docId: doc.id,
        title: doc.title,
        content: doc.content,
        tags: doc.tags,
        tokens,
        updatedAt: doc.updatedAt,
      });
    });

    this.lastIndexTime = Date.now();
  }

  /**
   * 检查索引是否需要重建
   */
  needsRebuild(): boolean {
    return Date.now() - this.lastIndexTime > this.CACHE_DURATION;
  }

  /**
   * 搜索文档
   */
  search(
    documents: KBDocument[],
    query: string,
    options?: {
      maxResults?: number;
      minScore?: number;
    }
  ): SearchResult[] {
    // 如果索引过期或为空，重建索引
    if (this.needsRebuild() || this.index.size === 0) {
      this.buildIndex(documents);
    }

    if (!query.trim()) {
      return documents.map((doc) => ({
        document: doc,
        score: 0,
        highlights: [],
        matchedTerms: [],
      }));
    }

    // 解析高级搜索语法
    const parsedQuery = parseAdvancedQuery(query);
    const queryTokens = tokenize(query);
    const results: SearchResult[] = [];

    documents.forEach((doc) => {
      const indexItem = this.index.get(doc.id);
      if (!indexItem) return;

      // 检查排除词
      const hasExcludedTerm = parsedQuery.excludeTerms.some((term) => {
        const lowerTerm = term.toLowerCase();
        return (
          doc.title.toLowerCase().includes(lowerTerm) ||
          doc.content.toLowerCase().includes(lowerTerm) ||
          doc.tags.some((tag) => tag.toLowerCase().includes(lowerTerm))
        );
      });

      if (hasExcludedTerm) return;

      // 检查标签过滤
      if (parsedQuery.tagFilters.length > 0) {
        const hasAllTags = parsedQuery.tagFilters.every((tagFilter) =>
          doc.tags.some((tag) =>
            tag.toLowerCase().includes(tagFilter.toLowerCase())
          )
        );
        if (!hasAllTags) return;
      }

      // 检查逻辑运算符
      if (parsedQuery.operator === "AND") {
        // AND: 所有词都必须匹配
        const allTermsMatch = [
          ...parsedQuery.terms,
          ...parsedQuery.exactPhrases,
        ].every((term) => {
          const lowerTerm = term.toLowerCase();
          return (
            doc.title.toLowerCase().includes(lowerTerm) ||
            doc.content.toLowerCase().includes(lowerTerm) ||
            doc.tags.some((tag) => tag.toLowerCase().includes(lowerTerm))
          );
        });

        if (!allTermsMatch && parsedQuery.terms.length > 0) return;
      }

      const score = calculateRelevance(indexItem, queryTokens, query, parsedQuery);

      if (score >= (options?.minScore || 0)) {
        // 收集匹配的关键词
        const matchedTerms = [
          ...parsedQuery.terms,
          ...parsedQuery.exactPhrases,
        ].filter((term) => {
          const lowerTerm = term.toLowerCase();
          return (
            doc.title.toLowerCase().includes(lowerTerm) ||
            doc.content.toLowerCase().includes(lowerTerm)
          );
        });

        results.push({
          document: doc,
          score,
          highlights: generateHighlights(doc.content, query, parsedQuery),
          matchedTerms,
        });
      }
    });

    // 按得分排序
    results.sort((a, b) => b.score - a.score);

    // 限制结果数量
    if (options?.maxResults) {
      return results.slice(0, options.maxResults);
    }

    return results;
  }

  /**
   * 清除索引
   */
  clearIndex(): void {
    this.index.clear();
    this.lastIndexTime = 0;
  }

  /**
   * 获取索引统计信息
   */
  getStats() {
    return {
      indexSize: this.index.size,
      lastIndexTime: this.lastIndexTime,
      cacheAge: Date.now() - this.lastIndexTime,
    };
  }
}

// 单例实例
let searchIndexInstance: SearchIndexManager | null = null;

/**
 * 获取搜索索引管理器实例
 */
export function getSearchIndex(): SearchIndexManager {
  if (!searchIndexInstance) {
    searchIndexInstance = new SearchIndexManager();
  }
  return searchIndexInstance;
}

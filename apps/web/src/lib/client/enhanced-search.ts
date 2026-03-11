/**
 * 增强的搜索功能
 * 支持全文搜索、标签筛选、日期范围、搜索历史
 */

import { getKBStorage, type KBDocument } from "./kb-storage";

export type SearchOptions = {
  query: string;
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: "relevance" | "date" | "title";
  sortOrder?: "asc" | "desc";
};

export type SearchResult = {
  document: KBDocument;
  score: number;
  highlights: string[];
};

export type SearchHistory = {
  id: string;
  query: string;
  timestamp: Date;
  resultCount: number;
};

const STORAGE_KEY_HISTORY = "edunexus_kb_search_history";
const MAX_HISTORY = 20;

/**
 * 增强的搜索引擎
 */
export class EnhancedSearchEngine {
  /**
   * 全文搜索
   */
  async search(
    vaultId: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const storage = getKBStorage();
    const allDocs = await storage.getDocumentsByVault(vaultId);

    let results: SearchResult[] = [];

    // 1. 应用标签筛选
    let filteredDocs = allDocs;
    if (options.tags && options.tags.length > 0) {
      filteredDocs = filteredDocs.filter((doc) =>
        options.tags!.some((tag) => doc.tags.includes(tag))
      );
    }

    // 2. 应用日期范围筛选
    if (options.dateFrom) {
      filteredDocs = filteredDocs.filter(
        (doc) => doc.updatedAt >= options.dateFrom!
      );
    }
    if (options.dateTo) {
      filteredDocs = filteredDocs.filter(
        (doc) => doc.updatedAt <= options.dateTo!
      );
    }

    // 3. 全文搜索和评分
    const query = options.query.toLowerCase();
    if (query) {
      results = filteredDocs
        .map((doc) => {
          const titleMatch = doc.title.toLowerCase().includes(query);
          const contentMatch = doc.content.toLowerCase().includes(query);
          const tagMatch = doc.tags.some((tag) =>
            tag.toLowerCase().includes(query)
          );

          if (!titleMatch && !contentMatch && !tagMatch) {
            return null;
          }

          // 计算相关性分数
          let score = 0;
          if (titleMatch) score += 10;
          if (contentMatch) {
            const occurrences = (
              doc.content.toLowerCase().match(new RegExp(query, "g")) || []
            ).length;
            score += occurrences * 2;
          }
          if (tagMatch) score += 5;

          // 提取高亮片段
          const highlights = this.extractHighlights(doc.content, query);

          return {
            document: doc,
            score,
            highlights,
          };
        })
        .filter((r): r is SearchResult => r !== null);
    } else {
      // 无搜索词时返回所有筛选后的文档
      results = filteredDocs.map((doc) => ({
        document: doc,
        score: 0,
        highlights: [],
      }));
    }

    // 4. 排序
    results = this.sortResults(results, options);

    // 5. 保存搜索历史
    if (options.query) {
      this.addSearchHistory(options.query, results.length);
    }

    return results;
  }

  /**
   * 提取高亮片段
   */
  private extractHighlights(content: string, query: string): string[] {
    const highlights: string[] = [];
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();

    let index = lowerContent.indexOf(lowerQuery);
    let count = 0;

    while (index !== -1 && count < 3) {
      const start = Math.max(0, index - 50);
      const end = Math.min(content.length, index + query.length + 50);
      let snippet = content.substring(start, end);

      if (start > 0) snippet = "..." + snippet;
      if (end < content.length) snippet = snippet + "...";

      highlights.push(snippet);
      count++;

      index = lowerContent.indexOf(lowerQuery, index + 1);
    }

    return highlights;
  }

  /**
   * 排序结果
   */
  private sortResults(
    results: SearchResult[],
    options: SearchOptions
  ): SearchResult[] {
    const sortBy = options.sortBy || "relevance";
    const sortOrder = options.sortOrder || "desc";

    results.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "relevance":
          comparison = b.score - a.score;
          break;
        case "date":
          comparison =
            b.document.updatedAt.getTime() - a.document.updatedAt.getTime();
          break;
        case "title":
          comparison = a.document.title.localeCompare(b.document.title);
          break;
      }

      return sortOrder === "asc" ? -comparison : comparison;
    });

    return results;
  }

  /**
   * 获取搜索历史
   */
  getSearchHistory(): SearchHistory[] {
    const historyJson = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!historyJson) return [];

    const history = JSON.parse(historyJson);
    return history.map((h: any) => ({
      ...h,
      timestamp: new Date(h.timestamp),
    }));
  }

  /**
   * 添加搜索历史
   */
  addSearchHistory(query: string, resultCount: number): void {
    let history = this.getSearchHistory();

    // 移除重复的查询
    history = history.filter((h) => h.query !== query);

    // 添加新记录
    history.unshift({
      id: `search_${Date.now()}`,
      query,
      timestamp: new Date(),
      resultCount,
    });

    // 限制数量
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }

    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  }

  /**
   * 清除搜索历史
   */
  clearSearchHistory(): void {
    localStorage.removeItem(STORAGE_KEY_HISTORY);
  }

  /**
   * 删除单条搜索历史
   */
  removeSearchHistory(id: string): void {
    const history = this.getSearchHistory();
    const filtered = history.filter((h) => h.id !== id);
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(filtered));
  }

  /**
   * 获取搜索建议
   */
  async getSearchSuggestions(
    vaultId: string,
    query: string
  ): Promise<string[]> {
    if (!query) return [];

    const storage = getKBStorage();
    const allDocs = await storage.getDocumentsByVault(vaultId);

    const suggestions = new Set<string>();
    const lowerQuery = query.toLowerCase();

    // 从标题中提取建议
    allDocs.forEach((doc) => {
      if (doc.title.toLowerCase().includes(lowerQuery)) {
        suggestions.add(doc.title);
      }
    });

    // 从标签中提取建议
    allDocs.forEach((doc) => {
      doc.tags.forEach((tag) => {
        if (tag.toLowerCase().includes(lowerQuery)) {
          suggestions.add(tag);
        }
      });
    });

    return Array.from(suggestions).slice(0, 10);
  }
}

// 单例实例
let searchEngineInstance: EnhancedSearchEngine | null = null;

export function getEnhancedSearchEngine(): EnhancedSearchEngine {
  if (!searchEngineInstance) {
    searchEngineInstance = new EnhancedSearchEngine();
  }
  return searchEngineInstance;
}

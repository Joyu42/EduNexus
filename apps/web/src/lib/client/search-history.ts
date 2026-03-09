/**
 * 搜索历史管理模块
 * 提供搜索历史的保存、读取、清除等功能
 */

const STORAGE_KEY = "kb_search_history";
const MAX_HISTORY_SIZE = 20;

export type SearchHistoryItem = {
  query: string;
  timestamp: number;
  resultCount?: number;
};

/**
 * 搜索历史管理器
 */
export class SearchHistoryManager {
  private history: SearchHistoryItem[] = [];

  constructor() {
    this.loadFromStorage();
  }

  /**
   * 从 localStorage 加载历史记录
   */
  private loadFromStorage(): void {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load search history:", error);
      this.history = [];
    }
  }

  /**
   * 保存历史记录到 localStorage
   */
  private saveToStorage(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  }

  /**
   * 添加搜索记录
   */
  addSearch(query: string, resultCount?: number): void {
    if (!query.trim()) return;

    // 移除已存在的相同查询
    this.history = this.history.filter((item) => item.query !== query);

    // 添加到开头
    this.history.unshift({
      query,
      timestamp: Date.now(),
      resultCount,
    });

    // 限制历史记录数量
    if (this.history.length > MAX_HISTORY_SIZE) {
      this.history = this.history.slice(0, MAX_HISTORY_SIZE);
    }

    this.saveToStorage();
  }

  /**
   * 获取所有历史记录
   */
  getHistory(): SearchHistoryItem[] {
    return [...this.history];
  }

  /**
   * 获取最近的 N 条历史记录
   */
  getRecentHistory(limit: number = 10): SearchHistoryItem[] {
    return this.history.slice(0, limit);
  }

  /**
   * 搜索历史记录（模糊匹配）
   */
  searchHistory(query: string): SearchHistoryItem[] {
    if (!query.trim()) return this.getRecentHistory();

    const lowerQuery = query.toLowerCase();
    return this.history.filter((item) =>
      item.query.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * 删除指定的历史记录
   */
  removeItem(query: string): void {
    this.history = this.history.filter((item) => item.query !== query);
    this.saveToStorage();
  }

  /**
   * 清除所有历史记录
   */
  clearHistory(): void {
    this.history = [];
    this.saveToStorage();
  }

  /**
   * 获取历史记录统计
   */
  getStats() {
    return {
      totalSearches: this.history.length,
      oldestSearch: this.history[this.history.length - 1]?.timestamp,
      newestSearch: this.history[0]?.timestamp,
    };
  }
}

// 单例实例
let searchHistoryInstance: SearchHistoryManager | null = null;

/**
 * 获取搜索历史管理器实例
 */
export function getSearchHistory(): SearchHistoryManager {
  if (!searchHistoryInstance) {
    searchHistoryInstance = new SearchHistoryManager();
  }
  return searchHistoryInstance;
}

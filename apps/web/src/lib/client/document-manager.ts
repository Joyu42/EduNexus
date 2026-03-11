/**
 * 文档标签管理系统
 */

import { getKBStorage, type KBDocument } from "./kb-storage";

export type Tag = {
  id: string;
  name: string;
  color: string;
  count: number;
  createdAt: Date;
};

export type FavoriteDocument = {
  docId: string;
  addedAt: Date;
};

export type RecentDocument = {
  docId: string;
  accessedAt: Date;
  title: string;
};

const STORAGE_KEYS = {
  TAGS: "edunexus_kb_tags",
  FAVORITES: "edunexus_kb_favorites",
  RECENT: "edunexus_kb_recent",
} as const;

const TAG_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
];

/**
 * 标签管理类
 */
export class TagManager {
  /**
   * 获取所有标签
   */
  getAllTags(): Tag[] {
    const tagsJson = localStorage.getItem(STORAGE_KEYS.TAGS);
    if (!tagsJson) return [];

    const tags = JSON.parse(tagsJson);
    return tags.map((t: any) => ({
      ...t,
      createdAt: new Date(t.createdAt),
    }));
  }

  /**
   * 创建标签
   */
  createTag(name: string): Tag {
    const tags = this.getAllTags();
    const existingTag = tags.find((t) => t.name === name);

    if (existingTag) {
      return existingTag;
    }

    const newTag: Tag = {
      id: `tag_${Date.now()}`,
      name,
      color: TAG_COLORS[tags.length % TAG_COLORS.length],
      count: 0,
      createdAt: new Date(),
    };

    tags.push(newTag);
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(tags));

    return newTag;
  }

  /**
   * 更新标签
   */
  updateTag(tagId: string, updates: Partial<Tag>): void {
    const tags = this.getAllTags();
    const index = tags.findIndex((t) => t.id === tagId);

    if (index !== -1) {
      tags[index] = { ...tags[index], ...updates };
      localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(tags));
    }
  }

  /**
   * 删除标签
   */
  deleteTag(tagId: string): void {
    const tags = this.getAllTags();
    const filtered = tags.filter((t) => t.id !== tagId);
    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(filtered));
  }

  /**
   * 更新标签计数
   */
  async updateTagCounts(): Promise<void> {
    const storage = getKBStorage();
    const currentVaultId = storage.getCurrentVaultId();

    if (!currentVaultId) return;

    const docs = await storage.getDocumentsByVault(currentVaultId);
    const tags = this.getAllTags();

    // 统计每个标签的使用次数
    const tagCounts = new Map<string, number>();
    docs.forEach((doc) => {
      doc.tags.forEach((tagName) => {
        tagCounts.set(tagName, (tagCounts.get(tagName) || 0) + 1);
      });
    });

    // 更新标签计数
    tags.forEach((tag) => {
      tag.count = tagCounts.get(tag.name) || 0;
    });

    localStorage.setItem(STORAGE_KEYS.TAGS, JSON.stringify(tags));
  }

  /**
   * 获取热门标签
   */
  getPopularTags(limit: number = 10): Tag[] {
    const tags = this.getAllTags();
    return tags.sort((a, b) => b.count - a.count).slice(0, limit);
  }
}

/**
 * 收藏管理类
 */
export class FavoriteManager {
  /**
   * 获取所有收藏
   */
  getAllFavorites(): FavoriteDocument[] {
    const favJson = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (!favJson) return [];

    const favorites = JSON.parse(favJson);
    return favorites.map((f: any) => ({
      ...f,
      addedAt: new Date(f.addedAt),
    }));
  }

  /**
   * 添加收藏
   */
  addFavorite(docId: string): void {
    const favorites = this.getAllFavorites();

    if (favorites.some((f) => f.docId === docId)) {
      return; // 已收藏
    }

    favorites.push({
      docId,
      addedAt: new Date(),
    });

    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  }

  /**
   * 移除收藏
   */
  removeFavorite(docId: string): void {
    const favorites = this.getAllFavorites();
    const filtered = favorites.filter((f) => f.docId !== docId);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(filtered));
  }

  /**
   * 检查是否已收藏
   */
  isFavorite(docId: string): boolean {
    const favorites = this.getAllFavorites();
    return favorites.some((f) => f.docId === docId);
  }

  /**
   * 切换收藏状态
   */
  toggleFavorite(docId: string): boolean {
    if (this.isFavorite(docId)) {
      this.removeFavorite(docId);
      return false;
    } else {
      this.addFavorite(docId);
      return true;
    }
  }
}

/**
 * 最近访问管理类
 */
export class RecentManager {
  private maxRecent = 50;

  /**
   * 获取最近访问
   */
  getRecentDocuments(): RecentDocument[] {
    const recentJson = localStorage.getItem(STORAGE_KEYS.RECENT);
    if (!recentJson) return [];

    const recent = JSON.parse(recentJson);
    return recent.map((r: any) => ({
      ...r,
      accessedAt: new Date(r.accessedAt),
    }));
  }

  /**
   * 添加最近访问
   */
  addRecentDocument(docId: string, title: string): void {
    let recent = this.getRecentDocuments();

    // 移除已存在的记录
    recent = recent.filter((r) => r.docId !== docId);

    // 添加到开头
    recent.unshift({
      docId,
      title,
      accessedAt: new Date(),
    });

    // 限制数量
    if (recent.length > this.maxRecent) {
      recent = recent.slice(0, this.maxRecent);
    }

    localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(recent));
  }

  /**
   * 清除最近访问
   */
  clearRecent(): void {
    localStorage.removeItem(STORAGE_KEYS.RECENT);
  }

  /**
   * 移除特定文档
   */
  removeRecentDocument(docId: string): void {
    const recent = this.getRecentDocuments();
    const filtered = recent.filter((r) => r.docId !== docId);
    localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(filtered));
  }
}

// 单例实例
let tagManagerInstance: TagManager | null = null;
let favoriteManagerInstance: FavoriteManager | null = null;
let recentManagerInstance: RecentManager | null = null;

export function getTagManager(): TagManager {
  if (!tagManagerInstance) {
    tagManagerInstance = new TagManager();
  }
  return tagManagerInstance;
}

export function getFavoriteManager(): FavoriteManager {
  if (!favoriteManagerInstance) {
    favoriteManagerInstance = new FavoriteManager();
  }
  return favoriteManagerInstance;
}

export function getRecentManager(): RecentManager {
  if (!recentManagerInstance) {
    recentManagerInstance = new RecentManager();
  }
  return recentManagerInstance;
}

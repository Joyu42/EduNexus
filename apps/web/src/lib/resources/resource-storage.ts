// 资源存储管理

import { getClientUserIdentity } from '@/lib/auth/client-user-cache';
import { getDataSyncEventManager, SyncEventType } from '../sync/data-sync-events';
import type {
  Resource,
  Bookmark,
  BookmarkFolder,
  ResourceNote,
  ResourceType,
  ResourceStatus,
} from "./resource-types";

export type {
  Resource,
  Bookmark,
  BookmarkFolder,
  ResourceNote,
  ResourceType,
  ResourceStatus,
} from "./resource-types";

const STORAGE_KEYS_BASE = {
  RESOURCES: "edunexus_resources",
  BOOKMARKS: "edunexus_bookmarks",
  FOLDERS: "edunexus_bookmark_folders",
  NOTES: "edunexus_resource_notes",
} as const;

// 获取用户特定的存储键
function getStorageKeys() {
  const userId = getClientUserIdentity() || 'anonymous';
  return {
    RESOURCES: `edunexus_resources_${userId}`,
    BOOKMARKS: `edunexus_bookmarks_${userId}`,
    FOLDERS: `edunexus_bookmark_folders_${userId}`,
    NOTES: `edunexus_resource_notes_${userId}`,
  };
}

// ==================== 资源管理 ====================

export function getAllResources(): Resource[] {
  if (typeof window === "undefined") return [];
  const keys = getStorageKeys();
  const data = localStorage.getItem(keys.RESOURCES);
  return data ? JSON.parse(data) : [];
}

export function getResourceById(id: string): Resource | null {
  const resources = getAllResources();
  return resources.find((r) => r.id === id) || null;
}

export function createResource(
  data: Omit<Resource, "id" | "createdAt" | "updatedAt" | "viewCount" | "bookmarkCount" | "rating" | "ratingCount">
): Resource {
  const resource: Resource = {
    ...data,
    id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    viewCount: 0,
    bookmarkCount: 0,
    rating: 0,
    ratingCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const resources = getAllResources();
  resources.unshift(resource);
  localStorage.setItem(getStorageKeys().RESOURCES, JSON.stringify(resources));

  // 发布资源创建事件
  const eventManager = getDataSyncEventManager();
  eventManager.emit(SyncEventType.RESOURCE_CREATED, {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    tags: resource.tags,
    type: resource.type,
  }, 'resource-storage');

  return resource;
}

// 批量创建资源（不发事件，用于初始化）
export function createResourcesBatch(
  items: Omit<Resource, "id" | "createdAt" | "updatedAt" | "viewCount" | "bookmarkCount" | "rating" | "ratingCount">[]
): Resource[] {
  const now = new Date().toISOString();
  const newResources: Resource[] = items.map((data) => ({
    ...data,
    id: `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    viewCount: Math.floor(Math.random() * 500) + 50,
    bookmarkCount: 0,
    rating: 0,
    ratingCount: 0,
    createdAt: now,
    updatedAt: now,
  }));

  const resources = getAllResources();
  resources.unshift(...newResources);
  localStorage.setItem(getStorageKeys().RESOURCES, JSON.stringify(resources));

  return newResources;
}

export function updateResource(
  id: string,
  updates: Partial<Omit<Resource, "id" | "createdAt" | "userId">>
): Resource | null {
  const resources = getAllResources();
  const index = resources.findIndex((r) => r.id === id);

  if (index === -1) return null;

  resources[index] = {
    ...resources[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(getStorageKeys().RESOURCES, JSON.stringify(resources));

  // 发布资源更新事件
  const eventManager = getDataSyncEventManager();
  eventManager.emit(SyncEventType.RESOURCE_UPDATED, {
    id: resources[index].id,
    title: resources[index].title,
    description: resources[index].description,
    tags: resources[index].tags,
    type: resources[index].type,
  }, 'resource-storage');

  return resources[index];
}

export function deleteResource(id: string): boolean {
  const resources = getAllResources();
  const filtered = resources.filter((r) => r.id !== id);

  if (filtered.length === resources.length) return false;

  localStorage.setItem(getStorageKeys().RESOURCES, JSON.stringify(filtered));

  // 同时删除相关的收藏和笔记
  const bookmarks = getAllBookmarks().filter((b) => b.resourceId !== id);
  localStorage.setItem(getStorageKeys().BOOKMARKS, JSON.stringify(bookmarks));

  const notes = getAllNotes().filter((n) => n.resourceId !== id);
  localStorage.setItem(getStorageKeys().NOTES, JSON.stringify(notes));

  // 发布资源删除事件
  const eventManager = getDataSyncEventManager();
  eventManager.emit(SyncEventType.RESOURCE_DELETED, {
    id,
  }, 'resource-storage');

  return true;
}

export function incrementViewCount(id: string): void {
  const resource = getResourceById(id);
  if (resource) {
    updateResource(id, { viewCount: resource.viewCount + 1 });
  }
}

export function searchResources(query: {
  keyword?: string;
  type?: ResourceType;
  tags?: string[];
  status?: ResourceStatus;
  sortBy?: "createdAt" | "viewCount" | "bookmarkCount" | "rating";
  sortOrder?: "asc" | "desc";
}): Resource[] {
  let results = getAllResources();

  // 关键词搜索
  if (query.keyword) {
    const kw = query.keyword.toLowerCase();
    results = results.filter(
      (r) =>
        r.title.toLowerCase().includes(kw) ||
        r.description.toLowerCase().includes(kw) ||
        r.tags.some((t) => t.toLowerCase().includes(kw))
    );
  }

  // 类型筛选
  if (query.type) {
    results = results.filter((r) => r.type === query.type);
  }

  // 标签筛选
  if (query.tags && query.tags.length > 0) {
    results = results.filter((r) =>
      query.tags!.some((tag) => r.tags.includes(tag))
    );
  }

  // 状态筛选
  if (query.status) {
    results = results.filter((r) => r.status === query.status);
  }

  // 排序
  const sortBy = query.sortBy || "createdAt";
  const sortOrder = query.sortOrder || "desc";

  results.sort((a, b) => {
    let aVal: number;
    let bVal: number;

    const aRaw = a[sortBy];
    const bRaw = b[sortBy];

    if (typeof aRaw === "string") {
      aVal = new Date(aRaw).getTime();
      bVal = new Date(bRaw as string).getTime();
    } else {
      aVal = aRaw as number;
      bVal = bRaw as number;
    }

    return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  });

  return results;
}

// ==================== 收藏管理 ====================

export function getAllBookmarks(userId?: string): Bookmark[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(getStorageKeys().BOOKMARKS);
  const bookmarks: Bookmark[] = data ? JSON.parse(data) : [];
  return userId ? bookmarks.filter((b) => b.userId === userId) : bookmarks;
}

export function getBookmarkByResourceId(
  resourceId: string,
  userId: string
): Bookmark | null {
  const bookmarks = getAllBookmarks(userId);
  return bookmarks.find((b) => b.resourceId === resourceId) || null;
}

export function createBookmark(
  data: Omit<Bookmark, "id" | "createdAt" | "updatedAt">
): Bookmark {
  const bookmark: Bookmark = {
    ...data,
    id: `bm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const bookmarks = getAllBookmarks();
  bookmarks.unshift(bookmark);
  localStorage.setItem(getStorageKeys().BOOKMARKS, JSON.stringify(bookmarks));

  const resource = getResourceById(data.resourceId);
  if (resource) {
    updateResource(data.resourceId, {
      bookmarkCount: resource.bookmarkCount + 1,
    });
  }

  return bookmark;
}

export function createBookmarksBatch(
  items: Omit<Bookmark, "id" | "createdAt" | "updatedAt">[],
  resourceIdToCount: Map<string, number> = new Map()
): Bookmark[] {
  const now = new Date().toISOString();
  const newBookmarks: Bookmark[] = items.map((data) => ({
    ...data,
    id: `bm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
  }));

  const bookmarks = getAllBookmarks();
  bookmarks.unshift(...newBookmarks);
  localStorage.setItem(getStorageKeys().BOOKMARKS, JSON.stringify(bookmarks));

  // Batch update resource bookmark counts
  if (resourceIdToCount.size > 0) {
    const resources = getAllResources();
    resourceIdToCount.forEach((count, resourceId) => {
      const idx = resources.findIndex((r) => r.id === resourceId);
      if (idx >= 0) {
        resources[idx].bookmarkCount += count;
      }
    });
    localStorage.setItem(getStorageKeys().RESOURCES, JSON.stringify(resources));
  }

  return newBookmarks;
}

export function updateBookmark(
  id: string,
  updates: Partial<Omit<Bookmark, "id" | "createdAt" | "userId" | "resourceId">>
): Bookmark | null {
  const bookmarks = getAllBookmarks();
  const index = bookmarks.findIndex((b) => b.id === id);

  if (index === -1) return null;

  bookmarks[index] = {
    ...bookmarks[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(getStorageKeys().BOOKMARKS, JSON.stringify(bookmarks));

  // 如果更新了评分，重新计算资源的平均评分
  if (updates.rating !== undefined) {
    updateResourceRating(bookmarks[index].resourceId);
  }

  return bookmarks[index];
}

export function deleteBookmark(id: string): boolean {
  const bookmarks = getAllBookmarks();
  const bookmark = bookmarks.find((b) => b.id === id);
  if (!bookmark) return false;

  const filtered = bookmarks.filter((b) => b.id !== id);
  localStorage.setItem(getStorageKeys().BOOKMARKS, JSON.stringify(filtered));

  // 更新资源的收藏数
  const resource = getResourceById(bookmark.resourceId);
  if (resource) {
    updateResource(bookmark.resourceId, {
      bookmarkCount: Math.max(0, resource.bookmarkCount - 1),
    });
  }

  // 重新计算评分
  updateResourceRating(bookmark.resourceId);

  return true;
}

function updateResourceRating(resourceId: string): void {
  const bookmarks = getAllBookmarks().filter(
    (b) => b.resourceId === resourceId && b.rating !== undefined
  );

  if (bookmarks.length === 0) {
    updateResource(resourceId, { rating: 0, ratingCount: 0 });
    return;
  }

  const totalRating = bookmarks.reduce((sum, b) => sum + (b.rating || 0), 0);
  const avgRating = totalRating / bookmarks.length;

  updateResource(resourceId, {
    rating: Math.round(avgRating * 10) / 10,
    ratingCount: bookmarks.length,
  });
}

// ==================== 收藏夹管理 ====================

export function getAllFolders(userId?: string): BookmarkFolder[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(getStorageKeys().FOLDERS);
  const folders: BookmarkFolder[] = data ? JSON.parse(data) : [];
  return userId ? folders.filter((f) => f.userId === userId) : folders;
}

export function getFolderById(id: string): BookmarkFolder | null {
  const folders = getAllFolders();
  return folders.find((f) => f.id === id) || null;
}

export function createFolder(
  data: Omit<BookmarkFolder, "id" | "createdAt" | "updatedAt" | "shareToken">
): BookmarkFolder {
  const folder: BookmarkFolder = {
    ...data,
    id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const folders = getAllFolders();
  folders.unshift(folder);
  localStorage.setItem(getStorageKeys().FOLDERS, JSON.stringify(folders));

  return folder;
}

export function createFoldersBatch(
  items: Omit<BookmarkFolder, "id" | "createdAt" | "updatedAt" | "shareToken">[]
): BookmarkFolder[] {
  const now = new Date().toISOString();
  const newFolders: BookmarkFolder[] = items.map((data) => ({
    ...data,
    id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now,
    updatedAt: now,
  }));

  const folders = getAllFolders();
  folders.unshift(...newFolders);
  localStorage.setItem(getStorageKeys().FOLDERS, JSON.stringify(folders));

  return newFolders;
}

export function updateFolder(
  id: string,
  updates: Partial<Omit<BookmarkFolder, "id" | "createdAt" | "userId">>
): BookmarkFolder | null {
  const folders = getAllFolders();
  const index = folders.findIndex((f) => f.id === id);

  if (index === -1) return null;

  folders[index] = {
    ...folders[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(getStorageKeys().FOLDERS, JSON.stringify(folders));
  return folders[index];
}

export function deleteFolder(id: string): boolean {
  const folders = getAllFolders();
  const filtered = folders.filter((f) => f.id !== id);

  if (filtered.length === folders.length) return false;

  localStorage.setItem(getStorageKeys().FOLDERS, JSON.stringify(filtered));

  // 将该文件夹下的收藏移到未分类
  const bookmarks = getAllBookmarks();
  bookmarks.forEach((b) => {
    if (b.folderId === id) {
      updateBookmark(b.id, { folderId: undefined });
    }
  });

  return true;
}

export function generateShareToken(folderId: string): string | null {
  const folder = getFolderById(folderId);
  if (!folder) return null;

  const token = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  updateFolder(folderId, { shareToken: token, isPublic: true });

  return token;
}

// ==================== 笔记管理 ====================

export function getAllNotes(userId?: string): ResourceNote[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(getStorageKeys().NOTES);
  const notes: ResourceNote[] = data ? JSON.parse(data) : [];
  return userId ? notes.filter((n) => n.userId === userId) : notes;
}

export function getNotesByResourceId(
  resourceId: string,
  userId: string
): ResourceNote[] {
  return getAllNotes(userId).filter((n) => n.resourceId === resourceId);
}

export function createNote(
  data: Omit<ResourceNote, "id" | "createdAt" | "updatedAt">
): ResourceNote {
  const note: ResourceNote = {
    ...data,
    id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const notes = getAllNotes();
  notes.unshift(note);
  localStorage.setItem(getStorageKeys().NOTES, JSON.stringify(notes));

  return note;
}

export function updateNote(
  id: string,
  updates: Partial<Omit<ResourceNote, "id" | "createdAt" | "userId" | "resourceId">>
): ResourceNote | null {
  const notes = getAllNotes();
  const index = notes.findIndex((n) => n.id === id);

  if (index === -1) return null;

  notes[index] = {
    ...notes[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(getStorageKeys().NOTES, JSON.stringify(notes));
  return notes[index];
}

export function deleteNote(id: string): boolean {
  const notes = getAllNotes();
  const filtered = notes.filter((n) => n.id !== id);

  if (filtered.length === notes.length) return false;

  localStorage.setItem(getStorageKeys().NOTES, JSON.stringify(filtered));
  return true;
}

// ==================== 导出功能 ====================

export function exportFolderToMarkdown(folderId: string): string {
  const folder = getFolderById(folderId);
  if (!folder) return "";

  const bookmarks = getAllBookmarks(folder.userId).filter(
    (b) => b.folderId === folderId
  );

  let markdown = `# ${folder.name}\n\n`;

  if (folder.description) {
    markdown += `${folder.description}\n\n`;
  }

  markdown += `创建时间：${new Date(folder.createdAt).toLocaleString()}\n`;
  markdown += `资源数量：${bookmarks.length}\n\n`;
  markdown += `---\n\n`;

  bookmarks.forEach((bookmark) => {
    const resource = getResourceById(bookmark.resourceId);
    if (!resource) return;

    markdown += `## ${resource.title}\n\n`;
    markdown += `- **类型**：${getResourceTypeLabel(resource.type)}\n`;
    markdown += `- **标签**：${resource.tags.join(", ")}\n`;

    if (resource.url) {
      markdown += `- **链接**：${resource.url}\n`;
    }

    if (bookmark.rating) {
      markdown += `- **评分**：${"⭐".repeat(bookmark.rating)}\n`;
    }

    markdown += `\n${resource.description}\n\n`;

    if (bookmark.notes) {
      markdown += `**我的笔记**：\n\n${bookmark.notes}\n\n`;
    }

    markdown += `---\n\n`;
  });

  return markdown;
}

function getResourceTypeLabel(type: ResourceType): string {
  const labels: Record<ResourceType, string> = {
    document: "文档",
    video: "视频",
    tool: "工具",
    website: "网站",
    book: "书籍",
  };
  return labels[type];
}

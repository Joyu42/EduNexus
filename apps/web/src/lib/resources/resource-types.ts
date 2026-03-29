// 资源类型定义

export type ResourceType = "document" | "video" | "tool" | "website" | "book";
export type ResourceStatus = "active" | "archived";

export interface Resource {
  id: string;
  title: string;
  description: string;
  type?: ResourceType;
  status?: ResourceStatus;

  // 资源内容
  url?: string; // 外部链接
  fileUrl?: string; // 上传的文件路径
  fileName?: string;
  fileSize?: number; // 字节
  mimeType?: string;

  // 元数据
  tags?: string[];
  category?: string;
  author?: string;
  source?: string;

  // 统计
  viewCount?: number;
  bookmarkCount?: number;
  rating?: number; // 平均评分 0-5
  ratingCount?: number;

  // 时间
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface Bookmark {
  id: string;
  userId: string;
  resourceId: string;
  folderId?: string;
  notes?: string;
  rating?: number; // 用户评分 1-5
  createdAt: string;
  updatedAt: string;
}

export interface BookmarkFolder {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isPublic: boolean;
  shareToken?: string; // 分享链接 token
  createdAt: string;
  updatedAt: string;
}

export interface ResourceNote {
  id: string;
  userId: string;
  resourceId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

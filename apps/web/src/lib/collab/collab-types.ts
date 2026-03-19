// 协作编辑系统类型定义

export type CollabRole = "owner" | "editor" | "viewer" | "commenter";

export type CollabPermission = {
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  canManagePermissions: boolean;
  canDelete: boolean;
};

export type CollabUser = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string; // 用户光标颜色
  role: CollabRole;
  isOnline: boolean;
  lastSeen: string;
  cursor?: {
    line: number;
    column: number;
  };
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
};

export type CollabSession = {
  id: string;
  title: string;
  description?: string;
  documentType: "markdown" | "code" | "text";
  language?: string; // 代码语言
  content: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  lastEditedBy: string;
  users: CollabUser[];
  permissions: Record<string, CollabRole>;
  isPublic: boolean;
  inviteCode?: string;
  tags?: string[];
};

export type CollabMessage = {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  type: "text" | "system";
  createdAt: string;
};

export type CollabVersion = {
  id: string;
  sessionId: string;
  content: string;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  description?: string;
  changesSummary?: string;
};

export type CollabOperation = {
  type: "insert" | "delete" | "replace";
  position: { line: number; column: number };
  content?: string;
  length?: number;
  userId: string;
  timestamp: string;
};

export type CollabCursor = {
  userId: string;
  userName: string;
  color: string;
  position: { line: number; column: number };
  selection?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
};

export type CollabEvent = {
  type: "join" | "leave" | "edit" | "cursor" | "message" | "version";
  sessionId: string;
  userId: string;
  data: any;
  timestamp: string;
};

export type CollabInvite = {
  id: string;
  sessionId: string;
  code: string;
  role: CollabRole;
  expiresAt?: string;
  maxUses?: number;
  usedCount: number;
  createdBy: string;
  createdAt: string;
};

export type CollabStats = {
  sessionId: string;
  totalEdits: number;
  totalUsers: number;
  totalVersions: number;
  totalMessages: number;
  lastActivity: string;
};

export const ROLE_PERMISSIONS: Record<CollabRole, CollabPermission> = {
  owner: {
    canEdit: true,
    canComment: true,
    canShare: true,
    canManagePermissions: true,
    canDelete: true,
  },
  editor: {
    canEdit: true,
    canComment: true,
    canShare: true,
    canManagePermissions: false,
    canDelete: false,
  },
  commenter: {
    canEdit: false,
    canComment: true,
    canShare: false,
    canManagePermissions: false,
    canDelete: false,
  },
  viewer: {
    canEdit: false,
    canComment: false,
    canShare: false,
    canManagePermissions: false,
    canDelete: false,
  },
};

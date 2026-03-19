// 协作客户端
import type {
  CollabSession,
  CollabUser,
  CollabMessage,
  CollabOperation,
  CollabCursor,
  CollabRole,
} from "./collab-types";
import { SyncEngine } from "./sync-engine";
import { VersionManager } from "./version-manager";
import {
  saveSession,
  getSession,
  saveMessage,
  getMessagesBySession,
} from "./collab-storage";

export class CollabClient {
  private session: CollabSession | null = null;
  private syncEngine: SyncEngine | null = null;
  private versionManager: VersionManager | null = null;
  private currentUser: CollabUser | null = null;
  private onlineUsers: Map<string, CollabUser> = new Map();
  private cursors: Map<string, CollabCursor> = new Map();

  // 加入会话
  async joinSession(
    sessionId: string,
    user: { id: string; name: string; email: string; avatar?: string }
  ): Promise<CollabSession> {
    const session = await getSession(sessionId);
    if (!session) {
      throw new Error("会话不存在");
    }

    this.session = session;
    this.syncEngine = new SyncEngine(sessionId, user.id);
    this.versionManager = new VersionManager(sessionId);

    // 创建当前用户
    this.currentUser = {
      ...user,
      color: this.generateUserColor(user.id),
      role: session.permissions[user.id] || "viewer",
      isOnline: true,
      lastSeen: new Date().toISOString(),
    };

    // 添加到在线用户列表
    this.onlineUsers.set(user.id, this.currentUser);

    // 更新会话
    session.users = Array.from(this.onlineUsers.values());
    await saveSession(session);

    // 连接同步引擎
    this.syncEngine.connect();

    return session;
  }

  // 离开会话
  async leaveSession(): Promise<void> {
    if (!this.session || !this.currentUser) return;

    // 标记用户离线
    this.currentUser.isOnline = false;
    this.currentUser.lastSeen = new Date().toISOString();
    this.onlineUsers.delete(this.currentUser.id);

    // 更新会话
    this.session.users = Array.from(this.onlineUsers.values());
    await saveSession(this.session);

    // 断开同步引擎
    this.syncEngine?.disconnect();
    this.versionManager?.stopAutoSave();

    this.session = null;
    this.syncEngine = null;
    this.versionManager = null;
    this.currentUser = null;
  }

  // 编辑内容
  async edit(operation: CollabOperation): Promise<void> {
    if (!this.syncEngine || !this.currentUser) {
      throw new Error("未加入会话");
    }

    await this.syncEngine.sendOperation(operation);
  }

  // 更新光标位置
  updateCursor(position: { line: number; column: number }): void {
    if (!this.syncEngine || !this.currentUser) return;

    const cursor: CollabCursor = {
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      color: this.currentUser.color,
      position,
    };

    this.cursors.set(this.currentUser.id, cursor);
    this.syncEngine.sendCursor(cursor);
  }

  // 发送消息
  async sendMessage(content: string): Promise<void> {
    if (!this.session || !this.currentUser) {
      throw new Error("未加入会话");
    }

    const message: CollabMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId: this.session.id,
      userId: this.currentUser.id,
      userName: this.currentUser.name,
      userAvatar: this.currentUser.avatar,
      content,
      type: "text",
      createdAt: new Date().toISOString(),
    };

    await saveMessage(message);
  }

  // 获取消息历史
  async getMessages(): Promise<CollabMessage[]> {
    if (!this.session) {
      throw new Error("未加入会话");
    }

    return getMessagesBySession(this.session.id);
  }

  // 创建版本
  async createVersion(description?: string): Promise<void> {
    if (!this.session || !this.currentUser || !this.versionManager) {
      throw new Error("未加入会话");
    }

    await this.versionManager.createVersion(
      this.session.content,
      this.currentUser.id,
      this.currentUser.name,
      description
    );
  }

  // 获取在线用户
  getOnlineUsers(): CollabUser[] {
    return Array.from(this.onlineUsers.values());
  }

  // 获取用户光标
  getUserCursors(): CollabCursor[] {
    return Array.from(this.cursors.values());
  }

  // 获取当前会话
  getCurrentSession(): CollabSession | null {
    return this.session;
  }

  // 检查权限
  hasPermission(action: "edit" | "comment" | "share" | "manage" | "delete"): boolean {
    if (!this.currentUser) return false;

    const role = this.currentUser.role;
    switch (action) {
      case "edit":
        return role === "owner" || role === "editor";
      case "comment":
        return role !== "viewer";
      case "share":
        return role === "owner" || role === "editor";
      case "manage":
        return role === "owner";
      case "delete":
        return role === "owner";
      default:
        return false;
    }
  }

  // 生成用户颜色
  private generateUserColor(userId: string): string {
    const colors = [
      "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A",
      "#98D8C8", "#F7DC6F", "#BB8FCE", "#85C1E2",
    ];
    const hash = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }
}

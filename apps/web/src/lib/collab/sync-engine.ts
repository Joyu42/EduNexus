// 同步引擎
import type { CollabOperation, CollabCursor } from "./collab-types";
import { ConflictResolver } from "./conflict-resolver";
import { saveOperation } from "./collab-storage";

export type SyncEventHandler = (event: {
  type: "operation" | "cursor" | "user-join" | "user-leave";
  data: any;
}) => void;

export class SyncEngine {
  private sessionId: string;
  private userId: string;
  private resolver: ConflictResolver;
  private pendingOperations: CollabOperation[] = [];
  private eventHandlers: SyncEventHandler[] = [];
  private isConnected: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(sessionId: string, userId: string) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.resolver = new ConflictResolver();
  }

  // 连接到协作会话
  connect(): void {
    this.isConnected = true;
    this.startHeartbeat();
    this.emit({ type: "user-join", data: { userId: this.userId } });
  }

  // 断开连接
  disconnect(): void {
    this.isConnected = false;
    this.stopHeartbeat();
    this.emit({ type: "user-leave", data: { userId: this.userId } });
  }

  // 发送操作
  async sendOperation(operation: CollabOperation): Promise<void> {
    if (!this.isConnected) {
      this.pendingOperations.push(operation);
      return;
    }

    // 保存操作
    await saveOperation(operation);

    // 广播操作
    this.emit({ type: "operation", data: operation });
  }

  // 接收操作
  async receiveOperation(operation: CollabOperation): Promise<CollabOperation | null> {
    // 检查是否有冲突
    for (const pending of this.pendingOperations) {
      const resolved = this.resolver.transform(operation, pending);
      if (resolved) {
        operation = resolved;
      }
    }

    await saveOperation(operation);
    return operation;
  }

  // 发送光标位置
  sendCursor(cursor: CollabCursor): void {
    if (!this.isConnected) return;
    this.emit({ type: "cursor", data: cursor });
  }

  // 订阅事件
  on(handler: SyncEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index > -1) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  // 发送事件
  private emit(event: { type: "operation" | "cursor" | "user-join" | "user-leave"; data: any }): void {
    this.eventHandlers.forEach((handler) => handler(event));
  }

  // 心跳检测
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected) {
        this.reconnect();
      }
    }, 30000); // 30秒
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // 重连
  private reconnect(): void {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
      this.reconnectTimer = null;

      // 发送待处理的操作
      this.pendingOperations.forEach((op) => {
        this.sendOperation(op);
      });
      this.pendingOperations = [];
    }, 3000); // 3秒后重连
  }

  // 获取连接状态
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // 清理
  cleanup(): void {
    this.disconnect();
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

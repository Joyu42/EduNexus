/**
 * 学习记录追踪服务 - 记录和分析学习活动
 */

import type { LearningRecord } from '../path/skill-tree-types';

// IndexedDB 配置
const DB_NAME = 'EduNexusLearning';
const DB_VERSION = 1;
const STORE_EVENTS = 'events';
const STORE_STATS = 'stats';
const STORE_SESSIONS = 'sessions';

/**
 * 学习事件类型
 */
export interface LearningEvent {
  id: string;
  userId: string;
  documentId?: string;
  skillNodeId?: string;
  graphNodeId?: string;
  action: 'create' | 'edit' | 'view' | 'delete' | 'complete' | 'review' | 'practice';
  timestamp: Date;
  duration?: number; // 持续时间（秒）
  metadata?: Record<string, any>;
}

/**
 * 学习会话
 */
export interface LearningSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // 持续时间（秒）
  activities: string[]; // 事件 ID 列表
  focusScore?: number; // 专注度评分 0-1
}

/**
 * 学习统计
 */
export interface LearningStats {
  userId: string;
  date: string; // YYYY-MM-DD
  totalTime: number; // 总学习时间（秒）
  documentsCreated: number;
  documentsEdited: number;
  skillsCompleted: number;
  practicesCompleted: number;
  reviewsCompleted: number;
  focusScore: number; // 平均专注度
  updatedAt: Date;
}

/**
 * 初始化学习追踪数据库
 */
function openLearningDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 创建事件存储
      if (!db.objectStoreNames.contains(STORE_EVENTS)) {
        const eventStore = db.createObjectStore(STORE_EVENTS, { keyPath: 'id' });
        eventStore.createIndex('userId', 'userId', { unique: false });
        eventStore.createIndex('timestamp', 'timestamp', { unique: false });
        eventStore.createIndex('action', 'action', { unique: false });
        eventStore.createIndex('documentId', 'documentId', { unique: false });
        eventStore.createIndex('skillNodeId', 'skillNodeId', { unique: false });
      }

      // 创建统计存储
      if (!db.objectStoreNames.contains(STORE_STATS)) {
        const statsStore = db.createObjectStore(STORE_STATS, { keyPath: ['userId', 'date'] });
        statsStore.createIndex('userId', 'userId', { unique: false });
        statsStore.createIndex('date', 'date', { unique: false });
      }

      // 创建会话存储
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        const sessionStore = db.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
        sessionStore.createIndex('userId', 'userId', { unique: false });
        sessionStore.createIndex('startTime', 'startTime', { unique: false });
      }
    };
  });
}

/**
 * 学习追踪服务
 */
export class LearningTracker {
  private db: IDBDatabase | null = null;
  private currentSession: LearningSession | null = null;
  private sessionStartTime: number | null = null;
  private lastActivityTime: number | null = null;
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000; // 5分钟无活动则结束会话

  async initialize(): Promise<void> {
    this.db = await openLearningDatabase();
    await this.resumeOrStartSession();
  }

  /**
   * 记录学习事件
   */
  async trackEvent(event: Omit<LearningEvent, 'id' | 'timestamp'>): Promise<string> {
    if (!this.db) await this.initialize();

    const eventId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullEvent: LearningEvent = {
      ...event,
      id: eventId,
      timestamp: new Date(),
    };

    console.debug('[LearningTracker] Tracking event:', fullEvent.action, fullEvent);

    // 保存事件
    await this.saveEvent(fullEvent);

    // 更新当前会话
    await this.updateSession(eventId);

    // 更新统计
    await this.updateStats(fullEvent);

    return eventId;
  }

  /**
   * 保存事件到数据库
   */
  private async saveEvent(event: LearningEvent): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_EVENTS], 'readwrite');
      const store = transaction.objectStore(STORE_EVENTS);
      const request = store.add(event);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 更新或创建学习会话
   */
  private async updateSession(eventId: string): Promise<void> {
    const now = Date.now();

    // 检查是否需要开始新会话
    if (!this.currentSession ||
        (this.lastActivityTime && now - this.lastActivityTime > this.SESSION_TIMEOUT)) {
      await this.endCurrentSession();
      await this.startNewSession();
    }

    // 更新会话活动
    if (this.currentSession) {
      this.currentSession.activities.push(eventId);
      this.lastActivityTime = now;
      await this.saveSession(this.currentSession);
    }
  }

  /**
   * 开始新会话
   */
  private async startNewSession(): Promise<void> {
    const sessionId = `session_${Date.now()}`;
    this.currentSession = {
      id: sessionId,
      userId: 'default', // TODO: 从用户上下文获取
      startTime: new Date(),
      activities: [],
    };
    this.sessionStartTime = Date.now();
    this.lastActivityTime = Date.now();

    await this.saveSession(this.currentSession);
    console.debug('[LearningTracker] Started new session:', sessionId);
  }

  /**
   * 结束当前会话
   */
  private async endCurrentSession(): Promise<void> {
    if (!this.currentSession) return;

    const endTime = new Date();
    const duration = this.sessionStartTime
      ? Math.floor((endTime.getTime() - this.sessionStartTime) / 1000)
      : 0;

    this.currentSession.endTime = endTime;
    this.currentSession.duration = duration;
    this.currentSession.focusScore = this.calculateFocusScore(duration, this.currentSession.activities.length);

    await this.saveSession(this.currentSession);
    console.debug('[LearningTracker] Ended session:', this.currentSession.id, 'Duration:', duration, 's');

    this.currentSession = null;
    this.sessionStartTime = null;
  }

  /**
   * 计算专注度评分
   */
  private calculateFocusScore(duration: number, activityCount: number): number {
    if (duration === 0) return 0;

    // 活动频率（每分钟活动次数）
    const activityRate = (activityCount / duration) * 60;

    // 理想频率：2-5次/分钟
    if (activityRate >= 2 && activityRate <= 5) {
      return 1.0;
    } else if (activityRate < 2) {
      return Math.max(0.3, activityRate / 2);
    } else {
      return Math.max(0.3, 5 / activityRate);
    }
  }

  /**
   * 保存会话
   */
  private async saveSession(session: LearningSession): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_SESSIONS], 'readwrite');
      const store = transaction.objectStore(STORE_SESSIONS);
      const request = store.put(session);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 恢复或开始会话
   */
  private async resumeOrStartSession(): Promise<void> {
    // 尝试恢复最近的会话
    const recentSession = await this.getRecentSession();

    if (recentSession && !recentSession.endTime) {
      const timeSinceStart = Date.now() - recentSession.startTime.getTime();
      if (timeSinceStart < this.SESSION_TIMEOUT) {
        this.currentSession = recentSession;
        this.sessionStartTime = recentSession.startTime.getTime();
        this.lastActivityTime = Date.now();
        console.debug('[LearningTracker] Resumed session:', recentSession.id);
        return;
      }
    }

    // 开始新会话
    await this.startNewSession();
  }

  /**
   * 获取最近的会话
   */
  private async getRecentSession(): Promise<LearningSession | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_SESSIONS], 'readonly');
      const store = transaction.objectStore(STORE_SESSIONS);
      const index = store.index('startTime');
      const request = index.openCursor(null, 'prev');

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const session = cursor.value;
          resolve({
            ...session,
            startTime: new Date(session.startTime),
            endTime: session.endTime ? new Date(session.endTime) : undefined,
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 更新统计数据
   */
  private async updateStats(event: LearningEvent): Promise<void> {
    if (!this.db) await this.initialize();

    const dateKey = event.timestamp.toISOString().split('T')[0];
    let stats = await this.getStats(event.userId, dateKey);

    if (!stats) {
      stats = {
        userId: event.userId,
        date: dateKey,
        totalTime: 0,
        documentsCreated: 0,
        documentsEdited: 0,
        skillsCompleted: 0,
        practicesCompleted: 0,
        reviewsCompleted: 0,
        focusScore: 0,
        updatedAt: new Date(),
      };
    }

    // 更新统计
    if (event.duration) {
      stats.totalTime += event.duration;
    }

    switch (event.action) {
      case 'create':
        stats.documentsCreated++;
        break;
      case 'edit':
        stats.documentsEdited++;
        break;
      case 'complete':
        if (event.skillNodeId) {
          stats.skillsCompleted++;
        }
        break;
      case 'practice':
        stats.practicesCompleted++;
        break;
      case 'review':
        stats.reviewsCompleted++;
        break;
    }

    stats.updatedAt = new Date();

    await this.saveStats(stats);
  }

  /**
   * 获取统计数据
   */
  private async getStats(userId: string, date: string): Promise<LearningStats | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_STATS], 'readonly');
      const store = transaction.objectStore(STORE_STATS);
      const request = store.get([userId, date]);

      request.onsuccess = () => {
        const stats = request.result;
        if (stats) {
          resolve({
            ...stats,
            updatedAt: new Date(stats.updatedAt),
          });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 保存统计数据
   */
  private async saveStats(stats: LearningStats): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_STATS], 'readwrite');
      const store = transaction.objectStore(STORE_STATS);
      const request = store.put(stats);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取时间范围内的统计
   */
  async getStatsRange(userId: string, startDate: string, endDate: string): Promise<LearningStats[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_STATS], 'readonly');
      const store = transaction.objectStore(STORE_STATS);
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const allStats = request.result;
        const filtered = allStats
          .filter((s: any) => s.date >= startDate && s.date <= endDate)
          .map((s: any) => ({
            ...s,
            updatedAt: new Date(s.updatedAt),
          }));
        resolve(filtered);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取文档的学习记录
   */
  async getDocumentLearningRecords(documentId: string): Promise<LearningEvent[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_EVENTS], 'readonly');
      const store = transaction.objectStore(STORE_EVENTS);
      const index = store.index('documentId');
      const request = index.getAll(documentId);

      request.onsuccess = () => {
        const events = request.result.map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp),
        }));
        resolve(events);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取技能节点的学习记录
   */
  async getSkillNodeLearningRecords(skillNodeId: string): Promise<LearningRecord[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_EVENTS], 'readonly');
      const store = transaction.objectStore(STORE_EVENTS);
      const index = store.index('skillNodeId');
      const request = index.getAll(skillNodeId);

      request.onsuccess = () => {
        const events = request.result.map((e: any) => ({
          id: e.id,
          timestamp: new Date(e.timestamp),
          action: this.mapActionToRecordAction(e.action),
          duration: e.duration,
          notes: e.metadata?.notes,
          metadata: e.metadata,
        }));
        resolve(events);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 映射事件动作到记录动作
   */
  private mapActionToRecordAction(action: string): 'start' | 'progress' | 'complete' | 'review' {
    switch (action) {
      case 'create':
        return 'start';
      case 'edit':
        return 'progress';
      case 'complete':
        return 'complete';
      case 'review':
        return 'review';
      default:
        return 'progress';
    }
  }

  /**
   * 计算学习时长
   */
  async calculateLearningDuration(userId: string, startDate: string, endDate: string): Promise<number> {
    const stats = await this.getStatsRange(userId, startDate, endDate);
    return stats.reduce((total, s) => total + s.totalTime, 0);
  }

  /**
   * 生成学习报告
   */
  async generateLearningReport(userId: string, days: number = 7): Promise<{
    totalTime: number;
    averageTime: number;
    documentsCreated: number;
    documentsEdited: number;
    skillsCompleted: number;
    practicesCompleted: number;
    reviewsCompleted: number;
    averageFocusScore: number;
    dailyStats: LearningStats[];
  }> {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const stats = await this.getStatsRange(userId, startDate, endDate);

    const totalTime = stats.reduce((sum, s) => sum + s.totalTime, 0);
    const documentsCreated = stats.reduce((sum, s) => sum + s.documentsCreated, 0);
    const documentsEdited = stats.reduce((sum, s) => sum + s.documentsEdited, 0);
    const skillsCompleted = stats.reduce((sum, s) => sum + s.skillsCompleted, 0);
    const practicesCompleted = stats.reduce((sum, s) => sum + s.practicesCompleted, 0);
    const reviewsCompleted = stats.reduce((sum, s) => sum + s.reviewsCompleted, 0);
    const averageFocusScore = stats.length > 0
      ? stats.reduce((sum, s) => sum + s.focusScore, 0) / stats.length
      : 0;

    return {
      totalTime,
      averageTime: stats.length > 0 ? totalTime / stats.length : 0,
      documentsCreated,
      documentsEdited,
      skillsCompleted,
      practicesCompleted,
      reviewsCompleted,
      averageFocusScore,
      dailyStats: stats,
    };
  }

  /**
   * 清理
   */
  async cleanup(): Promise<void> {
    await this.endCurrentSession();
  }
}

// 单例实例
let trackerInstance: LearningTracker | null = null;

/**
 * 获取学习追踪服务实例
 */
export function getLearningTracker(): LearningTracker {
  if (!trackerInstance) {
    trackerInstance = new LearningTracker();
  }
  return trackerInstance;
}

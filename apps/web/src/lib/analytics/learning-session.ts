/**
 * 学习会话追踪系统
 * 用于记录和追踪用户的学习会话数据
 */

export interface LearningSession {
  sessionId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  duration: number; // 分钟
  activityType: 'document_create' | 'document_edit' | 'practice' | 'chat' | 'reading';
  metadata?: {
    documentId?: string;
    documentTitle?: string;
    practiceId?: string;
    questionsCount?: number;
    correctCount?: number;
    knowledgePoints?: string[];
    completed?: boolean;
  };
}

export interface SessionStats {
  totalSessions: number;
  totalDuration: number; // 分钟
  avgSessionDuration: number;
  byActivityType: Record<string, number>;
  byDate: Record<string, number>; // date -> duration
}

/**
 * 学习会话管理器
 */
export class LearningSessionTracker {
  private activeSessions: Map<string, LearningSession> = new Map();

  /**
   * 开始新的学习会话
   */
  startSession(
    userId: string,
    activityType: LearningSession['activityType'],
    metadata?: LearningSession['metadata']
  ): string {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: LearningSession = {
      sessionId,
      userId,
      startTime: new Date().toISOString(),
      duration: 0,
      activityType,
      metadata,
    };

    this.activeSessions.set(sessionId, session);
    return sessionId;
  }

  /**
   * 结束学习会话
   */
  endSession(sessionId: string): LearningSession | null {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    const endTime = new Date();
    const startTime = new Date(session.startTime);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000); // 转换为分钟

    session.endTime = endTime.toISOString();
    session.duration = duration;

    this.activeSessions.delete(sessionId);
    return session;
  }

  /**
   * 更新会话元数据
   */
  updateSessionMetadata(sessionId: string, metadata: LearningSession['metadata']): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.metadata = { ...session.metadata, ...metadata };
    }
  }

  /**
   * 获取活跃会话
   */
  getActiveSession(sessionId: string): LearningSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * 清理超时会话（超过2小时自动结束）
   */
  cleanupStaleSessions(): LearningSession[] {
    const now = Date.now();
    const timeout = 2 * 60 * 60 * 1000; // 2小时
    const endedSessions: LearningSession[] = [];

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const startTime = new Date(session.startTime).getTime();
      if (now - startTime > timeout) {
        const ended = this.endSession(sessionId);
        if (ended) endedSessions.push(ended);
      }
    }

    return endedSessions;
  }
}

/**
 * 计算会话统计数据
 */
export function calculateSessionStats(sessions: LearningSession[]): SessionStats {
  const stats: SessionStats = {
    totalSessions: sessions.length,
    totalDuration: 0,
    avgSessionDuration: 0,
    byActivityType: {},
    byDate: {},
  };

  sessions.forEach((session) => {
    stats.totalDuration += session.duration;

    // 按活动类型统计
    stats.byActivityType[session.activityType] =
      (stats.byActivityType[session.activityType] || 0) + session.duration;

    // 按日期统计
    const date = session.startTime.split('T')[0];
    stats.byDate[date] = (stats.byDate[date] || 0) + session.duration;
  });

  stats.avgSessionDuration = stats.totalSessions > 0
    ? Math.round(stats.totalDuration / stats.totalSessions)
    : 0;

  return stats;
}

/**
 * 获取时间范围内的会话
 */
export function getSessionsInRange(
  sessions: LearningSession[],
  startDate: Date,
  endDate: Date
): LearningSession[] {
  return sessions.filter((session) => {
    const sessionDate = new Date(session.startTime);
    return sessionDate >= startDate && sessionDate <= endDate;
  });
}

/**
 * 按日期分组会话
 */
export function groupSessionsByDate(
  sessions: LearningSession[]
): Record<string, LearningSession[]> {
  const grouped: Record<string, LearningSession[]> = {};

  sessions.forEach((session) => {
    const date = session.startTime.split('T')[0];
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(session);
  });

  return grouped;
}

// 全局会话追踪器实例
export const sessionTracker = new LearningSessionTracker();

/**
 * 分析引擎
 * 核心分析逻辑，整合各个分析模块
 */

import type { LearningSession } from './learning-session';
import type {
  LearningBehaviorAnalysis,
  AIInsights,
  AnalyticsMetrics,
  TimeRange,
} from './analytics-types';
import {
  aggregateTimeAnalysis,
  aggregateEfficiencyAnalysis,
  aggregateHabitAnalysis,
  aggregateKnowledgeMastery,
  generateHeatmapData,
} from './data-aggregator';
import { generateAIInsights } from './insight-generator';

/**
 * 分析引擎类
 */
export class AnalyticsEngine {
  /**
   * 执行完整的学习行为分析
   */
  static analyzeLearningBehavior(
    sessions: LearningSession[],
    dateRange: TimeRange
  ): LearningBehaviorAnalysis {
    const timeAnalysis = aggregateTimeAnalysis(sessions, dateRange);
    const efficiencyAnalysis = aggregateEfficiencyAnalysis(sessions);
    const habitAnalysis = aggregateHabitAnalysis(sessions);
    const knowledgeMasteryAnalysis = aggregateKnowledgeMastery(sessions);

    // 路径分析（简化版，实际应从数据库获取）
    const pathAnalysis = {
      completionRate: 0,
      onTrack: true,
      bottlenecks: [],
      milestones: [],
    };

    return {
      timeAnalysis,
      efficiencyAnalysis,
      habitAnalysis,
      knowledgeMasteryAnalysis,
      pathAnalysis,
    };
  }

  /**
   * 生成 AI 驱动的洞察
   */
  static generateInsights(
    sessions: LearningSession[],
    behaviorAnalysis: LearningBehaviorAnalysis,
    historicalData?: any
  ): AIInsights {
    return generateAIInsights(
      sessions,
      behaviorAnalysis.timeAnalysis,
      behaviorAnalysis.efficiencyAnalysis,
      behaviorAnalysis.habitAnalysis,
      behaviorAnalysis.knowledgeMasteryAnalysis,
      historicalData
    );
  }

  /**
   * 计算分析指标
   */
  static calculateMetrics(
    sessions: LearningSession[]
  ): AnalyticsMetrics {
    const durations = sessions.map(s => s.duration);
    const totalTime = durations.reduce((sum, d) => sum + d, 0);

    // 计算学习天数
    const dates = new Set(sessions.map(s => s.startTime.split('T')[0]));
    const studyDays = dates.size;

    // 计算连续天数
    const sortedDates = Array.from(dates).sort();
    let consecutiveDays = 0;
    let currentStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      const diffDays = Math.round(
        (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffDays === 1) {
        currentStreak++;
      } else {
        consecutiveDays = Math.max(consecutiveDays, currentStreak);
        currentStreak = 1;
      }
    }
    consecutiveDays = Math.max(consecutiveDays, currentStreak);

    // 计算正确率
    const practiceSessions = sessions.filter(s => s.activityType === 'practice');
    let totalQuestions = 0;
    let totalCorrect = 0;

    practiceSessions.forEach(session => {
      if (session.metadata?.questionsCount) {
        totalQuestions += session.metadata.questionsCount;
        totalCorrect += session.metadata.correctCount || 0;
      }
    });

    const practiceAccuracy = totalQuestions > 0
      ? (totalCorrect / totalQuestions) * 100
      : 0;

    return {
      studyTime: {
        total: totalTime,
        average: sessions.length > 0 ? totalTime / sessions.length : 0,
        max: durations.length > 0 ? Math.max(...durations) : 0,
        min: durations.length > 0 ? Math.min(...durations) : 0,
      },
      frequency: {
        studyDays,
        consecutiveDays,
        longestStreak: consecutiveDays,
      },
      completion: {
        goalCompletionRate: 0, // 需要从目标系统获取
        pathCompletionRate: 0, // 需要从路径系统获取
        practiceCompletionRate: practiceSessions.length > 0
          ? (practiceSessions.filter(s => s.metadata?.completed !== false).length / practiceSessions.length) * 100
          : 0,
      },
      accuracy: {
        practiceAccuracy,
        testAccuracy: 0, // 需要从测试系统获取
        overallAccuracy: practiceAccuracy,
      },
      knowledge: {
        pointsMastered: 0, // 需要从知识系统获取
        averageMastery: 0,
        categoriesCovered: 0,
      },
      efficiency: {
        studyEfficiency: totalTime > 0 ? sessions.length / (totalTime / 60) : 0,
        focusTime: totalTime,
        breakTime: 0,
      },
    };
  }

  /**
   * 生成热力图数据
   */
  static generateHeatmap(sessions: LearningSession[]) {
    return generateHeatmapData(sessions);
  }

  /**
   * 获取时间范围内的会话
   */
  static getSessionsInRange(
    sessions: LearningSession[],
    range: TimeRange
  ): LearningSession[] {
    return sessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= range.start && sessionDate <= range.end;
    });
  }

  /**
   * 按活动类型分组
   */
  static groupByActivityType(
    sessions: LearningSession[]
  ): Record<string, LearningSession[]> {
    const grouped: Record<string, LearningSession[]> = {};

    sessions.forEach(session => {
      if (!grouped[session.activityType]) {
        grouped[session.activityType] = [];
      }
      grouped[session.activityType].push(session);
    });

    return grouped;
  }
}

/**
 * 创建时间范围
 */
export function createTimeRange(
  type: 'day' | 'week' | 'month' | 'year' | 'custom',
  customStart?: Date,
  customEnd?: Date
): TimeRange {
  const now = new Date();
  let start: Date;
  let end: Date = new Date(now);

  switch (type) {
    case 'day':
      start = new Date(now);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'week':
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;

    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;

    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom range requires start and end dates');
      }
      start = customStart;
      end = customEnd;
      break;

    default:
      throw new Error(`Unknown time range type: ${type}`);
  }

  return { start, end };
}

/**
 * 格式化时间范围为字符串
 */
export function formatTimeRange(range: TimeRange): string {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return `${formatDate(range.start)} - ${formatDate(range.end)}`;
}

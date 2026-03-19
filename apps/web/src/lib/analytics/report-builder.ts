/**
 * 报告构建器
 * 生成各种类型的学习报告
 */

import type { LearningSession } from './learning-session';
import type {
  DailyReport,
  WeeklyReport,
  MonthlyReport,
  YearlyReport,
  CustomReport,
  DateRange,
} from './analytics-types';
import { AnalyticsEngine, createTimeRange } from './analytics-engine';
import { generateQuickInsights } from './insight-generator';

/**
 * 生成日报
 */
export function generateDailyReport(
  sessions: LearningSession[],
  date: Date
): DailyReport {
  const dateStr = date.toISOString().split('T')[0];
  const daySessions = sessions.filter(
    s => s.startTime.split('T')[0] === dateStr
  );

  const studyTime = daySessions.reduce((sum, s) => sum + s.duration, 0);
  const activitiesCompleted = daySessions.filter(
    s => s.metadata?.completed !== false
  ).length;

  // 计算专注度
  const focusScore = daySessions.length > 0
    ? Math.round(
        daySessions.reduce((sum, s) => {
          if (s.duration >= 25 && s.duration <= 50) return sum + 100;
          if (s.duration >= 15 && s.duration < 25) return sum + 70;
          if (s.duration > 50 && s.duration <= 90) return sum + 80;
          return sum + 50;
        }, 0) / daySessions.length
      )
    : 0;

  // 统计活动类型
  const activityMap = new Map<string, { duration: number; count: number }>();
  daySessions.forEach(s => {
    const existing = activityMap.get(s.activityType) || { duration: 0, count: 0 };
    existing.duration += s.duration;
    existing.count++;
    activityMap.set(s.activityType, existing);
  });

  const topActivity = Array.from(activityMap.entries())
    .sort((a, b) => b[1].duration - a[1].duration)[0]?.[0] || '无';

  const activities = Array.from(activityMap.entries()).map(([type, data]) => ({
    type: getActivityTypeName(type),
    duration: data.duration,
    completed: true,
  }));

  const achievements: string[] = [];
  if (studyTime >= 120) achievements.push('今日学习超过2小时');
  if (focusScore >= 80) achievements.push('保持高度专注');
  if (activitiesCompleted >= 5) achievements.push('完成多项学习任务');

  const insights: string[] = [];
  if (studyTime > 0) {
    insights.push(`今日学习 ${Math.round(studyTime)} 分钟`);
  }
  if (focusScore >= 70) {
    insights.push('学习效率良好');
  }

  return {
    date: dateStr,
    summary: {
      studyTime,
      activitiesCompleted,
      focusScore,
      topActivity: getActivityTypeName(topActivity),
    },
    activities,
    achievements,
    insights,
    tomorrow: {
      suggestions: [
        '继续保持学习节奏',
        '复习今日所学内容',
      ],
      goals: [
        '完成计划的学习任务',
        '保持专注度',
      ],
    },
  };
}

/**
 * 生成周报（增强版）
 */
export function generateEnhancedWeeklyReport(
  sessions: LearningSession[],
  weekStart?: Date
): WeeklyReport {
  const start = weekStart || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  })();

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  const range = { start, end };
  const weekSessions = AnalyticsEngine.getSessionsInRange(sessions, range);

  const behaviorAnalysis = AnalyticsEngine.analyzeLearningBehavior(weekSessions, range);
  const metrics = AnalyticsEngine.calculateMetrics(weekSessions);

  // 每日分解
  const dailyBreakdown = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const daySessions = weekSessions.filter(
      s => s.startTime.split('T')[0] === dateStr
    );

    const studyTime = daySessions.reduce((sum, s) => sum + s.duration, 0);
    const focusScore = daySessions.length > 0
      ? Math.round(
          daySessions.reduce((sum, s) => {
            if (s.duration >= 25 && s.duration <= 50) return sum + 100;
            return sum + 70;
          }, 0) / daySessions.length
        )
      : 0;

    dailyBreakdown.push({
      date: dateStr,
      studyTime,
      activities: daySessions.length,
      focusScore,
    });
  }

  // 活动类型统计
  const activityMap = new Map<string, number>();
  weekSessions.forEach(s => {
    activityMap.set(s.activityType, (activityMap.get(s.activityType) || 0) + s.duration);
  });

  const totalDuration = weekSessions.reduce((sum, s) => sum + s.duration, 0);
  const topActivities = Array.from(activityMap.entries())
    .map(([type, duration]) => ({
      type: getActivityTypeName(type),
      duration,
      percentage: totalDuration > 0 ? Math.round((duration / totalDuration) * 100) : 0,
    }))
    .sort((a, b) => b.duration - a.duration);

  // 知识进度
  const knowledgeProgress = behaviorAnalysis.knowledgeMasteryAnalysis.byKnowledgePoint
    .slice(0, 5)
    .map(kp => ({
      name: kp.name,
      mastery: kp.mastery,
      change: kp.trend === 'improving' ? 5 : kp.trend === 'declining' ? -5 : 0,
    }));

  // 成就
  const achievements: string[] = [];
  if (totalDuration >= 600) achievements.push('本周学习超过10小时');
  if (behaviorAnalysis.habitAnalysis.streakAnalysis.current >= 7) {
    achievements.push(`连续学习 ${behaviorAnalysis.habitAnalysis.streakAnalysis.current} 天`);
  }
  if (behaviorAnalysis.efficiencyAnalysis.focusScore >= 80) {
    achievements.push('保持高专注度');
  }

  // 洞察
  const insights = generateQuickInsights(
    behaviorAnalysis.timeAnalysis,
    behaviorAnalysis.efficiencyAnalysis,
    behaviorAnalysis.habitAnalysis
  );

  // 建议
  const suggestions: string[] = [];
  if (behaviorAnalysis.efficiencyAnalysis.avgSessionLength < 30) {
    suggestions.push('建议延长单次学习时长至30分钟以上');
  }
  if (behaviorAnalysis.knowledgeMasteryAnalysis.weakPoints.length > 0) {
    const weakPoint = behaviorAnalysis.knowledgeMasteryAnalysis.weakPoints[0];
    suggestions.push(`重点关注：${weakPoint.name}`);
  }

  return {
    period: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    },
    weekNumber: getWeekNumber(start),
    summary: {
      totalStudyTime: totalDuration,
      avgDailyTime: Math.round(totalDuration / 7),
      totalSessions: weekSessions.length,
      focusScore: behaviorAnalysis.efficiencyAnalysis.focusScore,
      completionRate: behaviorAnalysis.efficiencyAnalysis.completionRate,
    },
    dailyBreakdown,
    topActivities,
    knowledgeProgress,
    achievements,
    insights,
    suggestions,
    nextWeek: {
      goals: [
        '保持学习习惯',
        '提高学习效率',
      ],
      focus: knowledgeProgress.slice(0, 2).map(kp => kp.name),
    },
  };
}

/**
 * 生成月报（增强版）
 */
export function generateEnhancedMonthlyReport(
  sessions: LearningSession[],
  year?: number,
  month?: number
): MonthlyReport {
  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month !== undefined ? month : now.getMonth();

  const start = new Date(targetYear, targetMonth, 1);
  const end = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  const range = { start, end };
  const monthSessions = AnalyticsEngine.getSessionsInRange(sessions, range);

  const behaviorAnalysis = AnalyticsEngine.analyzeLearningBehavior(monthSessions, range);
  const metrics = AnalyticsEngine.calculateMetrics(monthSessions);

  // 周趋势
  const weeklyTrend = [];
  let weekNum = 1;
  let currentWeekStart = new Date(start);

  while (currentWeekStart <= end) {
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

    const weekSessions = monthSessions.filter(s => {
      const sessionDate = new Date(s.startTime);
      return sessionDate >= currentWeekStart && sessionDate <= currentWeekEnd;
    });

    const studyTime = weekSessions.reduce((sum, s) => sum + s.duration, 0);
    const focusScore = weekSessions.length > 0
      ? Math.round(
          weekSessions.reduce((sum, s) => {
            if (s.duration >= 25 && s.duration <= 50) return sum + 100;
            return sum + 70;
          }, 0) / weekSessions.length
        )
      : 0;

    weeklyTrend.push({
      week: weekNum,
      studyTime,
      activities: weekSessions.length,
      focusScore,
    });

    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    weekNum++;
  }

  // 活动类型统计
  const activityMap = new Map<string, number>();
  monthSessions.forEach(s => {
    activityMap.set(s.activityType, (activityMap.get(s.activityType) || 0) + s.duration);
  });

  const totalDuration = monthSessions.reduce((sum, s) => sum + s.duration, 0);
  const topActivities = Array.from(activityMap.entries())
    .map(([type, duration]) => ({
      type: getActivityTypeName(type),
      duration,
      percentage: totalDuration > 0 ? Math.round((duration / totalDuration) * 100) : 0,
    }))
    .sort((a, b) => b.duration - a.duration);

  // 知识掌握度
  const knowledgeMastery = behaviorAnalysis.knowledgeMasteryAnalysis.byKnowledgePoint
    .slice(0, 10)
    .map(kp => ({
      name: kp.name,
      category: kp.category,
      mastery: kp.mastery,
      change: kp.trend === 'improving' ? 10 : kp.trend === 'declining' ? -10 : 0,
    }));

  // 里程碑
  const milestones: string[] = [];
  if (totalDuration >= 2400) milestones.push('本月学习超过40小时');
  if (metrics.frequency.longestStreak >= 14) {
    milestones.push(`最长连续学习 ${metrics.frequency.longestStreak} 天`);
  }

  // 成就
  const achievements: string[] = [];
  if (totalDuration >= 1800) achievements.push('月度学习达人');
  if (behaviorAnalysis.efficiencyAnalysis.focusScore >= 80) {
    achievements.push('高效学习者');
  }

  // 洞察
  const insights = generateQuickInsights(
    behaviorAnalysis.timeAnalysis,
    behaviorAnalysis.efficiencyAnalysis,
    behaviorAnalysis.habitAnalysis
  );

  // 建议
  const recommendations: string[] = [];
  if (behaviorAnalysis.efficiencyAnalysis.avgSessionLength < 45) {
    recommendations.push('建议延长单次学习时长，提高学习效率');
  }
  if (behaviorAnalysis.knowledgeMasteryAnalysis.weakPoints.length > 0) {
    recommendations.push('重点突破薄弱知识点');
  }

  const daysInMonth = end.getDate();

  return {
    period: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    },
    month: start.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }),
    summary: {
      totalStudyTime: totalDuration,
      avgDailyTime: Math.round(totalDuration / daysInMonth),
      totalSessions: monthSessions.length,
      focusScore: behaviorAnalysis.efficiencyAnalysis.focusScore,
      completionRate: behaviorAnalysis.efficiencyAnalysis.completionRate,
      knowledgePointsMastered: behaviorAnalysis.knowledgeMasteryAnalysis.strongPoints.length,
    },
    weeklyTrend,
    topActivities,
    knowledgeMastery,
    milestones,
    achievements,
    insights,
    recommendations,
    nextMonth: {
      goals: [
        '继续保持学习习惯',
        '提高知识掌握度',
      ],
      focus: knowledgeMastery.slice(0, 3).map(km => km.name),
    },
  };
}

/**
 * 生成年度报告
 */
export function generateYearlyReport(
  sessions: LearningSession[],
  year?: number
): YearlyReport {
  const targetYear = year || new Date().getFullYear();
  const start = new Date(targetYear, 0, 1);
  const end = new Date(targetYear, 11, 31, 23, 59, 59, 999);

  const range = { start, end };
  const yearSessions = AnalyticsEngine.getSessionsInRange(sessions, range);

  const metrics = AnalyticsEngine.calculateMetrics(yearSessions);
  const totalDuration = yearSessions.reduce((sum, s) => sum + s.duration, 0);

  // 月度趋势
  const monthlyTrend = [];
  for (let month = 0; month < 12; month++) {
    const monthStart = new Date(targetYear, month, 1);
    const monthEnd = new Date(targetYear, month + 1, 0, 23, 59, 59, 999);

    const monthSessions = yearSessions.filter(s => {
      const sessionDate = new Date(s.startTime);
      return sessionDate >= monthStart && sessionDate <= monthEnd;
    });

    const studyTime = monthSessions.reduce((sum, s) => sum + s.duration, 0);

    monthlyTrend.push({
      month: monthStart.toLocaleDateString('zh-CN', { month: 'long' }),
      studyTime,
      activities: monthSessions.length,
    });
  }

  // 分类统计
  const categoryMap = new Map<string, number>();
  yearSessions.forEach(s => {
    categoryMap.set(s.activityType, (categoryMap.get(s.activityType) || 0) + s.duration);
  });

  const topCategories = Array.from(categoryMap.entries())
    .map(([category, duration]) => ({
      category: getActivityTypeName(category),
      duration,
      percentage: totalDuration > 0 ? Math.round((duration / totalDuration) * 100) : 0,
    }))
    .sort((a, b) => b.duration - a.duration);

  // 年度亮点
  const yearHighlights: string[] = [];
  if (totalDuration >= 10000) {
    yearHighlights.push(`全年学习 ${Math.round(totalDuration / 60)} 小时`);
  }
  if (metrics.frequency.longestStreak >= 30) {
    yearHighlights.push(`最长连续学习 ${metrics.frequency.longestStreak} 天`);
  }

  // 成就
  const achievements: string[] = [];
  if (totalDuration >= 10000) achievements.push('年度学习之星');
  if (metrics.frequency.studyDays >= 200) achievements.push('坚持不懈');

  return {
    year: targetYear,
    summary: {
      totalStudyTime: totalDuration,
      avgDailyTime: Math.round(totalDuration / 365),
      totalSessions: yearSessions.length,
      knowledgePointsMastered: 0,
      longestStreak: metrics.frequency.longestStreak,
    },
    monthlyTrend,
    topCategories,
    yearHighlights,
    achievements,
    growth: {
      areas: topCategories.slice(0, 3).map(c => c.category),
      improvements: ['学习习惯养成', '知识体系构建'],
    },
    nextYear: {
      goals: [
        '继续保持学习习惯',
        '扩展知识领域',
      ],
      recommendations: [
        '设定明确的年度学习目标',
        '定期回顾和调整学习计划',
      ],
    },
  };
}

// ==================== 辅助函数 ====================

function getActivityTypeName(type: string): string {
  const names: Record<string, string> = {
    document_create: '创建文档',
    document_edit: '编辑文档',
    practice: '练习题目',
    chat: 'AI 对话',
    reading: '阅读学习',
  };
  return names[type] || type;
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

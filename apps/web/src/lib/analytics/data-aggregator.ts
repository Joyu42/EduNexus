/**
 * 数据聚合器
 * 负责从各种数据源聚合和处理分析数据
 */

import type { LearningSession } from './learning-session';
import type {
  TimeAnalysis,
  EfficiencyAnalysis,
  HabitAnalysis,
  KnowledgeMasteryAnalysis,
  AnalyticsMetrics,
  HeatmapData,
} from './analytics-types';

/**
 * 聚合时间分析数据
 */
export function aggregateTimeAnalysis(
  sessions: LearningSession[],
  dateRange: { start: Date; end: Date }
): TimeAnalysis {
  const { start, end } = dateRange;
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  // 按日期分组
  const byDate = groupSessionsByDate(sessions);
  const dailyTotals = Object.values(byDate).map(daySessions =>
    daySessions.reduce((sum, s) => sum + s.duration, 0)
  );

  const totalTime = dailyTotals.reduce((sum, t) => sum + t, 0);
  const avgDaily = days > 0 ? totalTime / days : 0;

  // 计算趋势
  const trend = calculateTrend(dailyTotals);

  // 分析高峰时段
  const peakHours = analyzePeakHours(sessions);

  // 周统计
  const weeklyData = aggregateByWeek(sessions, start, end);
  const avgWeekly = weeklyData.length > 0
    ? weeklyData.reduce((sum, w) => sum + w.total, 0) / weeklyData.length
    : 0;

  // 月统计
  const monthlyData = aggregateByMonth(sessions, start, end);
  const avgMonthly = monthlyData.length > 0
    ? monthlyData.reduce((sum, m) => sum + m.total, 0) / monthlyData.length
    : 0;

  return {
    daily: {
      average: Math.round(avgDaily),
      total: totalTime,
      trend: trend.direction,
      trendPercentage: trend.percentage,
    },
    weekly: {
      average: Math.round(avgWeekly),
      total: weeklyData.reduce((sum, w) => sum + w.total, 0),
      trend: calculateTrend(weeklyData.map(w => w.total)).direction,
    },
    monthly: {
      average: Math.round(avgMonthly),
      total: monthlyData.reduce((sum, m) => sum + m.total, 0),
      trend: calculateTrend(monthlyData.map(m => m.total)).direction,
    },
    peakHours,
  };
}

/**
 * 聚合效率分析数据
 */
export function aggregateEfficiencyAnalysis(
  sessions: LearningSession[]
): EfficiencyAnalysis {
  if (sessions.length === 0) {
    return {
      focusScore: 0,
      completionRate: 0,
      avgSessionLength: 0,
      productivityIndex: 0,
      distractionRate: 0,
    };
  }

  const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
  const avgSessionLength = totalDuration / sessions.length;

  // 计算专注度（基于会话长度和完成情况）
  const focusScore = calculateFocusScore(sessions);

  // 计算完成率
  const completedSessions = sessions.filter(s =>
    s.metadata?.completed !== false
  ).length;
  const completionRate = (completedSessions / sessions.length) * 100;

  // 计算生产力指数
  const productivityIndex = calculateProductivityIndex(sessions);

  // 计算分心率
  const distractionRate = 100 - focusScore;

  return {
    focusScore: Math.round(focusScore),
    completionRate: Math.round(completionRate),
    avgSessionLength: Math.round(avgSessionLength),
    productivityIndex: Math.round(productivityIndex),
    distractionRate: Math.round(distractionRate),
  };
}

/**
 * 聚合学习习惯数据
 */
export function aggregateHabitAnalysis(
  sessions: LearningSession[]
): HabitAnalysis {
  const peakHours = analyzePeakHours(sessions);
  const bestTime = determineBestStudyTime(peakHours);

  const rhythm = analyzeStudyRhythm(sessions);
  const streaks = calculateStreaks(sessions);

  return {
    bestStudyTime: bestTime,
    studyRhythm: rhythm,
    streakAnalysis: streaks,
  };
}

/**
 * 聚合知识掌握度数据
 */
export function aggregateKnowledgeMastery(
  sessions: LearningSession[]
): KnowledgeMasteryAnalysis {
  // 从会话中提取知识点数据
  const knowledgePointsMap = new Map<string, {
    name: string;
    category: string;
    practiceCount: number;
    correctCount: number;
    lastPracticed: string;
    history: number[];
  }>();

  sessions.forEach(session => {
    if (session.metadata?.knowledgePoints) {
      session.metadata.knowledgePoints.forEach(kp => {
        const existing = knowledgePointsMap.get(kp);
        if (existing) {
          existing.practiceCount++;
          if (session.metadata?.correctCount) {
            existing.correctCount += session.metadata.correctCount;
          }
          existing.lastPracticed = session.startTime;
          existing.history.push(
            session.metadata?.correctCount || 0
          );
        } else {
          knowledgePointsMap.set(kp, {
            name: kp,
            category: '未分类',
            practiceCount: 1,
            correctCount: session.metadata?.correctCount || 0,
            lastPracticed: session.startTime,
            history: [session.metadata?.correctCount || 0],
          });
        }
      });
    }
  });

  const byKnowledgePoint = Array.from(knowledgePointsMap.entries()).map(([id, data]) => {
    const mastery = data.practiceCount > 0
      ? Math.min(100, (data.correctCount / data.practiceCount) * 100)
      : 0;

    const trend = calculateKnowledgeTrend(data.history);

    return {
      id,
      name: data.name,
      category: data.category,
      mastery: Math.round(mastery),
      practiceCount: data.practiceCount,
      lastPracticed: data.lastPracticed,
      trend,
    };
  });

  // 按类别分组
  const categoryMap = new Map<string, typeof byKnowledgePoint>();
  byKnowledgePoint.forEach(kp => {
    const existing = categoryMap.get(kp.category) || [];
    existing.push(kp);
    categoryMap.set(kp.category, existing);
  });

  const byCategory = Array.from(categoryMap.entries()).map(([category, points]) => {
    const avgMastery = points.reduce((sum, p) => sum + p.mastery, 0) / points.length;
    const trends = points.map(p => p.trend);
    const improvingCount = trends.filter(t => t === 'improving').length;
    const decliningCount = trends.filter(t => t === 'declining').length;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (improvingCount > decliningCount) trend = 'improving';
    else if (decliningCount > improvingCount) trend = 'declining';

    return {
      category,
      mastery: Math.round(avgMastery),
      knowledgePoints: points.length,
      trend,
    };
  });

  const overall = byKnowledgePoint.length > 0
    ? byKnowledgePoint.reduce((sum, kp) => sum + kp.mastery, 0) / byKnowledgePoint.length
    : 0;

  const weakPoints = byKnowledgePoint
    .filter(kp => kp.mastery < 60)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 5)
    .map(kp => ({
      name: kp.name,
      mastery: kp.mastery,
      reason: kp.practiceCount < 3 ? '练习次数不足' : '正确率偏低',
    }));

  const strongPoints = byKnowledgePoint
    .filter(kp => kp.mastery >= 80)
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 5)
    .map(kp => ({
      name: kp.name,
      mastery: kp.mastery,
    }));

  return {
    overall: Math.round(overall),
    byCategory,
    byKnowledgePoint,
    weakPoints,
    strongPoints,
  };
}

/**
 * 生成热力图数据
 */
export function generateHeatmapData(
  sessions: LearningSession[]
): HeatmapData[] {
  const heatmap: HeatmapData[] = [];
  const dataMap = new Map<string, number>();

  sessions.forEach(session => {
    const date = new Date(session.startTime);
    const dateStr = date.toISOString().split('T')[0];
    const hour = date.getHours();
    const key = `${dateStr}-${hour}`;

    dataMap.set(key, (dataMap.get(key) || 0) + session.duration);
  });

  // 找出最大值用于归一化
  const maxValue = Math.max(...Array.from(dataMap.values()));

  dataMap.forEach((value, key) => {
    const [date, hourStr] = key.split('-');
    const hour = parseInt(hourStr);

    heatmap.push({
      date,
      hour,
      value,
      intensity: maxValue > 0 ? value / maxValue : 0,
    });
  });

  return heatmap.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.hour - b.hour;
  });
}

// ==================== 辅助函数 ====================

function groupSessionsByDate(
  sessions: LearningSession[]
): Record<string, LearningSession[]> {
  const grouped: Record<string, LearningSession[]> = {};

  sessions.forEach(session => {
    const date = session.startTime.split('T')[0];
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(session);
  });

  return grouped;
}

function calculateTrend(values: number[]): {
  direction: 'increasing' | 'stable' | 'decreasing';
  percentage: number;
} {
  if (values.length < 2) {
    return { direction: 'stable', percentage: 0 };
  }

  const half = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, half);
  const secondHalf = values.slice(half);

  const avgFirst = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

  const change = avgSecond - avgFirst;
  const percentage = avgFirst > 0 ? (change / avgFirst) * 100 : 0;

  if (Math.abs(percentage) < 5) {
    return { direction: 'stable', percentage: 0 };
  }

  return {
    direction: change > 0 ? 'increasing' : 'decreasing',
    percentage: Math.round(Math.abs(percentage)),
  };
}

function analyzePeakHours(sessions: LearningSession[]): Array<{
  hour: number;
  duration: number;
  efficiency: number;
}> {
  const hourMap = new Map<number, { duration: number; count: number }>();

  sessions.forEach(session => {
    const hour = new Date(session.startTime).getHours();
    const existing = hourMap.get(hour) || { duration: 0, count: 0 };
    existing.duration += session.duration;
    existing.count++;
    hourMap.set(hour, existing);
  });

  return Array.from(hourMap.entries())
    .map(([hour, data]) => ({
      hour,
      duration: data.duration,
      efficiency: Math.round((data.duration / data.count) * 10) / 10,
    }))
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5);
}

function determineBestStudyTime(peakHours: Array<{ hour: number; duration: number; efficiency: number }>): {
  period: 'morning' | 'afternoon' | 'evening' | 'night';
  hours: number[];
  efficiency: number;
} {
  if (peakHours.length === 0) {
    return { period: 'morning', hours: [], efficiency: 0 };
  }

  const topHours = peakHours.slice(0, 3);
  const hours = topHours.map(h => h.hour);
  const avgEfficiency = topHours.reduce((sum, h) => sum + h.efficiency, 0) / topHours.length;

  const avgHour = hours.reduce((sum, h) => sum + h, 0) / hours.length;

  let period: 'morning' | 'afternoon' | 'evening' | 'night';
  if (avgHour >= 6 && avgHour < 12) period = 'morning';
  else if (avgHour >= 12 && avgHour < 18) period = 'afternoon';
  else if (avgHour >= 18 && avgHour < 22) period = 'evening';
  else period = 'night';

  return {
    period,
    hours: hours.sort((a, b) => a - b),
    efficiency: Math.round(avgEfficiency),
  };
}

function analyzeStudyRhythm(sessions: LearningSession[]): {
  consistency: number;
  pattern: 'regular' | 'irregular' | 'weekend-warrior' | 'night-owl';
  preferredDuration: number;
} {
  const byDate = groupSessionsByDate(sessions);
  const dates = Object.keys(byDate).sort();

  // 计算一致性
  const studyDays = dates.length;
  const totalDays = dates.length > 0
    ? Math.ceil((new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;
  const consistency = totalDays > 0 ? (studyDays / totalDays) * 100 : 0;

  // 分析模式
  const weekdayCounts = { weekday: 0, weekend: 0 };
  const hourCounts = { day: 0, night: 0 };

  sessions.forEach(session => {
    const date = new Date(session.startTime);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      weekdayCounts.weekend++;
    } else {
      weekdayCounts.weekday++;
    }

    if (hour >= 22 || hour < 6) {
      hourCounts.night++;
    } else {
      hourCounts.day++;
    }
  });

  let pattern: 'regular' | 'irregular' | 'weekend-warrior' | 'night-owl';
  if (consistency >= 70) {
    pattern = 'regular';
  } else if (weekdayCounts.weekend > weekdayCounts.weekday * 1.5) {
    pattern = 'weekend-warrior';
  } else if (hourCounts.night > hourCounts.day) {
    pattern = 'night-owl';
  } else {
    pattern = 'irregular';
  }

  const avgDuration = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length
    : 0;

  return {
    consistency: Math.round(consistency),
    pattern,
    preferredDuration: Math.round(avgDuration),
  };
}

function calculateStreaks(sessions: LearningSession[]): {
  current: number;
  longest: number;
  average: number;
} {
  const byDate = groupSessionsByDate(sessions);
  const dates = Object.keys(byDate).sort();

  if (dates.length === 0) {
    return { current: 0, longest: 0, average: 0 };
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let streaks: number[] = [];
  let tempStreak = 1;

  for (let i = 1; i < dates.length; i++) {
    const prevDate = new Date(dates[i - 1]);
    const currDate = new Date(dates[i]);
    const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
    } else {
      streaks.push(tempStreak);
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }

  streaks.push(tempStreak);
  longestStreak = Math.max(longestStreak, tempStreak);

  // 检查当前连续天数
  const today = new Date().toISOString().split('T')[0];
  const lastDate = dates[dates.length - 1];
  const daysSinceLastStudy = Math.round(
    (new Date(today).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24)
  );

  currentStreak = daysSinceLastStudy <= 1 ? tempStreak : 0;

  const avgStreak = streaks.length > 0
    ? streaks.reduce((sum, s) => sum + s, 0) / streaks.length
    : 0;

  return {
    current: currentStreak,
    longest: longestStreak,
    average: Math.round(avgStreak),
  };
}

function calculateFocusScore(sessions: LearningSession[]): number {
  // 基于会话长度和完成情况计算专注度
  let score = 0;

  sessions.forEach(session => {
    // 理想会话长度 25-50 分钟
    if (session.duration >= 25 && session.duration <= 50) {
      score += 100;
    } else if (session.duration >= 15 && session.duration < 25) {
      score += 70;
    } else if (session.duration > 50 && session.duration <= 90) {
      score += 80;
    } else {
      score += 50;
    }
  });

  return sessions.length > 0 ? score / sessions.length : 0;
}

function calculateProductivityIndex(sessions: LearningSession[]): number {
  // 综合考虑学习时长、完成率和效率
  const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
  const completedCount = sessions.filter(s => s.metadata?.completed !== false).length;
  const completionRate = sessions.length > 0 ? completedCount / sessions.length : 0;

  const focusScore = calculateFocusScore(sessions);

  // 加权计算
  const productivity = (
    (totalDuration / 10) * 0.3 +  // 时长权重 30%
    completionRate * 100 * 0.4 +   // 完成率权重 40%
    focusScore * 0.3                // 专注度权重 30%
  );

  return Math.min(100, productivity);
}

function calculateKnowledgeTrend(history: number[]): 'improving' | 'stable' | 'declining' {
  if (history.length < 2) return 'stable';

  const recent = history.slice(-3);
  const earlier = history.slice(0, Math.max(1, history.length - 3));

  const avgRecent = recent.reduce((sum, v) => sum + v, 0) / recent.length;
  const avgEarlier = earlier.reduce((sum, v) => sum + v, 0) / earlier.length;

  const change = avgRecent - avgEarlier;

  if (Math.abs(change) < 5) return 'stable';
  return change > 0 ? 'improving' : 'declining';
}

function aggregateByWeek(
  sessions: LearningSession[],
  start: Date,
  end: Date
): Array<{ week: number; total: number }> {
  const weeks: Array<{ week: number; total: number }> = [];
  let weekNum = 1;
  let currentWeekStart = new Date(start);

  while (currentWeekStart <= end) {
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

    const weekSessions = sessions.filter(s => {
      const sessionDate = new Date(s.startTime);
      return sessionDate >= currentWeekStart && sessionDate <= currentWeekEnd;
    });

    const total = weekSessions.reduce((sum, s) => sum + s.duration, 0);
    weeks.push({ week: weekNum, total });

    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    weekNum++;
  }

  return weeks;
}

function aggregateByMonth(
  sessions: LearningSession[],
  start: Date,
  end: Date
): Array<{ month: string; total: number }> {
  const months: Array<{ month: string; total: number }> = [];
  const monthMap = new Map<string, number>();

  sessions.forEach(session => {
    const date = new Date(session.startTime);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + session.duration);
  });

  monthMap.forEach((total, month) => {
    months.push({ month, total });
  });

  return months.sort((a, b) => a.month.localeCompare(b.month));
}

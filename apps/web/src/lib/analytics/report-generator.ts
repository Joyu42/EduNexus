/**
 * 学习报告生成器
 * 生成周报、月报和学习建议
 */

import type { LearningSession, SessionStats } from './learning-session';
import type { UserStats } from '@/lib/server/user-level-types';
import { calculateSessionStats, getSessionsInRange } from './learning-session';

export interface WeeklyReport {
  period: {
    start: string;
    end: string;
    weekNumber: number;
  };
  summary: {
    totalStudyTime: number; // 分钟
    avgDailyTime: number;
    totalSessions: number;
    documentsCreated: number;
    documentsEdited: number;
    practicesCompleted: number;
    practiceAccuracy: number;
  };
  dailyBreakdown: Array<{
    date: string;
    studyTime: number;
    activities: number;
  }>;
  topActivities: Array<{
    type: string;
    duration: number;
    percentage: number;
  }>;
  achievements: string[];
  insights: string[];
  suggestions: string[];
}

export interface MonthlyReport {
  period: {
    start: string;
    end: string;
    month: string;
  };
  summary: {
    totalStudyTime: number;
    avgDailyTime: number;
    totalSessions: number;
    documentsCreated: number;
    documentsEdited: number;
    practicesCompleted: number;
    practiceAccuracy: number;
    knowledgePointsMastered: number;
  };
  weeklyTrend: Array<{
    week: number;
    studyTime: number;
    activities: number;
  }>;
  topActivities: Array<{
    type: string;
    duration: number;
    percentage: number;
  }>;
  knowledgeMastery: Array<{
    name: string;
    mastery: number;
    category: string;
  }>;
  milestones: string[];
  achievements: string[];
  insights: string[];
  recommendations: string[];
}

export interface LearningInsights {
  studyPattern: {
    preferredTimeSlots: string[];
    avgSessionLength: number;
    consistency: number; // 0-100
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  nextSteps: string[];
}

/**
 * 生成周报
 */
export function generateWeeklyReport(
  sessions: LearningSession[],
  userStats: UserStats
): WeeklyReport {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(now);
  weekEnd.setHours(23, 59, 59, 999);

  // 获取本周会话
  const weekSessions = getSessionsInRange(sessions, weekStart, weekEnd);
  const sessionStats = calculateSessionStats(weekSessions);

  // 计算每日数据
  const dailyBreakdown = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    const daySessions = weekSessions.filter(
      s => s.startTime.split('T')[0] === dateStr
    );

    dailyBreakdown.push({
      date: dateStr,
      studyTime: sessionStats.byDate[dateStr] || 0,
      activities: daySessions.length,
    });
  }

  // 计算活动类型分布
  const topActivities = Object.entries(sessionStats.byActivityType)
    .map(([type, duration]) => ({
      type: getActivityTypeName(type),
      duration,
      percentage: Math.round((duration / sessionStats.totalDuration) * 100),
    }))
    .sort((a, b) => b.duration - a.duration);

  // 生成成就
  const achievements = generateWeeklyAchievements(sessionStats, userStats);

  // 生成洞察
  const insights = generateWeeklyInsights(sessionStats, dailyBreakdown);

  // 生成建议
  const suggestions = generateWeeklySuggestions(sessionStats, userStats);

  return {
    period: {
      start: weekStart.toISOString().split('T')[0],
      end: weekEnd.toISOString().split('T')[0],
      weekNumber: getWeekNumber(now),
    },
    summary: {
      totalStudyTime: sessionStats.totalDuration,
      avgDailyTime: Math.round(sessionStats.totalDuration / 7),
      totalSessions: sessionStats.totalSessions,
      documentsCreated: countActivityType(weekSessions, 'document_create'),
      documentsEdited: countActivityType(weekSessions, 'document_edit'),
      practicesCompleted: countActivityType(weekSessions, 'practice'),
      practiceAccuracy: calculatePracticeAccuracy(weekSessions),
    },
    dailyBreakdown,
    topActivities,
    achievements,
    insights,
    suggestions,
  };
}

/**
 * 生成月报
 */
export function generateMonthlyReport(
  sessions: LearningSession[],
  userStats: UserStats
): MonthlyReport {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // 获取本月会话
  const monthSessions = getSessionsInRange(sessions, monthStart, monthEnd);
  const sessionStats = calculateSessionStats(monthSessions);

  // 计算周趋势
  const weeklyTrend = calculateWeeklyTrend(monthSessions, monthStart, monthEnd);

  // 计算活动类型分布
  const topActivities = Object.entries(sessionStats.byActivityType)
    .map(([type, duration]) => ({
      type: getActivityTypeName(type),
      duration,
      percentage: Math.round((duration / sessionStats.totalDuration) * 100),
    }))
    .sort((a, b) => b.duration - a.duration);

  // 知识点掌握度（模拟数据，实际应从数据库获取）
  const knowledgeMastery = generateKnowledgeMastery(userStats);

  // 生成里程碑
  const milestones = generateMonthlyMilestones(sessionStats, userStats);

  // 生成成就
  const achievements = generateMonthlyAchievements(sessionStats, userStats);

  // 生成洞察
  const insights = generateMonthlyInsights(sessionStats, weeklyTrend);

  // 生成建议
  const recommendations = generateMonthlyRecommendations(sessionStats, userStats);

  const daysInMonth = monthEnd.getDate();

  return {
    period: {
      start: monthStart.toISOString().split('T')[0],
      end: monthEnd.toISOString().split('T')[0],
      month: monthStart.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' }),
    },
    summary: {
      totalStudyTime: sessionStats.totalDuration,
      avgDailyTime: Math.round(sessionStats.totalDuration / daysInMonth),
      totalSessions: sessionStats.totalSessions,
      documentsCreated: countActivityType(monthSessions, 'document_create'),
      documentsEdited: countActivityType(monthSessions, 'document_edit'),
      practicesCompleted: countActivityType(monthSessions, 'practice'),
      practiceAccuracy: calculatePracticeAccuracy(monthSessions),
      knowledgePointsMastered: userStats.knowledgePointsMastered,
    },
    weeklyTrend,
    topActivities,
    knowledgeMastery,
    milestones,
    achievements,
    insights,
    recommendations,
  };
}

/**
 * 生成学习洞察和建议
 */
export function generateLearningInsights(
  sessions: LearningSession[],
  userStats: UserStats
): LearningInsights {
  const sessionStats = calculateSessionStats(sessions);

  // 分析学习模式
  const studyPattern = analyzeStudyPattern(sessions);

  // 识别优势
  const strengths = identifyStrengths(sessionStats, userStats);

  // 识别薄弱点
  const weaknesses = identifyWeaknesses(sessionStats, userStats);

  // 生成推荐
  const recommendations = generateRecommendations(strengths, weaknesses, studyPattern);

  // 生成下一步行动
  const nextSteps = generateNextSteps(weaknesses, userStats);

  return {
    studyPattern,
    strengths,
    weaknesses,
    recommendations,
    nextSteps,
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

function countActivityType(sessions: LearningSession[], type: string): number {
  return sessions.filter(s => s.activityType === type).length;
}

function calculatePracticeAccuracy(sessions: LearningSession[]): number {
  const practiceSessions = sessions.filter(s => s.activityType === 'practice');
  if (practiceSessions.length === 0) return 0;

  let totalQuestions = 0;
  let totalCorrect = 0;

  practiceSessions.forEach(session => {
    if (session.metadata?.questionsCount) {
      totalQuestions += session.metadata.questionsCount;
      totalCorrect += session.metadata.correctCount || 0;
    }
  });

  return totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function calculateWeeklyTrend(
  sessions: LearningSession[],
  monthStart: Date,
  monthEnd: Date
): Array<{ week: number; studyTime: number; activities: number }> {
  const weeks: Array<{ week: number; studyTime: number; activities: number }> = [];
  let weekNum = 1;
  let currentWeekStart = new Date(monthStart);

  while (currentWeekStart <= monthEnd) {
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

    const weekSessions = getSessionsInRange(sessions, currentWeekStart, currentWeekEnd);
    const weekStats = calculateSessionStats(weekSessions);

    weeks.push({
      week: weekNum,
      studyTime: weekStats.totalDuration,
      activities: weekStats.totalSessions,
    });

    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    weekNum++;
  }

  return weeks;
}

function generateKnowledgeMastery(userStats: UserStats): Array<{
  name: string;
  mastery: number;
  category: string;
}> {
  // 实际应用中应从数据库获取真实的知识点掌握数据
  // 这里返回模拟数据
  return [
    { name: 'React Hooks', mastery: 85, category: '前端开发' },
    { name: 'TypeScript', mastery: 78, category: '编程语言' },
    { name: '算法设计', mastery: 65, category: '计算机科学' },
    { name: '数据结构', mastery: 72, category: '计算机科学' },
    { name: 'Node.js', mastery: 80, category: '后端开发' },
    { name: 'CSS布局', mastery: 90, category: '前端开发' },
  ];
}

function generateWeeklyAchievements(stats: SessionStats, userStats: UserStats): string[] {
  const achievements: string[] = [];

  if (stats.totalDuration >= 600) {
    achievements.push('本周学习超过10小时');
  }
  if (stats.avgSessionDuration >= 60) {
    achievements.push('保持每日学习习惯');
  }
  if (userStats.currentStreak >= 7) {
    achievements.push(`连续学习 ${userStats.currentStreak} 天`);
  }
  if (userStats.practiceCorrect > 0 && userStats.practiceCorrect / (userStats.practiceCorrect + userStats.practiceWrong) > 0.8) {
    achievements.push('练习正确率超过80%');
  }

  return achievements;
}

function generateWeeklyInsights(stats: SessionStats, dailyBreakdown: any[]): string[] {
  const insights: string[] = [];

  // 分析学习时长趋势
  const recentDays = dailyBreakdown.slice(-3);
  const avgRecent = recentDays.reduce((sum, d) => sum + d.studyTime, 0) / 3;
  const earlierDays = dailyBreakdown.slice(0, 3);
  const avgEarlier = earlierDays.reduce((sum, d) => sum + d.studyTime, 0) / 3;

  if (avgRecent > avgEarlier * 1.2) {
    insights.push('学习时长呈上升趋势，保持良好势头');
  } else if (avgRecent < avgEarlier * 0.8) {
    insights.push('学习时长有所下降，建议调整学习计划');
  }

  // 分析活动分布
  const activeDays = dailyBreakdown.filter(d => d.studyTime > 0).length;
  if (activeDays === 7) {
    insights.push('本周每天都有学习，坚持得很好');
  } else if (activeDays >= 5) {
    insights.push('本周学习频率较高，继续保持');
  }

  return insights;
}

function generateWeeklySuggestions(stats: SessionStats, userStats: UserStats): string[] {
  const suggestions: string[] = [];

  if (stats.avgSessionDuration < 30) {
    suggestions.push('建议增加每次学习时长至30分钟以上');
  }

  if (userStats.currentStreak < 3) {
    suggestions.push('尝试建立连续学习习惯，每天至少学习15分钟');
  }

  const practiceRate = userStats.practiceCorrect / (userStats.practiceCorrect + userStats.practiceWrong);
  if (practiceRate < 0.7) {
    suggestions.push('练习正确率偏低，建议复习基础知识');
  }

  return suggestions;
}

function generateMonthlyMilestones(stats: SessionStats, userStats: UserStats): string[] {
  const milestones: string[] = [];

  if (stats.totalDuration >= 2400) {
    milestones.push('本月学习时长突破40小时');
  }
  if (userStats.notesCreated >= 20) {
    milestones.push(`创建了 ${userStats.notesCreated} 篇学习笔记`);
  }
  if (userStats.knowledgePointsMastered >= 10) {
    milestones.push(`掌握了 ${userStats.knowledgePointsMastered} 个知识点`);
  }
  if (userStats.longestStreak >= 14) {
    milestones.push(`最长连续学习 ${userStats.longestStreak} 天`);
  }

  return milestones;
}

function generateMonthlyAchievements(stats: SessionStats, userStats: UserStats): string[] {
  const achievements: string[] = [];

  if (stats.totalDuration >= 1800) {
    achievements.push('月度学习达人');
  }
  if (userStats.currentStreak >= 30) {
    achievements.push('连续学习一个月');
  }
  if (userStats.practiceCorrect >= 100) {
    achievements.push('练习题达人');
  }

  return achievements;
}

function generateMonthlyInsights(stats: SessionStats, weeklyTrend: any[]): string[] {
  const insights: string[] = [];

  // 分析周趋势
  if (weeklyTrend.length >= 2) {
    const lastWeek = weeklyTrend[weeklyTrend.length - 1];
    const prevWeek = weeklyTrend[weeklyTrend.length - 2];

    if (lastWeek.studyTime > prevWeek.studyTime * 1.2) {
      insights.push('最近一周学习时长显著增加');
    }
  }

  // 分析总体表现
  if (stats.totalDuration >= 2400) {
    insights.push('本月学习时长表现优秀');
  } else if (stats.totalDuration >= 1200) {
    insights.push('本月学习时长达到良好水平');
  }

  return insights;
}

function generateMonthlyRecommendations(stats: SessionStats, userStats: UserStats): string[] {
  const recommendations: string[] = [];

  // 基于学习时长推荐
  if (stats.avgSessionDuration < 45) {
    recommendations.push('建议延长单次学习时长，提高学习效率');
  }

  // 基于练习情况推荐
  const practiceTotal = userStats.practiceCorrect + userStats.practiceWrong;
  if (practiceTotal < 50) {
    recommendations.push('增加练习量，巩固所学知识');
  }

  // 基于知识点掌握推荐
  if (userStats.knowledgePointsMastered < 5) {
    recommendations.push('专注于深入掌握核心知识点');
  }

  return recommendations;
}

function analyzeStudyPattern(sessions: LearningSession[]): {
  preferredTimeSlots: string[];
  avgSessionLength: number;
  consistency: number;
} {
  const stats = calculateSessionStats(sessions);

  // 分析时间偏好（简化版）
  const preferredTimeSlots = ['上午', '下午']; // 实际应分析具体时间

  // 计算一致性（基于每日学习频率）
  const dates = Object.keys(stats.byDate);
  const consistency = Math.min(100, (dates.length / 30) * 100);

  return {
    preferredTimeSlots,
    avgSessionLength: stats.avgSessionDuration,
    consistency: Math.round(consistency),
  };
}

function identifyStrengths(stats: SessionStats, userStats: UserStats): string[] {
  const strengths: string[] = [];

  if (stats.totalDuration >= 1800) {
    strengths.push('学习时长充足');
  }
  if (userStats.currentStreak >= 7) {
    strengths.push('学习习惯良好');
  }
  const practiceRate = userStats.practiceCorrect / (userStats.practiceCorrect + userStats.practiceWrong);
  if (practiceRate >= 0.8) {
    strengths.push('练习正确率高');
  }

  return strengths;
}

function identifyWeaknesses(stats: SessionStats, userStats: UserStats): string[] {
  const weaknesses: string[] = [];

  if (stats.avgSessionDuration < 30) {
    weaknesses.push('单次学习时长较短');
  }
  if (userStats.currentStreak < 3) {
    weaknesses.push('学习连续性不足');
  }
  const practiceRate = userStats.practiceCorrect / (userStats.practiceCorrect + userStats.practiceWrong);
  if (practiceRate < 0.7) {
    weaknesses.push('练习正确率需提高');
  }

  return weaknesses;
}

function generateRecommendations(
  strengths: string[],
  weaknesses: string[],
  pattern: any
): string[] {
  const recommendations: string[] = [];

  if (weaknesses.includes('单次学习时长较短')) {
    recommendations.push('尝试使用番茄工作法，每次专注学习25分钟');
  }
  if (weaknesses.includes('学习连续性不足')) {
    recommendations.push('设定固定的学习时间，培养学习习惯');
  }
  if (weaknesses.includes('练习正确率需提高')) {
    recommendations.push('先复习理论知识，再进行练习');
  }

  return recommendations;
}

function generateNextSteps(weaknesses: string[], userStats: UserStats): string[] {
  const nextSteps: string[] = [];

  if (weaknesses.length > 0) {
    nextSteps.push('重点改善：' + weaknesses[0]);
  }

  if (userStats.knowledgePointsMastered < 10) {
    nextSteps.push('本周目标：掌握3个新知识点');
  }

  nextSteps.push('保持每日学习习惯');

  return nextSteps;
}

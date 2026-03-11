/**
 * 学习报告系统使用示例
 * 演示如何在实际应用中集成学习报告功能
 */

// ============================================
// 示例 1: 追踪文档编辑会话
// ============================================

import { sessionTracker } from '@/lib/analytics/learning-session';

export async function handleDocumentEdit(userId: string, documentId: string, documentTitle: string) {
  // 1. 开始学习会话
  const sessionId = sessionTracker.startSession(
    userId,
    'document_edit',
    {
      documentId,
      documentTitle,
    }
  );

  console.log(`开始编辑文档: ${documentTitle}`);

  // 2. 用户编辑文档...
  // (实际的编辑逻辑)

  // 3. 结束会话
  const session = sessionTracker.endSession(sessionId);

  if (session) {
    console.log(`编辑完成，学习时长: ${session.duration} 分钟`);

    // 4. 保存到数据库
    await saveSessionToDatabase(session);

    // 5. 更新用户统计
    await updateUserStats(userId, {
      learningMinutes: session.duration,
      notesEdited: 1,
    });
  }
}

// ============================================
// 示例 2: 追踪练习会话
// ============================================

export async function handlePracticeSession(
  userId: string,
  practiceId: string,
  questions: any[]
) {
  // 1. 开始练习会话
  const sessionId = sessionTracker.startSession(
    userId,
    'practice',
    {
      practiceId,
      questionsCount: questions.length,
    }
  );

  console.log(`开始练习，共 ${questions.length} 题`);

  // 2. 用户答题...
  let correctCount = 0;
  // (实际的答题逻辑)

  // 3. 更新会话元数据
  sessionTracker.updateSessionMetadata(sessionId, {
    correctCount,
  });

  // 4. 结束会话
  const session = sessionTracker.endSession(sessionId);

  if (session) {
    const accuracy = (correctCount / questions.length) * 100;
    console.log(`练习完成，正确率: ${accuracy.toFixed(1)}%`);

    // 5. 保存并更新统计
    await saveSessionToDatabase(session);
    await updateUserStats(userId, {
      learningMinutes: session.duration,
      practiceCorrect: correctCount,
      practiceWrong: questions.length - correctCount,
    });
  }
}

// ============================================
// 示例 3: 生成周报
// ============================================

import { generateWeeklyReport } from '@/lib/analytics/report-generator';
import { getSessionsInRange } from '@/lib/analytics/learning-session';

export async function generateUserWeeklyReport(userId: string) {
  // 1. 获取本周的会话数据
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const sessions = await getSessionsFromDatabase(userId, weekStart, now);

  // 2. 获取用户统计数据
  const userStats = await getUserStatsFromDatabase(userId);

  // 3. 生成周报
  const report = generateWeeklyReport(sessions, userStats);

  console.log('周报生成成功:');
  console.log(`- 学习时长: ${report.summary.totalStudyTime} 分钟`);
  console.log(`- 文档活动: ${report.summary.documentsCreated + report.summary.documentsEdited}`);
  console.log(`- 练习完成: ${report.summary.practicesCompleted}`);
  console.log(`- 成就数: ${report.achievements.length}`);

  return report;
}

// ============================================
// 示例 4: 生成月报
// ============================================

import { generateMonthlyReport } from '@/lib/analytics/report-generator';

export async function generateUserMonthlyReport(userId: string) {
  // 1. 获取本月的会话数据
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const sessions = await getSessionsFromDatabase(userId, monthStart, now);

  // 2. 获取用户统计数据
  const userStats = await getUserStatsFromDatabase(userId);

  // 3. 生成月报
  const report = generateMonthlyReport(sessions, userStats);

  console.log('月报生成成功:');
  console.log(`- 月份: ${report.period.month}`);
  console.log(`- 学习时长: ${report.summary.totalStudyTime} 分钟`);
  console.log(`- 知识点掌握: ${report.summary.knowledgePointsMastered}`);
  console.log(`- 里程碑: ${report.milestones.length}`);

  return report;
}

// ============================================
// 示例 5: 获取 AI 学习建议
// ============================================

import { generateLearningInsights } from '@/lib/analytics/report-generator';

export async function getAILearningInsights(userId: string, period: 'week' | 'month' = 'month') {
  // 1. 获取指定时期的会话数据
  const now = new Date();
  const startDate = new Date(now);

  if (period === 'week') {
    startDate.setDate(now.getDate() - 7);
  } else {
    startDate.setDate(now.getDate() - 30);
  }

  const sessions = await getSessionsFromDatabase(userId, startDate, now);

  // 2. 获取用户统计数据
  const userStats = await getUserStatsFromDatabase(userId);

  // 3. 生成 AI 洞察
  const insights = generateLearningInsights(sessions, userStats);

  console.log('AI 学习建议:');
  console.log('优势:', insights.strengths);
  console.log('薄弱点:', insights.weaknesses);
  console.log('建议:', insights.recommendations);
  console.log('下一步:', insights.nextSteps);

  return insights;
}

// ============================================
// 示例 6: 在 React 组件中使用
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { WeeklyReport } from '@/components/analytics/weekly-report';
import { MonthlyReport } from '@/components/analytics/monthly-report';
import { AISuggestions } from '@/components/analytics/ai-suggestions';

export function UserReportsPage() {
  // This is a usage example - actual implementation should be in a React component file
  // const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');

  console.log('UserReportsPage example - implement in a .tsx file');
}

// ============================================
// 示例 7: API 路由使用
// ============================================

// 在客户端组件中调用 API
export async function fetchWeeklyReport(userId: string, date?: string) {
  const params = new URLSearchParams({
    userId,
    ...(date && { date }),
  });

  const response = await fetch(`/api/analytics/weekly-report?${params}`);
  const report = await response.json();

  return report;
}

export async function fetchMonthlyReport(userId: string, date?: string) {
  const params = new URLSearchParams({
    userId,
    ...(date && { date }),
  });

  const response = await fetch(`/api/analytics/monthly-report?${params}`);
  const report = await response.json();

  return report;
}

export async function fetchAIInsights(userId: string, period: 'week' | 'month' = 'month') {
  const params = new URLSearchParams({
    userId,
    period,
  });

  const response = await fetch(`/api/analytics/insights?${params}`);
  const insights = await response.json();

  return insights;
}

// ============================================
// 辅助函数（需要实现）
// ============================================

async function saveSessionToDatabase(session: any) {
  // 实现保存会话到数据库的逻辑
  console.log('保存会话到数据库:', session);
}

async function updateUserStats(userId: string, updates: any) {
  // 实现更新用户统计的逻辑
  console.log('更新用户统计:', userId, updates);
}

async function getSessionsFromDatabase(userId: string, startDate: Date, endDate: Date) {
  // 实现从数据库获取会话的逻辑
  console.log('从数据库获取会话:', userId, startDate, endDate);
  return [];
}

async function getUserStatsFromDatabase(userId: string) {
  // 实现从数据库获取用户统计的逻辑
  console.log('从数据库获取用户统计:', userId);
  return {
    userId,
    learningMinutes: 0,
    notesCreated: 0,
    notesEdited: 0,
    practiceCorrect: 0,
    practiceWrong: 0,
    knowledgePointsMastered: 0,
    pathsCompleted: 0,
    quizzesPassed: 0,
    postsCount: 0,
    answersCount: 0,
    answersAccepted: 0,
    likesReceived: 0,
    notesShared: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastActiveDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
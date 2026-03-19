import { NextRequest, NextResponse } from 'next/server';
import {
  generateDailyReport,
  generateEnhancedWeeklyReport,
  generateEnhancedMonthlyReport,
  generateYearlyReport,
} from '@/lib/analytics/report-builder';
import type { LearningSession } from '@/lib/analytics/learning-session';

/**
 * GET /api/analytics/reports
 * 生成学习报告
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reportType = searchParams.get('type') as 'daily' | 'weekly' | 'monthly' | 'yearly' || 'weekly';
    const date = searchParams.get('date');

    // 获取会话数据（实际应从数据库获取）
    const sessions = generateMockSessions();

    let report;

    switch (reportType) {
      case 'daily':
        const targetDate = date ? new Date(date) : new Date();
        report = generateDailyReport(sessions, targetDate);
        break;

      case 'weekly':
        const weekStart = date ? new Date(date) : undefined;
        report = generateEnhancedWeeklyReport(sessions, weekStart);
        break;

      case 'monthly':
        const [year, month] = date ? date.split('-').map(Number) : [undefined, undefined];
        report = generateEnhancedMonthlyReport(sessions, year, month ? month - 1 : undefined);
        break;

      case 'yearly':
        const targetYear = date ? parseInt(date) : undefined;
        report = generateYearlyReport(sessions, targetYear);
        break;

      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('生成报告失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '生成报告失败',
      },
      { status: 500 }
    );
  }
}

function generateMockSessions(): LearningSession[] {
  const sessions: LearningSession[] = [];
  const activityTypes: LearningSession['activityType'][] = [
    'document_create', 'document_edit', 'practice', 'chat', 'reading',
  ];

  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - 90);

  const currentDate = new Date(startDate);

  while (currentDate <= now) {
    const sessionsPerDay = Math.floor(Math.random() * 6);
    for (let i = 0; i < sessionsPerDay; i++) {
      const hour = Math.floor(Math.random() * 16) + 6;
      const minute = Math.floor(Math.random() * 60);
      const duration = Math.floor(Math.random() * 90) + 15;
      const sessionDate = new Date(currentDate);
      sessionDate.setHours(hour, minute, 0, 0);
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];

      sessions.push({
        sessionId: `session_${sessionDate.getTime()}_${i}`,
        userId: 'user_1',
        startTime: sessionDate.toISOString(),
        duration,
        activityType,
        metadata: {
          completed: Math.random() > 0.2,
          questionsCount: activityType === 'practice' ? Math.floor(Math.random() * 20) + 5 : undefined,
          correctCount: activityType === 'practice' ? Math.floor(Math.random() * 15) + 3 : undefined,
          knowledgePoints: activityType === 'practice' ? ['React', 'TypeScript', 'Node.js'] : undefined,
        },
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return sessions;
}

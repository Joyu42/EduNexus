import { NextRequest, NextResponse } from 'next/server';
import { AnalyticsEngine, createTimeRange } from '@/lib/analytics/analytics-engine';
import type { LearningSession } from '@/lib/analytics/learning-session';

/**
 * GET /api/analytics/stats
 * 获取学习统计数据
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rangeType = searchParams.get('range') as 'day' | 'week' | 'month' | 'year' || 'week';
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    // 创建时间范围
    let timeRange;
    if (startDate && endDate) {
      timeRange = createTimeRange('custom', new Date(startDate), new Date(endDate));
    } else {
      timeRange = createTimeRange(rangeType);
    }

    // 实际应用中应从数据库获取会话数据
    // 这里使用模拟数据
    const sessions = generateMockSessions(timeRange);

    // 执行分析
    const behaviorAnalysis = AnalyticsEngine.analyzeLearningBehavior(sessions, timeRange);
    const metrics = AnalyticsEngine.calculateMetrics(sessions);
    const heatmapData = AnalyticsEngine.generateHeatmap(sessions);

    return NextResponse.json({
      success: true,
      data: {
        timeRange: {
          start: timeRange.start.toISOString(),
          end: timeRange.end.toISOString(),
        },
        behaviorAnalysis,
        metrics,
        heatmapData,
      },
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取统计数据失败',
      },
      { status: 500 }
    );
  }
}

// 生成模拟会话数据
function generateMockSessions(timeRange: { start: Date; end: Date }): LearningSession[] {
  const sessions: LearningSession[] = [];
  const activityTypes: LearningSession['activityType'][] = [
    'document_create',
    'document_edit',
    'practice',
    'chat',
    'reading',
  ];

  const currentDate = new Date(timeRange.start);
  const endDate = new Date(timeRange.end);

  while (currentDate <= endDate) {
    // 每天随机生成 0-5 个会话
    const sessionsPerDay = Math.floor(Math.random() * 6);

    for (let i = 0; i < sessionsPerDay; i++) {
      const hour = Math.floor(Math.random() * 16) + 6; // 6-22点
      const minute = Math.floor(Math.random() * 60);
      const duration = Math.floor(Math.random() * 90) + 15; // 15-105分钟

      const sessionDate = new Date(currentDate);
      sessionDate.setHours(hour, minute, 0, 0);

      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];

      sessions.push({
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

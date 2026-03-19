import { NextRequest, NextResponse } from 'next/server';
import { exportToJSON, exportToCSV, exportReportAsText } from '@/lib/analytics/export-manager';
import {
  generateDailyReport,
  generateEnhancedWeeklyReport,
  generateEnhancedMonthlyReport,
  generateYearlyReport,
} from '@/lib/analytics/report-builder';
import type { LearningSession } from '@/lib/analytics/learning-session';

/**
 * POST /api/analytics/export
 * 导出分析数据
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { format, reportType, dateRange } = body;

    // 获取会话数据
    const sessions = generateMockSessions();

    let exportResult;

    if (format === 'json') {
      // 导出为 JSON
      const data = {
        sessions,
        dateRange,
        exportedAt: new Date().toISOString(),
      };
      exportResult = exportToJSON(data, `analytics_${reportType}_${Date.now()}`);
    } else if (format === 'csv') {
      // 导出为 CSV
      const csvData = sessions.map(s => ({
        日期: s.startTime.split('T')[0],
        时间: s.startTime.split('T')[1].split('.')[0],
        活动类型: getActivityTypeName(s.activityType),
        时长分钟: s.duration,
        是否完成: s.metadata?.completed ? '是' : '否',
      }));
      exportResult = exportToCSV(csvData, `analytics_${reportType}_${Date.now()}`);
    } else if (format === 'text') {
      // 导出报告为文本
      let report;
      switch (reportType) {
        case 'daily':
          report = generateDailyReport(sessions, new Date());
          break;
        case 'weekly':
          report = generateEnhancedWeeklyReport(sessions);
          break;
        case 'monthly':
          report = generateEnhancedMonthlyReport(sessions);
          break;
        case 'yearly':
          report = generateYearlyReport(sessions);
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }
      exportResult = exportReportAsText(report, reportType);
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    if (!exportResult.success) {
      throw new Error(exportResult.error);
    }

    return NextResponse.json({
      success: true,
      data: {
        filename: exportResult.filename,
        format: exportResult.format,
        data: exportResult.data,
      },
    });
  } catch (error) {
    console.error('导出失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '导出失败',
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
  startDate.setDate(now.getDate() - 30);
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
        },
      });
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return sessions;
}

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

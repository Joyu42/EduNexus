import { NextRequest, NextResponse } from "next/server";
import { loadDb } from "@/lib/server/store";
import { generateMonthlyReport } from "@/lib/analytics/report-generator";
import type { LearningSession } from "@/lib/analytics/learning-session";
import type { UserStats } from "@/lib/server/user-level-types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId") || "demo_user";
    const date = searchParams.get("date");

    // 加载数据库
    const db = await loadDb();

    // 获取用户统计数据
    const userStats: UserStats = db.userStats[userId] || {
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

    // 模拟学习会话数据（实际应从数据库获取）
    const sessions: LearningSession[] = generateMockSessions(userId, date);

    // 生成月报
    const report = generateMonthlyReport(sessions, userStats);

    return NextResponse.json(report);
  } catch (error) {
    console.error("Error generating monthly report:", error);
    return NextResponse.json(
      { error: "Failed to generate monthly report" },
      { status: 500 }
    );
  }
}

// 生成模拟会话数据
function generateMockSessions(userId: string, dateStr: string | null): LearningSession[] {
  const sessions: LearningSession[] = [];
  const endDate = dateStr ? new Date(dateStr) : new Date();
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  const activityTypes: LearningSession['activityType'][] = [
    'document_create',
    'document_edit',
    'practice',
    'chat',
    'reading',
  ];

  const daysInMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate();

  for (let i = 0; i < daysInMonth; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    // 每天生成 2-5 个会话
    const sessionsPerDay = Math.floor(Math.random() * 4) + 2;

    for (let j = 0; j < sessionsPerDay; j++) {
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const duration = Math.floor(Math.random() * 60) + 20; // 20-80 分钟

      const session: LearningSession = {
        sessionId: `session_${date.getTime()}_${j}`,
        userId,
        startTime: date.toISOString(),
        endTime: new Date(date.getTime() + duration * 60000).toISOString(),
        duration,
        activityType,
        metadata: activityType === 'practice' ? {
          questionsCount: Math.floor(Math.random() * 10) + 5,
          correctCount: Math.floor(Math.random() * 8) + 4,
        } : undefined,
      };

      sessions.push(session);
    }
  }

  return sessions;
}
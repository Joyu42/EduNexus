import { NextRequest, NextResponse } from "next/server";
import { loadDb } from "@/lib/server/store";
import { generateLearningInsights } from "@/lib/analytics/report-generator";
import type { LearningSession } from "@/lib/analytics/learning-session";
import type { UserStats } from "@/lib/server/user-level-types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId") || "demo_user";
    const period = searchParams.get("period") || "month"; // week or month

    // 加载数据库
    const db = await loadDb();

    // 获取用户统计数据
    const userStats: UserStats = db.userStats[userId] || {
      userId,
      learningMinutes: 0,
      notesCreated: 0,
      notesEdited: 0,
      practiceCorrect: 50,
      practiceWrong: 10,
      knowledgePointsMastered: 8,
      pathsCompleted: 0,
      quizzesPassed: 0,
      postsCount: 0,
      answersCount: 0,
      answersAccepted: 0,
      likesReceived: 0,
      notesShared: 0,
      currentStreak: 5,
      longestStreak: 12,
      lastActiveDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 模拟学习会话数据
    const sessions: LearningSession[] = generateMockSessions(userId, period);

    // 生成 AI 洞察
    const insights = generateLearningInsights(sessions, userStats);

    return NextResponse.json(insights);
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return NextResponse.json(
      { error: "Failed to generate AI insights" },
      { status: 500 }
    );
  }
}

function generateMockSessions(userId: string, period: string): LearningSession[] {
  const sessions: LearningSession[] = [];
  const endDate = new Date();
  const startDate = new Date(endDate);

  if (period === "week") {
    startDate.setDate(endDate.getDate() - 7);
  } else {
    startDate.setDate(endDate.getDate() - 30);
  }

  const activityTypes: LearningSession['activityType'][] = [
    'document_create',
    'document_edit',
    'practice',
    'chat',
    'reading',
  ];

  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    const sessionsPerDay = Math.floor(Math.random() * 4) + 2;

    for (let j = 0; j < sessionsPerDay; j++) {
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const duration = Math.floor(Math.random() * 60) + 20;

      sessions.push({
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
      });
    }
  }

  return sessions;
}
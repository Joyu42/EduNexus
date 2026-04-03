import type { AnalyticsReport } from "./report-builder";

export type AnalyticsInsightCard = {
  id: "activity-volume" | "study-consistency" | "snapshot-coverage" | "study-streak" | "due-pressure" | "mastery-trend" | "focus-book";
  title: string;
  description: string;
  severity: "positive" | "neutral" | "warning";
};

// Map WordsAnalyticsReport properties generically since we can't import server types here easily
export type ExtendedAnalyticsReport = AnalyticsReport & {
  streakDays?: number;
  dueToday?: number;
  totalWords?: number;
  learnedWords?: number;
  masteredWords?: number;
  accuracyToday?: number;
  recentProgress?: {
    activeDays: number;
    averageDailyLearnedWords: number;
  };
  bookProgress?: Array<{
    bookName: string;
    progressPercent: number;
    dueToday: number;
  }>;
};

function buildStreakInsight(report: ExtendedAnalyticsReport): AnalyticsInsightCard {
  const streak = report.streakDays ?? 0;
  if (streak === 0) {
    return {
      id: "study-streak",
      title: "暂无连续学习",
      description: "今天还没有学习，开启你的学习之旅，建立第一个连续学习打卡吧！",
      severity: "warning"
    };
  }

  if (streak >= 7) {
    return {
      id: "study-streak",
      title: "学习状态火热",
      description: `太棒了！你已经连续学习 ${streak} 天，继续保持这个好习惯！`,
      severity: "positive"
    };
  }

  return {
    id: "study-streak",
    title: "正在养成习惯",
    description: `已连续学习 ${streak} 天，坚持下去，让学习成为日常生活的一部分。`,
    severity: "neutral"
  };
}

function buildDuePressureInsight(report: ExtendedAnalyticsReport): AnalyticsInsightCard {
  const due = report.dueToday ?? 0;
  
  if (due === 0) {
    return {
      id: "due-pressure",
      title: "复习压力轻松",
      description: "今天没有积压的待复习内容，可以安心学习新词或进行扩展阅读。",
      severity: "positive"
    };
  }

  if (due > 100) {
    return {
      id: "due-pressure",
      title: "复习压力较大",
      description: `今日有 ${due} 个词待复习，建议分批进行，先清理复习任务再学新词。`,
      severity: "warning"
    };
  }

  return {
    id: "due-pressure",
    title: "复习任务适中",
    description: `今日待复习 ${due} 词，保持当前节奏，记忆曲线正在稳固。`,
    severity: "neutral"
  };
}

function buildFocusBookInsight(report: ExtendedAnalyticsReport): AnalyticsInsightCard {
  const books = report.bookProgress ?? [];
  const activeBooks = books.filter(b => b.progressPercent > 0);
  
  if (activeBooks.length === 0) {
    return {
      id: "focus-book",
      title: "尚未开始词书",
      description: "您还没有开始任何词书的学习，去资源中心挑选一本感兴趣的词书吧。",
      severity: "neutral"
    };
  }

  const focusBook = [...activeBooks].sort((a, b) => b.dueToday - a.dueToday)[0];
  
  return {
    id: "focus-book",
    title: `聚焦：${focusBook.bookName}`,
    description: `当前进度 ${focusBook.progressPercent}%，今日待复习 ${focusBook.dueToday} 词，继续攻克它！`,
    severity: "positive"
  };
}

export function generateAnalyticsInsights(report: ExtendedAnalyticsReport): AnalyticsInsightCard[] {
  return [
    buildStreakInsight(report),
    buildDuePressureInsight(report),
    buildFocusBookInsight(report)
  ];
}

/**
 * 学习分析统计工具
 */

export interface LearningStats {
  totalStudyTime: number; // 总学习时长（分钟）
  documentsCreated: number; // 创建的文档数
  documentsEdited: number; // 编辑的文档数
  quizzesCompleted: number; // 完成的练习数
  quizzesCorrect: number; // 正确的练习数
  knowledgePoints: KnowledgePoint[];
  dailyActivity: DailyActivity[];
}

export interface KnowledgePoint {
  name: string;
  mastery: number; // 0-100
  category: string;
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  studyTime: number; // 分钟
  activities: number; // 活动次数
}

export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalStudyTime: number;
  avgDailyTime: number;
  topKnowledgePoints: KnowledgePoint[];
  achievements: string[];
  suggestions: string[];
}

/**
 * 生成模拟学习数据（实际应用中从数据库获取）
 */
export function generateMockStats(): LearningStats {
  const now = new Date();
  const dailyActivity: DailyActivity[] = [];

  // 生成过去30天的活动数据
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // 模拟学习时长（0-180分钟）
    const studyTime = Math.floor(Math.random() * 180);
    const activities = studyTime > 0 ? Math.floor(Math.random() * 10) + 1 : 0;

    dailyActivity.push({
      date: dateStr,
      studyTime,
      activities,
    });
  }

  const knowledgePoints: KnowledgePoint[] = [
    { name: 'React Hooks', mastery: 85, category: '前端开发' },
    { name: 'TypeScript', mastery: 78, category: '编程语言' },
    { name: '算法设计', mastery: 65, category: '计算机科学' },
    { name: '数据结构', mastery: 72, category: '计算机科学' },
    { name: 'Node.js', mastery: 80, category: '后端开发' },
    { name: 'CSS布局', mastery: 90, category: '前端开发' },
  ];

  return {
    totalStudyTime: dailyActivity.reduce((sum, day) => sum + day.studyTime, 0),
    documentsCreated: Math.floor(Math.random() * 50) + 20,
    documentsEdited: Math.floor(Math.random() * 100) + 50,
    quizzesCompleted: Math.floor(Math.random() * 80) + 30,
    quizzesCorrect: Math.floor(Math.random() * 60) + 20,
    knowledgePoints,
    dailyActivity,
  };
}

/**
 * 生成周报
 */
export function generateWeeklyReport(stats: LearningStats): WeeklyReport {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 7);

  const weekData = stats.dailyActivity.slice(-7);
  const totalStudyTime = weekData.reduce((sum, day) => sum + day.studyTime, 0);
  const avgDailyTime = Math.round(totalStudyTime / 7);

  const topKnowledgePoints = [...stats.knowledgePoints]
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, 3);

  const achievements: string[] = [];
  if (totalStudyTime > 600) achievements.push('本周学习超过10小时');
  if (avgDailyTime > 60) achievements.push('保持每日学习习惯');
  if (stats.quizzesCorrect / stats.quizzesCompleted > 0.8) {
    achievements.push('练习正确率超过80%');
  }

  const suggestions: string[] = [];
  if (avgDailyTime < 30) suggestions.push('建议增加每日学习时间');
  const weakPoints = stats.knowledgePoints.filter(kp => kp.mastery < 70);
  if (weakPoints.length > 0) {
    suggestions.push(`重点关注：${weakPoints.map(kp => kp.name).join('、')}`);
  }

  return {
    weekStart: weekStart.toISOString().split('T')[0],
    weekEnd: now.toISOString().split('T')[0],
    totalStudyTime,
    avgDailyTime,
    topKnowledgePoints,
    achievements,
    suggestions,
  };
}

/**
 * 格式化学习时长
 */
export function formatStudyTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? mins + '分钟' : ''}`;
  }
  return `${mins}分钟`;
}

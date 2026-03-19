/**
 * AI 洞察生成器
 * 基于学习数据生成智能洞察和建议
 */

import type {
  AIInsights,
  LearningPattern,
  Recommendation,
  Prediction,
  Anomaly,
  Comparison,
  TimeAnalysis,
  EfficiencyAnalysis,
  HabitAnalysis,
  KnowledgeMasteryAnalysis,
} from './analytics-types';
import type { LearningSession } from './learning-session';

/**
 * 生成 AI 洞察
 */
export function generateAIInsights(
  sessions: LearningSession[],
  timeAnalysis: TimeAnalysis,
  efficiencyAnalysis: EfficiencyAnalysis,
  habitAnalysis: HabitAnalysis,
  knowledgeAnalysis: KnowledgeMasteryAnalysis,
  historicalData?: any
): AIInsights {
  const patterns = discoverLearningPatterns(
    sessions,
    timeAnalysis,
    habitAnalysis
  );

  const recommendations = generateRecommendations(
    efficiencyAnalysis,
    habitAnalysis,
    knowledgeAnalysis
  );

  const predictions = generatePredictions(
    timeAnalysis,
    knowledgeAnalysis,
    habitAnalysis
  );

  const anomalies = detectAnomalies(
    sessions,
    timeAnalysis,
    efficiencyAnalysis
  );

  const comparisons = generateComparisons(
    timeAnalysis,
    efficiencyAnalysis,
    historicalData
  );

  return {
    patterns,
    recommendations,
    predictions,
    anomalies,
    comparisons,
  };
}

/**
 * 发现学习模式
 */
function discoverLearningPatterns(
  sessions: LearningSession[],
  timeAnalysis: TimeAnalysis,
  habitAnalysis: HabitAnalysis
): LearningPattern[] {
  const patterns: LearningPattern[] = [];

  // 时间模式
  if (habitAnalysis.bestStudyTime.efficiency > 70) {
    patterns.push({
      id: 'time-pattern-1',
      type: 'time',
      title: '最佳学习时段',
      description: `你在${getPeriodName(habitAnalysis.bestStudyTime.period)}的学习效率最高（${habitAnalysis.bestStudyTime.efficiency}%），建议在这个时段安排重要的学习任务。`,
      confidence: 85,
      impact: 'high',
      discoveredAt: new Date().toISOString(),
    });
  }

  // 学习节奏模式
  if (habitAnalysis.studyRhythm.consistency >= 70) {
    patterns.push({
      id: 'behavior-pattern-1',
      type: 'behavior',
      title: '稳定的学习习惯',
      description: `你的学习一致性达到 ${habitAnalysis.studyRhythm.consistency}%，保持了良好的学习节奏。`,
      confidence: 90,
      impact: 'high',
      discoveredAt: new Date().toISOString(),
    });
  } else if (habitAnalysis.studyRhythm.pattern === 'weekend-warrior') {
    patterns.push({
      id: 'behavior-pattern-2',
      type: 'behavior',
      title: '周末学习模式',
      description: '你倾向于在周末集中学习，建议在工作日也保持一定的学习频率以提高知识保持率。',
      confidence: 80,
      impact: 'medium',
      discoveredAt: new Date().toISOString(),
    });
  } else if (habitAnalysis.studyRhythm.pattern === 'night-owl') {
    patterns.push({
      id: 'behavior-pattern-3',
      type: 'behavior',
      title: '夜间学习模式',
      description: '你经常在夜间学习，注意保证充足的睡眠，避免影响学习效果。',
      confidence: 75,
      impact: 'medium',
      discoveredAt: new Date().toISOString(),
    });
  }

  // 效率模式
  if (timeAnalysis.daily.trend === 'increasing') {
    patterns.push({
      id: 'efficiency-pattern-1',
      type: 'efficiency',
      title: '学习时长增长',
      description: `你的学习时长呈上升趋势，增长了 ${timeAnalysis.daily.trendPercentage}%，保持这个势头！`,
      confidence: 85,
      impact: 'high',
      discoveredAt: new Date().toISOString(),
    });
  }

  // 连续学习模式
  if (habitAnalysis.streakAnalysis.current >= 7) {
    patterns.push({
      id: 'behavior-pattern-4',
      type: 'behavior',
      title: '连续学习成就',
      description: `你已经连续学习 ${habitAnalysis.streakAnalysis.current} 天，这是培养长期习惯的关键时期。`,
      confidence: 95,
      impact: 'high',
      discoveredAt: new Date().toISOString(),
    });
  }

  return patterns;
}

/**
 * 生成个性化建议
 */
function generateRecommendations(
  efficiencyAnalysis: EfficiencyAnalysis,
  habitAnalysis: HabitAnalysis,
  knowledgeAnalysis: KnowledgeMasteryAnalysis
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // 时间管理建议
  if (efficiencyAnalysis.avgSessionLength < 25) {
    recommendations.push({
      id: 'rec-time-1',
      category: 'time-management',
      priority: 'high',
      title: '延长学习时长',
      description: '你的平均学习时长较短，建议使用番茄工作法，每次专注学习 25-50 分钟。',
      actionItems: [
        '设置 25 分钟的专注计时器',
        '消除学习环境中的干扰因素',
        '完成一个番茄钟后休息 5 分钟',
      ],
      expectedImpact: '提高学习效率 30-40%',
      reasoning: '研究表明，25-50 分钟是最佳的专注学习时长。',
    });
  }

  // 学习方法建议
  if (efficiencyAnalysis.focusScore < 60) {
    recommendations.push({
      id: 'rec-method-1',
      category: 'study-method',
      priority: 'high',
      title: '提高专注度',
      description: `你的专注度评分为 ${efficiencyAnalysis.focusScore}，建议优化学习环境和方法。`,
      actionItems: [
        '选择安静的学习环境',
        '关闭手机通知',
        '使用白噪音或专注音乐',
        '采用主动学习法（做笔记、提问、总结）',
      ],
      expectedImpact: '专注度提升 20-30%',
      reasoning: '专注度是学习效率的关键因素。',
    });
  }

  // 知识点建议
  if (knowledgeAnalysis.weakPoints.length > 0) {
    const weakPoint = knowledgeAnalysis.weakPoints[0];
    recommendations.push({
      id: 'rec-knowledge-1',
      category: 'knowledge-focus',
      priority: 'high',
      title: '重点突破薄弱知识点',
      description: `${weakPoint.name} 的掌握度仅为 ${weakPoint.mastery}%，建议重点加强。`,
      actionItems: [
        `复习 ${weakPoint.name} 的基础概念`,
        '完成相关练习题',
        '寻找实际应用场景',
        '向他人讲解以加深理解',
      ],
      expectedImpact: '知识掌握度提升 15-25%',
      reasoning: weakPoint.reason,
    });
  }

  // 习惯养成建议
  if (habitAnalysis.studyRhythm.consistency < 50) {
    recommendations.push({
      id: 'rec-habit-1',
      category: 'habit-building',
      priority: 'high',
      title: '建立稳定的学习习惯',
      description: `你的学习一致性为 ${habitAnalysis.studyRhythm.consistency}%，建议建立固定的学习时间。`,
      actionItems: [
        '每天在固定时间学习',
        '从每天 15 分钟开始',
        '使用习惯追踪工具',
        '设置学习提醒',
      ],
      expectedImpact: '学习一致性提升 30-40%',
      reasoning: '固定的学习时间有助于形成自动化习惯。',
    });
  }

  // 完成率建议
  if (efficiencyAnalysis.completionRate < 70) {
    recommendations.push({
      id: 'rec-method-2',
      category: 'study-method',
      priority: 'medium',
      title: '提高任务完成率',
      description: `你的任务完成率为 ${efficiencyAnalysis.completionRate}%，建议优化任务规划。`,
      actionItems: [
        '将大任务分解为小任务',
        '设置可实现的每日目标',
        '使用任务清单',
        '及时调整不合理的计划',
      ],
      expectedImpact: '完成率提升 20-30%',
      reasoning: '合理的任务规划能显著提高完成率。',
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * 生成预测分析
 */
function generatePredictions(
  timeAnalysis: TimeAnalysis,
  knowledgeAnalysis: KnowledgeMasteryAnalysis,
  habitAnalysis: HabitAnalysis
): Prediction[] {
  const predictions: Prediction[] = [];

  // 目标达成预测
  if (timeAnalysis.daily.trend === 'increasing') {
    predictions.push({
      id: 'pred-goal-1',
      type: 'goal-achievement',
      title: '月度学习目标',
      prediction: '按照当前趋势，你有 85% 的可能性达成本月学习目标。',
      confidence: 85,
      timeframe: '本月',
      factors: [
        `学习时长增长 ${timeAnalysis.daily.trendPercentage}%`,
        `当前连续学习 ${habitAnalysis.streakAnalysis.current} 天`,
      ],
    });
  }

  // 知识掌握预测
  const improvingPoints = knowledgeAnalysis.byKnowledgePoint.filter(
    kp => kp.trend === 'improving'
  );
  if (improvingPoints.length > 0) {
    predictions.push({
      id: 'pred-knowledge-1',
      type: 'knowledge-mastery',
      title: '知识点掌握预测',
      prediction: `预计在 2 周内，你将完全掌握 ${improvingPoints.length} 个正在进步的知识点。`,
      confidence: 75,
      timeframe: '2 周',
      factors: [
        `${improvingPoints.length} 个知识点呈上升趋势`,
        `平均掌握度 ${Math.round(improvingPoints.reduce((sum, p) => sum + p.mastery, 0) / improvingPoints.length)}%`,
      ],
    });
  }

  // 学习时长预测
  if (habitAnalysis.studyRhythm.consistency >= 70) {
    const projectedTime = Math.round(
      timeAnalysis.daily.average * 30 * (1 + timeAnalysis.daily.trendPercentage / 100)
    );
    predictions.push({
      id: 'pred-time-1',
      type: 'time-estimate',
      title: '下月学习时长预测',
      prediction: `基于当前学习习惯，预计下月学习时长约 ${Math.round(projectedTime / 60)} 小时。`,
      confidence: 80,
      timeframe: '下月',
      factors: [
        `学习一致性 ${habitAnalysis.studyRhythm.consistency}%`,
        `日均学习 ${timeAnalysis.daily.average} 分钟`,
      ],
    });
  }

  return predictions;
}

/**
 * 检测异常
 */
function detectAnomalies(
  sessions: LearningSession[],
  timeAnalysis: TimeAnalysis,
  efficiencyAnalysis: EfficiencyAnalysis
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // 学习时长异常下降
  if (timeAnalysis.daily.trend === 'decreasing' && timeAnalysis.daily.trendPercentage > 30) {
    anomalies.push({
      id: 'anom-time-1',
      type: 'time',
      severity: 'high',
      title: '学习时长显著下降',
      description: `你的学习时长下降了 ${timeAnalysis.daily.trendPercentage}%，可能影响学习进度。`,
      detectedAt: new Date().toISOString(),
      suggestion: '检查是否有外部因素影响学习，调整学习计划以恢复正常节奏。',
    });
  }

  // 效率异常
  if (efficiencyAnalysis.focusScore < 40) {
    anomalies.push({
      id: 'anom-efficiency-1',
      type: 'efficiency',
      severity: 'high',
      title: '专注度过低',
      description: `你的专注度评分仅为 ${efficiencyAnalysis.focusScore}，远低于正常水平。`,
      detectedAt: new Date().toISOString(),
      suggestion: '优化学习环境，减少干扰因素，考虑调整学习时间段。',
    });
  }

  // 完成率异常
  if (efficiencyAnalysis.completionRate < 50) {
    anomalies.push({
      id: 'anom-performance-1',
      type: 'performance',
      severity: 'medium',
      title: '任务完成率偏低',
      description: `你的任务完成率为 ${efficiencyAnalysis.completionRate}%，建议调整学习计划。`,
      detectedAt: new Date().toISOString(),
      suggestion: '降低任务难度或减少任务量，设置更合理的学习目标。',
    });
  }

  return anomalies;
}

/**
 * 生成对比分析
 */
function generateComparisons(
  timeAnalysis: TimeAnalysis,
  efficiencyAnalysis: EfficiencyAnalysis,
  historicalData?: any
): Comparison[] {
  const comparisons: Comparison[] = [];

  // 如果没有历史数据，返回空数组
  if (!historicalData) {
    return comparisons;
  }

  // 学习时长对比
  if (historicalData.avgDailyTime) {
    const current = timeAnalysis.daily.average;
    const previous = historicalData.avgDailyTime;
    const change = current - previous;
    const changePercentage = previous > 0 ? (change / previous) * 100 : 0;

    comparisons.push({
      id: 'comp-time-1',
      metric: '日均学习时长',
      current,
      previous,
      change,
      changePercentage: Math.round(changePercentage),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      interpretation: change > 0
        ? `学习时长增加了 ${Math.abs(Math.round(changePercentage))}%，保持良好势头`
        : change < 0
        ? `学习时长减少了 ${Math.abs(Math.round(changePercentage))}%，需要调整计划`
        : '学习时长保持稳定',
    });
  }

  // 专注度对比
  if (historicalData.focusScore) {
    const current = efficiencyAnalysis.focusScore;
    const previous = historicalData.focusScore;
    const change = current - previous;
    const changePercentage = previous > 0 ? (change / previous) * 100 : 0;

    comparisons.push({
      id: 'comp-efficiency-1',
      metric: '专注度评分',
      current,
      previous,
      change,
      changePercentage: Math.round(changePercentage),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      interpretation: change > 0
        ? `专注度提升了 ${Math.abs(Math.round(changePercentage))}%，学习效率提高`
        : change < 0
        ? `专注度下降了 ${Math.abs(Math.round(changePercentage))}%，需要改善学习环境`
        : '专注度保持稳定',
    });
  }

  // 完成率对比
  if (historicalData.completionRate) {
    const current = efficiencyAnalysis.completionRate;
    const previous = historicalData.completionRate;
    const change = current - previous;
    const changePercentage = previous > 0 ? (change / previous) * 100 : 0;

    comparisons.push({
      id: 'comp-performance-1',
      metric: '任务完成率',
      current,
      previous,
      change,
      changePercentage: Math.round(changePercentage),
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
      interpretation: change > 0
        ? `完成率提升了 ${Math.abs(Math.round(changePercentage))}%，执行力增强`
        : change < 0
        ? `完成率下降了 ${Math.abs(Math.round(changePercentage))}%，需要优化任务规划`
        : '完成率保持稳定',
    });
  }

  return comparisons;
}

// ==================== 辅助函数 ====================

function getPeriodName(period: 'morning' | 'afternoon' | 'evening' | 'night'): string {
  const names = {
    morning: '上午',
    afternoon: '下午',
    evening: '晚上',
    night: '深夜',
  };
  return names[period];
}

/**
 * 生成简短洞察（用于卡片展示）
 */
export function generateQuickInsights(
  timeAnalysis: TimeAnalysis,
  efficiencyAnalysis: EfficiencyAnalysis,
  habitAnalysis: HabitAnalysis
): string[] {
  const insights: string[] = [];

  // 时间洞察
  if (timeAnalysis.daily.trend === 'increasing') {
    insights.push(`学习时长增长 ${timeAnalysis.daily.trendPercentage}%，保持这个势头！`);
  }

  // 习惯洞察
  if (habitAnalysis.streakAnalysis.current >= 7) {
    insights.push(`已连续学习 ${habitAnalysis.streakAnalysis.current} 天，坚持得很好！`);
  }

  // 效率洞察
  if (efficiencyAnalysis.focusScore >= 80) {
    insights.push(`专注度达到 ${efficiencyAnalysis.focusScore}%，学习效率很高！`);
  } else if (efficiencyAnalysis.focusScore < 60) {
    insights.push(`专注度 ${efficiencyAnalysis.focusScore}%，建议优化学习环境`);
  }

  // 最佳时段洞察
  const period = getPeriodName(habitAnalysis.bestStudyTime.period);
  insights.push(`你在${period}的学习效率最高`);

  return insights;
}

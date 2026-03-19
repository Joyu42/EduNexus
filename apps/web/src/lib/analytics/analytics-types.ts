/**
 * 高级分析系统类型定义
 */

// ==================== 基础类型 ====================

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;
}

// ==================== 学习行为分析 ====================

export interface LearningBehaviorAnalysis {
  timeAnalysis: TimeAnalysis;
  efficiencyAnalysis: EfficiencyAnalysis;
  habitAnalysis: HabitAnalysis;
  knowledgeMasteryAnalysis: KnowledgeMasteryAnalysis;
  pathAnalysis: PathAnalysis;
}

export interface TimeAnalysis {
  daily: {
    average: number; // 分钟
    total: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    trendPercentage: number;
  };
  weekly: {
    average: number;
    total: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  };
  monthly: {
    average: number;
    total: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  };
  peakHours: Array<{
    hour: number;
    duration: number;
    efficiency: number;
  }>;
}

export interface EfficiencyAnalysis {
  focusScore: number; // 0-100 专注度评分
  completionRate: number; // 0-100 完成率
  avgSessionLength: number; // 分钟
  productivityIndex: number; // 0-100 生产力指数
  distractionRate: number; // 0-100 分心率
}

export interface HabitAnalysis {
  bestStudyTime: {
    period: 'morning' | 'afternoon' | 'evening' | 'night';
    hours: number[];
    efficiency: number;
  };
  studyRhythm: {
    consistency: number; // 0-100
    pattern: 'regular' | 'irregular' | 'weekend-warrior' | 'night-owl';
    preferredDuration: number; // 分钟
  };
  streakAnalysis: {
    current: number;
    longest: number;
    average: number;
  };
}

export interface KnowledgeMasteryAnalysis {
  overall: number; // 0-100
  byCategory: Array<{
    category: string;
    mastery: number;
    knowledgePoints: number;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  byKnowledgePoint: Array<{
    id: string;
    name: string;
    category: string;
    mastery: number;
    practiceCount: number;
    lastPracticed: string;
    trend: 'improving' | 'stable' | 'declining';
  }>;
  weakPoints: Array<{
    name: string;
    mastery: number;
    reason: string;
  }>;
  strongPoints: Array<{
    name: string;
    mastery: number;
  }>;
}

export interface PathAnalysis {
  completionRate: number; // 0-100
  onTrack: boolean;
  bottlenecks: Array<{
    nodeId: string;
    nodeName: string;
    difficulty: number;
    timeSpent: number;
    expectedTime: number;
  }>;
  milestones: Array<{
    name: string;
    completed: boolean;
    completedAt?: string;
  }>;
}

// ==================== AI 洞察 ====================

export interface AIInsights {
  patterns: LearningPattern[];
  recommendations: Recommendation[];
  predictions: Prediction[];
  anomalies: Anomaly[];
  comparisons: Comparison[];
}

export interface LearningPattern {
  id: string;
  type: 'time' | 'efficiency' | 'knowledge' | 'behavior';
  title: string;
  description: string;
  confidence: number; // 0-100
  impact: 'high' | 'medium' | 'low';
  discoveredAt: string;
}

export interface Recommendation {
  id: string;
  category: 'time-management' | 'study-method' | 'knowledge-focus' | 'habit-building';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  expectedImpact: string;
  reasoning: string;
}

export interface Prediction {
  id: string;
  type: 'goal-achievement' | 'knowledge-mastery' | 'time-estimate';
  title: string;
  prediction: string;
  confidence: number; // 0-100
  timeframe: string;
  factors: string[];
}

export interface Anomaly {
  id: string;
  type: 'time' | 'efficiency' | 'performance';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  detectedAt: string;
  suggestion: string;
}

export interface Comparison {
  id: string;
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
  interpretation: string;
}

// ==================== 报告类型 ====================

export interface DailyReport {
  date: string;
  summary: {
    studyTime: number;
    activitiesCompleted: number;
    focusScore: number;
    topActivity: string;
  };
  activities: Array<{
    type: string;
    duration: number;
    completed: boolean;
  }>;
  achievements: string[];
  insights: string[];
  tomorrow: {
    suggestions: string[];
    goals: string[];
  };
}

export interface WeeklyReport {
  period: DateRange;
  weekNumber: number;
  summary: {
    totalStudyTime: number;
    avgDailyTime: number;
    totalSessions: number;
    focusScore: number;
    completionRate: number;
  };
  dailyBreakdown: Array<{
    date: string;
    studyTime: number;
    activities: number;
    focusScore: number;
  }>;
  topActivities: Array<{
    type: string;
    duration: number;
    percentage: number;
  }>;
  knowledgeProgress: Array<{
    name: string;
    mastery: number;
    change: number;
  }>;
  achievements: string[];
  insights: string[];
  suggestions: string[];
  nextWeek: {
    goals: string[];
    focus: string[];
  };
}

export interface MonthlyReport {
  period: DateRange;
  month: string;
  summary: {
    totalStudyTime: number;
    avgDailyTime: number;
    totalSessions: number;
    focusScore: number;
    completionRate: number;
    knowledgePointsMastered: number;
  };
  weeklyTrend: Array<{
    week: number;
    studyTime: number;
    activities: number;
    focusScore: number;
  }>;
  topActivities: Array<{
    type: string;
    duration: number;
    percentage: number;
  }>;
  knowledgeMastery: Array<{
    name: string;
    category: string;
    mastery: number;
    change: number;
  }>;
  milestones: string[];
  achievements: string[];
  insights: string[];
  recommendations: string[];
  nextMonth: {
    goals: string[];
    focus: string[];
  };
}

export interface YearlyReport {
  year: number;
  summary: {
    totalStudyTime: number;
    avgDailyTime: number;
    totalSessions: number;
    knowledgePointsMastered: number;
    longestStreak: number;
  };
  monthlyTrend: Array<{
    month: string;
    studyTime: number;
    activities: number;
  }>;
  topCategories: Array<{
    category: string;
    duration: number;
    percentage: number;
  }>;
  yearHighlights: string[];
  achievements: string[];
  growth: {
    areas: string[];
    improvements: string[];
  };
  nextYear: {
    goals: string[];
    recommendations: string[];
  };
}

export interface CustomReport {
  period: DateRange;
  metrics: string[];
  data: Record<string, any>;
  charts: Array<{
    type: string;
    data: any;
  }>;
}

// ==================== 数据导出 ====================

export interface ExportOptions {
  format: 'json' | 'csv' | 'pdf' | 'image';
  dateRange: DateRange;
  metrics: string[];
  includeCharts: boolean;
  includeInsights: boolean;
}

export interface ExportResult {
  success: boolean;
  format: string;
  filename: string;
  data?: any;
  url?: string;
  error?: string;
}

// ==================== 分享 ====================

export interface ShareOptions {
  reportType: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  reportId: string;
  privacy: 'public' | 'private' | 'unlisted';
  expiresIn?: number; // 小时
  includePersonalInfo: boolean;
}

export interface ShareResult {
  success: boolean;
  shareUrl?: string;
  shareId?: string;
  expiresAt?: string;
  error?: string;
}

// ==================== 图表数据 ====================

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'radar' | 'heatmap' | 'funnel' | 'scatter';
  title: string;
  data: any;
  options?: any;
}

export interface HeatmapData {
  date: string;
  hour: number;
  value: number;
  intensity: number; // 0-1
}

export interface FunnelData {
  stage: string;
  value: number;
  percentage: number;
  dropoff?: number;
}

// ==================== 仪表板 ====================

export interface DashboardConfig {
  widgets: DashboardWidget[];
  layout: 'grid' | 'masonry';
  refreshInterval?: number; // 秒
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'stat' | 'insight' | 'achievement' | 'goal';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  data: any;
  config?: any;
}

// ==================== 统计指标 ====================

export interface AnalyticsMetrics {
  studyTime: {
    total: number;
    average: number;
    max: number;
    min: number;
  };
  frequency: {
    studyDays: number;
    consecutiveDays: number;
    longestStreak: number;
  };
  completion: {
    goalCompletionRate: number;
    pathCompletionRate: number;
    practiceCompletionRate: number;
  };
  accuracy: {
    practiceAccuracy: number;
    testAccuracy: number;
    overallAccuracy: number;
  };
  knowledge: {
    pointsMastered: number;
    averageMastery: number;
    categoriesCovered: number;
  };
  efficiency: {
    studyEfficiency: number; // 单位时间学习量
    focusTime: number;
    breakTime: number;
  };
}

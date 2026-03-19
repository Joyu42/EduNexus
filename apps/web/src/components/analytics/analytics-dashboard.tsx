"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Clock,
  Target,
  Award,
  Download,
  Share2,
  Calendar,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LearningChart } from "./learning-chart";
import { ActivityHeatmap } from "./activity-heatmap";
import { AIInsightsPanel } from "./ai-insights-panel";
import type {
  LearningBehaviorAnalysis,
  AIInsights,
  AnalyticsMetrics,
} from "@/lib/analytics/analytics-types";

interface AnalyticsDashboardProps {
  userId?: string;
}

export function AnalyticsDashboard({ userId }: AnalyticsDashboardProps) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [loading, setLoading] = useState(true);
  const [behaviorAnalysis, setBehaviorAnalysis] = useState<LearningBehaviorAnalysis | null>(null);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [period]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      // 加载统计数据
      const statsRes = await fetch(`/api/analytics/stats?range=${period}`);
      const statsData = await statsRes.json();

      if (statsData.success) {
        setBehaviorAnalysis(statsData.data.behaviorAnalysis);
        setMetrics(statsData.data.metrics);
      }

      // 加载 AI 洞察
      const insightsRes = await fetch(`/api/analytics/insights?range=${period}`);
      const insightsData = await insightsRes.json();

      if (insightsData.success) {
        setInsights(insightsData.data);
      }
    } catch (error) {
      console.error("加载分析数据失败:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "json" | "csv" | "text") => {
    try {
      const res = await fetch("/api/analytics/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          reportType: period === "week" ? "weekly" : "monthly",
          dateRange: { start: new Date(), end: new Date() },
        }),
      });

      const data = await res.json();

      if (data.success) {
        // 创建下载链接
        const blob = new Blob([data.data.data], {
          type: format === "json" ? "application/json" : "text/plain",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.data.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("导出失败:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
          <p className="text-muted-foreground">加载分析数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-orange-500" />
            学习分析仪表板
          </h2>
          <p className="text-muted-foreground mt-1">
            深入了解你的学习行为和进度
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport("text")}>
            <Download className="h-4 w-4 mr-2" />
            导出报告
          </Button>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            分享
          </Button>
        </div>
      </div>

      {/* 周期选择 */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as "week" | "month")}>
        <TabsList>
          <TabsTrigger value="week">
            <Calendar className="h-4 w-4 mr-2" />
            本周
          </TabsTrigger>
          <TabsTrigger value="month">
            <Calendar className="h-4 w-4 mr-2" />
            本月
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 关键指标卡片 */}
      {behaviorAnalysis && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                学习时长
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(behaviorAnalysis.timeAnalysis.daily.total / 60)}h
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                日均 {behaviorAnalysis.timeAnalysis.daily.average} 分钟
              </p>
              <div className="flex items-center gap-1 mt-2">
                {behaviorAnalysis.timeAnalysis.daily.trend === "increasing" ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : null}
                <span className="text-xs text-green-600">
                  {behaviorAnalysis.timeAnalysis.daily.trendPercentage > 0
                    ? `+${behaviorAnalysis.timeAnalysis.daily.trendPercentage}%`
                    : ""}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                专注度
              </CardTitle>
              <Zap className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {behaviorAnalysis.efficiencyAnalysis.focusScore}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                完成率 {behaviorAnalysis.efficiencyAnalysis.completionRate}%
              </p>
              <Badge
                variant={
                  behaviorAnalysis.efficiencyAnalysis.focusScore >= 80
                    ? "default"
                    : "secondary"
                }
                className="mt-2"
              >
                {behaviorAnalysis.efficiencyAnalysis.focusScore >= 80
                  ? "优秀"
                  : behaviorAnalysis.efficiencyAnalysis.focusScore >= 60
                  ? "良好"
                  : "需改进"}
              </Badge>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                学习习惯
              </CardTitle>
              <Target className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {behaviorAnalysis.habitAnalysis.studyRhythm.consistency}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                连续 {behaviorAnalysis.habitAnalysis.streakAnalysis.current} 天
              </p>
              <Badge variant="outline" className="mt-2">
                {behaviorAnalysis.habitAnalysis.studyRhythm.pattern === "regular"
                  ? "规律学习"
                  : behaviorAnalysis.habitAnalysis.studyRhythm.pattern === "weekend-warrior"
                  ? "周末学习"
                  : behaviorAnalysis.habitAnalysis.studyRhythm.pattern === "night-owl"
                  ? "夜间学习"
                  : "不规律"}
              </Badge>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                知识掌握
              </CardTitle>
              <Award className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {behaviorAnalysis.knowledgeMasteryAnalysis.overall}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {behaviorAnalysis.knowledgeMasteryAnalysis.byKnowledgePoint.length} 个知识点
              </p>
              <div className="flex gap-1 mt-2">
                <Badge variant="default" className="text-xs">
                  强项 {behaviorAnalysis.knowledgeMasteryAnalysis.strongPoints.length}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  弱项 {behaviorAnalysis.knowledgeMasteryAnalysis.weakPoints.length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 图表区域 */}
        <div className="lg:col-span-2 space-y-6">
          {behaviorAnalysis && (
            <>
              <LearningChart
                stats={{
                  totalStudyTime: behaviorAnalysis.timeAnalysis.daily.total,
                  documentsCreated: 0,
                  documentsEdited: 0,
                  quizzesCompleted: 0,
                  quizzesCorrect: 0,
                  knowledgePoints: behaviorAnalysis.knowledgeMasteryAnalysis.byKnowledgePoint.map(
                    (kp) => ({
                      name: kp.name,
                      mastery: kp.mastery,
                      category: kp.category,
                    })
                  ),
                  dailyActivity: [],
                }}
                period={period}
              />
              <ActivityHeatmap data={[]} />
            </>
          )}
        </div>

        {/* AI 洞察面板 */}
        <div>
          <AIInsightsPanel insights={insights || undefined} loading={loading} />
        </div>
      </div>
    </div>
  );
}

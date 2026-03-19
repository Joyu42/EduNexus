"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Clock, FileText, CheckCircle, TrendingUp, Award } from "lucide-react";
import { ActivityHeatmap } from "./activity-heatmap";
import type { WeeklyReport as WeeklyReportType } from "@/lib/analytics/report-generator";

interface WeeklyReportProps {
  date: Date;
}

export function WeeklyReport({ date }: WeeklyReportProps) {
  const [report, setReport] = useState<WeeklyReportType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 实际应用中从 API 获取数据
    // 这里使用模拟数据
    const mockReport: WeeklyReportType = {
      period: {
        start: "2026-03-03",
        end: "2026-03-09",
        weekNumber: 10,
      },
      summary: {
        totalStudyTime: 720,
        avgDailyTime: 103,
        totalSessions: 28,
        documentsCreated: 5,
        documentsEdited: 12,
        practicesCompleted: 15,
        practiceAccuracy: 82,
      },
      dailyBreakdown: [
        { date: "2026-03-03", studyTime: 90, activities: 4 },
        { date: "2026-03-04", studyTime: 120, activities: 5 },
        { date: "2026-03-05", studyTime: 105, activities: 4 },
        { date: "2026-03-06", studyTime: 95, activities: 3 },
        { date: "2026-03-07", studyTime: 110, activities: 5 },
        { date: "2026-03-08", studyTime: 100, activities: 4 },
        { date: "2026-03-09", studyTime: 100, activities: 3 },
      ],
      topActivities: [
        { type: "编辑文档", duration: 280, percentage: 39 },
        { type: "练习题目", duration: 240, percentage: 33 },
        { type: "AI 对话", duration: 150, percentage: 21 },
        { type: "创建文档", duration: 50, percentage: 7 },
      ],
      achievements: [
        "本周学习超过10小时",
        "保持每日学习习惯",
        "连续学习 7 天",
      ],
      insights: [
        "学习时长呈上升趋势，保持良好势头",
        "本周每天都有学习，坚持得很好",
      ],
      suggestions: [
        "练习正确率良好，继续保持",
        "可以尝试更多样化的学习方式",
      ],
    };

    setTimeout(() => {
      setReport(mockReport);
      setLoading(false);
    }, 500);
  }, [date]);

  if (loading || !report) {
    return <div className="text-center py-8">加载中...</div>;
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`;
  };

  const chartData = report.dailyBreakdown.map((day) => ({
    date: new Date(day.date).toLocaleDateString("zh-CN", {
      month: "numeric",
      day: "numeric",
    }),
    学习时长: day.studyTime,
    活动次数: day.activities,
  }));

  return (
    <div className="space-y-6">
      {/* 报告标题 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">
            第 {report.period.weekNumber} 周学习报告
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {report.period.start} 至 {report.period.end}
          </p>
        </CardHeader>
      </Card>

      {/* 核心指标 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总学习时长</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(report.summary.totalStudyTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              日均 {formatTime(report.summary.avgDailyTime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">文档活动</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report.summary.documentsCreated + report.summary.documentsEdited}
            </div>
            <p className="text-xs text-muted-foreground">
              创建 {report.summary.documentsCreated} / 编辑{" "}
              {report.summary.documentsEdited}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">练习完成</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report.summary.practicesCompleted}
            </div>
            <p className="text-xs text-muted-foreground">
              正确率 {report.summary.practiceAccuracy}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">学习会话</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.summary.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              日均 {Math.round(report.summary.totalSessions / 7)} 次
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 学习趋势图 */}
      <Card>
        <CardHeader>
          <CardTitle>每日学习时长</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="学习时长"
                stroke="hsl(15, 86%, 65%)"
                strokeWidth={2}
                dot={{ fill: "hsl(15, 86%, 65%)", r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 活动分布 */}
      <Card>
        <CardHeader>
          <CardTitle>学习活动分布</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {report.topActivities.map((activity, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{activity.type}</span>
                  <span className="text-muted-foreground">
                    {formatTime(activity.duration)} ({activity.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${activity.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 成就和洞察 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              本周成就
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {report.achievements.map((achievement, index) => (
                <Badge key={index} variant="secondary" className="mr-2">
                  {achievement}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>学习洞察</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {report.insights.map((insight, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 学习建议 */}
      <Card>
        <CardHeader>
          <CardTitle>学习建议</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {report.suggestions.map((suggestion, index) => (
              <li key={index} className="text-sm flex items-start gap-2">
                <span className="text-primary mt-1">→</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

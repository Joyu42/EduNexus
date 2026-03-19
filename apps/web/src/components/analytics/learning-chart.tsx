"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LearningStats, DailyActivity, KnowledgePoint } from "@/lib/analytics/stats";

interface LearningChartProps {
  stats: LearningStats;
  period: "week" | "month";
}

const COLORS = {
  primary: "hsl(15, 86%, 65%)",
  accent: "hsl(35, 100%, 70%)",
  success: "hsl(142, 71%, 45%)",
  warning: "hsl(38, 92%, 50%)",
  info: "hsl(199, 89%, 48%)",
  muted: "hsl(215, 16%, 47%)",
};

const PIE_COLORS = [
  COLORS.primary,
  COLORS.accent,
  COLORS.success,
  COLORS.info,
  COLORS.warning,
  COLORS.muted,
];

export function LearningChart({ stats, period }: LearningChartProps) {
  // 根据周期过滤数据
  const filteredData = period === "week"
    ? stats.dailyActivity.slice(-7)
    : stats.dailyActivity;

  // 准备趋势图数据
  const trendData = filteredData.map((day) => ({
    date: new Date(day.date).toLocaleDateString("zh-CN", {
      month: "numeric",
      day: "numeric",
    }),
    学习时长: Math.round(day.studyTime),
    活动次数: day.activities,
  }));

  // 准备雷达图数据
  const radarData = stats.knowledgePoints.map((kp) => ({
    subject: kp.name,
    掌握度: kp.mastery,
    fullMark: 100,
  }));

  // 准备饼图数据
  const categoryMap = new Map<string, number>();
  stats.knowledgePoints.forEach((kp) => {
    const current = categoryMap.get(kp.category) || 0;
    categoryMap.set(kp.category, current + 1);
  });
  const pieData = Array.from(categoryMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  // 计算正确率
  const correctRate = stats.quizzesCompleted > 0
    ? Math.round((stats.quizzesCorrect / stats.quizzesCompleted) * 100)
    : 0;

  const quizData = [
    { name: "正确", value: stats.quizzesCorrect, color: COLORS.success },
    {
      name: "错误",
      value: stats.quizzesCompleted - stats.quizzesCorrect,
      color: COLORS.warning,
    },
  ];

  return (
    <Tabs defaultValue="trend" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="trend">学习趋势</TabsTrigger>
        <TabsTrigger value="mastery">知识掌握</TabsTrigger>
        <TabsTrigger value="category">学习分布</TabsTrigger>
        <TabsTrigger value="quiz">练习统计</TabsTrigger>
      </TabsList>

      <TabsContent value="trend" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">学习时长趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
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
                <Legend />
                <Line
                  type="monotone"
                  dataKey="学习时长"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  dot={{ fill: COLORS.primary, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">活动频率</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trendData}>
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
                <Bar dataKey="活动次数" fill={COLORS.accent} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="mastery">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">知识点掌握度雷达图</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="subject"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={10}
                />
                <Radar
                  name="掌握度"
                  dataKey="掌握度"
                  stroke={COLORS.primary}
                  fill={COLORS.primary}
                  fillOpacity={0.6}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="category">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">学习领域分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="quiz">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              练习正确率：{correctRate}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={quizData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) =>
                    `${name}: ${value} (${((percent || 0) * 100).toFixed(0)}%)`
                  }
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {quizData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">总练习数：</span>
                <span className="font-medium">{stats.quizzesCompleted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">正确数：</span>
                <span className="font-medium text-green-600">
                  {stats.quizzesCorrect}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">错误数：</span>
                <span className="font-medium text-orange-600">
                  {stats.quizzesCompleted - stats.quizzesCorrect}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

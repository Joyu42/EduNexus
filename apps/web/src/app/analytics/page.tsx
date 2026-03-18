"use client";

import { useMemo, useState } from "react";
import { BarChart3, Activity, BookOpen, GitFork, Users, MessageSquare, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { LoginPrompt } from "@/components/ui/login-prompt";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AnalyticsStats {
  totalSessions: number;
  totalPlans: number;
  totalSyncedPaths: number;
  totalResources: number;
  totalGroups: number;
  totalPosts: number;
  range: "7d" | "30d" | "all";
  dailySeries: Array<{
    day: string;
    sessions: number;
    plans: number;
    syncedPaths: number;
    resources: number;
    groups: number;
    posts: number;
    events: number;
  }>;
}

const COLORS = ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316'];

function StatCard({
  title,
  value,
  icon: Icon,
  colorClassName,
}: {
  title: string;
  value: number | undefined;
  icon: React.ElementType;
  colorClassName: string;
}) {
  return (
    <Card variant="glass" padding="md" className="border-violet-100/50 hover:border-violet-200 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${colorClassName} bg-opacity-10`}>
          <Icon className={`w-6 h-6 ${colorClassName.replace('bg-', 'text-')}`} />
        </div>
        <div>
          <div className="text-sm font-medium text-slate-500 mb-1">{title}</div>
          <div className="text-3xl font-bold text-slate-800">
            {value !== undefined ? value : "—"}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function AnalyticsPage() {
  const { status } = useSession();
  const [range, setRange] = useState<"7d" | "30d" | "all">("30d");

  const { data, isLoading } = useQuery<AnalyticsStats>({
    queryKey: ["analytics-stats", range],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/stats?range=${range}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      const json = await res.json();
      return (json?.data ?? {
        totalSessions: 0,
        totalPlans: 0,
        totalSyncedPaths: 0,
        totalResources: 0,
        totalGroups: 0,
        totalPosts: 0,
        range,
        dailySeries: []
      }) as AnalyticsStats;
    },
    enabled: status === "authenticated",
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "学习次数", value: data.totalSessions },
      { name: "学习计划", value: data.totalPlans },
      { name: "同步路径", value: data.totalSyncedPaths },
      { name: "公共资源", value: data.totalResources },
      { name: "学习小组", value: data.totalGroups },
      { name: "社区帖子", value: data.totalPosts },
    ];
  }, [data]);

  if (status === "unauthenticated") {
    return <LoginPrompt title="学习分析" />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">数据概览</h1>
            <p className="text-sm text-slate-500">查看平台的整体使用情况和内容增长</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="h-32 bg-slate-100 border-none" />
            ))}
          </div>
        ) : (
          <>
            <div className="flex justify-end">
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={range}
                onChange={(e) => setRange(e.target.value as "7d" | "30d" | "all")}
              >
                <option value="7d">近 7 天</option>
                <option value="30d">近 30 天</option>
                <option value="all">全部</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                title="总学习次数"
                value={data?.totalSessions}
                icon={Activity}
                colorClassName="bg-blue-500 text-blue-500"
              />
              <StatCard
                title="总学习计划"
                value={data?.totalPlans}
                icon={BookOpen}
                colorClassName="bg-violet-500 text-violet-500"
              />
              <StatCard
                title="已同步路径"
                value={data?.totalSyncedPaths}
                icon={GitFork}
                colorClassName="bg-fuchsia-500 text-fuchsia-500"
              />
              <StatCard
                title="公共资源"
                value={data?.totalResources}
                icon={Layers}
                colorClassName="bg-pink-500 text-pink-500"
              />
              <StatCard
                title="学习小组"
                value={data?.totalGroups}
                icon={Users}
                colorClassName="bg-rose-500 text-rose-500"
              />
              <StatCard
                title="社区帖子"
                value={data?.totalPosts}
                icon={MessageSquare}
                colorClassName="bg-orange-500 text-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <Card variant="glass" className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">数据分布 (条形图)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12 }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#64748b', fontSize: 12 }} 
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar 
                          dataKey="value" 
                          fill="#8b5cf6" 
                          radius={[4, 4, 0, 0]} 
                          barSize={40}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass" className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">数据占比 (环形图)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass" className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg font-medium">趋势图 ({range})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data?.dailySeries ?? []} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="posts" stroke="#f97316" strokeWidth={2} dot={false} name="帖子" />
                        <Line type="monotone" dataKey="resources" stroke="#10b981" strokeWidth={2} dot={false} name="资源" />
                        <Line type="monotone" dataKey="groups" stroke="#3b82f6" strokeWidth={2} dot={false} name="小组" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

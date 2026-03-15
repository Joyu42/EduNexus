"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Brain,
  Map,
  Users,
  Settings,
  TrendingUp,
  Activity,
  Clock,
  Target
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const router = useRouter();
  const [stats] = useState({
    totalSessions: 24,
    totalDocuments: 156,
    totalPaths: 8,
    totalStudents: 45,
    weeklyActivity: 89,
    completionRate: 72
  });

  const quickActions = [
    {
      title: "学习工作区",
      description: "开始新的学习会话",
      icon: BookOpen,
      href: "/workspace",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "知识库",
      description: "管理学习笔记和文档",
      icon: Brain,
      href: "/kb",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "学习路径",
      description: "查看和创建学习路径",
      icon: Map,
      href: "/path",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-500/10"
    },
    {
      title: "知识图谱",
      description: "可视化知识关系",
      icon: Activity,
      href: "/graph",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10"
    },
    {
      title: "配置中心",
      description: "系统设置和配置",
      icon: Settings,
      href: "/settings",
      color: "text-gray-600 dark:text-gray-400",
      bgColor: "bg-muted"
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6 relative overflow-hidden">
      {/* 装饰性背景 */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-30 dark:opacity-20 z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] bg-accent/20 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="space-y-2 animate-in">
          <h1 className="text-4xl font-bold tracking-tight gradient-text">
            总览
          </h1>
          <p className="text-muted-foreground">
            欢迎回到 EduNexus，开始你的学习之旅
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "学习会话", value: stats.totalSessions, icon: BookOpen, sub: "本周活跃会话" },
            { title: "知识文档", value: stats.totalDocuments, icon: Brain, sub: "累计创建文档" },
            { title: "学习路径", value: stats.totalPaths, icon: Map, sub: "正在进行的路径" },
            { title: "学生人数", value: stats.totalStudents, icon: Users, sub: "活跃学生数量" },
            { title: "本周活跃度", value: `${stats.weeklyActivity}%`, icon: TrendingUp, sub: "较上周 +12%", color: "text-green-500" },
            { title: "完成率", value: `${stats.completionRate}%`, icon: Target, sub: "任务完成率" },
          ].map((item, i) => (
            <Card key={i} className="glass-card hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{item.title}</CardTitle>
                <item.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{item.value}</div>
                <p className={`text-xs mt-1 ${item.color || 'text-muted-foreground'}`}>
                  {item.sub}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              快速导航
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.href}
                  variant="outline"
                  className="h-auto p-5 flex flex-col items-start gap-3 glass-card card-hover group"
                  onClick={() => router.push(action.href)}
                >
                  <div className={`p-3 rounded-xl ${action.bgColor} group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-6 w-6 ${action.color}`} />
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-lg">{action.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {action.description}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Recent Activity & Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                最近活动
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[
                  { icon: BookOpen, title: "创建了新的学习会话", time: "2 小时前", tag: "工作区", color: "bg-blue-500/10", iconColor: "text-blue-500" },
                  { icon: Brain, title: "更新了知识库文档", time: "5 小时前", tag: "知识库", color: "bg-purple-500/10", iconColor: "text-purple-500" },
                  { icon: Map, title: "完成了学习路径任务", time: "昨天", tag: "路径", color: "bg-green-500/10", iconColor: "text-green-500" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 group cursor-pointer hover:bg-muted/30 p-2 rounded-lg transition-colors">
                    <div className={`p-2.5 rounded-xl ${item.color}`}>
                      <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold group-hover:text-primary transition-colors">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                    <Badge variant="secondary" className="bg-muted text-muted-foreground border-none px-2">{item.tag}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-primary" />
                学习目标
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {[
                  { label: "React 高阶组件", progress: 75 },
                  { label: "知识图谱可视化", progress: 40 },
                  { label: "英语口语打卡", progress: 90 },
                ].map((goal, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{goal.label}</span>
                      <span className="text-muted-foreground">{goal.progress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
                <Button className="w-full mt-4 btn-primary" variant="secondary">
                  查看全部目标
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

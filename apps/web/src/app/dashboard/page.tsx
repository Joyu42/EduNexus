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
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "知识库",
      description: "管理学习笔记和文档",
      icon: Brain,
      href: "/kb",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "学习路径",
      description: "查看和创建学习路径",
      icon: Map,
      href: "/path",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "知识图谱",
      description: "可视化知识关系",
      icon: Activity,
      href: "/graph",
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "配置中心",
      description: "系统设置和配置",
      icon: Settings,
      href: "/settings",
      color: "text-gray-600",
      bgColor: "bg-gray-50"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-rose-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent">
            总览
          </h1>
          <p className="text-muted-foreground">
            欢迎回到 EduNexus，开始你的学习之旅
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">学习会话</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                本周活跃会话
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">知识文档</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDocuments}</div>
              <p className="text-xs text-muted-foreground">
                累计创建文档
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">学习路径</CardTitle>
              <Map className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPaths}</div>
              <p className="text-xs text-muted-foreground">
                正在进行的路径
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">学生人数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                活跃学生数量
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">本周活跃度</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.weeklyActivity}%</div>
              <p className="text-xs text-muted-foreground">
                较上周 +12%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">完成率</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                任务完成率
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>快速导航</CardTitle>
            <CardDescription>选择一个功能模块开始使用</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.href}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start gap-2 hover:shadow-md transition-shadow"
                    onClick={() => router.push(action.href)}
                  >
                    <div className={`p-2 rounded-lg ${action.bgColor}`}>
                      <Icon className={`h-6 w-6 ${action.color}`} />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">{action.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {action.description}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              最近活动
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-blue-50">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">创建了新的学习会话</p>
                  <p className="text-xs text-muted-foreground">2 小时前</p>
                </div>
                <Badge variant="secondary">工作区</Badge>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-purple-50">
                  <Brain className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">更新了知识库文档</p>
                  <p className="text-xs text-muted-foreground">5 小时前</p>
                </div>
                <Badge variant="secondary">知识库</Badge>
              </div>

              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-green-50">
                  <Map className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">完成了学习路径任务</p>
                  <p className="text-xs text-muted-foreground">昨天</p>
                </div>
                <Badge variant="secondary">路径</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

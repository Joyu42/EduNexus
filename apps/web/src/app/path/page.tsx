"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  Circle,
  PlayCircle,
  Flag,
  BookOpen,
  FileText,
  Link2,
  ChevronRight,
  MoreHorizontal,
  Calendar,
  Target,
  TrendingUp
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type PathStatus = "not_started" | "in_progress" | "completed";
type TaskStatus = "not_started" | "in_progress" | "completed";

type Task = {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  progress: number;
  status: TaskStatus;
  dependencies: string[];
  resources: Resource[];
  notes: string;
};

type Resource = {
  id: string;
  title: string;
  type: "article" | "video" | "document";
  url: string;
};

type LearningPath = {
  id: string;
  title: string;
  description: string;
  status: PathStatus;
  progress: number;
  tags: string[];
  createdAt: string;
  tasks: Task[];
  milestones: Milestone[];
};

type Milestone = {
  id: string;
  title: string;
  taskIds: string[];
};

const mockPaths: LearningPath[] = [
  {
    id: "1",
    title: "前端开发基础",
    description: "从零开始学习前端开发",
    status: "in_progress",
    progress: 45,
    tags: ["前端", "基础"],
    createdAt: "2026-03-01",
    milestones: [
      { id: "m1", title: "HTML/CSS 基础", taskIds: ["t1", "t2"] },
      { id: "m2", title: "JavaScript 核心", taskIds: ["t3", "t4"] },
    ],
    tasks: [
      {
        id: "t1",
        title: "HTML 语义化标签",
        description: "学习 HTML5 语义化标签的使用",
        estimatedTime: "2小时",
        progress: 100,
        status: "completed",
        dependencies: [],
        resources: [
          { id: "r1", title: "MDN HTML 指南", type: "article", url: "#" },
        ],
        notes: "已完成基础学习",
      },
      {
        id: "t2",
        title: "CSS Flexbox 布局",
        description: "掌握 Flexbox 弹性布局",
        estimatedTime: "3小时",
        progress: 60,
        status: "in_progress",
        dependencies: ["t1"],
        resources: [
          { id: "r2", title: "Flexbox 完全指南", type: "article", url: "#" },
        ],
        notes: "正在学习对齐属性",
      },
      {
        id: "t3",
        title: "JavaScript 基础语法",
        description: "变量、数据类型、运算符",
        estimatedTime: "4小时",
        progress: 30,
        status: "in_progress",
        dependencies: ["t1"],
        resources: [],
        notes: "",
      },
      {
        id: "t4",
        title: "DOM 操作",
        description: "学习 DOM API 和事件处理",
        estimatedTime: "5小时",
        progress: 0,
        status: "not_started",
        dependencies: ["t3"],
        resources: [],
        notes: "",
      },
    ],
  },
  {
    id: "2",
    title: "React 进阶",
    description: "深入学习 React 框架",
    status: "not_started",
    progress: 0,
    tags: ["React", "进阶"],
    createdAt: "2026-03-05",
    milestones: [],
    tasks: [],
  },
];

export default function PathPage() {
  const [selectedPath, setSelectedPath] = useState<LearningPath>(mockPaths[0]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(mockPaths[0].tasks[0]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <PlayCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: PathStatus) => {
    const variants = {
      completed: { label: "已完成", className: "bg-green-100 text-green-700 border-green-200" },
      in_progress: { label: "进行中", className: "bg-blue-100 text-blue-700 border-blue-200" },
      not_started: { label: "未开始", className: "bg-gray-100 text-gray-700 border-gray-200" },
    };
    const variant = variants[status];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const filteredPaths = mockPaths.filter((path) => {
    if (statusFilter !== "all" && path.status !== statusFilter) return false;
    if (searchQuery && !path.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-yellow-50/30">
      {/* 左侧面板 */}
      <div className="w-80 border-r bg-white/80 backdrop-blur-sm flex flex-col">
        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">学习路径</h2>
            <Button size="sm" className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索路径..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="not_started">未开始</SelectItem>
                <SelectItem value="in_progress">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredPaths.map((path) => (
            <Card
              key={path.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedPath.id === path.id ? "ring-2 ring-orange-500 bg-orange-50/50" : ""
              }`}
              onClick={() => {
                setSelectedPath(path);
                setSelectedTask(path.tasks[0] || null);
              }}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium">{path.title}</CardTitle>
                  {getStatusBadge(path.status)}
                </div>
                <CardDescription className="text-xs mt-1">{path.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Calendar className="h-3 w-3" />
                  <span>{path.createdAt}</span>
                </div>
                <Progress value={path.progress} className="h-1.5" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{path.progress}% 完成</span>
                  <div className="flex gap-1">
                    {path.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* 主区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 路径头部 */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                  {selectedPath.title}
                </h1>
                <p className="text-gray-600">{selectedPath.description}</p>
              </div>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-4">
              {getStatusBadge(selectedPath.status)}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Target className="h-4 w-4" />
                <span>{selectedPath.tasks.length} 个任务</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Flag className="h-4 w-4" />
                <span>{selectedPath.milestones.length} 个里程碑</span>
              </div>
            </div>

            <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">总体进度</span>
                  <span className="text-2xl font-bold text-orange-600">{selectedPath.progress}%</span>
                </div>
                <Progress value={selectedPath.progress} className="h-2" />
              </CardContent>
            </Card>
          </div>

          {/* 时间线 */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              学习路径
            </h2>

            <div className="relative">
              {/* 垂直连线 */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-200 via-amber-200 to-yellow-200" />

              <div className="space-y-6">
                {selectedPath.milestones.map((milestone) => (
                  <div key={milestone.id} className="space-y-4">
                    {/* 里程碑标记 */}
                    <div className="flex items-center gap-4">
                      <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg">
                        <Flag className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{milestone.title}</h3>
                        <p className="text-sm text-gray-600">
                          {milestone.taskIds.length} 个任务
                        </p>
                      </div>
                    </div>

                    {/* 任务卡片 */}
                    {selectedPath.tasks
                      .filter((task) => milestone.taskIds.includes(task.id))
                      .map((task) => (
                        <div key={task.id} className="ml-6 pl-10 relative">
                          {/* 任务节点 */}
                          <div className="absolute left-0 top-6 z-10">
                            {getStatusIcon(task.status)}
                          </div>

                          <Card
                            className={`cursor-pointer transition-all hover:shadow-lg ${
                              selectedTask?.id === task.id ? "ring-2 ring-orange-500 bg-orange-50/30" : ""
                            }`}
                            onClick={() => setSelectedTask(task)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-base">{task.title}</CardTitle>
                                  <CardDescription className="mt-1">{task.description}</CardDescription>
                                </div>
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  <span>{task.estimatedTime}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <BookOpen className="h-4 w-4" />
                                  <span>{task.resources.length} 个资源</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">完成度</span>
                                  <span className="font-medium">{task.progress}%</span>
                                </div>
                                <Progress value={task.progress} className="h-1.5" />
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                  </div>
                ))}

                {/* 未分组任务 */}
                {selectedPath.tasks
                  .filter(
                    (task) =>
                      !selectedPath.milestones.some((m) => m.taskIds.includes(task.id))
                  )
                  .map((task) => (
                    <div key={task.id} className="ml-6 pl-10 relative">
                      <div className="absolute left-0 top-6 z-10">
                        {getStatusIcon(task.status)}
                      </div>
                      <Card
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          selectedTask?.id === task.id ? "ring-2 ring-orange-500" : ""
                        }`}
                        onClick={() => setSelectedTask(task)}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{task.title}</CardTitle>
                          <CardDescription>{task.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{task.estimatedTime}</span>
                            </div>
                          </div>
                          <Progress value={task.progress} className="h-1.5" />
                        </CardContent>
                      </Card>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧面板 */}
      {selectedTask && (
        <div className="w-96 border-l bg-white/80 backdrop-blur-sm overflow-y-auto">
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">任务详情</h3>
              <div className="flex items-center gap-2">
                {getStatusIcon(selectedTask.status)}
                <span className="text-sm text-gray-600">
                  {selectedTask.status === "completed"
                    ? "已完成"
                    : selectedTask.status === "in_progress"
                    ? "进行中"
                    : "未开始"}
                </span>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{selectedTask.title}</CardTitle>
                <CardDescription>{selectedTask.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">预计时间</span>
                    <span className="font-medium">{selectedTask.estimatedTime}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">完成进度</span>
                    <span className="font-medium">{selectedTask.progress}%</span>
                  </div>
                </div>
                <Progress value={selectedTask.progress} className="h-2" />
              </CardContent>
            </Card>

            {selectedTask.resources.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  相关资源
                </h4>
                <div className="space-y-2">
                  {selectedTask.resources.map((resource) => (
                    <Card key={resource.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100">
                          <FileText className="h-4 w-4 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{resource.title}</p>
                          <p className="text-xs text-gray-500">{resource.type}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {selectedTask.notes && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  笔记
                </h4>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-700">{selectedTask.notes}</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="space-y-2 pt-4 border-t">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600">
                开始学习
              </Button>
              <Button variant="outline" className="w-full">
                标记为完成
              </Button>
              <Button variant="ghost" className="w-full">
                编辑任务
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

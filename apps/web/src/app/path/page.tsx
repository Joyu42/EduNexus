"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Timestamp } from "@/components/ui/timestamp";
import { cn } from "@/lib/utils";

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
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
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
  createdAt: Date;
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
    createdAt: new Date("2026-03-01"),
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
        createdAt: new Date("2026-03-01"),
        startedAt: new Date("2026-03-01"),
        completedAt: new Date("2026-03-02")
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
        createdAt: new Date("2026-03-02"),
        startedAt: new Date("2026-03-03")
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
        createdAt: new Date("2026-03-03"),
        startedAt: new Date("2026-03-05")
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
        createdAt: new Date("2026-03-04")
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
    createdAt: new Date("2026-03-05"),
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

  // 创建新路径
  const handleCreatePath = useCallback(() => {
    const title = prompt('输入新路径名称:');
    if (title && title.trim()) {
      alert(`创建路径: ${title}`);
    }
  }, []);

  // 开始学习任务
  const handleStartTask = useCallback(() => {
    if (!selectedTask) return;
    alert(`开始学习: ${selectedTask.title}`);
  }, [selectedTask]);

  // 标记任务完成
  const handleCompleteTask = useCallback(() => {
    if (!selectedTask) return;
    if (confirm(`确定标记"${selectedTask.title}"为已完成吗?`)) {
      alert('任务已标记为完成');
    }
  }, [selectedTask]);

  // 编辑任务
  const handleEditTask = useCallback(() => {
    if (!selectedTask) return;
    alert(`编辑任务: ${selectedTask.title}`);
  }, [selectedTask]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-yellow-50/30">
      {/* 左侧面板 */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-80 border-r bg-white/80 backdrop-blur-sm flex flex-col"
      >
        <div className="p-4 border-b space-y-4">
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="text-2xl">🎮</span>
              成长地图
            </h2>
            <motion.div whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}>
              <Button
                size="sm"
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg hover:shadow-xl transition-all"
                onClick={handleCreatePath}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="搜索成长地图..."
              className="pl-9 focus:ring-2 focus:ring-orange-400 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </motion.div>

          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex gap-2"
          >
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
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </motion.div>
          </motion.div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
          <AnimatePresence mode="popLayout">
            {filteredPaths.map((path, index) => (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-lg",
                    selectedPath.id === path.id
                      ? "ring-2 ring-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md"
                      : "hover:border-orange-300"
                  )}
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
                    <Timestamp date={path.createdAt} showIcon={true} className="text-gray-600" />
                    <Progress value={path.progress} className="h-1.5" />
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 font-medium">{path.progress}% 完成</span>
                      <div className="flex gap-1">
                        {path.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0 border-orange-300">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* 主区域 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex-1 overflow-y-auto p-6 scrollbar-thin"
      >
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 路径头部 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <motion.h1
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent"
                >
                  {selectedPath.title}
                </motion.h1>
                <motion.p
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-gray-600"
                >
                  {selectedPath.description}
                </motion.p>
              </div>
              <motion.div whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center gap-4 flex-wrap"
            >
              {getStatusBadge(selectedPath.status)}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Target className="h-4 w-4 text-orange-500" />
                <span>{selectedPath.tasks.length} 个任务</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Flag className="h-4 w-4 text-amber-500" />
                <span>{selectedPath.milestones.length} 个里程碑</span>
              </div>
            </motion.div>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.7 }}
              whileHover={{ scale: 1.01 }}
            >
              <Card className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border-orange-200 shadow-md hover:shadow-lg transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">总体进度</span>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.8, type: "spring" }}
                      className="text-2xl font-bold text-orange-600"
                    >
                      {selectedPath.progress}%
                    </motion.span>
                  </div>
                  <Progress value={selectedPath.progress} className="h-2" />
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* 时间线 */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              成长路线
            </h2>

            <div className="relative">
              {/* 垂直连线 */}
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 1, delay: 0.9 }}
                className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-200 via-amber-200 to-yellow-200 origin-top"
              />

              <div className="space-y-6">
                {selectedPath.milestones.map((milestone, mIndex) => (
                  <motion.div
                    key={milestone.id}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + mIndex * 0.2 }}
                    className="space-y-4"
                  >
                    {/* 里程碑标记 */}
                    <div className="flex items-center gap-4">
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 1.1 + mIndex * 0.2, type: "spring", stiffness: 200 }}
                        whileHover={{ scale: 1.1, rotate: 10 }}
                        className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg cursor-pointer"
                      >
                        <Flag className="h-5 w-5 text-white" />
                      </motion.div>
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
                      .map((task, tIndex) => (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.2 + mIndex * 0.2 + tIndex * 0.1 }}
                          whileHover={{ scale: 1.02, x: 4 }}
                          className="ml-6 pl-10 relative"
                        >
                          {/* 任务节点 */}
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 1.3 + mIndex * 0.2 + tIndex * 0.1, type: "spring" }}
                            className="absolute left-0 top-6 z-10"
                          >
                            {getStatusIcon(task.status)}
                          </motion.div>

                          <Card
                            className={cn(
                              "cursor-pointer transition-all hover:shadow-xl",
                              selectedTask?.id === task.id
                                ? "ring-2 ring-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 shadow-lg"
                                : "hover:border-orange-300"
                            )}
                            onClick={() => setSelectedTask(task)}
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <CardTitle className="text-base">{task.title}</CardTitle>
                                  <CardDescription className="mt-1">{task.description}</CardDescription>
                                </div>
                                <motion.div whileHover={{ x: 4 }}>
                                  <ChevronRight className="h-5 w-5 text-gray-400" />
                                </motion.div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-4 w-4 text-orange-500" />
                                  <span>{task.estimatedTime}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <BookOpen className="h-4 w-4 text-blue-500" />
                                  <span>{task.resources.length} 个资源</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">完成度</span>
                                  <span className="font-medium text-orange-600">{task.progress}%</span>
                                </div>
                                <Progress value={task.progress} className="h-1.5" />
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                  </motion.div>
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
          </motion.div>
        </div>
      </motion.div>

      {/* 右侧面板 */}
      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-96 border-l bg-white/80 backdrop-blur-sm overflow-y-auto scrollbar-thin"
          >
            <div className="p-6 space-y-6">
              <motion.div
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">任务详情</h3>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedTask(null)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    ✕
                  </motion.button>
                </div>
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
              </motion.div>

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.01 }}
              >
                <Card className="shadow-md hover:shadow-lg transition-all border-orange-100">
                  <CardHeader>
                    <CardTitle className="text-base">{selectedTask.title}</CardTitle>
                    <CardDescription>{selectedTask.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <motion.div
                        whileHover={{ x: 2 }}
                        className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        <span className="text-gray-600">预计时间</span>
                        <span className="font-medium">{selectedTask.estimatedTime}</span>
                      </motion.div>
                      <motion.div
                        whileHover={{ x: 2 }}
                        className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        <span className="text-gray-600">完成进度</span>
                        <span className="font-medium text-orange-600">{selectedTask.progress}%</span>
                      </motion.div>
                    </div>
                    <Progress value={selectedTask.progress} className="h-2" />
                  </CardContent>
                </Card>
              </motion.div>

              {selectedTask.resources.length > 0 && (
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="space-y-3"
                >
                  <h4 className="font-medium flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-blue-500" />
                    相关资源
                  </h4>
                  <div className="space-y-2">
                    {selectedTask.resources.map((resource, index) => (
                      <motion.div
                        key={resource.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.05 }}
                        whileHover={{ scale: 1.02, x: 4 }}
                      >
                        <Card className="hover:shadow-md transition-all cursor-pointer border-blue-100">
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-100 to-amber-100">
                              <FileText className="h-4 w-4 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{resource.title}</p>
                              <p className="text-xs text-gray-500">{resource.type}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {selectedTask.notes && (
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-3"
                >
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-500" />
                    笔记
                  </h4>
                  <Card className="border-purple-100">
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-700">{selectedTask.notes}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="space-y-2 pt-4 border-t"
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg hover:shadow-xl transition-all"
                    onClick={handleStartTask}
                  >
                    开始学习
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    className="w-full border-orange-300 hover:bg-orange-50"
                    onClick={handleCompleteTask}
                  >
                    标记为完成
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ghost"
                    className="w-full hover:bg-orange-50"
                    onClick={handleEditTask}
                  >
                    编辑任务
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

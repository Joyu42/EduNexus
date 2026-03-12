"use client";

import { useState, useCallback, useEffect } from "react";
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
  Target,
  TrendingUp,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Timestamp } from "@/components/ui/timestamp";
import { cn } from "@/lib/utils";
import { GrowthMapVisualization } from "@/components/path/growth-map-visualization";
import { AILearningSuggestions } from "@/components/path/ai-learning-suggestions";
import { PathCreateDialog } from "@/components/path/path-create-dialog";
import { PathEditDialog } from "@/components/path/path-edit-dialog";
import { TaskCreateDialog } from "@/components/path/task-create-dialog";
import { TaskEditDialog } from "@/components/path/task-edit-dialog";
import { MilestoneDialog } from "@/components/path/milestone-dialog";
import { toast } from "sonner";
import {
  pathStorage,
  type LearningPath,
  type Task,
  type TaskStatus,
  type PathStatus,
} from "@/lib/client/path-storage";
import { goalStorage } from "@/lib/goals/goal-storage";

export default function PathPage() {
  // 状态管理
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // 对话框状态
  const [pathCreateOpen, setPathCreateOpen] = useState(false);
  const [pathEditOpen, setPathEditOpen] = useState(false);
  const [taskCreateOpen, setTaskCreateOpen] = useState(false);
  const [taskEditOpen, setTaskEditOpen] = useState(false);
  const [milestoneOpen, setMilestoneOpen] = useState(false);

  // 加载数据 - 每次页面可见时都重新加载
  useEffect(() => {
    loadPaths();

    // 监听页面可见性变化
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[PathPage] 页面重新可见，重新加载数据');
        loadPaths();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const loadPaths = async () => {
    try {
      setLoading(true);
      console.log('[PathPage] 加载路径...');
      const loadedPaths = await pathStorage.getAllPaths();
      console.log('[PathPage] 加载成功:', loadedPaths.length, '个路径');

      // 如果没有路径，创建示例数据
      if (loadedPaths.length === 0) {
        console.log('[PathPage] 没有路径，创建示例数据...');
        await initializeSamplePaths();
        // 重新加载
        const newPaths = await pathStorage.getAllPaths();
        setPaths(newPaths);
        if (newPaths.length > 0) {
          setSelectedPath(newPaths[0]);
          if (newPaths[0].tasks.length > 0) {
            setSelectedTask(newPaths[0].tasks[0]);
          }
        }
      } else {
        setPaths(loadedPaths);
        if (loadedPaths.length > 0 && !selectedPath) {
          setSelectedPath(loadedPaths[0]);
          if (loadedPaths[0].tasks.length > 0) {
            setSelectedTask(loadedPaths[0].tasks[0]);
          }
        }
      }
    } catch (error) {
      console.error("[PathPage] 加载路径失败:", error);
      toast.error(`加载学习路径失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 初始化示例路径
  const initializeSamplePaths = async () => {
    try {
      // 示例路径 1: 前端开发入门
      const path1 = await pathStorage.createPath({
        title: "前端开发入门",
        description: "从零开始学习前端开发，掌握 HTML、CSS 和 JavaScript 基础知识",
        status: "in_progress",
        progress: 30,
        tags: ["前端", "Web开发", "入门"],
        tasks: [
          {
            id: `task_${Date.now()}_1`,
            title: "学习 HTML 基础",
            description: "掌握 HTML 标签、语义化、表单等基础知识",
            estimatedTime: "8小时",
            progress: 100,
            status: "completed" as const,
            dependencies: [],
            resources: [],
            notes: "已完成 HTML 基础学习",
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            id: `task_${Date.now()}_2`,
            title: "学习 CSS 样式",
            description: "学习 CSS 选择器、布局、动画等",
            estimatedTime: "12小时",
            progress: 60,
            status: "in_progress" as const,
            dependencies: [],
            resources: [],
            notes: "正在学习 Flexbox 和 Grid 布局",
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          },
          {
            id: `task_${Date.now()}_3`,
            title: "JavaScript 基础",
            description: "学习 JavaScript 语法、DOM 操作、事件处理",
            estimatedTime: "20小时",
            progress: 0,
            status: "not_started" as const,
            dependencies: [],
            resources: [],
            notes: "",
            createdAt: new Date(),
          },
        ],
        milestones: [
          {
            id: `milestone_${Date.now()}_1`,
            title: "完成基础三件套",
            taskIds: [`task_${Date.now()}_1`, `task_${Date.now()}_2`, `task_${Date.now()}_3`],
          },
        ],
      });

      // 示例路径 2: React 进阶
      const path2 = await pathStorage.createPath({
        title: "React 框架进阶",
        description: "深入学习 React 框架，掌握组件化开发和状态管理",
        status: "not_started",
        progress: 0,
        tags: ["React", "前端框架", "进阶"],
        tasks: [
          {
            id: `task_${Date.now()}_4`,
            title: "React 基础概念",
            description: "学习组件、Props、State 等核心概念",
            estimatedTime: "10小时",
            progress: 0,
            status: "not_started" as const,
            dependencies: [],
            resources: [],
            notes: "",
            createdAt: new Date(),
          },
          {
            id: `task_${Date.now()}_5`,
            title: "Hooks 深入理解",
            description: "掌握 useState、useEffect、useContext 等 Hooks",
            estimatedTime: "15小时",
            progress: 0,
            status: "not_started" as const,
            dependencies: [],
            resources: [],
            notes: "",
            createdAt: new Date(),
          },
        ],
        milestones: [],
      });

      console.log('[PathPage] 示例数据创建成功');
      toast.success("已为你创建示例学习路径");
    } catch (error) {
      console.error('[PathPage] 创建示例数据失败:', error);
      toast.error("创建示例数据失败");
    }
  };

  // 创建路径
  const handleCreatePath = useCallback(async (data: {
    title: string;
    description: string;
    tags: string[];
    goalId?: string;
  }) => {
    try {
      console.log('[PathPage] 创建路径:', data);
      const newPath = await pathStorage.createPath({
        title: data.title,
        description: data.description,
        tags: data.tags,
        goalId: data.goalId,
        status: "not_started",
        progress: 0,
        tasks: [],
        milestones: [],
      });

      console.log('[PathPage] 路径创建成功:', newPath.id);

      // 如果关联了目标，更新目标的 linkedPathIds
      if (data.goalId) {
        const goal = goalStorage.getGoals().find(g => g.id === data.goalId);
        if (goal) {
          goal.linkedPathIds = [...(goal.linkedPathIds || []), newPath.id];
          goalStorage.saveGoal(goal);
        }
      }

      // 重新加载所有路径以确保数据同步
      await loadPaths();

      // 选中新创建的路径
      setSelectedPath(newPath);
      setPathCreateOpen(false);
      toast.success("成功创建学习路径");

      // 验证保存
      setTimeout(async () => {
        const saved = await pathStorage.getPath(newPath.id);
        if (saved) {
          console.log('[PathPage] 验证成功，路径已保存');
        } else {
          console.error('[PathPage] 验证失败，路径未保存');
          toast.error("路径保存验证失败，请刷新页面");
        }
      }, 100);
    } catch (error) {
      console.error("[PathPage] 创建路径失败:", error);
      toast.error(`创建路径失败: ${error}`);
    }
  }, [paths]);

  // 编辑路径
  const handleEditPath = useCallback(async (data: {
    title: string;
    description: string;
    tags: string[];
  }) => {
    if (!selectedPath) return;

    try {
      const updated = await pathStorage.updatePath(selectedPath.id, data);
      setPaths(paths.map(p => p.id === updated.id ? updated : p));
      setSelectedPath(updated);
      setPathEditOpen(false);
      toast.success("成功更新路径信息");
    } catch (error) {
      console.error("Failed to update path:", error);
      toast.error("更新路径失败");
    }
  }, [selectedPath, paths]);

  // 删除路径
  const handleDeletePath = useCallback(async () => {
    if (!selectedPath) return;

    if (!confirm(`确定要删除"${selectedPath.title}"吗？此操作无法撤销。`)) {
      return;
    }

    try {
      await pathStorage.deletePath(selectedPath.id);
      const newPaths = paths.filter(p => p.id !== selectedPath.id);
      setPaths(newPaths);
      setSelectedPath(newPaths[0] || null);
      setSelectedTask(null);
      toast.success("成功删除路径");
    } catch (error) {
      console.error("Failed to delete path:", error);
      toast.error("删除路径失败");
    }
  }, [selectedPath, paths]);

  // 复制路径
  const handleDuplicatePath = useCallback(async () => {
    if (!selectedPath) return;

    try {
      const duplicated = await pathStorage.duplicatePath(selectedPath.id);
      setPaths([...paths, duplicated]);
      setSelectedPath(duplicated);
      toast.success("成功复制路径");
    } catch (error) {
      console.error("Failed to duplicate path:", error);
      toast.error("复制路径失败");
    }
  }, [selectedPath, paths]);

  // 导出路径
  const handleExportPath = useCallback(async () => {
    if (!selectedPath) return;

    try {
      const json = await pathStorage.exportPath(selectedPath.id);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedPath.title}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("成功导出路径");
    } catch (error) {
      console.error("Failed to export path:", error);
      toast.error("导出路径失败");
    }
  }, [selectedPath]);

  // 导入路径
  const handleImportPath = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = await pathStorage.importPath(text);
        setPaths([...paths, imported]);
        setSelectedPath(imported);
        toast.success("成功导入路径");
      } catch (error) {
        console.error("Failed to import path:", error);
        toast.error("导入路径失败，请检查文件格式");
      }
    };
    input.click();
  }, [paths]);

  // 创建任务
  const handleCreateTask = useCallback(async (data: Omit<Task, 'id' | 'createdAt' | 'status' | 'progress'>) => {
    if (!selectedPath) return;

    try {
      const newTask: Task = {
        ...data,
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: "not_started",
        progress: 0,
        createdAt: new Date(),
      };

      const updated = await pathStorage.updatePath(selectedPath.id, {
        tasks: [...selectedPath.tasks, newTask],
      });

      setPaths(paths.map(p => p.id === updated.id ? updated : p));
      setSelectedPath(updated);
      setTaskCreateOpen(false);
      toast.success("成功创建任务");
    } catch (error) {
      console.error("Failed to create task:", error);
      toast.error("创建任务失败");
    }
  }, [selectedPath, paths]);

  // 编辑任务
  const handleEditTask = useCallback(async (data: Partial<Task>) => {
    if (!selectedPath || !selectedTask) return;

    try {
      const updatedTasks = selectedPath.tasks.map(t =>
        t.id === selectedTask.id ? { ...t, ...data } : t
      );

      // 自动更新任务状态
      const taskIndex = updatedTasks.findIndex(t => t.id === selectedTask.id);
      if (taskIndex !== -1) {
        const task = updatedTasks[taskIndex];
        if (task.progress === 0) {
          task.status = "not_started";
        } else if (task.progress === 100) {
          task.status = "completed";
          if (!task.completedAt) {
            task.completedAt = new Date();
          }
        } else {
          task.status = "in_progress";
          if (!task.startedAt) {
            task.startedAt = new Date();
          }
        }
      }

      const updated = await pathStorage.updatePath(selectedPath.id, {
        tasks: updatedTasks,
      });

      setPaths(paths.map(p => p.id === updated.id ? updated : p));
      setSelectedPath(updated);
      setSelectedTask(updated.tasks.find(t => t.id === selectedTask.id) || null);
      setTaskEditOpen(false);
      toast.success("成功更新任务");
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("更新任务失败");
    }
  }, [selectedPath, selectedTask, paths]);

  // 删除任务
  const handleDeleteTask = useCallback(async () => {
    if (!selectedPath || !selectedTask) return;

    if (!confirm(`确定要删除任务"${selectedTask.title}"吗？`)) {
      return;
    }

    try {
      const updatedTasks = selectedPath.tasks.filter(t => t.id !== selectedTask.id);
      const updated = await pathStorage.updatePath(selectedPath.id, {
        tasks: updatedTasks,
      });

      setPaths(paths.map(p => p.id === updated.id ? updated : p));
      setSelectedPath(updated);
      setSelectedTask(updated.tasks[0] || null);
      toast.success("成功删除任务");
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("删除任务失败");
    }
  }, [selectedPath, selectedTask, paths]);

  // 开始学习任务
  const handleStartTask = useCallback(async () => {
    if (!selectedPath || !selectedTask) return;

    try {
      const updatedTasks = selectedPath.tasks.map(t =>
        t.id === selectedTask.id
          ? {
              ...t,
              status: "in_progress" as TaskStatus,
              startedAt: t.startedAt || new Date(),
              progress: t.progress === 0 ? 10 : t.progress,
            }
          : t
      );

      const updated = await pathStorage.updatePath(selectedPath.id, {
        tasks: updatedTasks,
      });

      setPaths(paths.map(p => p.id === updated.id ? updated : p));
      setSelectedPath(updated);
      setSelectedTask(updated.tasks.find(t => t.id === selectedTask.id) || null);
      toast.success("开始学习任务");
    } catch (error) {
      console.error("Failed to start task:", error);
      toast.error("操作失败");
    }
  }, [selectedPath, selectedTask, paths]);

  // 标记任务完成
  const handleCompleteTask = useCallback(async () => {
    if (!selectedPath || !selectedTask) return;

    try {
      const updatedTasks = selectedPath.tasks.map(t =>
        t.id === selectedTask.id
          ? {
              ...t,
              status: "completed" as TaskStatus,
              progress: 100,
              completedAt: new Date(),
            }
          : t
      );

      const updated = await pathStorage.updatePath(selectedPath.id, {
        tasks: updatedTasks,
      });

      setPaths(paths.map(p => p.id === updated.id ? updated : p));
      setSelectedPath(updated);
      setSelectedTask(updated.tasks.find(t => t.id === selectedTask.id) || null);
      toast.success("任务已完成！🎉");
    } catch (error) {
      console.error("Failed to complete task:", error);
      toast.error("操作失败");
    }
  }, [selectedPath, selectedTask, paths]);

  // 更新里程碑
  const handleUpdateMilestones = useCallback(async (milestones: any[]) => {
    if (!selectedPath) return;

    try {
      const updated = await pathStorage.updatePath(selectedPath.id, {
        milestones,
      });

      setPaths(paths.map(p => p.id === updated.id ? updated : p));
      setSelectedPath(updated);
      toast.success("成功更新里程碑");
    } catch (error) {
      console.error("Failed to update milestones:", error);
      toast.error("更新里程碑失败");
    }
  }, [selectedPath, paths]);

  // 工具函数
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

  const filteredPaths = paths.filter((path) => {
    if (statusFilter !== "all" && path.status !== statusFilter) return false;
    if (searchQuery && !path.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

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
            <div className="flex gap-1">
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleImportPath}
                  title="导入路径"
                >
                  <Upload className="h-4 w-4" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }}>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg hover:shadow-xl transition-all"
                  onClick={() => setPathCreateOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
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
                    selectedPath?.id === path.id
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

          {filteredPaths.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Target className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="mb-2">暂无学习路径</p>
              <Button
                size="sm"
                onClick={() => setPathCreateOpen(true)}
                className="bg-gradient-to-r from-orange-500 to-amber-500"
              >
                创建第一个路径
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* 主区域 */}
      {selectedPath ? (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* 成长地图可视化 */}
            <GrowthMapVisualization
              totalTasks={selectedPath.tasks.length}
              completedTasks={selectedPath.tasks.filter(t => t.status === 'completed').length}
              inProgressTasks={selectedPath.tasks.filter(t => t.status === 'in_progress').length}
              totalProgress={selectedPath.progress}
              estimatedTimeRemaining={
                selectedPath.tasks
                  .filter(t => t.status !== 'completed')
                  .reduce((sum, t) => {
                    const hours = parseInt(t.estimatedTime);
                    return sum + (isNaN(hours) ? 0 : hours);
                  }, 0) + '小时'
              }
            />

            {/* 路径头部 */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    {selectedPath.title}
                  </h1>
                  <p className="text-gray-600">{selectedPath.description}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setPathEditOpen(true)}>
                      <Edit className="h-4 w-4 mr-2" />
                      编辑路径
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTaskCreateOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      添加任务
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setMilestoneOpen(true)}>
                      <Flag className="h-4 w-4 mr-2" />
                      管理里程碑
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDuplicatePath}>
                      <Copy className="h-4 w-4 mr-2" />
                      复制路径
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPath}>
                      <Download className="h-4 w-4 mr-2" />
                      导出路径
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDeletePath} className="text-red-600">
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除路径
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                {getStatusBadge(selectedPath.status)}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Target className="h-4 w-4 text-orange-500" />
                  <span>{selectedPath.tasks.length} 个任务</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Flag className="h-4 w-4 text-amber-500" />
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

            {/* AI 学习建议 */}
            <AILearningSuggestions
              tasks={selectedPath.tasks}
              currentProgress={selectedPath.progress}
            />

            {/* 任务列表 */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  学习任务
                </h2>
                <Button
                  size="sm"
                  onClick={() => setTaskCreateOpen(true)}
                  className="bg-gradient-to-r from-orange-500 to-amber-500"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  添加任务
                </Button>
              </div>

              {selectedPath.tasks.length > 0 ? (
                <div className="space-y-3">
                  {selectedPath.tasks.map((task) => (
                    <Card
                      key={task.id}
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-lg",
                        selectedTask?.id === task.id
                          ? "ring-2 ring-orange-500 bg-gradient-to-br from-orange-50 to-amber-50"
                          : "hover:border-orange-300"
                      )}
                      onClick={() => setSelectedTask(task)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {getStatusIcon(task.status)}
                            <div className="flex-1">
                              <CardTitle className="text-base">{task.title}</CardTitle>
                              <CardDescription className="mt-1">{task.description}</CardDescription>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
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
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Target className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">暂无学习任务</p>
                  <Button
                    size="sm"
                    onClick={() => setTaskCreateOpen(true)}
                    className="bg-gradient-to-r from-orange-500 to-amber-500"
                  >
                    创建第一个任务
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <Target className="h-24 w-24 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">选择一个学习路径开始</p>
            <p className="text-sm">或创建一个新的成长地图</p>
          </div>
        </div>
      )}

      {/* 右侧面板 - 任务详情 */}
      <AnimatePresence>
        {selectedTask && selectedPath && (
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
                    disabled={selectedTask.status === "completed"}
                  >
                    {selectedTask.status === "not_started" ? "开始学习" : "继续学习"}
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    className="w-full border-orange-300 hover:bg-orange-50"
                    onClick={handleCompleteTask}
                    disabled={selectedTask.status === "completed"}
                  >
                    标记为完成
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ghost"
                    className="w-full hover:bg-orange-50"
                    onClick={() => setTaskEditOpen(true)}
                  >
                    编辑任务
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="ghost"
                    className="w-full hover:bg-red-50 text-red-600"
                    onClick={handleDeleteTask}
                  >
                    删除任务
                  </Button>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 对话框 */}
      <PathCreateDialog
        open={pathCreateOpen}
        onOpenChange={setPathCreateOpen}
        onSubmit={handleCreatePath}
      />

      <PathEditDialog
        open={pathEditOpen}
        onOpenChange={setPathEditOpen}
        path={selectedPath}
        onSubmit={handleEditPath}
      />

      <TaskCreateDialog
        open={taskCreateOpen}
        onOpenChange={setTaskCreateOpen}
        existingTasks={selectedPath?.tasks || []}
        onSubmit={handleCreateTask}
      />

      <TaskEditDialog
        open={taskEditOpen}
        onOpenChange={setTaskEditOpen}
        task={selectedTask}
        existingTasks={selectedPath?.tasks || []}
        onSubmit={handleEditTask}
      />

      <MilestoneDialog
        open={milestoneOpen}
        onOpenChange={setMilestoneOpen}
        milestones={selectedPath?.milestones || []}
        tasks={selectedPath?.tasks || []}
        onUpdate={handleUpdateMilestones}
      />
    </div>
  );
}

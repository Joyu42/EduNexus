"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Search,
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
import { LoginPrompt } from "@/components/ui/login-prompt";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { syncDemoClientData } from "@/lib/client/demo-client-sync";
import { getPathPageState } from "@/lib/client/path-goal-view-state";

function PathPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [pendingDeleteAction, setPendingDeleteAction] = useState<
    | {
        type: "path";
        pathId: string;
        pathTitle: string;
      }
    | {
        type: "task";
        pathId: string;
        taskId: string;
        taskTitle: string;
      }
    | null
  >(null);

  // 加载数据 - 每次页面可见时都重新加载
  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    loadPaths();

    // 监听页面可见性变化
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadPaths();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, session?.user?.isDemo, searchParams]);

  const loadPaths = async () => {
    try {
      setLoading(true);
      let loadedPaths = await pathStorage.getAllPaths();

      const pathCreatedByEditor = searchParams.get("selected");
      let editorSelectionApplied = false;
      if (pathCreatedByEditor) {
        const created = loadedPaths.find((path) => path.id === pathCreatedByEditor);
        if (created) {
          setSelectedPath(created);
          setSelectedTask(created.tasks[0] || null);
          editorSelectionApplied = true;
          toast.success(`已加载新路径：${created.title}`);
        }
      }

      const state = getPathPageState({
        isLoading: false,
        pathCount: loadedPaths.length,
        isDemoUser: session?.user?.isDemo === true,
      });

      if (session?.user?.isDemo === true && (state.kind === "bootstrap_demo" || state.kind === "content")) {
        await syncDemoClientData(session?.user?.id ?? "demo-user");
        loadedPaths = await pathStorage.getAllPaths();
      }

      setPaths(loadedPaths);
      if (!editorSelectionApplied && loadedPaths.length > 0 && !selectedPath) {
        setSelectedPath(loadedPaths[0]);
        if (loadedPaths[0].tasks.length > 0) {
          setSelectedTask(loadedPaths[0].tasks[0]);
        }
      }
    } catch (error) {
      console.error("[PathPage] 加载路径失败:", error);
      toast.error(`加载学习路径失败: ${error}`);
    } finally {
      setLoading(false);
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
      setSelectedTask(newPath.tasks[0] || null);
      setPathCreateOpen(false);
      toast.success("成功创建学习路径");

      // 验证保存
      setTimeout(async () => {
        const saved = await pathStorage.getPath(newPath.id);
        if (!saved) {
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
  const handleDeletePath = useCallback(() => {
    if (!selectedPath) return;

    setPendingDeleteAction({
      type: "path",
      pathId: selectedPath.id,
      pathTitle: selectedPath.title,
    });
    toast("请在弹窗中确认删除路径");
  }, [selectedPath]);

  const handleDeleteTask = useCallback(() => {
    if (!selectedPath || !selectedTask) return;

    setPendingDeleteAction({
      type: "task",
      pathId: selectedPath.id,
      taskId: selectedTask.id,
      taskTitle: selectedTask.title,
    });
    toast("请在弹窗中确认删除任务");
  }, [selectedPath, selectedTask]);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteAction) {
      return;
    }

    const deleteAction = pendingDeleteAction;
    setPendingDeleteAction(null);

    try {
      if (deleteAction.type === "path") {
        await pathStorage.deletePath(deleteAction.pathId);
        const newPaths = paths.filter((path) => path.id !== deleteAction.pathId);
        const nextSelectedPath = selectedPath?.id === deleteAction.pathId ? (newPaths[0] || null) : selectedPath;
        setPaths(newPaths);
        setSelectedPath(nextSelectedPath);
        setSelectedTask(nextSelectedPath?.tasks[0] || null);
        toast.success("成功删除路径");
        return;
      }

      const currentPath = paths.find((path) => path.id === deleteAction.pathId);
      if (!currentPath) {
        toast.error("未找到要删除任务所属的路径");
        return;
      }

      const updatedTasks = currentPath.tasks.filter((task) => task.id !== deleteAction.taskId);
      const updatedPath = await pathStorage.updatePath(deleteAction.pathId, {
        tasks: updatedTasks,
      });

      const updatedPaths = paths.map((path) => (path.id === updatedPath.id ? updatedPath : path));
      setPaths(updatedPaths);

      if (selectedPath?.id === updatedPath.id) {
        setSelectedPath(updatedPath);
        setSelectedTask(updatedPath.tasks.find((task) => task.id === selectedTask?.id) || updatedPath.tasks[0] || null);
      }

      toast.success("成功删除任务");
    } catch (error) {
      console.error("Failed to delete item:", error);
      toast.error(deleteAction.type === "path" ? "删除路径失败" : "删除任务失败");
    }
  }, [paths, pendingDeleteAction, selectedPath, selectedTask]);

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
        id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
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
      const latestTask = updated.tasks.find(t => t.id === selectedTask.id) || selectedTask;
      setSelectedTask(latestTask);
      toast.success("开始学习任务，正在进入学习工作区");

      const workspaceParams = new URLSearchParams({
        source: "path",
        autoStart: "1",
        pathId: updated.id,
        pathTitle: updated.title,
        taskId: latestTask.id,
        taskTitle: latestTask.title,
        taskStatus: latestTask.status,
        taskProgress: String(latestTask.progress),
      });

      if (latestTask.description) {
        workspaceParams.set("taskDescription", latestTask.description);
      }
      if (latestTask.estimatedTime) {
        workspaceParams.set("taskEstimatedTime", latestTask.estimatedTime);
      }
      if (latestTask.dependencies.length > 0) {
        workspaceParams.set("taskDependencies", latestTask.dependencies.join(","));
      }
      if (updated.tasks.length > 0) {
        workspaceParams.set("pathTaskCount", String(updated.tasks.length));
      }

      router.push(`/workspace?${workspaceParams.toString()}`);
    } catch (error) {
      console.error("Failed to start task:", error);
      toast.error("操作失败");
    }
  }, [selectedPath, selectedTask, paths, router]);

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

  if (status === 'loading' || status === 'unauthenticated') {
    return <LoginPrompt title="成长地图" />;
  }

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
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push('/path/new-editor')}
              >
                AI 生成路径
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

      <Dialog
        open={pendingDeleteAction !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteAction(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pendingDeleteAction?.type === "path" ? "删除路径" : "删除任务"}</DialogTitle>
            <DialogDescription>
              {pendingDeleteAction?.type === "path"
                ? `确定要删除「${pendingDeleteAction.pathTitle}」吗？此操作无法撤销。`
                : `确定要删除任务「${pendingDeleteAction?.taskTitle ?? "当前任务"}」吗？此操作无法撤销。`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteAction(null)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => void handleConfirmDelete()}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PathPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">加载中...</div>}>
      <PathPageContent />
    </Suspense>
  );
}

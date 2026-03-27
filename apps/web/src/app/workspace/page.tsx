"use client";

import { useState, useRef, useEffect, Suspense, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Loader2,
  Brain,
  Lightbulb,
  BookOpen,
  Target,
  MessageSquare,
  Settings,
  Image as ImageIcon,
  X,
  Download,
  Code,
  FileText,
  Zap,
  History,
  Trash2,
  Plus,
  Route,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginPrompt } from "@/components/ui/login-prompt";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { LearningNotes } from "@/components/workspace/learning-notes";
import { LearningPlanner } from "@/components/kb/learning-planner";
import { KBQAAssistant } from "@/components/kb/kb-qa-assistant";
import { TeacherManager } from "@/components/workspace/teacher-manager";
import { useSidebarStore } from "@/lib/stores/sidebar-store";
import { getKBStorage, type KBDocument } from "@/lib/client/kb-storage";
import { getModelConfig } from "@/lib/client/model-config";
import { exportChatSessionAsMarkdown, type ChatSession } from "@/lib/workspace/chat-history-storage";
import {
  getAllTeachers,
  type AITeacher,
} from "@/lib/workspace/teacher-storage";
import {
  useWorkspaceSessionController,
} from "@/lib/workspace/use-workspace-session-controller";
import { toast } from "sonner";
import { WorkspaceRailsLayout } from "./rails-layout";

type WorkspaceTaskContext = {
  source: string;
  autoStart: boolean;
  pathId?: string;
  pathTitle?: string;
  pathTaskCount?: number;
  taskId?: string;
  taskTitle?: string;
  taskDescription?: string;
  taskEstimatedTime?: string;
  taskDependencies?: string[];
  taskStatus?: string;
  taskProgress?: number;
};

type GraphViewProbeResponse = {
  packMissing?: boolean;
  nodes?: Array<{ kbDocumentId?: string }>;
  data?: {
    packMissing?: boolean;
    nodes?: Array<{ kbDocumentId?: string }>;
  };
};

const teachingStyleLabels = {
  socratic: '苏格拉底式',
  direct: '直接教学',
  interactive: '互动式',
  'project-based': '项目式',
  mixed: '混合式',
};

function WorkspacePageContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const storage = getKBStorage();
  const {
    workspaceLeftCollapsed,
    workspaceRightCollapsed,
    setWorkspaceLeftCollapsed,
    setWorkspaceRightCollapsed,
  } = useSidebarStore();
  const [kbDocuments, setKbDocuments] = useState<KBDocument[]>([]);
  const [currentTeacher, setCurrentTeacher] = useState<AITeacher | null>(null);
  const [kbQAMode, setKbQAMode] = useState(false); // 知识库问答模式开关
  const [inputValue, setInputValue] = useState("");
  const [showThinking, setShowThinking] = useState(true);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [taskContext, setTaskContext] = useState<WorkspaceTaskContext | null>(null);
  const [activeTab, setActiveTab] = useState<"status" | "teachers" | "notes" | "plan" | "kb-qa" | "history">("status");
  const [isMounted, setIsMounted] = useState(false);
  const [pendingDeleteSession, setPendingDeleteSession] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isSessionActionPending, setIsSessionActionPending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pathContextSeededTaskRef = useRef<string | null>(null);
  const pathContextSentTaskRef = useRef<string | null>(null);
  const taskFeedbackSyncedRef = useRef(new Set<string>());
  const sessionActionQueueRef = useRef<Promise<void>>(Promise.resolve());
  const {
    currentSessionId,
    currentSession,
    recentSessions,
    messages,
    isLoading,
    refreshSessions,
    selectSession,
    startNewConversation,
    deleteSession,
    sendMessage,
  } = useWorkspaceSessionController({
    enabled: status === "authenticated",
  });
  const socraticMode = currentTeacher?.teachingStyle === "socratic";

  useEffect(() => {
    setIsMounted(true);

    const loadKBDocuments = async () => {
      try {
        await storage.initialize();
        const vaultId = storage.getCurrentVaultId();
        if (vaultId) {
          const docs = await storage.getDocumentsByVault(vaultId);
          setKbDocuments(docs);
        }
      } catch (error) {
        console.error("加载知识库文档失败:", error);
      }
    };

    const loadTeachers = async () => {
      try {
        const allTeachers = await getAllTeachers();
        // 默认选择第一个老师（苏格拉底老师）
        if (allTeachers.length > 0 && !currentTeacher) {
          setCurrentTeacher(allTeachers[0]);
        }
      } catch (error) {
        console.error("加载老师列表失败:", error);
      }
    };

    loadKBDocuments();
    loadTeachers();
  }, [currentTeacher, storage]);

  useEffect(() => {
    const source = searchParams.get("source") || "";
    const autoStart = searchParams.get("autoStart") === "1";
    const taskId = searchParams.get("taskId") || undefined;

    if (source !== "path" || !taskId) {
      setTaskContext(null);
      return;
    }

    if (taskFeedbackSyncedRef.current.size > 0 && !taskFeedbackSyncedRef.current.has(taskId)) {
      taskFeedbackSyncedRef.current.clear();
      pathContextSentTaskRef.current = null;
    }

    const parsedProgress = Number(searchParams.get("taskProgress") || "0");
    const parsedTaskCount = Number(searchParams.get("pathTaskCount") || "0");
    const dependenciesRaw = searchParams.get("taskDependencies") || "";
    const parsedDependencies = dependenciesRaw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const context: WorkspaceTaskContext = {
      source,
      autoStart,
      pathId: searchParams.get("pathId") || undefined,
      pathTitle: searchParams.get("pathTitle") || undefined,
      pathTaskCount: Number.isFinite(parsedTaskCount) ? parsedTaskCount : undefined,
      taskId,
      taskTitle: searchParams.get("taskTitle") || undefined,
      taskDescription: searchParams.get("taskDescription") || undefined,
      taskEstimatedTime: searchParams.get("taskEstimatedTime") || undefined,
      taskDependencies: parsedDependencies,
      taskStatus: searchParams.get("taskStatus") || undefined,
      taskProgress: Number.isFinite(parsedProgress) ? parsedProgress : 0,
    };

    setTaskContext(context);

    if (!autoStart || pathContextSeededTaskRef.current === taskId) {
      return;
    }

    const details: string[] = [];
    if (context.taskDescription) {
      details.push(`- 任务描述：${context.taskDescription}`);
    }
    if (context.taskEstimatedTime) {
      details.push(`- 预计时长：${context.taskEstimatedTime}`);
    }
    if (context.taskDependencies && context.taskDependencies.length > 0) {
      details.push(`- 前置任务：${context.taskDependencies.join("、")}`);
    }
    if (context.pathTaskCount && context.pathTaskCount > 0) {
      details.push(`- 路径任务总数：${context.pathTaskCount}`);
    }

    const guidedPrompt = context.taskTitle
      ? `我从学习路径进入工作区，请按任务引导我学习：\n- 路径：${context.pathTitle || "未命名路径"}\n- 任务：${context.taskTitle}\n- 当前进度：${context.taskProgress ?? 0}%${details.length > 0 ? `\n${details.join("\n")}` : ""}\n请先给我一个 3 步学习推进方案，再从第 1 步开始提问引导。`
      : "我从学习路径进入工作区，请按当前任务引导我学习。";

    pathContextSeededTaskRef.current = taskId;
    setInputValue(guidedPrompt);
  }, [searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      // Convert to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newImages.push(event.target.result as string);
          if (newImages.length === files.length) {
            setUploadedImages((prev) => [...prev, ...newImages]);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const exportConversation = async () => {
    if (!currentSessionId) {
      const content = messages
        .map((m) => `[${m.role}] ${m.content}`)
        .join("\n\n");
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `学习对话_${new Date().toISOString().slice(0, 10)}.txt`;
      a.click();
      return;
    }

    try {
      const activeSession = currentSession;
      const exportSession: ChatSession = {
        id: currentSessionId,
        title: activeSession?.title || recentSessions.find((session) => session.id === currentSessionId)?.title || "学习对话",
        messages,
        createdAt: activeSession ? new Date(activeSession.createdAt) : (messages[0]?.timestamp ?? new Date()),
        updatedAt: activeSession ? new Date(activeSession.updatedAt) : (messages[messages.length - 1]?.timestamp ?? new Date()),
        socraticMode: socraticMode ?? false,
      };
      const markdown = exportChatSessionAsMarkdown(exportSession);
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportSession.title}_${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      toast.success("对话已导出");
    } catch (error) {
      console.error("导出失败:", error);
      toast.error("导出失败");
    }
  };

  const modelConfig = getModelConfig();

  const syncTaskFocusFeedback = useCallback(async (assistantContent: string) => {
    if (!taskContext?.taskId || !taskContext.pathId || taskFeedbackSyncedRef.current.has(taskContext.taskId)) {
      return;
    }

    const quality: "light" | "solid" | "deep" =
      assistantContent.length > 800 ? "deep" : assistantContent.length > 300 ? "solid" : "light";
    const normalizedPlanId = taskContext.pathId.startsWith("plan_") ? taskContext.pathId : undefined;

    try {
      const response = await fetch("/api/path/focus/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(normalizedPlanId ? { planId: normalizedPlanId } : {}),
          taskId: taskContext.taskId,
          nodeId: taskContext.taskId,
          nodeLabel: taskContext.taskTitle || taskContext.taskId,
          relatedNodes: [],
          quality,
        }),
      });

      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error?.message || data?.error || "反馈写回失败");
      }

      taskFeedbackSyncedRef.current.add(taskContext.taskId);

      if (process.env.NODE_ENV !== "production") {
        console.debug("[workspace:path-feedback] synced", {
          taskId: taskContext.taskId,
          planId: normalizedPlanId ?? null,
          quality,
        });
      }
    } catch (error) {
      console.error("同步任务学习反馈失败:", error);
    }
  }, [taskContext]);

  const runSessionAction = useCallback(async (action: () => Promise<void>) => {
    const queued = sessionActionQueueRef.current.then(async () => {
      setIsSessionActionPending(true);
      try {
        await action();
      } finally {
        setIsSessionActionPending(false);
      }
    });

    sessionActionQueueRef.current = queued.catch(() => undefined);
    await queued;
  }, []);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    try {
      await runSessionAction(async () => {
        await selectSession(sessionId);
      });
      toast.success("已加载对话");
    } catch (error) {
      console.error("加载对话失败:", error);
      toast.error("加载对话失败");
    }
  }, [runSessionAction, selectSession]);

  const handleStartNewConversation = useCallback(async () => {
    try {
      await runSessionAction(async () => {
        await startNewConversation();
      });
      toast.success("已开始新对话");
    } catch (error) {
      console.error("创建新对话失败:", error);
      toast.error("创建新对话失败");
    }
  }, [runSessionAction, startNewConversation]);

  const requestDeleteSession = useCallback((sessionId: string, title: string) => {
    setPendingDeleteSession({ id: sessionId, title });
  }, []);

  const handleConfirmDeleteSession = useCallback(async () => {
    if (!pendingDeleteSession) {
      return;
    }

    const deletingSession = pendingDeleteSession;
    setPendingDeleteSession(null);

    try {
      await runSessionAction(async () => {
        const deletingActiveSession = currentSessionId === deletingSession.id;
        const fallbackSessionId = deletingActiveSession
          ? (recentSessions.find((session) => session.id !== deletingSession.id)?.id ?? null)
          : currentSessionId;

        await deleteSession(deletingSession.id);
        await refreshSessions(fallbackSessionId);
      });
      toast.success("已删除对话");
    } catch (error) {
      console.error("删除对话失败:", error);
      toast.error("删除对话失败");
    }
  }, [currentSessionId, deleteSession, pendingDeleteSession, recentSessions, refreshSessions, runSessionAction]);

  const handleSendMessage = useCallback(
    async (overrideMessage?: string) => {
      const effectiveMessage = overrideMessage ?? inputValue;
      if (kbQAMode && kbDocuments.length === 0) {
        toast.error("知识库中没有文档，请先添加文档或切换到普通对话模式");
        return;
      }

      await sendMessage({
        inputValue: effectiveMessage,
        uploadedImages,
        kbQAMode,
        kbDocuments,
        modelConfig,
        currentTeacher,
        taskContext,
        onAssistantResponse: syncTaskFocusFeedback,
      });
      setInputValue("");
      setUploadedImages([]);
    },
    [currentTeacher, inputValue, kbDocuments, kbQAMode, modelConfig, sendMessage, syncTaskFocusFeedback, taskContext, uploadedImages]
  );

  useEffect(() => {
    if (!taskContext?.autoStart || !inputValue.trim() || isLoading || pathContextSentTaskRef.current === taskContext.taskId) {
      return;
    }

    pathContextSentTaskRef.current = taskContext.taskId || null;
    void handleSendMessage(inputValue);
  }, [handleSendMessage, inputValue, isLoading, taskContext?.autoStart, taskContext?.taskId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handleOpenLearningPack = useCallback(async (graphUrl: string, packTitle: string) => {
    try {
      const parsedUrl = new URL(graphUrl, window.location.origin);
      const packId = parsedUrl.searchParams.get("packId");
      if (!packId) {
        window.location.href = graphUrl;
        return;
      }

      const response = await fetch(`/api/graph/view?packId=${encodeURIComponent(packId)}`, {
        credentials: "include",
      });

      if (!response.ok) {
        toast.error(`无法打开「${packTitle}」，请稍后重试。`);
        return;
      }

      const payload = (await response.json()) as GraphViewProbeResponse;
      const data = payload.data ?? payload;
      if (data.packMissing) {
        toast.error(`「${packTitle}」已失效（关联文档已删除），请重新生成学习路径。`);
        return;
      }

      const nodes = Array.isArray(data.nodes) ? data.nodes : [];
      const hasLinkedKbDoc = nodes.some(
        (node) => typeof node.kbDocumentId === "string" && node.kbDocumentId.trim().length > 0
      );

      if (!hasLinkedKbDoc) {
        toast.error(`「${packTitle}」没有可用知识文档，请重新生成学习路径。`);
        return;
      }

      window.location.href = graphUrl;
    } catch {
      toast.error(`打开「${packTitle}」失败，请稍后重试。`);
    }
  }, []);

  const quickActions = [
    { icon: Brain, label: "解释概念", prompt: "请解释一下" },
    { icon: Lightbulb, label: "生成练习", prompt: "我想练习" },
    { icon: BookOpen, label: "学习路径", prompt: "我想学习" },
    { icon: Target, label: "检查理解", prompt: "测试我对...的理解" },
  ];

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <LoginPrompt title="学习工作区" />;
  }

  return (
    <WorkspaceRailsLayout
      leftCollapsed={workspaceLeftCollapsed}
      rightCollapsed={workspaceRightCollapsed}
      onExpandLeft={() => setWorkspaceLeftCollapsed(false)}
      onExpandRight={() => setWorkspaceRightCollapsed(false)}
      left={
        <motion.div
          data-testid="workspace-left-rail"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="w-[280px] border-r bg-white/50 backdrop-blur-sm flex flex-col flex-shrink-0"
        >
          <div className="p-4 border-b bg-white/80 flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-2 text-foreground">
              <History className="h-4 w-4" />
              历史会话
            </h2>
            <div className="flex items-center gap-1">
              <Button
                data-testid="workspace-left-rail-collapse"
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                onClick={() => setWorkspaceLeftCollapsed(true)}
                title="收起"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                onClick={() => void handleStartNewConversation()}
                disabled={isSessionActionPending}
                title="新对话"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 scrollbar-thin space-y-2">
            {recentSessions.length === 0 ? (
              <div className="text-center p-6 text-muted-foreground flex flex-col items-center">
                <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">暂无历史记录</p>
              </div>
            ) : (
              recentSessions.slice(0, 10).map((session) => (
                <div
                  key={session.id}
                  onClick={() => void handleSelectSession(session.id)}
                  className={cn(
                    "group p-3 rounded-xl cursor-pointer transition-all border",
                    currentSessionId === session.id
                      ? "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 shadow-sm"
                      : "bg-white/60 border-transparent hover:border-orange-100 hover:bg-white hover:shadow-sm"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-foreground truncate">{session.title}</h4>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                        <span className="truncate">{session.messageCount} 条消息</span>
                        <span>•</span>
                        <span className="truncate" suppressHydrationWarning>
                          {isMounted ? new Date(session.updatedAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 -mr-1 -mt-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        requestDeleteSession(session.id, session.title);
                      }}
                      disabled={isSessionActionPending}
                      title="删除"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      }
      center={
        <div data-testid="workspace-main" className="flex-1 flex flex-col min-w-0 w-full">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="border-b bg-white/80 backdrop-blur-sm p-4 shadow-sm"
        >
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <motion.div
                className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {currentTeacher ? (
                  <span className="text-2xl">{currentTeacher.avatar}</span>
                ) : (
                  <Sparkles className="h-5 w-5 text-white" />
                )}
              </motion.div>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  学习工作区
                  {currentTeacher && (
                    <Badge variant="secondary" className="text-xs">
                      {currentTeacher.name}
                    </Badge>
                  )}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {taskContext?.taskTitle
                    ? `任务模式：${taskContext.taskTitle}（${Math.round(taskContext.taskProgress ?? 0)}%）`
                    : currentTeacher
                    ? currentTeacher.description
                    : '智能学习伙伴 · 随时为你答疑解惑'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <motion.div
                className="flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
              >
                <Switch
                  id="kb-qa-mode"
                  checked={kbQAMode}
                  onCheckedChange={(checked) => {
                    setKbQAMode(checked);
                    toast.success(checked ? "已切换到知识库问答模式" : "已切换到普通对话模式");
                  }}
                />
                <Label htmlFor="kb-qa-mode" className="text-sm cursor-pointer flex items-center gap-1">
                  {kbQAMode ? (
                    <>
                      <BookOpen className="h-3 w-3" />
                      知识库问答
                    </>
                  ) : (
                    <>
                      <MessageSquare className="h-3 w-3" />
                      普通对话
                    </>
                  )}
                </Label>
              </motion.div>
              <motion.div
                className="flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
              >
                <Switch
                  id="thinking"
                  checked={showThinking}
                  onCheckedChange={setShowThinking}
                />
                <Label htmlFor="thinking" className="text-sm cursor-pointer">
                  显示思考
                </Label>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          <div className="max-w-4xl mx-auto space-y-4">
            <AnimatePresence>
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: "easeOut"
                  }}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, delay: 0.1 }}
                      className={cn(
                        "p-2 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0",
                        message.mode === "kb-qa"
                          ? "bg-gradient-to-br from-purple-500 to-pink-500"
                          : "bg-gradient-to-br from-orange-500 to-rose-500"
                      )}
                    >
                      {message.mode === "kb-qa" ? (
                        <BookOpen className="h-4 w-4 text-white" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-white" />
                      )}
                    </motion.div>
                  )}

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className={cn(
                      "rounded-2xl p-4 max-w-[80%] shadow-sm transition-all hover:shadow-md",
                      message.role === "user"
                        ? message.mode === "kb-qa"
                          ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                          : "bg-gradient-to-br from-orange-500 to-rose-500 text-white"
                        : "bg-white border border-gray-200"
                    )}
                  >
                    {message.thinking && showThinking && (
                      <details className="mb-3 text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
                          <Brain className="h-4 w-4" />
                          思考过程
                        </summary>
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className="mt-2 p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg text-xs whitespace-pre-wrap border border-orange-100"
                        >
                          {message.thinking}
                        </motion.div>
                      </details>
                    )}
                    {message.toolSteps && message.toolSteps.length > 0 && showThinking && (
                      <details className="mb-3 text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
                          <Code className="h-4 w-4" />
                          工具调用轨迹（{message.toolSteps.length}）
                        </summary>
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className="mt-2 space-y-2"
                        >
                          {message.toolSteps.map((step, stepIndex) => (
                            <div
                              key={`${message.id}-tool-step-${stepIndex}`}
                              className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50/70 to-cyan-50/50 p-2"
                            >
                              <div className="text-xs font-medium text-blue-700">
                                {step.type === "tool_call" ? "调用" : "结果"} · {step.tool}
                              </div>
                              <div className="mt-1 text-xs whitespace-pre-wrap break-words text-gray-700">
                                {step.content}
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      </details>
                    )}
                    {message.images && message.images.length > 0 && (
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        {message.images.map((img, idx) => (
                          <motion.img
                            key={idx}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            src={img}
                            alt={`上传的图片 ${idx + 1}`}
                            className="rounded-lg border border-gray-200 max-h-48 object-cover"
                          />
                        ))}
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none">
                      <MarkdownRenderer content={message.content} />
                    </div>
                    {message.learningPack && (
                      <div className="mt-3 pt-2 border-t border-gray-100">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs h-8 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 hover:border-orange-300 hover:bg-orange-100"
                          onClick={() => {
                            void handleOpenLearningPack(
                              message.learningPack!.graphUrl,
                              message.learningPack!.title
                            );
                          }}
                        >
                          <Route className="h-3 w-3 mr-1.5" />
                          进入 {message.learningPack!.title}
                        </Button>
                      </div>
                    )}
                    <div className="text-xs opacity-70 mt-2 flex items-center justify-between">
                      <span suppressHydrationWarning>{isMounted ? message.timestamp.toLocaleTimeString() : ""}</span>
                      {message.mode && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs ml-2",
                            message.mode === "kb-qa"
                              ? "border-purple-300 text-purple-600"
                              : "border-orange-300 text-orange-600"
                          )}
                        >
                          {message.mode === "kb-qa" ? (
                            <>
                              <BookOpen className="h-3 w-3 mr-1" />
                              知识库
                            </>
                          ) : (
                            <>
                              <MessageSquare className="h-3 w-3 mr-1" />
                              对话
                            </>
                          )}
                        </Badge>
                      )}
                    </div>
                  </motion.div>

                  {message.role === "user" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, delay: 0.1 }}
                      className="p-2 rounded-full bg-gray-200 h-8 w-8 flex items-center justify-center flex-shrink-0"
                    >
                      <MessageSquare className="h-4 w-4 text-gray-600" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <div
                  className={cn(
                    "p-2 rounded-full h-8 w-8 flex items-center justify-center flex-shrink-0 animate-pulse",
                    kbQAMode
                      ? "bg-gradient-to-br from-purple-500 to-pink-500"
                      : "bg-gradient-to-br from-orange-500 to-rose-500"
                  )}
                >
                  {kbQAMode ? (
                    <BookOpen className="h-4 w-4 text-white" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-white" />
                  )}
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">
                      {kbQAMode ? "正在查询知识库..." : "正在思考..."}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="border-t bg-white/80 backdrop-blur-sm p-4 shadow-lg"
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-thin">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInputValue(action.prompt)}
                      className="flex-shrink-0 hover:bg-orange-50 hover:border-orange-300 transition-colors group"
                    >
                      <Icon className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                      {action.label}
                    </Button>
                  </motion.div>
                );
              })}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: quickActions.length * 0.05 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartNewConversation}
                  className="flex-shrink-0 hover:bg-green-50 hover:border-green-300 transition-colors group"
                >
                  <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  新对话
                </Button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (quickActions.length + 1) * 0.05 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportConversation}
                  className="flex-shrink-0 hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                >
                  <Download className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  导出对话
                </Button>
              </motion.div>
            </div>

            {/* Image Preview */}
            <AnimatePresence>
              {uploadedImages.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-3 flex gap-2 flex-wrap overflow-hidden"
                >
                  {uploadedImages.map((img, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative group"
                    >
                      <img
                        src={img}
                        alt={`预览 ${idx + 1}`}
                        className="h-20 w-20 object-cover rounded-lg border-2 border-orange-300"
                      />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </motion.button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || kbQAMode}
                  className="flex-shrink-0 hover:bg-orange-50 hover:border-orange-300"
                  title={kbQAMode ? "知识库问答模式不支持图片" : "上传图片"}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </motion.div>
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  kbQAMode
                    ? `基于知识库提问（${kbDocuments.length} 个文档）...`
                    : currentTeacher
                    ? `向${currentTeacher.name}提问...`
                    : "输入你的问题..."
                }
                className={cn(
                  "min-h-[60px] max-h-[200px] resize-none rounded-xl transition-all",
                  kbQAMode
                    ? "border-purple-300 focus:border-purple-400 focus:ring-purple-400"
                    : "border-gray-300 focus:border-orange-400 focus:ring-orange-400"
                )}
                disabled={isLoading}
              />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={() => void handleSendMessage()}
                  disabled={(!inputValue.trim() && uploadedImages.length === 0) || isLoading}
                  className={cn(
                    "shadow-md hover:shadow-lg transition-all",
                    kbQAMode
                      ? "bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      : "bg-gradient-to-br from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-2 text-xs text-muted-foreground flex items-center gap-2"
            >
              {kbQAMode ? (
                <>
                  <BookOpen className="h-3 w-3" />
                  <span>知识库问答模式 · {kbDocuments.length} 个文档</span>
                </>
              ) : currentTeacher ? (
                <>
                  <Sparkles className="h-3 w-3" />
                  <span>{currentTeacher.name} · {teachingStyleLabels[currentTeacher.teachingStyle]}</span>
                </>
              ) : (
                <>
                  <Lightbulb className="h-3 w-3" />
                  <span>请在右侧选择一位 AI 老师</span>
                </>
              )}
            </motion.div>
          </div>
        </motion.div>

        <Dialog
          open={pendingDeleteSession !== null}
          onOpenChange={(open) => {
            if (!open && !isSessionActionPending) {
              setPendingDeleteSession(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>删除对话</DialogTitle>
              <DialogDescription>
                {`确定要删除「${pendingDeleteSession?.title ?? "当前对话"}」吗？该操作不可撤销。`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPendingDeleteSession(null)}
                disabled={isSessionActionPending}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                onClick={() => void handleConfirmDeleteSession()}
                disabled={isSessionActionPending}
              >
                {isSessionActionPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                删除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      }
      right={
        <motion.div
          data-testid="workspace-right-rail"
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="w-80 border-l bg-white/50 backdrop-blur-sm overflow-hidden flex flex-col shrink-0"
        >
          {/* Tabs */}
          <div className="border-b bg-white/80 p-2 flex items-center gap-1 overflow-x-auto scrollbar-thin">
            <Button
              data-testid="workspace-right-rail-collapse"
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => setWorkspaceRightCollapsed(true)}
              title="收起"
            >
              <PanelRightClose className="h-4 w-4" />
            </Button>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant={activeTab === "status" ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab("status")}
                className={cn(
                  "flex-shrink-0 text-xs transition-all",
                  activeTab === "status" && "bg-gradient-to-r from-orange-500 to-rose-500 text-white"
                )}
              >
                <Settings className="h-3 w-3 mr-1" />
                状态
              </Button>
            </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={activeTab === "teachers" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("teachers")}
              className={cn(
                "flex-shrink-0 text-xs transition-all",
                activeTab === "teachers" && "bg-gradient-to-r from-orange-500 to-rose-500 text-white"
              )}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              老师
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={activeTab === "notes" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("notes")}
              className={cn(
                "flex-shrink-0 text-xs transition-all",
                activeTab === "notes" && "bg-gradient-to-r from-orange-500 to-rose-500 text-white"
              )}
            >
              <FileText className="h-3 w-3 mr-1" />
              笔记
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={activeTab === "plan" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("plan")}
              className={cn(
                "flex-shrink-0 text-xs transition-all",
                activeTab === "plan" && "bg-gradient-to-r from-orange-500 to-rose-500 text-white"
              )}
            >
              <Target className="h-3 w-3 mr-1" />
              计划
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={activeTab === "kb-qa" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("kb-qa")}
              className={cn(
                "flex-shrink-0 text-xs transition-all",
                activeTab === "kb-qa" && "bg-gradient-to-r from-orange-500 to-rose-500 text-white"
              )}
            >
              <Brain className="h-3 w-3 mr-1" />
              知识库
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              variant={activeTab === "history" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex-shrink-0 text-xs transition-all",
                activeTab === "history" && "bg-gradient-to-r from-orange-500 to-rose-500 text-white"
              )}
            >
              <History className="h-3 w-3 mr-1" />
              历史
            </Button>
          </motion.div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 p-4 overflow-y-auto scrollbar-thin"
          >
            {activeTab === "status" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ staggerChildren: 0.1 }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="shadow-sm hover:shadow-md transition-all duration-300 border-orange-100">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Settings className="h-4 w-4 text-orange-500" />
                        助手状态
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <motion.div
                        whileHover={{ x: 2 }}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-orange-50/50 transition-colors"
                      >
                        <span className="text-muted-foreground">对话模式</span>
                        <Badge
                          variant="default"
                          className={
                            kbQAMode
                              ? "bg-gradient-to-r from-purple-500 to-pink-500"
                              : "bg-gradient-to-r from-orange-500 to-rose-500"
                          }
                        >
                          {kbQAMode ? "知识库问答" : "普通对话"}
                        </Badge>
                      </motion.div>
                      <motion.div
                        whileHover={{ x: 2 }}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-orange-50/50 transition-colors"
                      >
                        <span className="text-muted-foreground">工作模式</span>
                        <Badge variant={socraticMode ? "default" : "secondary"} className={socraticMode ? "bg-gradient-to-r from-orange-500 to-rose-500" : ""}>
                          {socraticMode ? "苏格拉底" : "直接教学"}
                        </Badge>
                      </motion.div>
                      <motion.div
                        whileHover={{ x: 2 }}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-orange-50/50 transition-colors"
                      >
                        <span className="text-muted-foreground">对话轮数</span>
                        <Badge variant="outline" className="border-orange-300">{messages.length}</Badge>
                      </motion.div>
                      <motion.div
                        whileHover={{ x: 2 }}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-orange-50/50 transition-colors"
                      >
                        <span className="text-muted-foreground">状态</span>
                        <Badge variant={isLoading ? "default" : "secondary"} className={isLoading ? "bg-gradient-to-r from-orange-500 to-rose-500 animate-pulse" : ""}>
                          {isLoading ? "思考中" : "就绪"}
                        </Badge>
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="mt-4 shadow-sm hover:shadow-md transition-all duration-300 border-blue-100">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4 text-blue-500" />
                        可用工具
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      {[
                        { icon: BookOpen, label: "搜索知识宝库", desc: "查找相关文档", color: "blue", prompt: "搜索知识宝库:" },
                        { icon: Brain, label: "查询知识星图", desc: "获取知识关系", color: "purple", prompt: "查询知识星图:" },
                        { icon: Target, label: "生成练习", desc: "个性化题目", color: "green", prompt: "我想练习" },
                        { icon: Lightbulb, label: "知识星图", desc: "智能规划", color: "orange", prompt: "帮我规划知识星图" },
                        { icon: ImageIcon, label: "图片分析", desc: "多模态理解", color: "pink", prompt: "分析这张图片:" },
                      ].map((tool, idx) => {
                        const Icon = tool.icon;
                        return (
                          <motion.div
                            key={tool.label}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + idx * 0.05 }}
                            whileHover={{ x: 4, scale: 1.02 }}
                            className="flex items-start gap-2 p-2 rounded-lg hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 transition-all cursor-pointer"
                            onClick={() => setInputValue(tool.prompt)}
                          >
                            <div className={`p-1 rounded bg-${tool.color}-100`}>
                              <Icon className={`h-3 w-3 text-${tool.color}-600`} />
                            </div>
                            <div>
                              <div className="font-medium">{tool.label}</div>
                              <div className="text-muted-foreground">{tool.desc}</div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="mt-4 shadow-sm hover:shadow-md transition-all duration-300 border-purple-100">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-purple-500" />
                        使用提示
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs text-muted-foreground">
                      {[
                        "苏格拉底模式会引导你思考",
                        "可以查看助手的思考过程",
                        "支持上传图片进行分析",
                        "使用快捷按钮快速开始",
                        "Shift+Enter 换行，Enter 发送",
                      ].map((tip, idx) => (
                        <motion.p
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + idx * 0.05 }}
                          whileHover={{ x: 4 }}
                          className="flex items-center gap-2 hover:text-foreground transition-colors"
                        >
                          <span className="text-orange-500">•</span>
                          {tip}
                        </motion.p>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            )}

            {activeTab === "teachers" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <TeacherManager
                  currentTeacherId={currentTeacher?.id || ''}
                  onSelectTeacher={(teacher) => {
                    setCurrentTeacher(teacher);
                    toast.success(`已切换到${teacher.name}`);
                  }}
                />
              </motion.div>
            )}

            {activeTab === "notes" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <LearningNotes />
              </motion.div>
            )}

            {activeTab === "plan" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <LearningPlanner documents={kbDocuments} />
              </motion.div>
            )}

            {activeTab === "kb-qa" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full"
              >
                <KBQAAssistant documents={kbDocuments} />
              </motion.div>
            )}

            {activeTab === "history" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">对话历史</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void handleStartNewConversation()}
                    disabled={isSessionActionPending}
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    新对话
                  </Button>
                </div>

                {recentSessions.length === 0 ? (
                  <Card className="p-6 text-center">
                    <History className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">暂无历史记录</p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {recentSessions.slice(0, 10).map((session) => (
                      <Card
                        key={session.id}
                        className={cn(
                          "p-3 cursor-pointer hover:shadow-md transition-all",
                          currentSessionId === session.id && "border-orange-500 bg-orange-50"
                        )}
                        onClick={() => void handleSelectSession(session.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium truncate">{session.title}</h4>
                            <p className="text-xs text-muted-foreground">
                              {session.messageCount} 条消息
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(session.updatedAt).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDeleteSession(session.id, session.title);
                            }}
                            disabled={isSessionActionPending}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      }
    />
  );
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">加载中...</div>}>
      <WorkspacePageContent />
    </Suspense>
  );
}

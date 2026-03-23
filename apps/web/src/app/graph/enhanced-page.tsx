"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Network,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Download,
  Share2,
  Settings,
  Route,
  AlertCircle,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { InteractiveGraph } from "@/components/graph/interactive-graph";
import { NodeDetailPanel } from "@/components/graph/node-detail-panel";
import { LearningPathOverlay } from "@/components/graph/learning-path-overlay";
import { ProgressLegend } from "@/components/graph/progress-legend";
import { LoginPrompt } from "@/components/ui/login-prompt";
import { RecommendationEngine } from "@/lib/graph/recommendation-engine";
import { ProgressTracker } from "@/lib/graph/progress-tracker";
import { cn } from "@/lib/utils";
import { getGraphViewState, loadPrivateGraphView } from "./view-state";
import { toast } from "@/lib/toast";
import { pathStorage } from "@/lib/client/path-storage";
import type {
  GraphNode,
  GraphEdge,
  NodeDetail,
  LearningPath as GraphLearningPath,
  LayoutType,
  ThemeType,
  NodeType,
  NodeStatus,
} from "@/lib/graph/types";
import type { LearningPath as StoredLearningPath, Task as StoredPathTask } from "@/lib/client/path-storage";

// 节点类型配置
const NODE_TYPE_CONFIG = {
  concept: { label: "概念", color: "bg-purple-500" },
  topic: { label: "主题", color: "bg-blue-500" },
  resource: { label: "资源", color: "bg-pink-500" },
  skill: { label: "技能", color: "bg-orange-500" },
};

type GraphMode = "explore" | "path" | "today" | "incomplete";

type SidebarKBDoc = {
  id: string;
  title: string;
  tags: string[];
  summary?: string;
  content: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

function normalizeMode(view: string | null): GraphMode {
  if (view === "path" || view === "today" || view === "incomplete") {
    return view;
  }
  return "explore";
}

function GraphPageContent() {
  const { status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "explore";

  // 状态管理
  const [graphData, setGraphData] = useState<{
    nodes: GraphNode[];
    edges: GraphEdge[];
  }>({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [layout, setLayout] = useState<LayoutType>("force");
  const [theme, setTheme] = useState<ThemeType>("tech");
  const [activeTypeFilters, setActiveTypeFilters] = useState<Set<NodeType>>(
    new Set(["concept", "topic", "resource", "skill"])
  );
  const [activeStatusFilters, setActiveStatusFilters] = useState<Set<NodeStatus>>(
    new Set(["unlearned", "learning", "mastered", "review"])
  );
  const [showLearningPath, setShowLearningPath] = useState(false);
  const [currentPath, setCurrentPath] = useState<GraphLearningPath | null>(null);
  const [recommendedPaths, setRecommendedPaths] = useState<GraphLearningPath[]>([]);
  const [nodeDetail, setNodeDetail] = useState<NodeDetail | null>(null);
  const [isGraphLoading, setIsGraphLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<GraphMode>("explore");

  const [kbDoc, setKbDoc] = useState<SidebarKBDoc | null>(null);
  const [isKbDocLoading, setIsKbDocLoading] = useState(false);
  const [isEditingKb, setIsEditingKb] = useState(false);
  const [kbEditTitle, setKbEditTitle] = useState("");
  const [kbEditTags, setKbEditTags] = useState("");
  const [showPathDialog, setShowPathDialog] = useState(false);
  const [userPaths, setUserPaths] = useState<StoredLearningPath[]>([]);
  const [newPathTitle, setNewPathTitle] = useState("");

  useEffect(() => {
    setActiveMode(normalizeMode(view));
  }, [view]);

  useEffect(() => {
    const kbDocumentId = selectedNode?.kbDocumentId;

    if (!kbDocumentId) {
      setKbDoc(null);
      setIsKbDocLoading(false);
      setIsEditingKb(false);
      setKbEditTitle("");
      setKbEditTags("");
      return;
    }

    let isMounted = true;
    setIsKbDocLoading(true);
    setIsEditingKb(false);

    void (async () => {
      try {
        const { getDocumentFromServer } = await import("@/lib/client/kb-storage");
        const doc = await getDocumentFromServer(kbDocumentId);
        if (!isMounted) {
          return;
        }

        if (!doc) {
          setKbDoc(null);
          return;
        }

        const localTagsKey = `edunexus_graph_kb_tags_${doc.id}`;
        const localTagsRaw = typeof window !== "undefined" ? window.localStorage.getItem(localTagsKey) : null;
        const localTags = (() => {
          if (!localTagsRaw) {
            return null;
          }
          try {
            const parsed = JSON.parse(localTagsRaw) as unknown;
            if (!Array.isArray(parsed)) {
              return null;
            }
            const tags = parsed.filter((t): t is string => typeof t === "string").map((t) => t.trim()).filter(Boolean);
            return tags.length > 0 ? tags : null;
          } catch {
            return null;
          }
        })();

        const tagsFromServer = doc.tags ?? [];
        const tags = tagsFromServer.length > 0 ? tagsFromServer : localTags ?? [];

        setKbDoc({
          id: doc.id,
          title: doc.title,
          tags,
          summary: undefined,
          content: doc.content,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        });
        setKbEditTitle(doc.title || "");
        setKbEditTags(tags.join(", "));
      } catch {
        if (!isMounted) {
          return;
        }
        setKbDoc(null);
      } finally {
        if (isMounted) {
          setIsKbDocLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [selectedNode?.kbDocumentId]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setGraphData({ nodes: [], edges: [] });
      setRecommendedPaths([]);
      setIsGraphLoading(status === 'loading');
      return;
    }

    let isMounted = true;

    const initializeGraph = async () => {
      setIsGraphLoading(true);
      try {
        const data = await loadPrivateGraphView();
        if (!isMounted) {
          return;
        }

        setGraphData(data);
        const engine = new RecommendationEngine(data.nodes, data.edges);
        setRecommendedPaths(engine.recommendLearningPaths(3));
      } catch (error) {
        console.error("Failed to load graph view:", error);
        if (isMounted) {
          setGraphData({ nodes: [], edges: [] });
          setRecommendedPaths([]);
        }
      } finally {
        if (isMounted) {
          setIsGraphLoading(false);
        }
      }
    };

    void initializeGraph();

    return () => {
      isMounted = false;
    };
  }, [status]);

  // 筛选节点
  const filteredNodes = graphData.nodes.filter((node) => {
    // 类型筛选
    if (!activeTypeFilters.has(node.type)) return false;
    // 状态筛选
    if (!activeStatusFilters.has(node.status)) return false;
    // 搜索筛选
    if (
      searchQuery &&
      !node.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const filteredEdges = graphData.edges.filter((edge) => {
    const sourceId = typeof edge.source === "string" ? edge.source : edge.source.id;
    const targetId = typeof edge.target === "string" ? edge.target : edge.target.id;
    return (
      filteredNodes.some((n) => n.id === sourceId) &&
      filteredNodes.some((n) => n.id === targetId)
    );
  });

  // 计算进度统计
  const stats = ProgressTracker.calculateStats(graphData.nodes);

  // 处理节点点击
  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      setSelectedNode(node);

      // 生成节点详情
      const engine = new RecommendationEngine(graphData.nodes, graphData.edges);
      const nextSteps = engine.recommendNextSteps(node.id, 3);

      // 获取前置知识
      const prerequisites = graphData.edges
        .filter((e) => {
          const targetId = typeof e.target === "string" ? e.target : e.target.id;
          return targetId === node.id && e.type === "prerequisite";
        })
        .map((e) => {
          const sourceId = typeof e.source === "string" ? e.source : e.source.id;
          return graphData.nodes.find((n) => n.id === sourceId);
        })
        .filter((n): n is GraphNode => n !== undefined);

      setNodeDetail({
        node,
        prerequisites,
        nextSteps,
        relatedNotes: [
          {
            id: "note1",
            title: `${node.name} 学习笔记`,
            excerpt: "这是关于该知识点的学习笔记摘要...",
          },
        ],
        relatedPractices: [
          {
            id: "practice1",
            title: `${node.name} 练习题`,
            completed: node.practiceCompleted > 0,
          },
        ],
        learningProgress: {
          totalTime: Math.floor(Math.random() * 120) + 30,
          lastStudied: node.lastReviewedAt,
          reviewCount: Math.floor(Math.random() * 5),
        },
      });
    },
    [graphData]
  );

  // 切换类型筛选
  const toggleTypeFilter = (type: NodeType) => {
    const newFilters = new Set(activeTypeFilters);
    if (newFilters.has(type)) {
      newFilters.delete(type);
    } else {
      newFilters.add(type);
    }
    setActiveTypeFilters(newFilters);
  };

  // 选择学习路径
  const handleSelectPath = (path: GraphLearningPath) => {
    setCurrentPath(path);
    setShowLearningPath(true);
  };

  // 清除学习路径
  const handleClearPath = () => {
    setCurrentPath(null);
    setShowLearningPath(false);
  };

  // 导出图谱
  const handleExport = () => {
    toast("导出功能开发中，敬请期待", "info");
  };

  // 分享图谱
  const handleShare = () => {
    toast("分享功能开发中，敬请期待", "info");
  };

  const refreshGraphData = useCallback(async (nodeId?: string) => {
    const data = await loadPrivateGraphView();
    setGraphData(data);
    if (!nodeId) {
      return;
    }

    const nextSelectedNode = data.nodes.find((node) => node.id === nodeId) ?? null;
    setSelectedNode(nextSelectedNode);
  }, []);

  const buildPathTaskFromNode = useCallback((node: GraphNode): StoredPathTask => {
    return {
      id: node.id,
      title: node.name,
      description: `来自知识星图节点「${node.name}」`,
      estimatedTime: "30m",
      progress: 0,
      status: "not_started",
      dependencies: [],
      resources: [],
      notes: "",
      createdAt: new Date(),
    };
  }, []);

  const loadUserPaths = useCallback(async () => {
    try {
      const paths = await pathStorage.getAllPaths();
      setUserPaths(paths);
    } catch {
      setUserPaths([]);
    }
  }, []);

  useEffect(() => {
    if (!selectedNode || status !== "authenticated") {
      setUserPaths([]);
      return;
    }

    void loadUserPaths();
  }, [loadUserPaths, selectedNode, status]);

  const handleAddNodeToPath = useCallback(
    async (pathId: string) => {
      if (!selectedNode) {
        return;
      }

      const targetPath = userPaths.find((path) => path.id === pathId) ?? (await pathStorage.getPath(pathId));
      if (!targetPath) {
        toast("路径不存在", "error");
        return;
      }

      const alreadyInPath = targetPath.tasks.some((task) => task.id === selectedNode.id);
      if (alreadyInPath) {
        toast("该节点已在路径中", "info");
        setShowPathDialog(false);
        return;
      }

      await pathStorage.updatePath(pathId, {
        tasks: [...targetPath.tasks, buildPathTaskFromNode(selectedNode)],
      });

      toast("路径操作已记录", "success");
      setShowPathDialog(false);
      await loadUserPaths();
      await refreshGraphData(selectedNode.id);
    },
    [buildPathTaskFromNode, loadUserPaths, refreshGraphData, selectedNode, userPaths]
  );

  const handleCreatePathWithNode = useCallback(async () => {
    if (!selectedNode) {
      return;
    }

    const title = newPathTitle.trim();
    if (!title) {
      toast("请输入路径名称", "info");
      return;
    }

    const initialTask = buildPathTaskFromNode(selectedNode);
    await pathStorage.createPath({
      title,
      description: `从知识星图创建，包含「${selectedNode.name}」`,
      status: "not_started",
      progress: 0,
      tags: ["graph"],
      tasks: [initialTask],
      milestones: [
        {
          id: `milestone_${Date.now()}`,
          title: "初始阶段",
          taskIds: [initialTask.id],
        },
      ],
    });

    toast("路径操作已记录", "success");
    setShowPathDialog(false);
    setNewPathTitle("");
    await loadUserPaths();
    await refreshGraphData(selectedNode.id);
  }, [buildPathTaskFromNode, loadUserPaths, newPathTitle, refreshGraphData, selectedNode]);

  const handleRemoveNodeFromPath = useCallback(
    async (pathId: string) => {
      if (!selectedNode) {
        return;
      }

      const targetPath = userPaths.find((path) => path.id === pathId) ?? (await pathStorage.getPath(pathId));
      if (!targetPath) {
        toast("路径不存在", "error");
        return;
      }

      const nextTasks = targetPath.tasks.filter((task) => task.id !== selectedNode.id);
      if (nextTasks.length === targetPath.tasks.length) {
        toast("该节点不在路径中", "info");
        return;
      }

      await pathStorage.updatePath(pathId, {
        tasks: nextTasks,
      });

      toast("已从路径移除", "success");
      await loadUserPaths();
      await refreshGraphData(selectedNode.id);
    },
    [loadUserPaths, refreshGraphData, selectedNode, userPaths]
  );

  const handleMasteryAction = useCallback(
    async (nodeId: string, action: "seen" | "understood" | "applied" | "mastered") => {
      const response = await fetch("/api/graph/mastery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId, action }),
      });

      if (!response.ok) {
        throw new Error("MASTERY_UPDATE_FAILED");
      }

      await refreshGraphData(nodeId);
    },
    [refreshGraphData]
  );

  const handleNeedsReviewAction = useCallback(
    async (nodeId: string, needsReview: boolean) => {
      const response = await fetch("/api/graph/mastery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId,
          action: needsReview ? "clearNeedsReview" : "setNeedsReview",
        }),
      });

      if (!response.ok) {
        throw new Error("REVIEW_UPDATE_FAILED");
      }

      await refreshGraphData(nodeId);
    },
    [refreshGraphData]
  );

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <LoginPrompt title="知识星图" />;
  }

  const viewState = getGraphViewState({
    isLoading: isGraphLoading,
    nodes: graphData.nodes,
  });

  if (viewState.kind === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载图谱中...</p>
        </div>
      </div>
    );
  }

  if (viewState.kind === "empty") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-lg rounded-3xl border bg-card p-10 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-foreground">{viewState.title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{viewState.description}</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button onClick={() => router.push('/kb')}>前往知识库</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="graph-workspace" className="min-h-screen flex flex-col bg-background">
      {/* 头部 */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="border-b bg-card/50 backdrop-blur-sm"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3"
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 180 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10"
              >
                <Network className="h-5 w-5 text-primary" />
              </motion.div>
              <div>
                <h1 className="text-xl font-semibold">知识星图</h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-sm text-muted-foreground"
                >
                  探索你的知识宇宙
                </motion.p>
              </div>
            </motion.div>

            {/* 搜索和控制 */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3"
            >
              <div data-testid="graph-mode-switcher" className="flex gap-1 rounded-lg bg-muted p-1">
                <button
                  onClick={() => router.push("/graph?view=explore")}
                  className={cn(
                    "rounded px-3 py-1 text-sm transition-colors",
                    activeMode === "explore" ? "bg-background shadow" : "hover:bg-background/60"
                  )}
                >
                  探索
                </button>
                <button
                  onClick={() => router.push("/graph?view=path")}
                  className={cn(
                    "rounded px-3 py-1 text-sm transition-colors",
                    activeMode === "path" ? "bg-background shadow" : "hover:bg-background/60"
                  )}
                >
                  路径
                </button>
                <button
                  onClick={() => router.push("/graph?view=today")}
                  className={cn(
                    "rounded px-3 py-1 text-sm transition-colors",
                    activeMode === "today" ? "bg-background shadow" : "hover:bg-background/60"
                  )}
                >
                  今日
                </button>
                <button
                  onClick={() => router.push("/graph?view=incomplete")}
                  className={cn(
                    "rounded px-3 py-1 text-sm transition-colors",
                    activeMode === "incomplete" ? "bg-background shadow" : "hover:bg-background/60"
                  )}
                >
                  未完
                </button>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="relative w-64"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索节点..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area: Top Stats + 3-Column Layout */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
        {/* Top Stats Bar */}
        <div data-testid="graph-stats-bar" className="flex gap-4 p-3 bg-card/50 rounded-lg border shrink-0">
          <div className="text-sm">
            <span className="text-muted-foreground">星球</span>
            <span className="ml-2 font-semibold">{graphData.nodes.length}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">已掌握</span>
            <span className="ml-2 font-semibold text-green-500">
              {graphData.nodes.filter(n => n.masteryStage === "mastered").length}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">应用中</span>
            <span className="ml-2 font-semibold text-yellow-500">
              {graphData.nodes.filter(n => n.masteryStage === "applied").length}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">理解中</span>
            <span className="ml-2 font-semibold text-blue-500">
              {graphData.nodes.filter(n => n.masteryStage === "understood").length}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">已见</span>
            <span className="ml-2 font-semibold text-gray-400">
              {graphData.nodes.filter(n => n.masteryStage === "seen").length}
            </span>
          </div>
        </div>

        {/* 3-Column Layout */}
        <div className="flex-1 flex min-h-0 gap-4">
          {/* Left Filters */}
          <div className="w-64 shrink-0 flex flex-col gap-6 bg-card/30 rounded-lg border p-4 overflow-y-auto">
            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Filter className="h-4 w-4" /> 节点类型
              </h3>
              <div className="flex flex-col gap-2">
                {Object.entries(NODE_TYPE_CONFIG).map(([type, config]) => {
                  const isActive = activeTypeFilters.has(type as NodeType);
                  return (
                    <Button
                      key={type}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleTypeFilter(type as NodeType)}
                      className={cn("justify-start", isActive && "bg-primary/10 text-primary hover:bg-primary/20")}
                    >
                      <div className={cn("w-2 h-2 rounded-full mr-2", config.color)} />
                      {config.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Settings className="h-4 w-4" /> 布局与主题
              </h3>
              <div className="flex flex-col gap-3">
                <Select value={layout} onValueChange={(v) => setLayout(v as LayoutType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择布局" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="force">力导向布局</SelectItem>
                    <SelectItem value="hierarchical">层次布局</SelectItem>
                    <SelectItem value="radial">径向布局</SelectItem>
                    <SelectItem value="timeline">时间轴布局</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={theme} onValueChange={(v) => setTheme(v as ThemeType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择主题" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tech">科技风</SelectItem>
                    <SelectItem value="nature">自然风</SelectItem>
                    <SelectItem value="minimal">简约风</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Route className="h-4 w-4" /> 学习路径
              </h3>
              <Button
                variant={showLearningPath ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => setShowLearningPath(!showLearningPath)}
              >
                {showLearningPath ? "隐藏推荐路径" : "显示推荐路径"}
              </Button>
            </div>
          </div>

          {/* Center Canvas */}
          <div className="flex-1 relative bg-card/20 rounded-lg border overflow-hidden">
            <InteractiveGraph
              nodes={filteredNodes}
              edges={filteredEdges}
              selectedNode={selectedNode}
              onNodeClick={handleNodeClick}
              onNodeHover={setHoveredNode}
              layout={layout}
              theme={theme}
              showLearningPath={showLearningPath}
              pathNodes={currentPath?.nodes || []}
            />
            {/* 进度图例 */}
            <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
              <ProgressLegend stats={stats} />
            </div>

            {/* 学习路径叠加层 */}
            {showLearningPath && (
              <div className="absolute top-4 right-4 z-10 w-80">
                <LearningPathOverlay
                  paths={recommendedPaths}
                  currentPath={currentPath}
                  nodes={graphData.nodes}
                  onSelectPath={handleSelectPath}
                  onClearPath={handleClearPath}
                />
              </div>
            )}
          </div>

          {/* Right Sidebar (Conditional) */}
          {selectedNode && (
            <div data-testid="graph-planet-sidebar" className="w-80 shrink-0 border bg-card rounded-lg overflow-y-auto flex flex-col">
              {/* Section 1: Summary */}
              <div data-testid="graph-sidebar-summary" className="p-4 border-b">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-xl font-bold leading-tight">
                    {selectedNode.name || (selectedNode as any).label}
                  </h2>
                  {(selectedNode as any).needsReview && (
                    <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600">
                      复习
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="secondary">
                    {NODE_TYPE_CONFIG[selectedNode.type]?.label || selectedNode.type}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {nodeDetail?.relatedNotes?.[0]?.excerpt || "暂无相关描述信息..."}
                </p>
              </div>

              {/* Section 2: Quick Learning Actions */}
              <div data-testid="graph-sidebar-learning-actions" className="p-4 border-b">
                <h3 className="text-sm font-medium mb-3">学习状态</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(["seen", "understood", "applied", "mastered"] as const).map((stage) => {
                    const stageLabels = {
                      seen: "已见",
                      understood: "理解",
                      applied: "应用",
                      mastered: "掌握"
                    };
                    const isActive = selectedNode.masteryStage === stage;
                    return (
                      <Button
                        key={stage}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={async () => {
                          if (!selectedNode) {
                            return;
                          }
                          try {
                            await handleMasteryAction(selectedNode.id, stage);
                            toast(`已标记为${stageLabels[stage]}`, "success");
                          } catch {
                            toast("更新失败", "error");
                          }
                        }}
                        className={cn("w-full", isActive && "ring-2 ring-primary ring-offset-1")}
                      >
                        {stageLabels[stage]}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!selectedNode) {
                      return;
                    }
                    try {
                      await handleNeedsReviewAction(selectedNode.id, Boolean(selectedNode.needsReview));
                      toast(selectedNode.needsReview ? "已取消复习" : "已加入复习", "success");
                    } catch {
                      toast("更新失败", "error");
                    }
                  }}
                  className={cn(
                    "mt-2 w-full",
                    selectedNode.needsReview &&
                      "border-orange-500 bg-orange-500/20 text-orange-500 hover:bg-orange-500/25"
                  )}
                >
                  🔄 复习
                </Button>
              </div>

              {/* Section 3: Path Actions */}
              <div data-testid="graph-sidebar-path-actions" className="p-4 border-b">
                <h3 className="text-sm font-medium mb-3">路径信息</h3>
                {selectedNode.pathMemberships && selectedNode.pathMemberships.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    <p className="text-xs text-muted-foreground">当前星球所在路径：</p>
                    {selectedNode.pathMemberships.map((membership) => (
                      <div
                        key={membership.pathId}
                        className="flex items-center justify-between gap-2 rounded bg-muted p-2 text-sm"
                      >
                        <div className="min-w-0">
                          <span className="font-medium truncate">{membership.pathName}</span>
                          <span className="ml-2 text-xs text-muted-foreground">阶段: {membership.stage}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            void handleRemoveNodeFromPath(membership.pathId);
                          }}
                          className="text-xs text-destructive hover:underline"
                        >
                          移除
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mb-3">尚未在任何路径中</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setShowPathDialog(true);
                  }}
                >
                  <Route className="h-4 w-4 mr-2" />
                  添加到路径
                </Button>
              </div>

              {/* Section 4: Content Info */}
              <div data-testid="graph-sidebar-content-info" className="p-4 border-b">
                <div className="space-y-3">
                  <h3 className="text-sm font-medium">文档信息</h3>

                  {!selectedNode.kbDocumentId ? (
                    <p className="text-xs text-muted-foreground">该星球未关联知识库文档。</p>
                  ) : isKbDocLoading ? (
                    <p className="text-xs text-muted-foreground">加载中...</p>
                  ) : kbDoc ? (
                    <>
                      {isEditingKb ? (
                        <div className="space-y-2">
                          <Input
                            value={kbEditTitle}
                            onChange={(e) => setKbEditTitle(e.target.value)}
                            className="text-sm"
                            placeholder="文档标题"
                          />
                          <Input
                            value={kbEditTags}
                            onChange={(e) => setKbEditTags(e.target.value)}
                            className="text-sm"
                            placeholder="标签（逗号分隔）"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={async () => {
                                if (!kbDoc) {
                                  return;
                                }

                                const nodeId = selectedNode?.id;
                                const tags = kbEditTags
                                  .split(",")
                                  .map((t) => t.trim())
                                  .filter(Boolean);

                                try {
                                  const { updateDocumentOnServer, getDocumentFromServer } = await import(
                                    "@/lib/client/kb-storage"
                                  );

                                  await updateDocumentOnServer(kbDoc.id, {
                                    title: kbEditTitle,
                                    content: kbDoc.content,
                                    tags,
                                  });

                                  const localTagsKey = `edunexus_graph_kb_tags_${kbDoc.id}`;
                                  window.localStorage.setItem(localTagsKey, JSON.stringify(tags));

                                  const refreshed = await getDocumentFromServer(kbDoc.id);
                                  if (refreshed) {
                                    const refreshedTags = refreshed.tags ?? [];
                                    setKbDoc({
                                      id: refreshed.id,
                                      title: refreshed.title,
                                      content: refreshed.content,
                                      createdAt: refreshed.createdAt,
                                      updatedAt: refreshed.updatedAt,
                                      tags: refreshedTags.length > 0 ? refreshedTags : tags,
                                    });
                                  } else {
                                    setKbDoc((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            title: kbEditTitle,
                                            tags,
                                          }
                                        : prev
                                    );
                                  }

                                  setIsEditingKb(false);
                                  if (nodeId) {
                                    await refreshGraphData(nodeId);
                                  }
                                  toast("文档已更新", "success");
                                } catch {
                                  toast("更新失败", "error");
                                }
                              }}
                            >
                              保存
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setIsEditingKb(false);
                                setKbEditTitle(kbDoc.title || "");
                                setKbEditTags((kbDoc.tags || []).join(", "));
                              }}
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{kbDoc.title || "无标题"}</p>
                          {kbDoc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {kbDoc.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsEditingKb(true)}
                            className="text-xs px-2"
                          >
                            编辑
                          </Button>
                        </div>
                      )}

                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>创建</span>
                          <span>
                            {kbDoc.createdAt ? new Date(kbDoc.createdAt).toLocaleDateString() : "未知"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>更新</span>
                          <span>
                            {kbDoc.updatedAt ? new Date(kbDoc.updatedAt).toLocaleDateString() : "未知"}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/kb/${kbDoc.id}`)}
                          className="text-xs flex-1"
                        >
                          打开编辑器
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/kb/${kbDoc.id}`, "_blank")}
                          className="text-xs"
                          title="新窗口打开"
                        >
                          ↗
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">未找到文档或无权访问。</p>
                  )}
                </div>
              </div>

              {/* Section 5: AI Assistance */}
              <div data-testid="graph-sidebar-ai" className="p-4 bg-primary/5 rounded-b-lg flex-1">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" /> AI 学习助手
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                  AI 可以帮你总结核心知识点，并推荐相关的学习资料。
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => toast("AI 能力将在后续实现", "info")}
                >
                  生成总结
                </Button>
              </div>
            </div>
          )}
        </div>

        <Dialog open={showPathDialog} onOpenChange={setShowPathDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加到路径</DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                为「{selectedNode?.name ?? "当前星球"}」选择或创建路径
              </p>

              {userPaths.length > 0 ? (
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {userPaths.map((path) => (
                    <button
                      type="button"
                      key={path.id}
                      onClick={() => {
                        void handleAddNodeToPath(path.id);
                      }}
                      className="w-full rounded border p-2 text-left hover:bg-muted"
                    >
                      <p className="text-sm font-medium">{path.title}</p>
                      <p className="text-xs text-muted-foreground">{path.tasks.length} 个任务</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">暂无可用路径，请先创建一个新路径。</p>
              )}

              <div className="flex gap-2">
                <Input
                  value={newPathTitle}
                  onChange={(event) => setNewPathTitle(event.target.value)}
                  placeholder="新路径名称..."
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && newPathTitle.trim()) {
                      void handleCreatePathWithNode();
                    }
                  }}
                />
                <Button size="sm" onClick={() => void handleCreatePathWithNode()} disabled={!newPathTitle.trim()}>
                  创建
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function EnhancedGraphPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-12 w-12 rounded-full border-b-2 border-primary"></div>
        </div>
      }
    >
      <GraphPageContent />
    </Suspense>
  );
}

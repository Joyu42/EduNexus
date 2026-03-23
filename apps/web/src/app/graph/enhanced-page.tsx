"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import type {
  GraphNode,
  GraphEdge,
  NodeDetail,
  LearningPath,
  LayoutType,
  ThemeType,
  NodeType,
  NodeStatus,
} from "@/lib/graph/types";

// 节点类型配置
const NODE_TYPE_CONFIG = {
  concept: { label: "概念", color: "bg-purple-500" },
  topic: { label: "主题", color: "bg-blue-500" },
  resource: { label: "资源", color: "bg-pink-500" },
  skill: { label: "技能", color: "bg-orange-500" },
};

type GraphMode = "explore" | "path" | "today" | "incomplete";

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
  const [currentPath, setCurrentPath] = useState<LearningPath | null>(null);
  const [recommendedPaths, setRecommendedPaths] = useState<LearningPath[]>([]);
  const [nodeDetail, setNodeDetail] = useState<NodeDetail | null>(null);
  const [isGraphLoading, setIsGraphLoading] = useState(true);
  const [activeMode, setActiveMode] = useState<GraphMode>("explore");

  useEffect(() => {
    setActiveMode(normalizeMode(view));
  }, [view]);

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
  const handleSelectPath = (path: LearningPath) => {
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
    <div className="min-h-screen flex flex-col bg-background">
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
                  {filteredNodes.length} 个节点 · {filteredEdges.length} 条关系 ·{" "}
                  {(stats.completionRate * 100).toFixed(1)}% 完成
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
              <div className="flex gap-1 rounded-lg bg-muted p-1">
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

              {/* 布局选择 */}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Select value={layout} onValueChange={(v) => setLayout(v as LayoutType)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="force">力导向</SelectItem>
                    <SelectItem value="hierarchical">层次</SelectItem>
                    <SelectItem value="radial">径向</SelectItem>
                    <SelectItem value="timeline">时间轴</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>

              {/* 主题选择 */}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Select value={theme} onValueChange={(v) => setTheme(v as ThemeType)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tech">科技风</SelectItem>
                    <SelectItem value="nature">自然风</SelectItem>
                    <SelectItem value="minimal">简约风</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>

              {/* 功能按钮 */}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLearningPath(!showLearningPath)}
                  className={cn(
                    "transition-all",
                    showLearningPath && "bg-primary text-primary-foreground"
                  )}
                >
                  <Route className="h-4 w-4 mr-1" />
                  学习路径
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1, rotate: 15 }} whileTap={{ scale: 0.9 }}>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1, rotate: -15 }} whileTap={{ scale: 0.9 }}>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>
          </div>

          {/* 筛选器 */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center gap-2 mt-4"
          >
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">节点类型:</span>
            {Object.entries(NODE_TYPE_CONFIG).map(([type, config], index) => {
              const isActive = activeTypeFilters.has(type as NodeType);
              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleTypeFilter(type as NodeType)}
                    className={cn(
                      "h-7 transition-all",
                      isActive && "bg-gradient-to-r from-primary to-accent shadow-md"
                    )}
                  >
                    {config.label}
                  </Button>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </motion.div>

      {/* 主内容区 */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* 图谱画布 */}
        <div className="flex-1 relative">
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
          <ProgressLegend stats={stats} />
        </div>

        {/* 学习路径叠加层 - 移到外层避免影响布局 */}
        {showLearningPath && (
          <LearningPathOverlay
            paths={recommendedPaths}
            currentPath={currentPath}
            nodes={graphData.nodes}
            onSelectPath={handleSelectPath}
            onClearPath={handleClearPath}
          />
        )}

        {/* 节点详情面板 */}
        {selectedNode && nodeDetail && (
          <NodeDetailPanel
            detail={nodeDetail}
            onClose={() => {
              setSelectedNode(null);
              setNodeDetail(null);
            }}
            onNavigate={(nodeId) => {
              const node = graphData.nodes.find((n) => n.id === nodeId);
              if (node) handleNodeClick(node);
            }}
          />
        )}
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

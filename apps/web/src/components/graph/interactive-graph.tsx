"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GraphNode, GraphEdge, LayoutType, ThemeType } from "@/lib/graph/types";
import { LayoutAlgorithms } from "@/lib/graph/layout-algorithms";

// 动态导入以避免 SSR 问题
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-muted-foreground">加载图谱中...</div>
    </div>
  ),
});

const MASTERY_COLORS = {
  seen: "#6b7280",
  understood: "#3b82f6",
  applied: "#f59e0b",
  mastered: "#10b981",
} as const;

const CATEGORY_HUES: Record<string, string> = {
  general: "",
  math: "#8b5cf6",
  science: "#06b6d4",
  language: "#f97316",
  history: "#84cc16",
};

const MASTERY_SIZE_MAP = {
  seen: 0.6,
  understood: 0.8,
  applied: 1.0,
  mastered: 1.3,
} as const;

function hexToRgb(hex: string): [number, number, number] | null {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length !== 6) {
    return null;
  }

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return null;
  }

  return [r, g, b];
}

function mixCategoryWithMastery(categoryHex: string, masteryHex: string): string {
  const categoryRgb = hexToRgb(categoryHex);
  const masteryRgb = hexToRgb(masteryHex);
  if (!categoryRgb || !masteryRgb) {
    return masteryHex;
  }

  const mixRatio = 0.35;
  const r = Math.round(categoryRgb[0] * mixRatio + masteryRgb[0] * (1 - mixRatio));
  const g = Math.round(categoryRgb[1] * mixRatio + masteryRgb[1] * (1 - mixRatio));
  const b = Math.round(categoryRgb[2] * mixRatio + masteryRgb[2] * (1 - mixRatio));

  return `rgb(${r}, ${g}, ${b})`;
}

// 主题配置
const THEMES = {
  tech: {
    background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e3a8a 100%)",
    particleColor: "#ffffff",
    glowColor: "#818cf8",
  },
  nature: {
    background: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 50%, #a855f7 100%)",
    particleColor: "#ffffff",
    glowColor: "#c084fc",
  },
  minimal: {
    background: "linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)",
    particleColor: "#ffffff",
    glowColor: "#94a3b8",
  },
};

interface InteractiveGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  onNodeClick: (node: GraphNode) => void;
  onNodeHover: (node: GraphNode | null) => void;
  layout: LayoutType;
  theme: ThemeType;
  showLearningPath?: boolean;
  pathNodes?: string[];
}

export function InteractiveGraph({
  nodes,
  edges,
  selectedNode,
  onNodeClick,
  onNodeHover,
  layout,
  theme,
  showLearningPath = false,
  pathNodes = [],
}: InteractiveGraphProps) {
  const graphRef = useRef<any>(null);
  const [layoutedNodes, setLayoutedNodes] = useState<GraphNode[]>(nodes);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // 应用布局算法
  useEffect(() => {
    const newNodes = LayoutAlgorithms.applyLayout(
      nodes,
      edges,
      layout,
      undefined
    );
    setLayoutedNodes(newNodes);
  }, [nodes, edges, layout]);

  // 只在初始化时自动缩放一次
  useEffect(() => {
    if (graphRef.current && layoutedNodes.length > 0 && !hasInitialized) {
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 50);
        setHasInitialized(true);
      }, 100);
    }
  }, [layoutedNodes, hasInitialized]);

  // 配置 d3 力导向参数
  useEffect(() => {
    if (!graphRef.current) return;
    const fg = graphRef.current;
    fg.d3Force('charge')?.strength(-400).distanceMax(600);
    fg.d3Force('link')?.distance(120).strength(0.4);
    fg.d3Force('center')?.strength(0.05);
  }, []);

  const handleNodeClick = useCallback(
    (node: any) => {
      onNodeClick(node as GraphNode);
    },
    [onNodeClick]
  );

  const handleNodeHover = useCallback(
    (node: any) => {
      const graphNode = node as GraphNode | null;
      setHoveredNode(graphNode);
      onNodeHover(graphNode);
    },
    [onNodeHover]
  );

  // 绘制节点
  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const graphNode = node as GraphNode;
      const label = graphNode.name;
      const fontSize = 11 / globalScale;

      const masteryStage = graphNode.masteryStage ?? "seen";
      const masteryColor = MASTERY_COLORS[masteryStage];
      const categoryHue = CATEGORY_HUES[graphNode.category ?? "general"];
      const nodeColor = categoryHue
        ? mixCategoryWithMastery(categoryHue, masteryColor)
        : masteryColor;

      // Obsidian 风格 - 节点大小更小更精致
      const baseSize = 5;
      const importanceSize = graphNode.importance * 6;
      const connectionSize = Math.min(graphNode.connections * 0.5, 3);
      const masteryMultiplier = MASTERY_SIZE_MAP[masteryStage] ?? 0.8;
      const nodeSize = (baseSize + importanceSize + connectionSize) * masteryMultiplier;

      // 绘制外层光晕 - 更柔和
      const gradient = ctx.createRadialGradient(
        graphNode.x || 0,
        graphNode.y || 0,
        nodeSize * 0.3,
        graphNode.x || 0,
        graphNode.y || 0,
        nodeSize * 1.8
      );
      gradient.addColorStop(0, nodeColor);
      gradient.addColorStop(0.4, nodeColor + "60");
      gradient.addColorStop(1, nodeColor + "00");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(graphNode.x || 0, graphNode.y || 0, nodeSize * 1.8, 0, 2 * Math.PI);
      ctx.fill();

      // 绘制节点主体
      ctx.beginPath();
      ctx.arc(graphNode.x || 0, graphNode.y || 0, nodeSize, 0, 2 * Math.PI);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      if (graphNode.needsReview) {
        const time = Date.now() / 1000;
        const pulsePhase = (Math.sin(time * 2) + 1) / 2;
        const pulseRadius = nodeSize * (1.5 + pulsePhase * 0.8);
        const pulseAlpha = 0.3 + pulsePhase * 0.3;

        ctx.beginPath();
        ctx.arc(graphNode.x || 0, graphNode.y || 0, pulseRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(249, 115, 22, ${pulseAlpha})`;
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      }

      // 绘制细边框
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1 / globalScale;
      ctx.stroke();

      // 绘制高光
      const highlightGradient = ctx.createRadialGradient(
        (graphNode.x || 0) - nodeSize * 0.3,
        (graphNode.y || 0) - nodeSize * 0.3,
        0,
        graphNode.x || 0,
        graphNode.y || 0,
        nodeSize
      );
      highlightGradient.addColorStop(0, "rgba(255, 255, 255, 0.5)");
      highlightGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = highlightGradient;
      ctx.fill();

      // 选中或悬停时的边框
      if (selectedNode?.id === graphNode.id || hoveredNode?.id === graphNode.id) {
        ctx.beginPath();
        ctx.arc(graphNode.x || 0, graphNode.y || 0, nodeSize, 0, 2 * Math.PI);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.5 / globalScale;
        ctx.shadowColor = nodeColor;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // 绘制标签 - Obsidian 风格
      if (globalScale > 0.5) {
        ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // 标签背景
        const textWidth = ctx.measureText(label).width;
        const padding = 4 / globalScale;
        const bgHeight = fontSize + padding * 2;
        const bgY = (graphNode.y || 0) + nodeSize + fontSize / 2 + 6;

        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(
          (graphNode.x || 0) - textWidth / 2 - padding,
          bgY - bgHeight / 2,
          textWidth + padding * 2,
          bgHeight
        );

        // 标签文字
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, graphNode.x || 0, bgY);
      }
    },
    [selectedNode, hoveredNode]
  );

  // 绘制连接线
  const linkColor = useCallback(
    (link: any) => {
      const graphLink = link as GraphEdge;
      const sourceId =
        typeof graphLink.source === "string"
          ? graphLink.source
          : graphLink.source.id;
      const targetId =
        typeof graphLink.target === "string"
          ? graphLink.target
          : graphLink.target.id;

      // 学习路径高亮
      if (
        showLearningPath &&
        pathNodes.includes(sourceId) &&
        pathNodes.includes(targetId)
      ) {
        return "#60a5fa";
      }

      // Obsidian 风格 - 非常细的半透明线
      return "rgba(148, 163, 184, 0.25)";
    },
    [showLearningPath, pathNodes]
  );

  // 连接线宽度 - Obsidian 风格更细
  const linkWidth = useCallback((link: any) => {
    const graphLink = link as GraphEdge;
    const sourceId = typeof graphLink.source === "string" ? graphLink.source : graphLink.source.id;
    const targetId = typeof graphLink.target === "string" ? graphLink.target : graphLink.target.id;

    if (showLearningPath && pathNodes.includes(sourceId) && pathNodes.includes(targetId)) {
      return 2;
    }
    return 0.8;
  }, [showLearningPath, pathNodes]);

  const linkDirectionalParticles = useCallback((link: any) => {
    const graphLink = link as GraphEdge;
    const sourceId = typeof graphLink.source === "string" ? graphLink.source : graphLink.source.id;
    const targetId = typeof graphLink.target === "string" ? graphLink.target : graphLink.target.id;
    if (showLearningPath && pathNodes.includes(sourceId) && pathNodes.includes(targetId)) {
      return 3;
    }
    return 0;
  }, [showLearningPath, pathNodes]);

  const linkDirectionalParticleColor = useCallback((link: any) => {
    const graphLink = link as GraphEdge;
    const sourceId = typeof graphLink.source === "string" ? graphLink.source : graphLink.source.id;
    const targetId = typeof graphLink.target === "string" ? graphLink.target : graphLink.target.id;
    if (showLearningPath && pathNodes.includes(sourceId) && pathNodes.includes(targetId)) {
      return "#60a5fa";
    }
    return "rgba(148, 163, 184, 0.55)";
  }, [showLearningPath, pathNodes]);

  return (
    <div
      className="w-full h-full relative overflow-hidden"
      style={{ background: THEMES[theme].background, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* 背景装饰 - 添加一些动态光点 */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <ForceGraph2D
        ref={graphRef}
        graphData={{ nodes: layoutedNodes, links: edges }}
        nodeLabel="name"
        nodeCanvasObject={nodeCanvasObject}
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkDirectionalParticles={linkDirectionalParticles}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.003}
        linkDirectionalParticleColor={linkDirectionalParticleColor}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        cooldownTicks={layout === "force" ? 200 : 0}
        warmupTicks={50}
        enableNodeDrag={layout === "force"}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        d3AlphaDecay={0.03}
        d3VelocityDecay={0.35}
      />
    </div>
  );
}

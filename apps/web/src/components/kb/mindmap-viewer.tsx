/**
 * 思维导图查看器 - 3D 增强版
 * 使用 React Flow 渲染思维导图，带有 3D 立体效果和科技感背景
 */

"use client";

import { useState, useCallback, useEffect, memo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  NodeProps,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Download, Maximize2, Zap } from "lucide-react";
import type { MindMapData } from "@/lib/ai/document-analyzer";

// 自定义 3D 节点组件
const CustomNode3D = memo(({ data, selected }: NodeProps) => {
  const nodeType = data.nodeType || "default";

  let bgGradient = "from-amber-100 via-amber-50 to-yellow-50";
  let borderColor = "border-amber-400";
  let glowColor = "rgba(251, 191, 36, 0.4)";
  let iconColor = "text-amber-600";

  if (nodeType === "root") {
    bgGradient = "from-orange-200 via-orange-100 to-amber-100";
    borderColor = "border-orange-500";
    glowColor = "rgba(249, 115, 22, 0.5)";
    iconColor = "text-orange-600";
  } else if (nodeType === "leaf") {
    bgGradient = "from-yellow-100 via-yellow-50 to-amber-50";
    borderColor = "border-yellow-400";
    glowColor = "rgba(234, 179, 8, 0.4)";
    iconColor = "text-yellow-600";
  }

  return (
    <div
      className={`
        relative px-4 py-3 rounded-xl border-2 ${borderColor}
        bg-gradient-to-br ${bgGradient}
        transition-all duration-300 ease-out
        ${selected ? "scale-110" : "hover:scale-105"}
        cursor-pointer group
      `}
      style={{
        boxShadow: selected
          ? `0 20px 40px -12px ${glowColor}, 0 8px 16px -4px ${glowColor}, inset 0 2px 4px rgba(255,255,255,0.8)`
          : `0 10px 25px -8px ${glowColor}, 0 4px 10px -2px rgba(0,0,0,0.1), inset 0 1px 2px rgba(255,255,255,0.6)`,
        transform: selected ? "translateZ(20px)" : "translateZ(0)",
        transformStyle: "preserve-3d",
      }}
    >
      {/* 3D 深度层 */}
      <div
        className="absolute inset-0 rounded-xl bg-gradient-to-br from-black/5 to-black/10 -z-10"
        style={{
          transform: "translateZ(-8px)",
          filter: "blur(4px)",
        }}
      />

      {/* 顶部高光 */}
      <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-white/60 rounded-full blur-sm" />

      {/* 内容 */}
      <div className="flex items-center gap-2 relative z-10">
        {nodeType === "root" && <Zap className={`w-4 h-4 ${iconColor}`} />}
        <span
          className={`
            ${nodeType === "root" ? "font-bold text-base" : "font-medium text-sm"}
            text-gray-800 drop-shadow-sm
          `}
        >
          {data.label}
        </span>
      </div>

      {/* 悬停光晕 */}
      <div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`,
          transform: "translateZ(1px)",
        }}
      />
    </div>
  );
});

CustomNode3D.displayName = "CustomNode3D";

const nodeTypes = {
  custom3d: CustomNode3D,
};

interface MindMapViewerProps {
  documentId?: string;
  documentTitle?: string;
  documentContent?: string;
}

export function MindMapViewer({
  documentId,
  documentTitle,
  documentContent,
}: MindMapViewerProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleGenerateMindMap = async () => {
    if (!documentContent || !documentTitle) {
      setError("请先选择一个文档");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/kb/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mindmap",
          content: documentContent,
          title: documentTitle,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const mindMapData: MindMapData = data.data;
        layoutMindMap(mindMapData);
      } else {
        setError(data.error || "生成思维导图失败");
      }
    } catch (err) {
      console.error("生成思维导图失败:", err);
      setError("生成思维导图失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const layoutMindMap = (data: MindMapData) => {
    // 改进的树形布局算法，增加间距以适应 3D 效果
    const levelWidth = 300;
    const levelHeight = 120;
    const nodesByLevel: { [key: number]: typeof data.nodes } = {};

    // 按层级分组
    data.nodes.forEach((node) => {
      if (!nodesByLevel[node.level]) {
        nodesByLevel[node.level] = [];
      }
      nodesByLevel[node.level].push(node);
    });

    // 计算节点位置，使用 3D 自定义节点
    const flowNodes: Node[] = data.nodes.map((node, index) => {
      const levelNodes = nodesByLevel[node.level];
      const indexInLevel = levelNodes.indexOf(node);
      const totalInLevel = levelNodes.length;

      const x = node.level * levelWidth;
      const y =
        (indexInLevel - totalInLevel / 2) * levelHeight + totalInLevel * 30;

      return {
        id: node.id,
        type: "custom3d",
        data: {
          label: node.label,
          nodeType: node.type,
        },
        position: { x, y },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    // 创建带有 3D 效果的边
    const flowEdges: Edge[] = data.edges.map((edge, index) => ({
      id: `e-${index}`,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      animated: true,
      style: {
        stroke: "url(#edge-gradient)",
        strokeWidth: 3,
        filter: "drop-shadow(0 2px 4px rgba(245, 158, 11, 0.3))",
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#f59e0b",
        width: 20,
        height: 20,
      },
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  };

  const handleExport = () => {
    // 导出为 PNG（需要额外的库支持，这里简化处理）
    alert("导出功能开发中...");
  };

  if (!documentId) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>请先选择一个文档</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`shadow-sm ${isFullscreen ? "fixed inset-4 z-50" : ""}`}>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            AI 思维导图
          </div>
          <div className="flex gap-2">
            {nodes.length > 0 && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExport}
                  className="text-xs"
                >
                  <Download className="w-3 h-3 mr-1" />
                  导出
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="text-xs"
                >
                  <Maximize2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {nodes.length === 0 && !isLoading && (
          <Button
            onClick={handleGenerateMindMap}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            disabled={isLoading}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            生成思维导图
          </Button>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="ml-2 text-sm text-muted-foreground">
              正在生成思维导图...
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {nodes.length > 0 && (
          <div
            className={`rounded-lg border border-gray-200 overflow-hidden relative ${
              isFullscreen ? "h-[calc(100vh-12rem)]" : "h-[500px]"
            }`}
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
            }}
          >
            {/* 科技感背景层 */}
            <div className="absolute inset-0 opacity-20">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `
                    radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
                    radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.2) 0%, transparent 50%),
                    radial-gradient(circle at 40% 20%, rgba(255, 255, 255, 0.15) 0%, transparent 40%)
                  `,
                }}
              />
            </div>

            {/* 网格背景 */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: "50px 50px",
              }}
            />

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              attributionPosition="bottom-left"
              className="bg-transparent"
              style={{
                background: "transparent",
              }}
            >
              {/* SVG 渐变定义 */}
              <svg style={{ position: "absolute", width: 0, height: 0 }}>
                <defs>
                  <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
              </svg>

              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1}
                color="rgba(255, 255, 255, 0.3)"
              />
              <Controls
                className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg"
              />
            </ReactFlow>
          </div>
        )}

        {nodes.length > 0 && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateMindMap}
              className="flex-1"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              重新生成
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MindMapViewer;

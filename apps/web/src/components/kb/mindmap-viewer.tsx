/**
 * 思维导图查看器
 * 使用 React Flow 渲染思维导图
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, Download, Maximize2 } from "lucide-react";
import type { MindMapData } from "@/lib/ai/document-analyzer";

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
    // 简单的树形布局算法
    const levelWidth = 250;
    const levelHeight = 100;
    const nodesByLevel: { [key: number]: typeof data.nodes } = {};

    // 按层级分组
    data.nodes.forEach((node) => {
      if (!nodesByLevel[node.level]) {
        nodesByLevel[node.level] = [];
      }
      nodesByLevel[node.level].push(node);
    });

    // 计算节点位置
    const flowNodes: Node[] = data.nodes.map((node, index) => {
      const levelNodes = nodesByLevel[node.level];
      const indexInLevel = levelNodes.indexOf(node);
      const totalInLevel = levelNodes.length;

      const x = node.level * levelWidth;
      const y =
        (indexInLevel - totalInLevel / 2) * levelHeight + totalInLevel * 25;

      let bgColor = "#fef3c7"; // amber-100
      let borderColor = "#f59e0b"; // amber-500

      if (node.type === "root") {
        bgColor = "#fed7aa"; // orange-200
        borderColor = "#ea580c"; // orange-600
      } else if (node.type === "leaf") {
        bgColor = "#fef9c3"; // yellow-100
        borderColor = "#eab308"; // yellow-500
      }

      return {
        id: node.id,
        type: "default",
        data: { label: node.label },
        position: { x, y },
        style: {
          background: bgColor,
          border: `2px solid ${borderColor}`,
          borderRadius: "8px",
          padding: "10px",
          fontSize: node.type === "root" ? "16px" : "14px",
          fontWeight: node.type === "root" ? "bold" : "normal",
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    const flowEdges: Edge[] = data.edges.map((edge, index) => ({
      id: `e-${index}`,
      source: edge.source,
      target: edge.target,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#f59e0b", strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#f59e0b",
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
            className={`rounded-lg border border-gray-200 bg-white ${
              isFullscreen ? "h-[calc(100vh-12rem)]" : "h-[500px]"
            }`}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              fitView
              attributionPosition="bottom-left"
            >
              <Background />
              <Controls />
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

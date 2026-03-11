"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Maximize2, Download } from "lucide-react";
import type { KBDocument } from "@/lib/client/kb-storage";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";

interface AIMindMapProps {
  document: KBDocument;
}

export function AIMindMap({ document }: AIMindMapProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const generateMindMap = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/kb/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: document.content,
          title: document.title,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate mind map");

      const data = await response.json();

      // 转换为 ReactFlow 节点和边
      const newNodes: Node[] = data.nodes.map((node: any, index: number) => ({
        id: node.id,
        type: "default",
        data: { label: node.label },
        position: {
          x: Math.cos((index * 2 * Math.PI) / data.nodes.length) * 200 + 250,
          y: Math.sin((index * 2 * Math.PI) / data.nodes.length) * 200 + 250,
        },
        style: {
          background: node.level === 0 ? "#6366f1" : "#e0e7ff",
          color: node.level === 0 ? "#fff" : "#000",
          border: "1px solid #6366f1",
          borderRadius: "8px",
          padding: "10px",
        },
      }));

      const newEdges: Edge[] = data.edges.map((edge: any) => ({
        id: `${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        type: "smoothstep",
        animated: true,
      }));

      setNodes(newNodes);
      setEdges(newEdges);
    } catch (error) {
      console.error("Failed to generate mind map:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const exportAsImage = () => {
    // TODO: 实现导出为图片功能
    console.log("Export as image");
  };

  if (nodes.length === 0) {
    return (
      <div className="border rounded-lg p-4 bg-muted/30">
        <p className="text-sm text-muted-foreground mb-3">
          使用 AI 生成文档的思维导图，帮助你更好地理解文档结构。
        </p>
        <Button
          onClick={generateMindMap}
          disabled={isGenerating || !document.content}
          size="sm"
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            "生成思维导图"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          onClick={() => setIsFullscreen(!isFullscreen)}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <Maximize2 className="h-4 w-4 mr-2" />
          {isFullscreen ? "退出全屏" : "全屏查看"}
        </Button>
        <Button
          onClick={exportAsImage}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          导出
        </Button>
      </div>

      <div
        className={`border rounded-lg overflow-hidden ${
          isFullscreen ? "fixed inset-4 z-50 bg-background" : "h-[300px]"
        }`}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>

      <Button
        onClick={generateMindMap}
        disabled={isGenerating}
        variant="ghost"
        size="sm"
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            重新生成中...
          </>
        ) : (
          "重新生成"
        )}
      </Button>
    </div>
  );
}
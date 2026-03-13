/**
 * 知识图谱 - 专业版
 * 参考 Obsidian 图谱样式
 */

"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  FileText,
  Route,
  BookOpen,
  Tag as TagIcon,
  ChevronDown
} from "lucide-react";
import type { KBDocument } from "@/lib/client/kb-storage";
import type { LearningPath } from "@/lib/client/path-storage";
import type { Resource } from "@/lib/resources/resource-types";

// 动态导入避免 SSR 问题
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

// 节点类型
type NodeType = "document" | "path" | "resource" | "tag";

interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  val: number;
  color: string;
  connections: number;
  data: KBDocument | LearningPath | Resource | { name: string; count: number };
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  type: "backlink" | "tag" | "resource" | "path";
}

interface KnowledgeStarMapProps {
  documents: KBDocument[];
  paths?: LearningPath[];
  resources?: Resource[];
  currentDocument: KBDocument | null;
  onDocumentClick?: (doc: KBDocument) => void;
  className?: string;
}

// 节点类型配置
const NODE_TYPES = {
  document: {
    label: "文档",
    color: "#ec4899", // 粉色
    icon: FileText,
  },
  path: {
    label: "学习路径",
    color: "#a855f7", // 紫色
    icon: Route,
  },
  resource: {
    label: "资源",
    color: "#10b981", // 绿色
    icon: BookOpen,
  },
  tag: {
    label: "标签",
    color: "#f97316", // 橙色
    icon: TagIcon,
  },
} as const;

export function KnowledgeStarMap({
  documents,
  paths = [],
  resources = [],
  currentDocument,
  onDocumentClick,
  className = "",
}: KnowledgeStarMapProps) {
  const graphRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<Set<NodeType>>(
    new Set(["document", "path", "resource", "tag"])
  );
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // 构建图数据
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeMap = new Map<string, GraphNode>();
    const tagMap = new Map<string, Set<string>>();

    // 添加文档节点
    documents.forEach((doc) => {
      const node: GraphNode = {
        id: `doc-${doc.id}`,
        name: doc.title,
        type: "document",
        val: 15,
        color: NODE_TYPES.document.color,
        connections: 0,
        data: doc,
      };
      nodes.push(node);
      nodeMap.set(node.id, node);

      // 处理标签
      doc.tags?.forEach((tag) => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, new Set());
        }
        tagMap.get(tag)!.add(node.id);
      });

      // 处理反向链接
      (doc as any).backlinks?.forEach((backlink: string) => {
        const targetId = `doc-${backlink}`;
        if (nodeMap.has(targetId)) {
          links.push({
            source: node.id,
            target: targetId,
            value: 2,
            type: "backlink",
          });
        }
      });
    });

    // 添加学习路径节点
    paths.forEach((path) => {
      const node: GraphNode = {
        id: `path-${path.id}`,
        name: path.title,
        type: "path",
        val: 12,
        color: NODE_TYPES.path.color,
        connections: 0,
        data: path,
      };
      nodes.push(node);
      nodeMap.set(node.id, node);

      // 路径标签
      path.tags?.forEach((tag) => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, new Set());
        }
        tagMap.get(tag)!.add(node.id);
      });
    });

    // 添加资源节点
    resources.forEach((resource) => {
      const node: GraphNode = {
        id: `res-${resource.id}`,
        name: resource.title,
        type: "resource",
        val: 10,
        color: NODE_TYPES.resource.color,
        connections: 0,
        data: resource,
      };
      nodes.push(node);
      nodeMap.set(node.id, node);

      // 资源标签
      resource.tags?.forEach((tag) => {
        if (!tagMap.has(tag)) {
          tagMap.set(tag, new Set());
        }
        tagMap.get(tag)!.add(node.id);
      });
    });

    // 添加标签节点和连接
    tagMap.forEach((nodeIds, tagName) => {
      if (nodeIds.size > 1) {
        const tagNode: GraphNode = {
          id: `tag-${tagName}`,
          name: tagName,
          type: "tag",
          val: 8,
          color: NODE_TYPES.tag.color,
          connections: nodeIds.size,
          data: { name: tagName, count: nodeIds.size },
        };
        nodes.push(tagNode);
        nodeMap.set(tagNode.id, tagNode);

        // 连接标签到节点
        nodeIds.forEach((nodeId) => {
          links.push({
            source: tagNode.id,
            target: nodeId,
            value: 1,
            type: "tag",
          });
        });
      }
    });

    // 计算连接数
    links.forEach((link) => {
      const sourceId = typeof link.source === "string" ? link.source : link.source.id;
      const targetId = typeof link.target === "string" ? link.target : link.target.id;
      const sourceNode = nodeMap.get(sourceId);
      const targetNode = nodeMap.get(targetId);
      if (sourceNode) sourceNode.connections++;
      if (targetNode) targetNode.connections++;
    });

    return { nodes, links };
  }, [documents, paths, resources]);

  // 过滤数据
  const filteredData = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const nodes = graphData.nodes.filter((node) => {
      if (!selectedTypes.has(node.type)) return false;
      if (query && !node.name.toLowerCase().includes(query)) return false;
      return true;
    });

    const nodeIds = new Set(nodes.map((n) => n.id));
    const links = graphData.links.filter((link) => {
      const sourceId = typeof link.source === "string" ? link.source : link.source.id;
      const targetId = typeof link.target === "string" ? link.target : link.target.id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    return { nodes, links };
  }, [graphData, searchQuery, selectedTypes]);

  // 统计数据
  const stats = useMemo(() => {
    return {
      documents: graphData.nodes.filter((n) => n.type === "document").length,
      paths: graphData.nodes.filter((n) => n.type === "path").length,
      resources: graphData.nodes.filter((n) => n.type === "resource").length,
      tags: graphData.nodes.filter((n) => n.type === "tag").length,
      links: graphData.links.length,
    };
  }, [graphData]);

  // 响应式尺寸
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // 缩放控制
  const handleZoomIn = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() * 1.2, 400);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoom(graphRef.current.zoom() / 1.2, 400);
    }
  }, []);

  const handleReset = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50);
    }
  }, []);

  // 节点点击
  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (node.type === "document" && onDocumentClick) {
        onDocumentClick(node.data as KBDocument);
      }
    },
    [onDocumentClick]
  );

  // 切换类型筛选
  const toggleType = useCallback((type: NodeType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full h-full bg-[#0a0a0f] ${className}`}>
      {/* 顶部控制栏 */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3">
        {/* 标题 */}
        <div className="flex items-center gap-2 text-white">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 10a2 2 0 114 0 2 2 0 01-4 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-lg">知识图谱</h3>
            <p className="text-xs text-gray-400">可视化知识关联与探索</p>
          </div>
        </div>

        <div className="flex-1" />

        {/* 搜索 */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索节点..."
            className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500"
          />
        </div>

        {/* 筛选下拉 */}
        <Button variant="outline" className="bg-gray-800/50 border-gray-700 text-white">
          全部节点
          <ChevronDown className="ml-2 w-4 h-4" />
        </Button>

        {/* 重置按钮 */}
        <Button
          onClick={handleReset}
          variant="outline"
          className="bg-gray-800/50 border-gray-700 text-white hover:bg-gray-700"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          重置
        </Button>

        {/* 全屏按钮 */}
        <Button
          variant="outline"
          className="bg-gray-800/50 border-gray-700 text-white hover:bg-gray-700"
        >
          <Maximize2 className="w-4 h-4 mr-2" />
          全屏
        </Button>
      </div>

      {/* 图例 */}
      <div className="absolute top-20 left-4 z-10 flex items-center gap-4 text-sm">
        {Object.entries(NODE_TYPES).map(([type, config]) => {
          const Icon = config.icon;
          const isActive = selectedTypes.has(type as NodeType);
          return (
            <button
              key={type}
              onClick={() => toggleType(type as NodeType)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                isActive
                  ? "bg-gray-800/80 text-white"
                  : "bg-gray-900/50 text-gray-500"
              }`}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: config.color }}
              />
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* 图谱 */}
      <ForceGraph2D
        ref={graphRef}
        graphData={filteredData}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="#0a0a0f"
        nodeRelSize={6}
        nodeVal={(node: any) => node.val}
        nodeColor={(node: any) => node.color}
        nodeLabel={(node: any) => node.name}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12 / globalScale;
          const nodeRadius = Math.sqrt(node.val) * 1.5;

          // 绘制节点
          ctx.beginPath();
          ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
          ctx.fillStyle = node.color;
          ctx.fill();

          // 绘制标签
          if (globalScale > 0.8) {
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "white";
            ctx.fillText(label, node.x, node.y + nodeRadius + fontSize);
          }
        }}
        linkColor={() => "rgba(100, 100, 100, 0.3)"}
        linkWidth={1}
        linkDirectionalParticles={0}
        onNodeClick={(node) => handleNodeClick(node as GraphNode)}
        onNodeHover={(node) => setHoveredNode(node as GraphNode | null)}
        enableNodeDrag={true}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        cooldownTicks={100}
        onEngineStop={() => {
          if (graphRef.current) {
            graphRef.current.zoomToFit(400, 50);
          }
        }}
      />

      {/* 底部统计 */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-around">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-400">{stats.documents}</div>
          <div className="text-xs text-gray-400">知识节点</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-400">{stats.links}</div>
          <div className="text-xs text-gray-400">关联边</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-400">{stats.paths}</div>
          <div className="text-xs text-gray-400">知识域</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-400">{stats.resources}</div>
          <div className="text-xs text-gray-400">农事经验</div>
        </div>
      </div>

      {/* 悬停信息 */}
      {hoveredNode && (
        <div className="absolute top-1/2 right-4 z-10 w-64 bg-gray-900/95 border border-gray-700 rounded-lg p-4 text-white">
          <h4 className="font-semibold mb-2">{hoveredNode.name}</h4>
          <div className="text-sm text-gray-400 space-y-1">
            <div>类型: {NODE_TYPES[hoveredNode.type].label}</div>
            <div>连接数: {hoveredNode.connections}</div>
          </div>
        </div>
      )}
    </div>
  );
}

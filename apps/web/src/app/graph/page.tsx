'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Network,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Filter,
  Edit,
  Trash2,
  Plus,
  X,
  Link as LinkIcon,
  Circle,
  GitBranch
} from 'lucide-react';

// Dynamic import to avoid SSR issues with force-graph
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-muted-foreground">加载图谱中...</div>
    </div>
  )
});

// Node types with aurora theme colors
const NODE_TYPES = {
  concept: { label: '概念', color: '#FF8C61', icon: Circle },
  topic: { label: '主题', color: '#FFB84D', icon: GitBranch },
  resource: { label: '资源', color: '#FF6B9D', icon: LinkIcon },
  skill: { label: '技能', color: '#FFA07A', icon: Network }
};

// Edge types
const EDGE_TYPES = {
  prerequisite: { label: '前置', color: 'rgba(255, 140, 97, 0.3)' },
  related: { label: '相关', color: 'rgba(255, 184, 77, 0.3)' },
  contains: { label: '包含', color: 'rgba(255, 107, 157, 0.3)' },
  applies: { label: '应用', color: 'rgba(255, 160, 122, 0.3)' }
};

interface GraphNode {
  id: string;
  name: string;
  type: keyof typeof NODE_TYPES;
  connections: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: keyof typeof EDGE_TYPES;
}

// Mock data - replace with real data from API
const generateMockData = (): { nodes: GraphNode[]; links: GraphLink[] } => {
  const nodes: GraphNode[] = [
    { id: '1', name: 'React 基础', type: 'concept', connections: 5 },
    { id: '2', name: 'JSX 语法', type: 'concept', connections: 3 },
    { id: '3', name: '组件化开发', type: 'topic', connections: 4 },
    { id: '4', name: 'Hooks', type: 'concept', connections: 6 },
    { id: '5', name: 'useState', type: 'skill', connections: 2 },
    { id: '6', name: 'useEffect', type: 'skill', connections: 3 },
    { id: '7', name: '状态管理', type: 'topic', connections: 4 },
    { id: '8', name: 'Redux', type: 'resource', connections: 2 },
    { id: '9', name: 'Context API', type: 'resource', connections: 2 },
    { id: '10', name: '路由', type: 'topic', connections: 3 },
    { id: '11', name: 'React Router', type: 'resource', connections: 2 },
    { id: '12', name: '性能优化', type: 'topic', connections: 4 },
    { id: '13', name: 'useMemo', type: 'skill', connections: 1 },
    { id: '14', name: 'useCallback', type: 'skill', connections: 1 },
    { id: '15', name: '虚拟 DOM', type: 'concept', connections: 2 }
  ];

  const links: GraphLink[] = [
    { source: '1', target: '2', type: 'contains' },
    { source: '1', target: '3', type: 'contains' },
    { source: '1', target: '4', type: 'contains' },
    { source: '4', target: '5', type: 'contains' },
    { source: '4', target: '6', type: 'contains' },
    { source: '1', target: '7', type: 'related' },
    { source: '7', target: '8', type: 'applies' },
    { source: '7', target: '9', type: 'applies' },
    { source: '1', target: '10', type: 'related' },
    { source: '10', target: '11', type: 'applies' },
    { source: '4', target: '12', type: 'related' },
    { source: '12', target: '13', type: 'applies' },
    { source: '12', target: '14', type: 'applies' },
    { source: '1', target: '15', type: 'prerequisite' },
    { source: '3', target: '7', type: 'prerequisite' }
  ];

  return { nodes, links };
};

interface ForceGraphRef {
  zoom: (scale?: number, duration?: number) => number | void;
  zoomToFit: (duration?: number, padding?: number) => void;
}

export default function GraphPage() {
  const graphRef = useRef<ForceGraphRef | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(Object.keys(NODE_TYPES)));
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    setGraphData(generateMockData());
  }, []);

  const filteredNodes = graphData.nodes.filter(node =>
    activeFilters.has(node.type) &&
    (searchQuery === '' || node.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredData = {
    nodes: filteredNodes,
    links: graphData.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return filteredNodes.some(n => n.id === sourceId) &&
             filteredNodes.some(n => n.id === targetId);
    })
  };

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
  }, []);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node);
  }, []);

  const handleZoomIn = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom() as number;
      graphRef.current.zoom(currentZoom * 1.2, 400);
    }
  };

  const handleZoomOut = () => {
    if (graphRef.current) {
      const currentZoom = graphRef.current.zoom() as number;
      graphRef.current.zoom(currentZoom / 1.2, 400);
    }
  };

  const handleCenterGraph = () => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 50);
    }
  };

  const toggleFilter = (type: string) => {
    const newFilters = new Set(activeFilters);
    if (newFilters.has(type)) {
      newFilters.delete(type);
    } else {
      newFilters.add(type);
    }
    setActiveFilters(newFilters);
  };

  const getNodeRelations = (nodeId: string) => {
    return graphData.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return sourceId === nodeId || targetId === nodeId;
    });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Network className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">知识图谱</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredData.nodes.length} 个节点 · {filteredData.links.length} 条关系
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索节点..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomOut}
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCenterGraph}
                  className="h-8 w-8 p-0"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleZoomIn}
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mt-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">节点类型:</span>
            {Object.entries(NODE_TYPES).map(([type, config]) => {
              const Icon = config.icon;
              const isActive = activeFilters.has(type);
              return (
                <Button
                  key={type}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleFilter(type)}
                  className="h-7 gap-1.5"
                  style={isActive ? { backgroundColor: config.color, borderColor: config.color } : {}}
                >
                  <Icon className="h-3 w-3" />
                  {config.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph Canvas */}
        <div className="flex-1 relative bg-gradient-to-br from-background via-background to-primary/5">
          <ForceGraph2D
            ref={graphRef}
            graphData={filteredData}
            nodeLabel="name"
            nodeAutoColorBy="type"
            nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const label = node.name;
              const fontSize = 12 / globalScale;
              const nodeType = NODE_TYPES[node.type as keyof typeof NODE_TYPES];
              const nodeColor = nodeType.color;

              // Node size based on connections
              const nodeSize = 3 + node.connections * 0.5;

              // Draw node circle
              ctx.beginPath();
              ctx.arc(node.x || 0, node.y || 0, nodeSize, 0, 2 * Math.PI);
              ctx.fillStyle = nodeColor;
              ctx.fill();

              // Draw border
              ctx.strokeStyle = hoveredNode?.id === node.id ? '#fff' : 'rgba(255, 255, 255, 0.3)';
              ctx.lineWidth = hoveredNode?.id === node.id ? 2 / globalScale : 1 / globalScale;
              ctx.stroke();

              // Draw label
              ctx.font = `${fontSize}px Inter, sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#1a1a1a';
              ctx.fillText(label, node.x || 0, (node.y || 0) + nodeSize + fontSize + 2);
            }}
            linkColor={(link: GraphLink) => EDGE_TYPES[link.type as keyof typeof EDGE_TYPES].color}
            linkWidth={1.5}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleSpeed={0.005}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            cooldownTicks={100}
            onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
          />

          {/* Hover Tooltip */}
          {hoveredNode && (
            <div className="absolute top-4 left-4 pointer-events-none">
              <Card className="shadow-lg border-2" style={{ borderColor: NODE_TYPES[hoveredNode.type].color }}>
                <CardHeader className="p-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: NODE_TYPES[hoveredNode.type].color }}
                    />
                    <CardTitle className="text-sm">{hoveredNode.name}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    {NODE_TYPES[hoveredNode.type].label} · {hoveredNode.connections} 个连接
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          )}
        </div>

        {/* Right Panel - Node Details */}
        {selectedNode && (
          <div className="w-96 border-l bg-card/50 backdrop-blur-sm overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: NODE_TYPES[selectedNode.type].color }}
                    />
                    <Badge variant="secondary">{NODE_TYPES[selectedNode.type].label}</Badge>
                  </div>
                  <h2 className="text-2xl font-semibold">{selectedNode.name}</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedNode(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="p-4">
                    <CardDescription className="text-xs">连接数</CardDescription>
                    <CardTitle className="text-2xl">{selectedNode.connections}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="p-4">
                    <CardDescription className="text-xs">节点类型</CardDescription>
                    <CardTitle className="text-sm">{NODE_TYPES[selectedNode.type].label}</CardTitle>
                  </CardHeader>
                </Card>
              </div>

              {/* Relations */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  关系列表
                </h3>
                <div className="space-y-2">
                  {getNodeRelations(selectedNode.id).map((link, idx) => {
                    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
                    const isSource = sourceId === selectedNode.id;
                    const relatedNodeId = isSource ? targetId : sourceId;
                    const relatedNode = graphData.nodes.find(n => n.id === relatedNodeId);

                    if (!relatedNode) return null;

                    return (
                      <Card
                        key={idx}
                        className="p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedNode(relatedNode)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: NODE_TYPES[relatedNode.type].color }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{relatedNode.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {isSource ? '→' : '←'} {EDGE_TYPES[link.type].label}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold mb-3">操作</h3>
                <Button className="w-full justify-start gap-2" variant="outline">
                  <Edit className="h-4 w-4" />
                  编辑节点
                </Button>
                <Button className="w-full justify-start gap-2" variant="outline">
                  <Plus className="h-4 w-4" />
                  添加关系
                </Button>
                <Button className="w-full justify-start gap-2" variant="outline">
                  <LinkIcon className="h-4 w-4" />
                  查看详情
                </Button>
                <Button
                  className="w-full justify-start gap-2"
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">删除节点</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

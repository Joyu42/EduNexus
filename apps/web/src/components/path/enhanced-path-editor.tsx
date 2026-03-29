'use client';

import React, { useCallback, useState, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Panel,
  ReactFlowProvider,
  BackgroundVariant,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Plus,
  Save,
  Trash2,
  Sparkles,
  Play,
  Settings,
  Loader2,
  FileText,
  Video,
  Code,
  CheckCircle2,
  PlayCircle,
  Trophy,
  Wand2,
  BookOpen,
  Users,
  RotateCcw,
  BookMarked,
  FlaskConical,
  ClipboardList,
  Presentation,
  Search,
} from 'lucide-react';
import { PathNodeData, NodeType, DifficultyLevel } from '@/lib/path/path-types';
import { toast } from 'sonner';
import { getModelConfig } from '@/lib/client/model-config';
import { cn } from '@/lib/utils';
import { nodeTypes } from './enhanced-node-types';

interface EnhancedPathEditorProps {
  initialNodes?: Node<PathNodeData>[];
  initialEdges?: Edge[];
  onSave?: (nodes: Node<PathNodeData>[], edges: Edge[]) => void;
}

const nodeTemplates: Array<{
  type: NodeType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  gradient: string;
  description: string;
  category: string;
}> = [
  // 学习类
  { type: 'document', icon: FileText, label: '文档学习', gradient: 'from-blue-500 to-cyan-500', description: '阅读文档、教材、文章', category: '学习' },
  { type: 'video', icon: Video, label: '视频课程', gradient: 'from-purple-500 to-pink-500', description: '观看视频教程、讲座', category: '学习' },
  { type: 'reading', icon: BookMarked, label: '阅读材料', gradient: 'from-indigo-500 to-blue-500', description: '书籍、论文、资料阅读', category: '学习' },

  // 实践类
  { type: 'practice', icon: Code, label: '实践练习', gradient: 'from-green-500 to-emerald-500', description: '动手实践、编程练习', category: '实践' },
  { type: 'project', icon: BookOpen, label: '项目实战', gradient: 'from-teal-500 to-cyan-500', description: '完整项目开发', category: '实践' },
  { type: 'lab', icon: FlaskConical, label: '实验室', gradient: 'from-lime-500 to-green-500', description: '实验、探索、尝试', category: '实践' },
  { type: 'assignment', icon: ClipboardList, label: '作业任务', gradient: 'from-emerald-500 to-teal-500', description: '课后作业、练习题', category: '实践' },

  // 评估类
  { type: 'quiz', icon: CheckCircle2, label: '测验考核', gradient: 'from-orange-500 to-amber-500', description: '测试、考试、自我检验', category: '评估' },
  { type: 'review', icon: RotateCcw, label: '复习回顾', gradient: 'from-yellow-500 to-orange-500', description: '知识复习、总结回顾', category: '评估' },
  { type: 'presentation', icon: Presentation, label: '演示汇报', gradient: 'from-rose-500 to-pink-500', description: '展示成果、分享经验', category: '评估' },

  // 协作类
  { type: 'discussion', icon: Users, label: '讨论交流', gradient: 'from-violet-500 to-purple-500', description: '小组讨论、问答交流', category: '协作' },
  { type: 'research', icon: Search, label: '研究调研', gradient: 'from-fuchsia-500 to-purple-500', description: '资料调研、深入研究', category: '协作' },

  // 特殊节点
  { type: 'start', icon: PlayCircle, label: '开始节点', gradient: 'from-gray-600 to-gray-700', description: '学习路径的起点', category: '特殊' },
  { type: 'end', icon: Trophy, label: '完成节点', gradient: 'from-yellow-500 to-orange-500', description: '学习路径的终点', category: '特殊' },
];

function EnhancedPathEditorInner({ initialNodes = [], initialEdges = [], onSave }: EnhancedPathEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<PathNodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<PathNodeData> | null>(null);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showNodeSelector, setShowNodeSelector] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [ageGroup, setAgeGroup] = useState('general');
  const [isGenerating, setIsGenerating] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const removeSelectedNode = useCallback(() => {
    if (!selectedNode) {
      return;
    }

    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
    setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
    setSelectedNode(null);
    toast.success('节点已删除');
  }, [edges, selectedNode, setEdges, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        animated: true,
        style: { stroke: '#6366f1', strokeWidth: 2 },
        type: 'smoothstep',
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const addNodeAtCenter = useCallback((type: NodeType) => {
    const position = reactFlowInstance
      ? reactFlowInstance.project({ x: window.innerWidth / 2 - 200, y: window.innerHeight / 2 - 100 })
      : { x: 250, y: 250 };

    const newNode: Node<PathNodeData> = {
      id: `node-${Date.now()}`,
      type: 'default',
      position,
      data: {
        label: `新${nodeTemplates.find(t => t.type === type)?.label || '节点'}`,
        type: type as NodeType,
        description: '',
        estimatedTime: 30,
        difficulty: 'beginner',
        status: 'not_started',
      },
    };

    setNodes((nds) => nds.concat(newNode));
    setShowNodeSelector(false);
    toast.success('节点已添加');
  }, [setNodes, reactFlowInstance]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!reactFlowBounds) return;

      const position = {
        x: event.clientX - reactFlowBounds.left - 120,
        y: event.clientY - reactFlowBounds.top - 60,
      };

      const newNode: Node<PathNodeData> = {
        id: `node-${Date.now()}`,
        type: 'default',
        position,
        data: {
          label: `新${nodeTemplates.find(t => t.type === type)?.label || '节点'}`,
          type: type as NodeType,
          description: '',
          estimatedTime: 30,
          difficulty: 'beginner',
          status: 'not_started',
        },
      };

      setNodes((nds) => nds.concat(newNode));
      toast.success('节点已添加');
    },
    [setNodes]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<PathNodeData>) => {
    setSelectedNode(node);
  }, []);

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('请输入学习目标');
      return;
    }

    setIsGenerating(true);
    try {
      const config = getModelConfig();
      const response = await fetch('/api/path/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          apiKey: config.apiKey,
          apiEndpoint: config.apiEndpoint,
          model: config.model,
          ageGroup: ageGroup,
        }),
      });

      if (response.ok) {
        const { nodes: generatedNodes, edges: generatedEdges } = await response.json();
        setNodes(generatedNodes);
        setEdges(generatedEdges);
        setShowAIDialog(false);
        setAiPrompt('');
        toast.success('AI 已生成学习路径！');
      } else {
        const error = await response.json();
        toast.error(error.error || '生成失败，请重试');
      }
    } catch (error) {
      console.error('AI generation failed:', error);
      toast.error('生成失败，请检查配置');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (nodes.length === 0) {
      toast.error('请至少添加一个节点');
      return;
    }
    onSave?.(nodes, edges);
    toast.success('路径已保存');
  };

  const edgeOptions = useMemo(
    () => ({
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
    }),
    []
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 中间画布 */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={edgeOptions}
          connectionMode={ConnectionMode.Loose}
          fitView
          className="bg-gray-50"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e7eb" />
          <Controls className="bg-white border border-gray-200 rounded-lg shadow-lg" />
          <MiniMap
            className="bg-white border border-gray-200 rounded-lg shadow-lg"
            nodeColor={(node) => {
              const data = node.data as PathNodeData;
              if (data.status === 'completed') return '#10b981';
              if (data.status === 'in_progress') return '#f59e0b';
              return '#6366f1';
            }}
          />

          {/* 顶部工具栏 */}
          <Panel position="top-right" className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNodeSelector(true)}
              className="bg-white shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              添加节点
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAIDialog(true)}
              className="bg-white shadow-md border-purple-300"
            >
              <Wand2 className="w-4 h-4 mr-2" />
              AI 生成
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-white shadow-md"
            >
              <Settings className="w-4 h-4 mr-2" />
              设置
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-md"
            >
              <Save className="w-4 h-4 mr-2" />
              保存路径
            </Button>
          </Panel>

          {/* 空状态提示 */}
          {nodes.length === 0 && (
            <Panel position="top-center" className="pointer-events-none">
              <Card className="p-6 bg-white/90 backdrop-blur-sm border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-500" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">开始创建学习路径</h3>
                  <p className="text-sm text-gray-600 mb-4">从左侧拖拽节点到画布，或使用 AI 生成</p>
                  <Badge variant="secondary" className="text-xs">提示：连接节点创建学习流程</Badge>
                </div>
              </Card>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* 右侧属性面板 */}
      {selectedNode && (
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">节点属性</h3>
          <div className="space-y-4">
            <div>
              <Label>节点名称</Label>
              <Input
                value={selectedNode.data.label}
                onChange={(e) => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selectedNode.id
                        ? { ...n, data: { ...n.data, label: e.target.value } }
                        : n
                    )
                  );
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={selectedNode.data.description || ''}
                onChange={(e) => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selectedNode.id
                        ? { ...n, data: { ...n.data, description: e.target.value } }
                        : n
                    )
                  );
                }}
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label>预计时长（分钟）</Label>
              <Input
                type="number"
                value={selectedNode.data.estimatedTime || 30}
                onChange={(e) => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selectedNode.id
                        ? { ...n, data: { ...n.data, estimatedTime: parseInt(e.target.value) } }
                        : n
                    )
                  );
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label>绑定知识文档 ID</Label>
              <Input
                value={(selectedNode.data.metadata?.documentBinding as { documentId?: string } | undefined)?.documentId ?? ''}
                onChange={(e) => {
                  const documentId = e.target.value;
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selectedNode.id
                        ? {
                            ...n,
                            data: {
                              ...n.data,
                              metadata: {
                                ...(n.data.metadata ?? {}),
                                documentBinding: {
                                  ...((n.data.metadata?.documentBinding as Record<string, unknown>) ?? {}),
                                  documentId,
                                },
                              },
                            },
                          }
                        : n
                    )
                  );
                }}
                placeholder="留空表示星球占位节点"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={removeSelectedNode} className="flex-1">
                <Trash2 className="w-4 h-4 mr-2" />
                删除节点
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 节点选择器对话框 */}
      <Dialog open={showNodeSelector} onOpenChange={setShowNodeSelector}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-500" />
              选择节点类型
            </DialogTitle>
            <DialogDescription>
              选择要添加到学习路径中的节点类型
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {['学习', '实践', '评估', '协作', '特殊'].map((category) => {
              const categoryNodes = nodeTemplates.filter(t => t.category === category);
              if (categoryNodes.length === 0) return null;

              return (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full" />
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {categoryNodes.map((template) => {
                      const Icon = template.icon;
                      return (
                        <motion.div
                          key={template.type}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Card
                            className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-400"
                            onClick={() => addNodeAtCenter(template.type)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br flex-shrink-0', template.gradient)}>
                                  <Icon className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-sm mb-0.5">{template.label}</h4>
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {template.description}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI 生成对话框 */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-500" />
              AI 生成学习路径
            </DialogTitle>
            <DialogDescription>
              描述你的学习目标，AI 将为你生成完整的学习路径
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="age-group">学习者年龄段</Label>
              <select
                id="age-group"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="general">通用（全年龄段）</option>
                <option value="elementary">小学生（6-12岁）</option>
                <option value="middle">初中生（12-15岁）</option>
                <option value="high">高中生（15-18岁）</option>
                <option value="college">大学生（18-22岁）</option>
                <option value="professional">职场人士（22岁+）</option>
              </select>
            </div>

            <div>
              <Label htmlFor="ai-prompt">学习目标</Label>
              <Textarea
                id="ai-prompt"
                placeholder="例如：我想学习 React 开发，从基础到进阶，包括 Hooks、状态管理和性能优化..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={5}
                className="mt-1"
              />
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700">
                💡 提示：AI 将生成包含并行分支的完整学习路径（12-18个节点），理论与实践结合，适合您选择的年龄段。
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAIDialog(false)} disabled={isGenerating}>
              取消
            </Button>
            <Button
              onClick={handleAIGenerate}
              disabled={isGenerating || !aiPrompt.trim()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  生成路径
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EnhancedPathEditor(props: EnhancedPathEditorProps) {
  return (
    <ReactFlowProvider>
      <EnhancedPathEditorInner {...props} />
    </ReactFlowProvider>
  );
}

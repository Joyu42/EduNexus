'use client';

import React, { useCallback, useState, useRef } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Plus,
  Save,
  Download,
  Upload,
  Play,
  Trash2,
  Settings,
} from 'lucide-react';
import { nodeTypes } from './node-types';
import { LearningPath, PathNode, PathEdge, NodeType, DifficultyLevel } from '@/lib/path/path-types';
import { savePath, exportPath, importPath } from '@/lib/path/path-storage';
import { Textarea } from '@/components/ui/textarea';

interface PathEditorProps {
  initialPath?: LearningPath;
  onSave?: (path: LearningPath) => void;
  onPreview?: (path: LearningPath) => void;
}

function PathEditorInner({ initialPath, onSave, onPreview }: PathEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<PathNode>(
    initialPath?.nodes || []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<PathEdge>(
    initialPath?.edges || []
  );

  const [pathInfo, setPathInfo] = useState({
    title: initialPath?.title || '新学习路径',
    description: initialPath?.description || '',
    category: initialPath?.category || '其他',
    difficulty: initialPath?.difficulty || ('beginner' as DifficultyLevel),
    tags: initialPath?.tags || [],
  });

  const [showNodeDialog, setShowNodeDialog] = useState(false);
  const [showPathSettings, setShowPathSettings] = useState(false);
  const [editingNode, setEditingNode] = useState<PathNode | null>(null);
  const [newNodeData, setNewNodeData] = useState({
    label: '',
    description: '',
    type: 'document' as NodeType,
    estimatedTime: 60,
    difficulty: 'beginner' as DifficultyLevel,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addNode = useCallback(() => {
    const newNode: PathNode = {
      id: `node-${Date.now()}`,
      type: 'default',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: { ...newNodeData },
    };
    setNodes((nds) => [...nds, newNode]);
    setShowNodeDialog(false);
    setNewNodeData({
      label: '',
      description: '',
      type: 'document',
      estimatedTime: 60,
      difficulty: 'beginner',
    });
  }, [newNodeData, setNodes]);

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setNodes, setEdges]
  );

  const handleSave = useCallback(async () => {
    const totalTime = nodes.reduce(
      (sum, node) => sum + (node.data.estimatedTime || 0),
      0
    );

    const path: LearningPath = {
      id: initialPath?.id || `path-${Date.now()}`,
      ...pathInfo,
      estimatedDuration: totalTime,
      nodes,
      edges,
      isPublic: false,
      createdAt: initialPath?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: (initialPath?.version || 0) + 1,
    };

    await savePath(path);
    onSave?.(path);
    alert('路径已保存！');
  }, [nodes, edges, pathInfo, initialPath, onSave]);

  const handleExport = useCallback(async () => {
    if (!initialPath?.id) {
      alert('请先保存路径');
      return;
    }
    const json = await exportPath(initialPath.id);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pathInfo.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [initialPath, pathInfo.title]);

  const handleImport = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const json = e.target?.result as string;
          const path = await importPath(json);
          setNodes(path.nodes);
          setEdges(path.edges);
          setPathInfo({
            title: path.title,
            description: path.description,
            category: path.category,
            difficulty: path.difficulty,
            tags: path.tags,
          });
          alert('导入成功！');
        } catch (error) {
          alert('导入失败：' + (error as Error).message);
        }
      };
      reader.readAsText(file);
    },
    [setNodes, setEdges]
  );

  const handlePreview = useCallback(() => {
    const totalTime = nodes.reduce(
      (sum, node) => sum + (node.data.estimatedTime || 0),
      0
    );

    const path: LearningPath = {
      id: initialPath?.id || `path-${Date.now()}`,
      ...pathInfo,
      estimatedDuration: totalTime,
      nodes,
      edges,
      isPublic: false,
      createdAt: initialPath?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: initialPath?.version || 1,
    };

    onPreview?.(path);
  }, [nodes, edges, pathInfo, initialPath, onPreview]);

  return (
    <div className="w-full h-full flex flex-col">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />

        <Panel position="top-left" className="bg-white p-4 rounded-lg shadow-lg space-y-2">
          <h2 className="font-bold text-lg">{pathInfo.title}</h2>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setShowNodeDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />
              添加节点
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowPathSettings(true)}>
              <Settings className="w-4 h-4 mr-1" />
              设置
            </Button>
            <Button size="sm" variant="outline" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              保存
            </Button>
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" />
              导出
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-1" />
              导入
            </Button>
            <Button size="sm" variant="default" onClick={handlePreview}>
              <Play className="w-4 h-4 mr-1" />
              预览
            </Button>
          </div>
        </Panel>
      </ReactFlow>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImport}
      />

      {/* 添加节点对话框 */}
      <Dialog open={showNodeDialog} onOpenChange={setShowNodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新节点</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>节点类型</Label>
              <Select
                value={newNodeData.type}
                onValueChange={(value) =>
                  setNewNodeData({ ...newNodeData, type: value as NodeType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">文档</SelectItem>
                  <SelectItem value="video">视频</SelectItem>
                  <SelectItem value="practice">练习</SelectItem>
                  <SelectItem value="quiz">测验</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>标题</Label>
              <Input
                value={newNodeData.label}
                onChange={(e) =>
                  setNewNodeData({ ...newNodeData, label: e.target.value })
                }
                placeholder="输入节点标题"
              />
            </div>
            <div>
              <Label>描述</Label>
              <Textarea
                value={newNodeData.description}
                onChange={(e) =>
                  setNewNodeData({ ...newNodeData, description: e.target.value })
                }
                placeholder="输入节点描述"
              />
            </div>
            <div>
              <Label>难度</Label>
              <Select
                value={newNodeData.difficulty}
                onValueChange={(value) =>
                  setNewNodeData({
                    ...newNodeData,
                    difficulty: value as DifficultyLevel,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">初级</SelectItem>
                  <SelectItem value="intermediate">中级</SelectItem>
                  <SelectItem value="advanced">高级</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>预计时长（分钟）</Label>
              <Input
                type="number"
                value={newNodeData.estimatedTime}
                onChange={(e) =>
                  setNewNodeData({
                    ...newNodeData,
                    estimatedTime: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNodeDialog(false)}>
              取消
            </Button>
            <Button onClick={addNode}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 路径设置对话框 */}
      <Dialog open={showPathSettings} onOpenChange={setShowPathSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>路径设置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>路径标题</Label>
              <Input
                value={pathInfo.title}
                onChange={(e) =>
                  setPathInfo({ ...pathInfo, title: e.target.value })
                }
              />
            </div>
            <div>
              <Label>路径描述</Label>
              <Textarea
                value={pathInfo.description}
                onChange={(e) =>
                  setPathInfo({ ...pathInfo, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label>分类</Label>
              <Input
                value={pathInfo.category}
                onChange={(e) =>
                  setPathInfo({ ...pathInfo, category: e.target.value })
                }
              />
            </div>
            <div>
              <Label>难度</Label>
              <Select
                value={pathInfo.difficulty}
                onValueChange={(value) =>
                  setPathInfo({
                    ...pathInfo,
                    difficulty: value as DifficultyLevel,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">初级</SelectItem>
                  <SelectItem value="intermediate">中级</SelectItem>
                  <SelectItem value="advanced">高级</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPathSettings(false)}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PathEditor(props: PathEditorProps) {
  return (
    <ReactFlowProvider>
      <PathEditorInner {...props} />
    </ReactFlowProvider>
  );
}

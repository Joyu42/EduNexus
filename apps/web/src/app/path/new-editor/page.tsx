'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import EnhancedPathEditor from '@/components/path/enhanced-path-editor';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { Node, Edge } from 'reactflow';
import { PathNodeData } from '@/lib/path/path-types';
import { pathStorage, type TaskStatus } from '@/lib/client/path-storage';
import { toast } from 'sonner';

export default function NewPathEditorPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (nodes: Node<PathNodeData>[], edges: Edge[]) => {
    if (isSaving) {
      return;
    }

    try {
      setIsSaving(true);

      const tagSet = new Set<string>();
      nodes.forEach((node) => {
        if (node.data.type) {
          tagSet.add(node.data.type);
        }
        if (node.data.difficulty) {
          tagSet.add(node.data.difficulty);
        }
      });

      const now = Date.now();
      const tasks = nodes.map((node, index) => {
        const rawMinutes = Number(node.data.estimatedTime ?? 30);
        const minutes = Number.isFinite(rawMinutes) && rawMinutes > 0 ? Math.round(rawMinutes) : 30;
        const prerequisiteIds = edges
          .filter((edge) => String(edge.target) === node.id)
          .map((edge) => String(edge.source));
        const taskStatus: TaskStatus =
          node.data.status === 'completed'
            ? 'completed'
            : node.data.status === 'in_progress'
              ? 'in_progress'
              : 'not_started';

        return {
          id: node.id,
          title: node.data.label?.trim() || `学习节点 ${index + 1}`,
          description: node.data.description?.trim() || '',
          estimatedTime: `${minutes}分钟`,
          progress: taskStatus === 'completed' ? 100 : taskStatus === 'in_progress' ? 50 : 0,
          status: taskStatus,
          dependencies: prerequisiteIds,
          resources: node.data.resourceUrl
            ? [
                {
                  id: `res_${node.id}`,
                  title: `${node.data.label || '学习资源'} 资料`,
                  type: 'document' as const,
                  url: node.data.resourceUrl,
                },
              ]
            : [],
          notes: '',
          createdAt: new Date(now + index),
          startedAt: node.data.status === 'in_progress' || node.data.status === 'completed' ? new Date() : undefined,
          completedAt: node.data.status === 'completed' ? new Date() : undefined,
        };
      });

      const completedCount = tasks.filter((task) => task.status === 'completed').length;
      const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

      const createdPath = await pathStorage.createPath({
        title: `学习路径 ${new Date().toLocaleDateString('zh-CN')}`,
        description: `由可视化编排编辑器生成，共 ${tasks.length} 个学习节点`,
        status: progress === 100 ? 'completed' : progress > 0 ? 'in_progress' : 'not_started',
        progress,
        tags: Array.from(tagSet),
        tasks,
        milestones: [],
      });

      toast.success('路径已保存！');
      router.push(`/path?selected=${createdPath.id}`);
    } catch (error) {
      console.error('保存路径失败:', error);
      toast.error('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 顶部导航 */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          返回
        </Button>
        <h1 className="text-lg font-semibold text-gray-900">学习路径编辑器</h1>
      </div>

      {/* 编辑器 */}
      <div className="flex-1">
        <EnhancedPathEditor onSave={handleSave} />
      </div>
    </div>
  );
}

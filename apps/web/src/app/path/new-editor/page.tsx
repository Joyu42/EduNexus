'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import EnhancedPathEditor from '@/components/path/enhanced-path-editor';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Node, Edge } from 'reactflow';
import { PathNodeData } from '@/lib/path/path-types';
import { toast } from 'sonner';

export default function NewPathEditorPage() {
  const router = useRouter();

  const handleSave = (nodes: Node<PathNodeData>[], edges: Edge[]) => {
    // 这里可以保存到 IndexedDB 或后端
    console.log('Saving path:', { nodes, edges });
    toast.success('路径已保存！');
  };

  return (
    <div className="h-screen flex flex-col">
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

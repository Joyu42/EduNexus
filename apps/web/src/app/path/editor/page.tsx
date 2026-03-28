'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PathEditor from '@/components/path/path-editor';
import PathExecutor from '@/components/path/path-executor';
import LearningPathMarket from '@/components/path/learning-path-market';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LearningPath } from '@/lib/path/path-types';
import { getPath, getAllPaths } from '@/lib/path/path-storage';
import { ArrowLeft, Plus, AlertTriangle } from 'lucide-react';
import { toast } from '@/lib/toast';

function PathEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathId = searchParams.get('id');
  const mode = searchParams.get('mode') || 'market';

  const [currentPath, setCurrentPath] = useState<LearningPath | undefined>();
  const [activeTab, setActiveTab] = useState(mode);

  useEffect(() => {
    if (pathId) {
      loadPath(pathId);
    }
  }, [pathId]);

  const loadPath = async (id: string) => {
    const path = await getPath(id);
    if (path) {
      setCurrentPath(path);
      setActiveTab('editor');
    }
  };

  const handleSavePath = (path: LearningPath) => {
    setCurrentPath(path);
    toast('路径已保存！', 'success');
  };

  const handlePreviewPath = (path: LearningPath) => {
    setCurrentPath(path);
    setActiveTab('preview');
  };

  const handleSelectTemplate = (path: LearningPath) => {
    setCurrentPath(path);
    setActiveTab('editor');
  };

  const handleStartPath = (path: LearningPath) => {
    setCurrentPath(path);
    setActiveTab('execute');
  };

  const handleCreateNew = () => {
    setCurrentPath(undefined);
    setActiveTab('editor');
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-4 h-4" />
            <span>⚠️ 此页面已停用。学习路径功能已移至知识星图</span>
          </div>
          <button
            onClick={() => router.push('/graph?view=path')}
            className="text-amber-800 hover:text-amber-900 font-medium text-sm"
          >
            前往知识星图 →
          </button>
        </div>
      </div>

      {/* 顶部导航 */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回
            </Button>
            <h1 className="text-2xl font-bold">学习路径编辑器</h1>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            创建新路径
          </Button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="border-b bg-white px-6">
            <TabsTrigger value="market">路径市场</TabsTrigger>
            <TabsTrigger value="editor">编辑器</TabsTrigger>
            <TabsTrigger value="preview" disabled={!currentPath}>
              预览
            </TabsTrigger>
            <TabsTrigger value="execute" disabled={!currentPath}>
              执行
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="market" className="h-full m-0 overflow-y-auto">
              <LearningPathMarket
                onSelectTemplate={handleSelectTemplate}
                onStartPath={handleStartPath}
              />
            </TabsContent>

            <TabsContent value="editor" className="h-full m-0">
              <PathEditor
                initialPath={currentPath}
                onSave={handleSavePath}
                onPreview={handlePreviewPath}
              />
            </TabsContent>

            <TabsContent value="preview" className="h-full m-0">
              {currentPath && (
                <PathExecutor
                  path={currentPath}
                  onComplete={() => toast('路径完成！', 'success')}
                />
              )}
            </TabsContent>

            <TabsContent value="execute" className="h-full m-0">
              {currentPath && (
                <PathExecutor
                  path={currentPath}
                  onComplete={() => {
                    toast('恭喜完成学习路径！', 'success');
                    setActiveTab('market');
                  }}
                />
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

export default function PathEditorPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">加载中...</div>}>
      <PathEditorContent />
    </Suspense>
  );
}
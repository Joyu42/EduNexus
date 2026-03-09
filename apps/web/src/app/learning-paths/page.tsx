'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Plus,
  Play,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  TrendingUp,
} from 'lucide-react';
import { LearningPath, PathProgress } from '@/lib/path/path-types';
import { getAllPaths, deletePath, getProgress } from '@/lib/path/path-storage';

export default function LearningPathsPage() {
  const router = useRouter();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, PathProgress>>({});

  useEffect(() => {
    loadPaths();
  }, []);

  const loadPaths = async () => {
    const allPaths = await getAllPaths();
    setPaths(allPaths);

    const progressData: Record<string, PathProgress> = {};
    for (const path of allPaths) {
      const progress = await getProgress(path.id);
      if (progress) {
        progressData[path.id] = progress;
      }
    }
    setProgressMap(progressData);
  };

  const handleCreateNew = () => {
    router.push('/path/editor?mode=editor');
  };

  const handleEdit = (pathId: string) => {
    router.push(`/path/editor?id=${pathId}&mode=editor`);
  };

  const handleStart = (pathId: string) => {
    router.push(`/path/editor?id=${pathId}&mode=execute`);
  };

  const handleDelete = async (pathId: string) => {
    if (confirm('确定要删除这个学习路径吗？')) {
      await deletePath(pathId);
      loadPaths();
    }
  };

  const handleBrowseMarket = () => {
    router.push('/path/editor?mode=market');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">我的学习路径</h1>
          <p className="text-gray-600 mt-2">
            创建和管理你的个性化学习路径
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleBrowseMarket}>
            <TrendingUp className="w-4 h-4 mr-2" />
            浏览市场
          </Button>
          <Button onClick={handleCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            创建路径
          </Button>
        </div>
      </div>

      {paths.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <div className="space-y-4">
              <div className="text-gray-400">
                <TrendingUp className="w-16 h-16 mx-auto mb-4" />
              </div>
              <h3 className="text-xl font-semibold">还没有学习路径</h3>
              <p className="text-gray-600">
                创建你的第一个学习路径，或从市场中选择一个模板
              </p>
              <div className="flex gap-2 justify-center mt-6">
                <Button onClick={handleBrowseMarket}>浏览市场</Button>
                <Button variant="outline" onClick={handleCreateNew}>
                  创建新路径
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paths.map((path) => {
            const progress = progressMap[path.id];
            const isCompleted = progress?.progress === 100;
            const isInProgress = progress && progress.progress > 0 && progress.progress < 100;

            return (
              <Card key={path.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge
                      variant={
                        path.difficulty === 'beginner'
                          ? 'default'
                          : path.difficulty === 'intermediate'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {path.difficulty === 'beginner' && '初级'}
                      {path.difficulty === 'intermediate' && '中级'}
                      {path.difficulty === 'advanced' && '高级'}
                    </Badge>
                    {isCompleted && (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        已完成
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl">{path.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {path.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {progress && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">学习进度</span>
                        <span className="font-medium">{progress.progress}%</span>
                      </div>
                      <Progress value={progress.progress} />
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{Math.round(path.estimatedDuration / 60)}h</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>{path.nodes.length} 节点</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {path.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {path.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{path.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleStart(path.id)}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      {isInProgress ? '继续学习' : '开始学习'}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleEdit(path.id)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleDelete(path.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Plus, Wand2, BookOpen, Target, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoginPrompt } from '@/components/ui/login-prompt';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { pathStorage, type LearningPath } from '@/lib/client/path-storage';
import { goalStorage, type Goal } from '@/lib/goals/goal-storage';
import { fetchDemoPathBootstrap, buildDemoStarterContent } from '@/lib/client/demo-bootstrap';
import { getLearningPathsPageState } from '@/lib/client/path-goal-view-state';

export default function LearningPathsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { 
    if (status === 'authenticated') {
      loadData(); 
    }
  }, [status]);

  const loadData = async () => {
    try {
      setLoading(true);
      let [loadedPaths, loadedGoals] = await Promise.all([
        pathStorage.getAllPaths(),
        Promise.resolve(goalStorage.getGoals())
      ]);

      const state = getLearningPathsPageState({
        isLoading: false,
        pathCount: loadedPaths.length,
        isDemoUser: session?.user?.isDemo === true,
      });

      if (state.kind === 'bootstrap_demo') {
        const bootstrap = await fetchDemoPathBootstrap();
        if (bootstrap) {
          const starter = buildDemoStarterContent(bootstrap);
          goalStorage.saveGoal(starter.goal);
          await pathStorage.createPath(starter.path);
          [loadedPaths, loadedGoals] = await Promise.all([
            pathStorage.getAllPaths(),
            Promise.resolve(goalStorage.getGoals()),
          ]);
        }
      }

      setPaths(loadedPaths);
      setGoals(loadedGoals);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePath = async (id: string) => {
    if (!confirm('确定要删除这个学习路径吗？')) return;
    try {
      await pathStorage.deletePath(id);
      setPaths(paths.filter(p => p.id !== id));
      toast.success('路径已删除');
    } catch (error) {
      toast.error('删除失败');
    }
  };

  const filteredPaths = paths.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getGoalTitle = (goalId?: string) => goalId ? goals.find(g => g.id === goalId)?.title : null;

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">加载中...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <LoginPrompt title="学习路径" />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">加载中...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: paths.length,
    inProgress: paths.filter(p => p.status === 'in_progress').length,
    completed: paths.filter(p => p.status === 'completed').length,
    avgProgress: paths.length > 0 ? Math.round(paths.reduce((sum, p) => sum + p.progress, 0) / paths.length) : 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30">
      <div className="page-container">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            学习路径
          </h1>
          <p className="text-muted-foreground">可视化学习路径编辑器，AI 智能生成，拖拽式设计</p>

          {paths.length > 0 && (
            <div className="grid grid-cols-4 gap-4 mt-6">
              {[
                { label: '总路径', value: stats.total, color: 'text-blue-500' },
                { label: '进行中', value: stats.inProgress, color: 'text-yellow-500' },
                { label: '已完成', value: stats.completed, color: 'text-green-500' },
                { label: '平均进度', value: `${stats.avgProgress}%`, color: 'text-purple-500' },
              ].map((stat) => (
                <Card key={stat.label} className="bg-white/80 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 mb-6">
          <Input placeholder="搜索学习路径..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="max-w-md" />
          <div className="flex-1" />
          <Button onClick={() => router.push('/path/new-editor')} variant="outline" className="border-purple-300 hover:bg-purple-50">
            <Wand2 className="w-4 h-4 mr-2" />
            AI 生成路径
          </Button>
          <Button onClick={() => router.push('/path')} className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            创建路径
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-muted-foreground mt-4">加载中...</p>
          </div>
        ) : filteredPaths.length === 0 ? (
          <Card className="p-12 text-center bg-white/80 backdrop-blur-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">还没有学习路径</h3>
            <p className="text-muted-foreground mb-6">{searchQuery ? '没有找到匹配的路径' : '创建你的第一个学习路径，开始成长之旅'}</p>
            {!searchQuery && (
              <div className="flex gap-3 justify-center">
                <Button onClick={() => router.push('/path/new-editor')} variant="outline" className="border-purple-300">
                  <Wand2 className="w-4 h-4 mr-2" />AI 生成
                </Button>
                <Button onClick={() => router.push('/path')} className="bg-gradient-to-r from-blue-500 to-purple-500">
                  <Plus className="w-4 h-4 mr-2" />手动创建
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPaths.map((path, index) => {
              const goalTitle = getGoalTitle(path.goalId);
              const completedTasks = path.tasks.filter(t => t.status === 'completed').length;
              const totalTasks = path.tasks.length;

              return (
                <motion.div key={path.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card className="hover:shadow-xl transition-all duration-300 group bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-lg mb-2">{path.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{path.description || '暂无描述'}</CardDescription>
                      {goalTitle && (
                        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2 text-xs">
                            <Target className="w-3 h-3 text-blue-500" />
                            <span className="text-blue-700 font-medium">{goalTitle}</span>
                          </div>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">完成进度</span>
                          <span className="font-semibold text-primary">{path.progress}%</span>
                        </div>
                        <Progress value={path.progress} className="h-2" />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          <span>{completedTasks}/{totalTasks} 任务</span>
                        </div>
                        {path.tags.length > 0 && (
                          <div className="flex gap-1">
                            {path.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="outline" onClick={() => router.push(`/path/new-editor?id=${path.id}`)} className="flex-1">
                          <Edit className="w-4 h-4 mr-2" />编辑
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeletePath(path.id)} className="text-red-500 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

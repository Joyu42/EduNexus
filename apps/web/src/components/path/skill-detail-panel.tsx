/**
 * 技能详情面板 - 显示技能节点的详细信息
 */

'use client';

import { useState } from 'react';
import {
  PanelRightClose,
  Clock,
  Zap,
  BookOpen,
  FileText,
  Video,
  Link2,
  CheckCircle2,
  Circle,
  PlayCircle,
  Lock,
  Target,
  TrendingUp,
  Award,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import type { SkillNode, SkillNodeStatus } from '@/lib/path/skill-tree-types';
import { cn } from '@/lib/utils';

type SkillDetailPanelProps = {
  node: SkillNode;
  status: SkillNodeStatus;
  onClose: () => void;
  onStart?: () => void;
  onComplete?: () => void;
  onUnlock?: () => void;
  recommendations?: string[];
};

export default function SkillDetailPanel({
  node,
  status,
  onClose,
  onStart,
  onComplete,
  onUnlock,
  recommendations = [],
}: SkillDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const statusConfig = {
    locked: {
      icon: Lock,
      label: '未解锁',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
    },
    available: {
      icon: Zap,
      label: '可学习',
      color: 'text-amber-500',
      bgColor: 'bg-amber-100',
    },
    in_progress: {
      icon: PlayCircle,
      label: '学习中',
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
    },
    completed: {
      icon: CheckCircle2,
      label: '已完成',
      color: 'text-green-500',
      bgColor: 'bg-green-100',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const typeLabels = {
    basic: '基础技能',
    advanced: '进阶技能',
    expert: '高级技能',
    milestone: '里程碑',
  };

  const resourceIcons = {
    article: FileText,
    video: Video,
    book: BookOpen,
    course: BookOpen,
    documentation: FileText,
  };

  return (
    <div className="relative w-96 h-full bg-white border-l shadow-2xl overflow-hidden flex flex-col">
      {/* 头部 */}
      <div className="p-6 bg-gradient-to-br from-orange-500 to-amber-500 text-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <StatusIcon className="w-6 h-6" />
            <Badge className="bg-white/20 text-white border-white/30">
              {typeLabels[node.type]}
            </Badge>
          </div>
          <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className={cn("absolute top-4 right-4 z-10 h-8 w-8 bg-white/70 hover:bg-white text-slate-700 shadow-sm rounded-lg transition-all duration-300")}
        aria-label="关闭面板"
        aria-expanded={true}
      >
        <PanelRightClose className="h-4 w-4" />
      </Button>
        </div>

        <h2 className="text-2xl font-bold mb-2">{node.title}</h2>
        <p className="text-white/90 text-sm">{node.description}</p>

        {/* 状态标签 */}
        <div className="mt-4 flex items-center gap-2">
          <div className={cn('px-3 py-1 rounded-full text-sm font-medium', config.bgColor, config.color)}>
            {config.label}
          </div>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border-b">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
            <Zap className="w-4 h-4" />
            <span className="text-lg font-bold">{node.exp}</span>
          </div>
          <p className="text-xs text-gray-600">经验值</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-lg font-bold">{node.estimatedHours}</span>
          </div>
          <p className="text-xs text-gray-600">预计小时</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
            <Target className="w-4 h-4" />
            <span className="text-lg font-bold">{node.skillPoints}</span>
          </div>
          <p className="text-xs text-gray-600">技能点</p>
        </div>
      </div>

      {/* 进度条 */}
      {status === 'in_progress' && (
        <div className="p-4 bg-blue-50 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">学习进度</span>
            <span className="text-sm font-bold text-blue-600">{node.progress}%</span>
          </div>
          <Progress value={node.progress} className="h-2" />
        </div>
      )}

      {/* 标签页内容 */}
      <div className="flex-1 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 sticky top-0 bg-white z-10">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="resources">资源</TabsTrigger>
            <TabsTrigger value="exercises">练习</TabsTrigger>
            <TabsTrigger value="notes">笔记</TabsTrigger>
          </TabsList>

          <div className="p-4">
            <TabsContent value="overview" className="mt-0 space-y-4">
              {/* AI 推荐 */}
              {recommendations.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-600" />
                      AI 学习建议
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {recommendations.map((tip, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2" />
                        <p className="text-sm text-gray-700">{tip}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* 依赖关系 */}
              {node.dependencies.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    前置技能
                  </h3>
                  <div className="space-y-1">
                    {node.dependencies.map((depId) => (
                      <div
                        key={depId}
                        className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-gray-700">技能 {depId}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 解锁技能 */}
              {node.unlocks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    完成后解锁
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {node.unlocks.map((unlockId) => (
                      <div
                        key={unlockId}
                        className="p-2 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 text-xs text-center"
                      >
                        技能 {unlockId}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="resources" className="mt-0 space-y-3">
              {node.resources.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">暂无学习资源</p>
              ) : (
                node.resources.map((resource) => {
                  const ResourceIcon = resourceIcons[resource.type];
                  return (
                    <Card
                      key={resource.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                            <ResourceIcon className="h-5 w-5 text-orange-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-sm font-medium">{resource.title}</h4>
                              {resource.completed && (
                                <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {resource.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {resource.difficulty}
                              </Badge>
                              {resource.duration && (
                                <span className="text-xs text-gray-500">{resource.duration}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="exercises" className="mt-0 space-y-3">
              {node.exercises.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">暂无练习题</p>
              ) : (
                node.exercises.map((exercise) => (
                  <Card key={exercise.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-sm font-medium">{exercise.title}</h4>
                        {exercise.completed && (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mb-3">{exercise.description}</p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            exercise.difficulty === 'easy' && 'border-green-300 text-green-700',
                            exercise.difficulty === 'medium' && 'border-yellow-300 text-yellow-700',
                            exercise.difficulty === 'hard' && 'border-red-300 text-red-700'
                          )}
                        >
                          {exercise.difficulty}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {exercise.points} 分
                        </span>
                        {exercise.bestScore !== undefined && (
                          <span className="text-xs text-green-600 ml-auto">
                            最高分: {exercise.bestScore}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              <Card>
                <CardContent className="p-4">
                  {node.notes ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{node.notes}</p>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-8">暂无学习笔记</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* 底部操作按钮 */}
      <div className="p-4 border-t bg-gray-50 space-y-2">
        {status === 'locked' && (
          <Button
            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600"
            onClick={onUnlock}
          >
            <Lock className="w-4 h-4 mr-2" />
            解锁技能 ({node.skillPoints} 点)
          </Button>
        )}

        {status === 'available' && (
          <Button
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
            onClick={onStart}
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            开始学习
          </Button>
        )}

        {status === 'in_progress' && (
          <>
            <Button
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              onClick={onComplete}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              标记完成
            </Button>
            <Button variant="outline" className="w-full">
              继续学习
            </Button>
          </>
        )}

        {status === 'completed' && (
          <Button variant="outline" className="w-full" disabled>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            已完成
          </Button>
        )}
      </div>
    </div>
  );
}
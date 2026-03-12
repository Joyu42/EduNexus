'use client';

import { Goal } from '@/lib/goals/goal-storage';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, Target, BookOpen, Edit, Trash2, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface GoalCardProps {
  goal: Goal;
  onUpdateProgress: (id: string, progress: number) => void;
  onDelete: (id: string) => void;
  linkedPathsCount?: number;
  linkedPathsProgress?: number;
}

export function GoalCard({
  goal,
  onUpdateProgress,
  onDelete,
  linkedPathsCount = 0,
  linkedPathsProgress = 0
}: GoalCardProps) {
  const getTypeLabel = (type: string) => {
    const labels = {
      'short-term': '短期',
      'mid-term': '中期',
      'long-term': '长期',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      exam: '📝 考试',
      skill: '⚡ 技能',
      project: '🚀 项目',
      habit: '🔄 习惯',
      other: '🎯 其他',
    };
    return labels[category as keyof typeof labels] || category;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-blue-500',
      completed: 'bg-green-500',
      paused: 'bg-yellow-500',
      cancelled: 'bg-gray-500',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-500';
  };

  const daysRemaining = Math.ceil(
    (new Date(goal.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const isOverdue = daysRemaining < 0;
  const isUrgent = daysRemaining > 0 && daysRemaining <= 7;

  return (
    <Card className="hover:shadow-lg transition-all duration-300 group">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="w-5 h-5 text-primary" />
              {goal.title}
            </CardTitle>
            <CardDescription className="mt-2 line-clamp-2">{goal.description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs">{getTypeLabel(goal.type)}</Badge>
            <Badge variant="outline" className="text-xs">{getCategoryLabel(goal.category)}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 目标进度 */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">目标进度</span>
            <span className="font-semibold text-primary">{goal.progress}%</span>
          </div>
          <Progress value={goal.progress} className="h-2" />
        </div>

        {/* 关联学习路径 */}
        {linkedPathsCount > 0 && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm">
                <BookOpen className="w-4 h-4 text-blue-500" />
                <span className="font-medium">关联学习路径</span>
                <Badge variant="secondary" className="text-xs">{linkedPathsCount}</Badge>
              </div>
              <Link href="/path">
                <Button variant="ghost" size="sm" className="h-6 text-xs">
                  查看 <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={linkedPathsProgress} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground">{linkedPathsProgress}%</span>
            </div>
          </div>
        )}

        {linkedPathsCount === 0 && (
          <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="w-4 h-4" />
              <span>暂无关联学习路径</span>
              <Link href="/path">
                <Button variant="link" size="sm" className="h-auto p-0 text-xs">
                  去创建
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* 时间信息 */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {isOverdue ? (
                <span className="text-red-500 font-medium">已逾期 {Math.abs(daysRemaining)} 天</span>
              ) : isUrgent ? (
                <span className="text-orange-500 font-medium">还剩 {daysRemaining} 天</span>
              ) : (
                <span>还剩 {daysRemaining} 天</span>
              )}
            </span>
          </div>
          <div className={`w-2 h-2 rounded-full ${getStatusColor(goal.status)}`} />
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-2 border-t opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdateProgress(goal.id, Math.min(100, goal.progress + 10))}
            className="flex-1"
          >
            +10% 进度
          </Button>
          <Button size="sm" variant="ghost" className="px-3">
            <Edit className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onDelete(goal.id)} className="px-3 text-red-500 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

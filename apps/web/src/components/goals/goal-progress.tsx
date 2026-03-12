'use client';

import { Goal } from '@/lib/goals/goal-storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Sparkles, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';

interface GoalProgressProps {
  goal: Goal;
}

export function GoalProgress({ goal }: GoalProgressProps) {
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (goal.progress === 100 && goal.status === 'completed') {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [goal.progress, goal.status]);

  return (
    <Card className="relative overflow-hidden">
      {showCelebration && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center animate-bounce">
            <Sparkles className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold">目标达成！</h3>
            <p className="text-muted-foreground mt-2">恭喜你完成了这个目标</p>
          </div>
        </div>
      )}

      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {goal.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
          {goal.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">总体进度</span>
            <span className="font-bold text-lg">{goal.progress}%</span>
          </div>
          <Progress value={goal.progress} className="h-3" />
        </div>

        {goal.linkedPathIds && goal.linkedPathIds.length > 0 && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-semibold mb-2 flex items-center gap-1">
              <BookOpen className="w-4 h-4 text-blue-500" />
              关联的学习路径
            </p>
            <p className="text-xs text-muted-foreground">
              已关联 {goal.linkedPathIds.length} 个学习路径
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <p className="text-sm text-muted-foreground">开始日期</p>
            <p className="font-medium">{new Date(goal.startDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">目标日期</p>
            <p className="font-medium">{new Date(goal.endDate).toLocaleDateString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

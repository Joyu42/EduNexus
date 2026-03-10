'use client';

import { useState, useEffect } from 'react';
import { Goal, goalStorage, Habit, habitStorage } from '@/lib/goals/goal-storage';
import { GoalWizard } from '@/components/goals/goal-wizard';
import { GoalCard } from '@/components/goals/goal-card';
import { HabitCalendar } from '@/components/goals/habit-calendar';
import { HabitTracker } from '@/components/goals/habit-tracker';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Target, Calendar } from 'lucide-react';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [showHabitDialog, setShowHabitDialog] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: '', description: '' });

  useEffect(() => {
    setGoals(goalStorage.getGoals());
    setHabits(habitStorage.getHabits());
  }, []);

  const handleCreateGoal = (goal: Goal) => {
    goalStorage.saveGoal(goal);
    setGoals(goalStorage.getGoals());
    setShowWizard(false);
  };

  const handleUpdateProgress = (id: string, progress: number) => {
    goalStorage.updateProgress(id, progress);
    setGoals(goalStorage.getGoals());
  };

  const handleToggleMilestone = (goalId: string, milestoneId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
      const milestone = goal.milestones.find(m => m.id === milestoneId);
      if (milestone) {
        milestone.completed = !milestone.completed;
        milestone.completedAt = milestone.completed ? new Date().toISOString() : undefined;

        const completedCount = goal.milestones.filter(m => m.completed).length;
        const progress = Math.round((completedCount / goal.milestones.length) * 100);
        goal.progress = progress;

        goalStorage.saveGoal(goal);
        setGoals(goalStorage.getGoals());
      }
    }
  };

  const handleDeleteGoal = (id: string) => {
    goalStorage.deleteGoal(id);
    setGoals(goalStorage.getGoals());
  };

  const handleCreateHabit = () => {
    if (!newHabit.name.trim()) return;

    const habit: Habit = {
      id: Date.now().toString(),
      name: newHabit.name,
      description: newHabit.description,
      frequency: 'daily',
      targetDays: [0, 1, 2, 3, 4, 5, 6],
      checkIns: {},
      streak: 0,
      longestStreak: 0,
      createdAt: new Date().toISOString(),
    };

    habitStorage.saveHabit(habit);
    setHabits(habitStorage.getHabits());
    setNewHabit({ name: '', description: '' });
    setShowHabitDialog(false);
  };

  const handleCheckIn = (habitId: string) => {
    const today = new Date().toISOString().split('T')[0];
    habitStorage.checkIn(habitId, today);
    setHabits(habitStorage.getHabits());
  };

  const handleDeleteHabit = (id: string) => {
    habitStorage.deleteHabit(id);
    setHabits(habitStorage.getHabits());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-rose-50/30">
      <div className="page-container">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500">
              <Target className="h-6 w-6 text-white" />
            </div>
            目标管理
          </h1>
          <p className="text-muted-foreground">
            设定目标，追踪进度，养成习惯，成就更好的自己
          </p>
        </div>

      <Tabs defaultValue="goals" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            我的目标
          </TabsTrigger>
          <TabsTrigger value="habits" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            习惯养成
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">目标列表</h2>
            <Button
              onClick={() => setShowWizard(true)}
              className="bg-gradient-to-br from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              创建新目标
            </Button>
          </div>

          {showWizard && (
            <GoalWizard
              onComplete={handleCreateGoal}
              onCancel={() => setShowWizard(false)}
            />
          )}

          {goals.length === 0 && !showWizard && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Target className="w-8 h-8 text-orange-500 opacity-50" />
              </div>
              <p className="text-muted-foreground mb-4">
                还没有目标，点击上方按钮创建你的第一个目标
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onUpdateProgress={handleUpdateProgress}
                onToggleMilestone={handleToggleMilestone}
                onDelete={handleDeleteGoal}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="habits" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">习惯追踪</h2>
            <Dialog open={showHabitDialog} onOpenChange={setShowHabitDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-br from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600">
                  <Plus className="w-4 h-4 mr-2" />
                  创建新习惯
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>创建新习惯</DialogTitle>
                  <DialogDescription>
                    设定一个你想要养成的习惯，每天打卡记录
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="habit-name">习惯名称</Label>
                    <Input
                      id="habit-name"
                      value={newHabit.name}
                      onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                      placeholder="例如：每天阅读30分钟"
                    />
                  </div>
                  <div>
                    <Label htmlFor="habit-description">描述（可选）</Label>
                    <Textarea
                      id="habit-description"
                      value={newHabit.description}
                      onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                      placeholder="描述这个习惯的目的和意义..."
                      rows={3}
                    />
                  </div>
                  <Button onClick={handleCreateHabit} className="w-full">
                    创建习惯
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {habits.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Calendar className="w-8 h-8 text-orange-500 opacity-50" />
              </div>
              <p className="text-muted-foreground mb-4">
                还没有习惯，点击上方按钮创建你的第一个习惯
              </p>
            </div>
          )}

          <HabitTracker
            habits={habits}
            onCheckIn={handleCheckIn}
            onDelete={handleDeleteHabit}
          />

          <div className="space-y-6 mt-8">
            {habits.map((habit) => (
              <HabitCalendar
                key={habit.id}
                habit={habit}
                onCheckIn={(date) => habitStorage.checkIn(habit.id, date)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

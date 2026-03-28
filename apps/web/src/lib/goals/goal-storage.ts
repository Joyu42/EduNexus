import { getClientUserIdentity } from '@/lib/auth/client-user-cache';

// 目标存储和管理
export type GoalType = 'long-term' | 'mid-term' | 'short-term';
export type GoalStatus = 'active' | 'completed' | 'paused' | 'cancelled';
export type GoalCategory = 'exam' | 'skill' | 'project' | 'habit' | 'other';

export interface Goal {
  id: string;
  title: string;
  description: string;
  type: GoalType;
  category: GoalCategory;
  status: GoalStatus;
  smart: {
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    timeBound: string;
  };
  progress: number;
  linkedPathIds: string[]; // 关联的学习路径 ID
  relatedKnowledge: string[];
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}


export interface Habit {
  id: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'custom';
  targetDays: number[];
  checkIns: Record<string, boolean>;
  streak: number;
  longestStreak: number;
  createdAt: string;
}

// 获取用户特定的存储键
function getStorageKeys(userId: string | null) {
  if (!userId) {
    return null;
  }

  const suffix = `_${userId}`;
  return {
    goals: `edunexus_goals${suffix}`,
    habits: `edunexus_habits${suffix}`,
  };
}

export const goalStorage = {
  getGoals(): Goal[] {
    if (typeof window === 'undefined') return [];
    const userId = getClientUserIdentity();
    const keys = getStorageKeys(userId);
    if (!keys) return [];
    const data = localStorage.getItem(keys.goals);
    return data ? JSON.parse(data) : [];
  },

  saveGoal(goal: Goal): void {
    const userId = getClientUserIdentity();
    const keys = getStorageKeys(userId);
    if (!keys) return;
    const goals = this.getGoals();
    const index = goals.findIndex(g => g.id === goal.id);
    if (index >= 0) {
      goals[index] = goal;
    } else {
      goals.push(goal);
    }
    localStorage.setItem(keys.goals, JSON.stringify(goals));
  },

  deleteGoal(id: string): void {
    const userId = getClientUserIdentity();
    const keys = getStorageKeys(userId);
    if (!keys) return;
    const goals = this.getGoals().filter(g => g.id !== id);
    localStorage.setItem(keys.goals, JSON.stringify(goals));
  },

  updateProgress(id: string, progress: number): void {
    const userId = getClientUserIdentity();
    const keys = getStorageKeys(userId);
    if (!keys) return;
    const goals = this.getGoals();
    const goal = goals.find(g => g.id === id);
    if (goal) {
      goal.progress = progress;
      goal.updatedAt = new Date().toISOString();
      if (progress >= 100) {
        goal.status = 'completed';
      }
      localStorage.setItem(keys.goals, JSON.stringify(goals));
    }
  },

  // 迁移旧数据到新格式（一次性操作）
  migrateData(userId: string): void {
    if (typeof window === 'undefined') return;
    const keys = getStorageKeys(userId);
    if (!keys) return;
    // 检查是否已经迁移过
    if (localStorage.getItem(keys.goals)) return;
    
    // 迁移旧数据
    const oldGoals = localStorage.getItem('edunexus_goals');
    const oldHabits = localStorage.getItem('edunexus_habits');
    
    if (oldGoals) {
      localStorage.setItem(keys.goals, oldGoals);
    }
    if (oldHabits) {
      localStorage.setItem(keys.habits, oldHabits);
    }
  },
};

export const habitStorage = {
  getHabits(): Habit[] {
    if (typeof window === 'undefined') return [];
    const userId = getClientUserIdentity();
    const keys = getStorageKeys(userId);
    if (!keys) return [];
    const data = localStorage.getItem(keys.habits);
    return data ? JSON.parse(data) : [];
  },

  saveHabit(habit: Habit): void {
    const userId = getClientUserIdentity();
    const keys = getStorageKeys(userId);
    if (!keys) return;
    const habits = this.getHabits();
    const index = habits.findIndex(h => h.id === habit.id);
    if (index >= 0) {
      habits[index] = habit;
    } else {
      habits.push(habit);
    }
    localStorage.setItem(keys.habits, JSON.stringify(habits));
  },

  checkIn(habitId: string, date: string): void {
    const userId = getClientUserIdentity();
    const keys = getStorageKeys(userId);
    if (!keys) return;
    const habits = this.getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      habit.checkIns[date] = true;
      habit.streak = this.calculateStreak(habit);
      habit.longestStreak = Math.max(habit.longestStreak, habit.streak);
      localStorage.setItem(keys.habits, JSON.stringify(habits));
    }
  },

  calculateStreak(habit: Habit): number {
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      if (habit.checkIns[dateStr]) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  },

  deleteHabit(id: string): void {
    const userId = getClientUserIdentity();
    const keys = getStorageKeys(userId);
    if (!keys) return;
    const habits = this.getHabits().filter(h => h.id !== id);
    localStorage.setItem(keys.habits, JSON.stringify(habits));
  },
};

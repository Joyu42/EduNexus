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

const STORAGE_KEY = 'edunexus_goals';
const HABITS_KEY = 'edunexus_habits';

export const goalStorage = {
  getGoals(): Goal[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveGoal(goal: Goal): void {
    const goals = this.getGoals();
    const index = goals.findIndex(g => g.id === goal.id);
    if (index >= 0) {
      goals[index] = goal;
    } else {
      goals.push(goal);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  },

  deleteGoal(id: string): void {
    const goals = this.getGoals().filter(g => g.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  },

  updateProgress(id: string, progress: number): void {
    const goals = this.getGoals();
    const goal = goals.find(g => g.id === id);
    if (goal) {
      goal.progress = progress;
      goal.updatedAt = new Date().toISOString();
      if (progress >= 100) {
        goal.status = 'completed';
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
    }
  },
};

export const habitStorage = {
  getHabits(): Habit[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(HABITS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveHabit(habit: Habit): void {
    const habits = this.getHabits();
    const index = habits.findIndex(h => h.id === habit.id);
    if (index >= 0) {
      habits[index] = habit;
    } else {
      habits.push(habit);
    }
    localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  },

  checkIn(habitId: string, date: string): void {
    const habits = this.getHabits();
    const habit = habits.find(h => h.id === habitId);
    if (habit) {
      habit.checkIns[date] = true;
      habit.streak = this.calculateStreak(habit);
      habit.longestStreak = Math.max(habit.longestStreak, habit.streak);
      localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
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
    const habits = this.getHabits().filter(h => h.id !== id);
    localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  },
};

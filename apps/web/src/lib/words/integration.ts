import { goalStorage, type Goal } from "@/lib/goals/goal-storage";

import { wordsStorage } from "./storage";
import type { LearningRecord, Word } from "./types";

type RelatedWordsStorage = {
  getWordsByBook: (bookId: string) => Promise<Word[]>;
};

export const WORDS_DAILY_GOAL_PREFIX = "words-daily";

export function getWordGoalId(date: string): string {
  return `${WORDS_DAILY_GOAL_PREFIX}:${date}`;
}

export function ensureWordDailyGoal(targetWords: number, date: string): Goal {
  if (typeof window === "undefined") {
    const now = new Date().toISOString();
    return {
      id: getWordGoalId(date),
      title: `背单词 ${targetWords} 个`,
      description: `每日背单词目标：${targetWords} 个`,
      type: "short-term",
      category: "habit",
      status: "active",
      smart: {
        specific: `完成 ${targetWords} 个单词学习/复习`,
        measurable: "按当日学习记录完成率计算",
        achievable: "配合复习调度器分配任务",
        relevant: "提升英语词汇量与阅读速度",
        timeBound: `当天完成（${date}）`,
      },
      progress: 0,
      linkedPathIds: [],
      relatedKnowledge: ["vocabulary", "spaced-repetition"],
      startDate: date,
      endDate: date,
      createdAt: now,
      updatedAt: now,
    };
  }

  const goals = goalStorage.getGoals();
  const id = getWordGoalId(date);
  const existing = goals.find((goal) => goal.id === id);

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const goal: Goal = {
    id,
    title: `背单词 ${targetWords} 个`,
    description: `每日背单词目标：${targetWords} 个`,
    type: "short-term",
    category: "habit",
    status: "active",
    smart: {
      specific: `完成 ${targetWords} 个单词学习/复习`,
      measurable: "按当日学习记录完成率计算",
      achievable: "配合复习调度器分配任务",
      relevant: "提升英语词汇量与阅读速度",
      timeBound: `当天完成（${date}）`,
    },
    progress: 0,
    linkedPathIds: [],
    relatedKnowledge: ["vocabulary", "spaced-repetition"],
    startDate: date,
    endDate: date,
    createdAt: now,
    updatedAt: now,
  };

  goalStorage.saveGoal(goal);
  return goal;
}

export function syncWordsProgressToGoal(date: string, targetWords: number, completedWords: number): void {
  if (typeof window === "undefined") {
    return;
  }
  const goal = ensureWordDailyGoal(targetWords, date);
  const progress = Math.min(100, Math.round((completedWords / Math.max(1, targetWords)) * 100));
  goalStorage.updateProgress(goal.id, progress);
}

export async function suggestRelatedWords(
  currentWordId: string,
  bookId: string,
  limit = 3,
  storage: RelatedWordsStorage = wordsStorage
): Promise<Word[]> {
  const words = await storage.getWordsByBook(bookId);
  const current = words.find((word) => word.id === currentWordId);
  if (!current) {
    return [];
  }

  const candidates = words
    .filter((word) => word.id !== currentWordId)
    .sort((left, right) => {
      const difficultyScore = Number(left.difficulty === current.difficulty) - Number(right.difficulty === current.difficulty);
      if (difficultyScore !== 0) {
        return difficultyScore > 0 ? -1 : 1;
      }

      const leftPrefix = left.word.slice(0, 2).toLowerCase();
      const rightPrefix = right.word.slice(0, 2).toLowerCase();
      const currentPrefix = current.word.slice(0, 2).toLowerCase();
      const leftPrefixScore = Number(leftPrefix === currentPrefix);
      const rightPrefixScore = Number(rightPrefix === currentPrefix);
      if (leftPrefixScore !== rightPrefixScore) {
        return rightPrefixScore - leftPrefixScore;
      }
      return left.word.localeCompare(right.word);
    });

  return candidates.slice(0, limit);
}

export function countCompletedToday(records: LearningRecord[], date: string): number {
  return records.filter((record) => record.lastReviewedAt === date).length;
}

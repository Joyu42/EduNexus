import type { LearningRecord } from "./types";

const MIN_EASE_FACTOR = 1.3;
const BASE_DAILY_NEW_WORDS = 20;

export function calculateNextReview(
  interval: number,
  easeFactor: number,
  quality: number
): { nextInterval: number; newEaseFactor: number } {
  const safeQuality = Math.min(5, Math.max(0, quality));
  const currentEase = Math.max(MIN_EASE_FACTOR, easeFactor);
  const newEaseFactor = Math.max(
    MIN_EASE_FACTOR,
    currentEase + (0.1 - (5 - safeQuality) * (0.08 + (5 - safeQuality) * 0.02))
  );

  if (safeQuality < 3) {
    return {
      nextInterval: 1,
      newEaseFactor,
    };
  }

  let nextInterval = 1;
  if (interval <= 1) {
    nextInterval = 1;
  } else if (interval <= 6) {
    nextInterval = 6;
  } else {
    nextInterval = Math.max(1, Math.round(interval * newEaseFactor));
  }

  return {
    nextInterval,
    newEaseFactor,
  };
}

export function getNewWordsForToday(total: number, reviewed: number): number {
  const dailyBudget = Math.max(0, total || BASE_DAILY_NEW_WORDS);
  const usedCapacity = Math.max(0, reviewed);
  return Math.max(0, dailyBudget - usedCapacity);
}

export function calculateRetention(
  records: Array<Pick<LearningRecord, "retentionScore">>
): number {
  if (records.length === 0) {
    return 0;
  }

  const kept = records.reduce((sum, record) => sum + record.retentionScore, 0);
  return kept / records.length;
}

import { calculateNextReview, getNewWordsForToday } from "./algorithm";
import type { LearningRecord, ReviewSchedule, Word } from "./types";

type SchedulerStorage = {
  getAllWords: () => Promise<Word[]>;
  getAllLearningRecords: () => Promise<LearningRecord[]>;
};

type StatusStorage = {
  getLearningRecords: (wordId: string) => Promise<LearningRecord[]>;
  saveLearningRecord: (record: LearningRecord) => Promise<void>;
};

function toIsoDate(value: Date): string {
  return value.toISOString().split("T")[0];
}

function addDays(date: string, days: number): string {
  const ref = new Date(`${date}T00:00:00.000Z`);
  ref.setUTCDate(ref.getUTCDate() + days);
  return toIsoDate(ref);
}

export async function generateDailySchedule(
  storage: SchedulerStorage,
  date: string,
  dailyTarget: number
): Promise<ReviewSchedule> {
  const [words, records] = await Promise.all([
    storage.getAllWords(),
    storage.getAllLearningRecords(),
  ]);
  const recordByWord = new Map(records.map((record) => [record.wordId, record]));

  const reviewWords = records
    .filter((record) => record.nextReviewDate <= date)
    .map((record) => record.wordId);

  const reviewedCount = reviewWords.length;
  const newCapacity = getNewWordsForToday(dailyTarget, reviewedCount);

  const newWords = words
    .filter((word) => !recordByWord.has(word.id))
    .slice(0, newCapacity)
    .map((word) => word.id);

  return {
    date,
    wordIds: [...reviewWords, ...newWords],
    newCount: newWords.length,
    reviewCount: reviewWords.length,
  };
}

export async function updateWordStatus(
  storage: StatusStorage,
  bookId: string,
  wordId: string,
  known: boolean,
  today: string
): Promise<void> {
  const existing = await storage.getLearningRecords(wordId);
  const current = existing[0];

  const quality = known ? 4 : 1;
  const baseInterval = current?.interval ?? 1;
  const baseEase = current?.easeFactor ?? 2.5;
  const next = calculateNextReview(baseInterval, baseEase, quality);

  const nextReviewDate = addDays(today, next.nextInterval);

  const record: LearningRecord = {
    wordId,
    bookId,
    learnDate: current?.learnDate ?? today,
    status: known ? "learning" : "reviewing",
    nextReviewDate,
    interval: next.nextInterval,
    easeFactor: next.newEaseFactor,
    reviewCount: (current?.reviewCount ?? 0) + 1,
    successCount: (current?.successCount ?? 0) + (known ? 1 : 0),
    failureCount: (current?.failureCount ?? 0) + (known ? 0 : 1),
    lastReviewedAt: today,
    retentionScore: known ? 1 : 0,
  };

  await storage.saveLearningRecord(record);
}

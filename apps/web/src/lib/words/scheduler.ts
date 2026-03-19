import { calculateNextReview, getNewWordsForToday } from "./algorithm";
import type {
  LearningRecord,
  ReviewSchedule,
  StudyEventType,
  Word,
  WordAnswerGrade,
} from "./types";

type SchedulerStorage = {
  getAllWords: () => Promise<Word[]>;
  getAllLearningRecords: () => Promise<LearningRecord[]>;
};

type StatusStorage = {
  getLearningRecords: (wordId: string) => Promise<LearningRecord[]>;
  saveLearningRecord: (record: LearningRecord) => Promise<void>;
};

const GRADE_TO_QUALITY: Record<WordAnswerGrade, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

const INITIAL_INTERVAL_BY_GRADE: Record<WordAnswerGrade, number> = {
  again: 1,
  hard: 2,
  good: 3,
  easy: 5,
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

function getStudyType(current: LearningRecord | undefined, grade: WordAnswerGrade): StudyEventType {
  if (!current) {
    return "learn";
  }
  return grade === "again" ? "relearn" : "review";
}

export async function updateWordStatus(
  storage: StatusStorage,
  bookId: string,
  wordId: string,
  grade: boolean | WordAnswerGrade,
  today: string
): Promise<void> {
  const existing = await storage.getLearningRecords(wordId);
  const current = existing[0];

  const normalizedGrade: WordAnswerGrade =
    typeof grade === "boolean" ? (grade ? "good" : "again") : grade;
  const quality = GRADE_TO_QUALITY[normalizedGrade];
  const startingInterval = INITIAL_INTERVAL_BY_GRADE[normalizedGrade];
  const baseInterval = current?.interval ?? startingInterval;
  const baseEase = current?.easeFactor ?? 2.5;
  const next = calculateNextReview(baseInterval, baseEase, quality);
  const nextInterval = current ? next.nextInterval : startingInterval;
  const nextReviewDate = addDays(today, nextInterval);

  const isFirstSeen = !current;
  const status =
    normalizedGrade === "again"
      ? "learning"
      : isFirstSeen
        ? "reviewing"
        : next.nextInterval > 6
          ? "mastered"
          : "reviewing";

  const success = normalizedGrade !== "again";
  const studyType = getStudyType(current, normalizedGrade);

  const record: LearningRecord = {
    wordId,
    bookId,
    learnDate: current?.learnDate ?? today,
    status,
    nextReviewDate,
    interval: nextInterval,
    easeFactor: next.newEaseFactor,
    reviewCount: (current?.reviewCount ?? 0) + 1,
    successCount: (current?.successCount ?? 0) + (success ? 1 : 0),
    failureCount: (current?.failureCount ?? 0) + (success ? 0 : 1),
    lastReviewedAt: today,
    retentionScore: success ? 1 : 0,
    lastStudyType: studyType,
    lastGrade: normalizedGrade,
  };

  await storage.saveLearningRecord(record);
}

import { prisma } from "./prisma";
import { listAllLocalWords, listLocalWordBooks, listLocalWordsByBook } from "@/lib/words/catalog";
import { calculateStreakDays } from "@/lib/words/stats";
import {
  CUSTOM_BOOK_ID_PREFIX,
  listCustomWordBooks,
  listCustomWords,
} from "@/lib/server/custom-wordbook-service";
import {
  BUILTIN_BOOK_ID_PREFIX,
  listBuiltinWordBooks,
  listBuiltinWords,
} from "@/lib/server/builtin-wordbook-service";

import type {
  LearningRecord,
  ReviewSchedule,
  StudyEvent,
  WordsPlanSettings,
} from "@/lib/words/types";
import type { WordsMajor } from "@/lib/words/major-gating";

const DEFAULT_PLAN_SETTINGS: WordsPlanSettings = {
  dailyNewLimit: 20,
  reviewFirst: true,
  defaultRevealMode: "hidden",
  selectedMajor: "",
  lastSelectedBookId: "",
};

type LegacyLearningRecord = Partial<LearningRecord> & {
  retentionScore?: number | null;
};

function normalizeIsoDate(value?: string | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function inferRetentionScore(record: LegacyLearningRecord): 0 | 1 {
  if (record.retentionScore === 1) {
    return 1;
  }
  if (record.retentionScore === 0) {
    return 0;
  }
  if (record.lastGrade && record.lastGrade !== "again") {
    return 1;
  }
  if (record.status === "mastered") {
    return 1;
  }
  const successCount = typeof record.successCount === "number" ? record.successCount : 0;
  const failureCount = typeof record.failureCount === "number" ? record.failureCount : 0;
  return successCount > failureCount ? 1 : 0;
}

function normalizeLearningRecord(record: LearningRecord): LearningRecord {
  const learnDateValue = normalizeIsoDate(record.learnDate);
  const lastReviewedAtValue = normalizeIsoDate(record.lastReviewedAt);
  const nextReviewDateValue = normalizeIsoDate(record.nextReviewDate);
  const fallbackDate = learnDateValue ?? lastReviewedAtValue ?? nextReviewDateValue ?? utcToday();
  const safeLearnDate = learnDateValue ?? fallbackDate;
  const normalizedLastReviewedAt = lastReviewedAtValue ?? safeLearnDate;
  const normalizedNextReviewDate = nextReviewDateValue ?? normalizedLastReviewedAt;

  return {
    ...record,
    learnDate: safeLearnDate,
    lastReviewedAt: normalizedLastReviewedAt,
    nextReviewDate: normalizedNextReviewDate,
    retentionScore: inferRetentionScore(record),
  };
}

function normalizeRecords(records: LearningRecord[]): LearningRecord[] {
  return records.map(normalizeLearningRecord);
}

export type WordsProgressSummary = {
  date: string;
  recentProgress: {
    rangeDays: number;
    startDate: string;
    endDate: string;
    activeDays: number;
    learnedWordsInRange: number;
    reviewedCountInRange: number;
    relearnedCountInRange: number;
    averageDailyLearnedWords: number;
  };
  streakDays: number;
  dueToday: number;
  hasDueReview: boolean;
  learnedToday: number;
  reviewedToday: number;
  relearnedToday: number;
  totalWords: number;
  learnedWords: number;
  masteredWords: number;
  accuracyToday: number;
  suggestedBookId: string | null;
  bookProgress: Array<{
    bookId: string;
    bookName: string;
    totalWords: number;
    learnedWords: number;
    masteredWords: number;
    dueToday: number;
    progressPercent: number;
  }>;
};

function utcToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function addUtcDays(date: string, days: number): string {
  const cursor = new Date(`${date}T00:00:00.000Z`);
  cursor.setUTCDate(cursor.getUTCDate() + days);
  return cursor.toISOString().slice(0, 10);
}

function normalizeRangeDays(value?: number): number {
  if (!value || Number.isNaN(value)) {
    return 7;
  }
  return Math.min(30, Math.max(1, Math.floor(value)));
}

function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

function calculateRecentProgress(records: LearningRecord[], endDate: string, rangeDays = 7) {
  const normalizedRangeDays = normalizeRangeDays(rangeDays);
  const startDate = addUtcDays(endDate, -(normalizedRangeDays - 1));
  const activeDaySet = new Set<string>();

  let learnedWordsInRange = 0;
  let reviewedCountInRange = 0;
  let relearnedCountInRange = 0;

  for (const record of records) {
    if (isDateInRange(record.learnDate, startDate, endDate)) {
      learnedWordsInRange += 1;
      activeDaySet.add(record.learnDate);
    }

    if (isDateInRange(record.lastReviewedAt, startDate, endDate)) {
      activeDaySet.add(record.lastReviewedAt);
      if (record.lastStudyType === "review") {
        reviewedCountInRange += 1;
      } else if (record.lastStudyType === "relearn") {
        relearnedCountInRange += 1;
      }
    }
  }

  return {
    rangeDays: normalizedRangeDays,
    startDate,
    endDate,
    activeDays: activeDaySet.size,
    learnedWordsInRange,
    reviewedCountInRange,
    relearnedCountInRange,
    averageDailyLearnedWords: Number((learnedWordsInRange / normalizedRangeDays).toFixed(1)),
  };
}

function toStudyEvent(record: LearningRecord, today: string): StudyEvent | null {
  if (record.lastReviewedAt !== today && record.learnDate !== today) {
    return null;
  }

  const type = record.lastStudyType ?? (record.learnDate === today ? "learn" : "review");
  const grade = record.lastGrade ?? (record.retentionScore === 1 ? "good" : "again");
  return {
    date: today,
    type,
    grade,
    success: record.retentionScore === 1,
  };
}

function calculateTodayStats(records: LearningRecord[], today: string) {
  const events = records
    .map((record) => toStudyEvent(record, today))
    .filter((item): item is StudyEvent => Boolean(item));

  const learnedToday = events.filter((event) => event.type === "learn").length;
  const reviewedToday = events.filter((event) => event.type === "review").length;
  const relearnedToday = events.filter((event) => event.type === "relearn").length;
  const attempts = reviewedToday + relearnedToday;
  const successCount = events.filter((event) => event.type !== "learn" && event.success).length;
  const accuracyToday = attempts === 0 ? 0 : successCount / attempts;

  return {
    learnedToday,
    reviewedToday,
    relearnedToday,
    accuracyToday,
  };
}

export async function getWordsProgressSummary(
  userId: string,
  date = utcToday(),
  rangeDays = 7
): Promise<WordsProgressSummary> {
  const [rawRecords, books, words] = await Promise.all([
    listWordsLearningRecords(userId),
    listWordBooks(userId),
    listWords(userId),
  ]);

  const records = normalizeRecords(rawRecords);

  const recordsByWord = new Map(records.map((record) => [record.wordId, record]));
  const activeDates = Array.from(
    new Set(records.map((record) => record.lastReviewedAt || record.learnDate).filter(Boolean))
  );

  const bookProgress = books.map((book) => {
    const bookWords = words.filter((word) => word.bookId === book.id);
    const bookRecords = records.filter((record) => record.bookId === book.id);
    const learnedWords = bookRecords.length;
    const masteredWords = bookRecords.filter((record) => record.status === "mastered").length;
    const dueToday = bookRecords.filter((record) => record.nextReviewDate <= date).length;
    const progressPercent = bookWords.length === 0 ? 0 : Math.round((masteredWords / bookWords.length) * 100);

    return {
      bookId: book.id,
      bookName: book.name,
      totalWords: bookWords.length,
      learnedWords,
      masteredWords,
      dueToday,
      progressPercent,
    };
  });

  const dueToday = records.filter((record) => record.nextReviewDate <= date).length;
  const suggestedBook =
    bookProgress
      .slice()
      .sort((left, right) => {
        if (left.dueToday !== right.dueToday) {
          return right.dueToday - left.dueToday;
        }
        return right.progressPercent - left.progressPercent;
      })
      .find((book) => book.totalWords > 0) ?? null;

  const totalWords = words.length;
  const learnedWords = recordsByWord.size;
  const masteredWords = records.filter((record) => record.status === "mastered").length;
  const todayStats = calculateTodayStats(records, date);
  const recentProgress = calculateRecentProgress(records, date, rangeDays);

  return {
    date,
    recentProgress,
    streakDays: calculateStreakDays(activeDates, date),
    dueToday,
    hasDueReview: dueToday > 0,
    learnedToday: todayStats.learnedToday,
    reviewedToday: todayStats.reviewedToday,
    relearnedToday: todayStats.relearnedToday,
    totalWords,
    learnedWords,
    masteredWords,
    accuracyToday: todayStats.accuracyToday,
    suggestedBookId: suggestedBook?.bookId ?? null,
    bookProgress,
  };
}

function toLearningRecord(record: {
  wordId: string;
  bookId: string;
  learnDate: string;
  status: string;
  nextReviewDate: string;
  interval: number;
  easeFactor: number;
  reviewCount: number;
  successCount: number;
  failureCount: number;
  lastReviewedAt: string;
  retentionScore: number;
  lastStudyType: string | null;
  lastGrade: string | null;
}): LearningRecord {
  return {
    wordId: record.wordId,
    bookId: record.bookId,
    learnDate: record.learnDate,
    status: record.status as LearningRecord["status"],
    nextReviewDate: record.nextReviewDate,
    interval: record.interval,
    easeFactor: record.easeFactor,
    reviewCount: record.reviewCount,
    successCount: record.successCount,
    failureCount: record.failureCount,
    lastReviewedAt: record.lastReviewedAt,
    retentionScore: record.retentionScore === 1 ? 1 : 0,
    lastStudyType: (record.lastStudyType ?? undefined) as LearningRecord["lastStudyType"],
    lastGrade: (record.lastGrade ?? undefined) as LearningRecord["lastGrade"],
  };
}

function toReviewSchedule(value: {
  date: string;
  wordIds: unknown;
  newCount: number;
  reviewCount: number;
}): ReviewSchedule {
  const wordIds = Array.isArray(value.wordIds)
    ? value.wordIds.filter((item): item is string => typeof item === "string")
    : [];
  return {
    date: value.date,
    wordIds,
    newCount: value.newCount,
    reviewCount: value.reviewCount,
  };
}

export async function listWordsLearningRecords(userId: string): Promise<LearningRecord[]> {
  const records = await prisma.wordsLearningRecord.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return records.map(toLearningRecord);
}

export async function listWordsLearningRecordsByWord(
  userId: string,
  wordId: string
): Promise<LearningRecord[]> {
  const records = await prisma.wordsLearningRecord.findMany({
    where: { userId, wordId },
    orderBy: { updatedAt: "desc" },
  });

  return records.map(toLearningRecord);
}

export async function saveWordsLearningRecord(userId: string, record: LearningRecord): Promise<void> {
  await prisma.wordsLearningRecord.upsert({
    where: {
      userId_wordId: {
        userId,
        wordId: record.wordId,
      },
    },
    update: {
      bookId: record.bookId,
      learnDate: record.learnDate,
      status: record.status,
      nextReviewDate: record.nextReviewDate,
      interval: record.interval,
      easeFactor: record.easeFactor,
      reviewCount: record.reviewCount,
      successCount: record.successCount,
      failureCount: record.failureCount,
      lastReviewedAt: record.lastReviewedAt,
      retentionScore: record.retentionScore,
      lastStudyType: record.lastStudyType ?? null,
      lastGrade: record.lastGrade ?? null,
    },
    create: {
      userId,
      wordId: record.wordId,
      bookId: record.bookId,
      learnDate: record.learnDate,
      status: record.status,
      nextReviewDate: record.nextReviewDate,
      interval: record.interval,
      easeFactor: record.easeFactor,
      reviewCount: record.reviewCount,
      successCount: record.successCount,
      failureCount: record.failureCount,
      lastReviewedAt: record.lastReviewedAt,
      retentionScore: record.retentionScore,
      lastStudyType: record.lastStudyType ?? null,
      lastGrade: record.lastGrade ?? null,
    },
  });
}

export async function getWordsPlanSettings(userId: string): Promise<WordsPlanSettings> {
  const setting = await prisma.wordsPlanSetting.findUnique({ where: { userId } });
  if (!setting) {
    return DEFAULT_PLAN_SETTINGS;
  }

  return {
    dailyNewLimit: setting.dailyNewLimit,
    reviewFirst: setting.reviewFirst,
    defaultRevealMode:
      setting.defaultRevealMode === "definition" ? "definition" : "hidden",
    selectedMajor: (setting.selectedMajor ?? "") as "" | WordsMajor,
    lastSelectedBookId: setting.lastSelectedBookId ?? "",
  };
}

export async function saveWordsPlanSettings(
  userId: string,
  settings: WordsPlanSettings
): Promise<void> {
  await prisma.wordsPlanSetting.upsert({
    where: { userId },
    update: {
      dailyNewLimit: settings.dailyNewLimit,
      reviewFirst: settings.reviewFirst,
      defaultRevealMode: settings.defaultRevealMode,
      selectedMajor: settings.selectedMajor,
      lastSelectedBookId: settings.lastSelectedBookId,
    },
    create: {
      userId,
      dailyNewLimit: settings.dailyNewLimit,
      reviewFirst: settings.reviewFirst,
      defaultRevealMode: settings.defaultRevealMode,
      selectedMajor: settings.selectedMajor,
      lastSelectedBookId: settings.lastSelectedBookId,
    },
  });
}

export async function getWordsReviewSchedule(
  userId: string,
  date: string
): Promise<ReviewSchedule | null> {
  const schedule = await prisma.wordsReviewSchedule.findUnique({
    where: {
      userId_date: {
        userId,
        date,
      },
    },
  });

  if (!schedule) {
    return null;
  }

  return toReviewSchedule(schedule);
}

export async function saveWordsReviewSchedule(userId: string, schedule: ReviewSchedule): Promise<void> {
  await prisma.wordsReviewSchedule.upsert({
    where: {
      userId_date: {
        userId,
        date: schedule.date,
      },
    },
    update: {
      wordIds: schedule.wordIds,
      newCount: schedule.newCount,
      reviewCount: schedule.reviewCount,
    },
    create: {
      userId,
      date: schedule.date,
      wordIds: schedule.wordIds,
      newCount: schedule.newCount,
      reviewCount: schedule.reviewCount,
    },
  });
}

export async function listWordBooks(userId: string) {
  const [local, builtin, custom] = await Promise.all([
    Promise.resolve(listLocalWordBooks()),
    listBuiltinWordBooks(),
    listCustomWordBooks(userId),
  ]);
  return [...local, ...builtin, ...custom];
}

export async function listWords(userId: string, bookId?: string) {
  if (bookId && bookId.startsWith(CUSTOM_BOOK_ID_PREFIX)) {
    return listCustomWords(userId, { bookId });
  }
  if (bookId && bookId.startsWith(BUILTIN_BOOK_ID_PREFIX)) {
    return listBuiltinWords({ bookId });
  }
  if (bookId) {
    return listLocalWordsByBook(bookId);
  }
  const [local, builtin, custom] = await Promise.all([
    Promise.resolve(listAllLocalWords()),
    listBuiltinWords(),
    listCustomWords(userId),
  ]);
  return [...local, ...builtin, ...custom];
}

import { listAllLocalWords, listLocalWordBooks, listLocalWordsByBook } from "./catalog";
import { calculateRetention } from "./algorithm";
import {
  calculateStreakDays,
  calculateTotalLearned,
  calculateTodayProgress,
} from "./stats";
import { requestJson } from "@/lib/client/api";
import type {
  LearningRecord,
  LearningStats,
  ReviewSchedule,
  StudyEvent,
  Word,
  WordBook,
  WordsPlanSettings,
} from "./types";

type StorageMode = "api" | "memory";

export type WordsStorage = {
  saveWordBook: (book: WordBook) => Promise<void>;
  getWordBooks: () => Promise<WordBook[]>;
  saveWords: (words: Word[]) => Promise<void>;
  getWordsByBook: (bookId: string) => Promise<Word[]>;
  getAllWords: () => Promise<Word[]>;
  saveLearningRecord: (record: LearningRecord) => Promise<void>;
  getLearningRecords: (wordId: string) => Promise<LearningRecord[]>;
  getAllLearningRecords: () => Promise<LearningRecord[]>;
  getTodayReviewWords: (today?: string) => Promise<Word[]>;
  saveReviewSchedule: (schedule: ReviewSchedule) => Promise<void>;
  getReviewSchedule: (date: string) => Promise<ReviewSchedule | null>;
  getLearningStats: (today?: string) => Promise<LearningStats>;
  getWordsPlanSettings: () => Promise<WordsPlanSettings>;
  saveWordsPlanSettings: (settings: WordsPlanSettings) => Promise<void>;
};

const DEFAULT_PLAN_SETTINGS: WordsPlanSettings = {
  dailyNewLimit: 20,
  reviewFirst: true,
  defaultRevealMode: "hidden",
  selectedMajor: "",
  lastSelectedBookId: "",
};

function toIsoDate(value: Date): string {
  return value.toISOString().split("T")[0];
}

function safeDate(today?: string): string {
  return today ?? toIsoDate(new Date());
}

function inferRetentionScore(record: LearningRecord): 0 | 1 {
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
  const fallbackDate = record.learnDate || record.lastReviewedAt || record.nextReviewDate;
  const safeLearnDate = record.learnDate || fallbackDate || safeDate();
  const normalizedLastReviewedAt = record.lastReviewedAt || safeLearnDate;
  const normalizedNextReviewDate = record.nextReviewDate || normalizedLastReviewedAt || safeLearnDate;

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

function createEvents(records: LearningRecord[], today: string): StudyEvent[] {
  return records.flatMap((record) => {
    if (record.lastReviewedAt === today) {
      return [
        {
          date: today,
          type: record.lastStudyType ?? (record.learnDate === today ? "learn" : "review"),
          grade: record.lastGrade ?? (record.retentionScore === 1 ? "good" : "again"),
          success: record.retentionScore === 1,
        },
      ];
    }
    if (record.learnDate === today) {
      return [
        {
          date: today,
          type: "learn",
          grade: "good",
          success: true,
        },
      ];
    }
    return [];
  });
}

function createCore(storage: {
  putBook: (book: WordBook) => Promise<void>;
  allBooks: () => Promise<WordBook[]>;
  putWords: (words: Word[]) => Promise<void>;
  wordsByBook: (bookId: string) => Promise<Word[]>;
  allWords: () => Promise<Word[]>;
  putRecord: (record: LearningRecord) => Promise<void>;
  recordsByWord: (wordId: string) => Promise<LearningRecord[]>;
  allRecords: () => Promise<LearningRecord[]>;
  putSchedule: (schedule: ReviewSchedule) => Promise<void>;
  getSchedule: (date: string) => Promise<ReviewSchedule | null>;
  getPlanSettings: () => Promise<WordsPlanSettings | null>;
  savePlanSettings: (settings: WordsPlanSettings) => Promise<void>;
}): WordsStorage {
  const loadAllRecords = async (): Promise<LearningRecord[]> => {
    const items = await storage.allRecords();
    return normalizeRecords(items);
  };

  const loadRecordsByWord = async (wordId: string): Promise<LearningRecord[]> => {
    const items = await storage.recordsByWord(wordId);
    return normalizeRecords(items);
  };

  return {
    saveWordBook: async (book) => {
      await storage.putBook(book);
    },
    getWordBooks: async () => storage.allBooks(),
    saveWords: async (words) => {
      await storage.putWords(words);
    },
    getWordsByBook: async (bookId) => storage.wordsByBook(bookId),
    getAllWords: async () => storage.allWords(),
    saveLearningRecord: async (record) => {
      await storage.putRecord(record);
    },
    getLearningRecords: async (wordId) => loadRecordsByWord(wordId),
    getAllLearningRecords: async () => loadAllRecords(),
    getTodayReviewWords: async (today) => {
      const date = safeDate(today);
      const [records, words] = await Promise.all([loadAllRecords(), storage.allWords()]);
      const dueSet = new Set(
        records.filter((record) => record.nextReviewDate <= date).map((record) => record.wordId)
      );
      return words.filter((word) => dueSet.has(word.id));
    },
    saveReviewSchedule: async (schedule) => {
      await storage.putSchedule(schedule);
    },
    getReviewSchedule: async (date) => storage.getSchedule(date),
    getLearningStats: async (today) => {
      const date = safeDate(today);
      const [books, words, records] = await Promise.all([
        storage.allBooks(),
        storage.allWords(),
        loadAllRecords(),
      ]);

      const events = createEvents(records, date);
      const todayProgress = calculateTodayProgress(events, date);
      const activeDates = Array.from(
        new Set(
          records
            .map((record) => record.lastReviewedAt || record.learnDate)
            .filter((value): value is string => Boolean(value))
        )
      );
      const masteredWords = calculateTotalLearned(records);
      const dueToday = records.filter((record) => record.nextReviewDate <= date).length;
      const retention = calculateRetention(records);

      return {
        totalBooks: books.length,
        totalWords: words.length,
        learnedWords: records.length,
        masteredWords,
        dueToday,
        accuracy: todayProgress.accuracy || retention,
        streakDays: calculateStreakDays(activeDates, date),
        todaySummary: todayProgress,
      };
    },
    getWordsPlanSettings: async () => {
      const stored = await storage.getPlanSettings();
      return stored ? { ...DEFAULT_PLAN_SETTINGS, ...stored } : DEFAULT_PLAN_SETTINGS;
    },
    saveWordsPlanSettings: async (settings) => {
      await storage.savePlanSettings(settings);
    },
  };
}

function createMemoryStorage(): WordsStorage {
  const books = new Map<string, WordBook>();
  const words = new Map<string, Word>();
  const records = new Map<string, LearningRecord>();
  const schedules = new Map<string, ReviewSchedule>();
  let planSettings: WordsPlanSettings | null = null;

  return createCore({
    putBook: async (book) => {
      books.set(book.id, book);
    },
    allBooks: async () => Array.from(books.values()),
    putWords: async (items) => {
      for (const item of items) {
        words.set(item.id, item);
      }
    },
    wordsByBook: async (bookId) =>
      Array.from(words.values()).filter((item) => item.bookId === bookId),
    allWords: async () => Array.from(words.values()),
    putRecord: async (record) => {
      records.set(record.wordId, record);
    },
    recordsByWord: async (wordId) => {
      const item = records.get(wordId);
      return item ? [item] : [];
    },
    allRecords: async () => Array.from(records.values()),
    putSchedule: async (schedule) => {
      schedules.set(schedule.date, schedule);
    },
    getSchedule: async (date) => schedules.get(date) ?? null,
    getPlanSettings: async () => planSettings,
    savePlanSettings: async (settings) => {
      planSettings = settings;
    },
  });
}

function createApiStorage(): WordsStorage {
  return createCore({
    putBook: async () => {
      // static books are served by /api/words/books
    },
    allBooks: async () => {
      const data = await requestJson<{ books: WordBook[] }>("/api/words/books", {
        cache: "no-store",
      });
      return data.books;
    },
    putWords: async () => {
      // static words are served by /api/words/words
    },
    wordsByBook: async (bookId) => {
      const data = await requestJson<{ words: Word[] }>(
        `/api/words/words?bookId=${encodeURIComponent(bookId)}`,
        { cache: "no-store" }
      );
      return data.words;
    },
    allWords: async () => {
      const data = await requestJson<{ words: Word[] }>("/api/words/words", {
        cache: "no-store",
      });
      return data.words;
    },
    putRecord: async (record) => {
      await requestJson<{ saved: boolean }>("/api/words/records", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record),
      });
    },
    recordsByWord: async (wordId) => {
      const data = await requestJson<{ records: LearningRecord[] }>(
        `/api/words/records?wordId=${encodeURIComponent(wordId)}`,
        { cache: "no-store" }
      );
      return data.records;
    },
    allRecords: async () => {
      const data = await requestJson<{ records: LearningRecord[] }>("/api/words/records", {
        cache: "no-store",
      });
      return data.records;
    },
    putSchedule: async (schedule) => {
      await requestJson<{ saved: boolean }>("/api/words/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedule),
      });
    },
    getSchedule: async (date) => {
      const data = await requestJson<{ schedule: ReviewSchedule | null }>(
        `/api/words/schedules?date=${encodeURIComponent(date)}`,
        { cache: "no-store" }
      );
      return data.schedule;
    },
    getPlanSettings: async () => {
      const data = await requestJson<{ settings: WordsPlanSettings }>("/api/words/settings", {
        cache: "no-store",
      });
      return data.settings;
    },
    savePlanSettings: async (settings) => {
      await requestJson<{ saved: boolean }>("/api/words/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    },
  });
}

export function createWordsStorage(options?: { mode?: StorageMode }): WordsStorage {
  const mode = options?.mode ?? "api";
  if (mode === "memory") {
    return createMemoryStorage();
  }
  return createApiStorage();
}

export const wordsStorage = createWordsStorage();

export const wordsCatalog = {
  listAllLocalWords,
  listLocalWordBooks,
  listLocalWordsByBook,
};

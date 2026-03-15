import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import { calculateRetention } from "./algorithm";
import {
  calculateStreakDays,
  calculateTotalLearned,
  calculateTodayProgress,
} from "./stats";
import type {
  LearningRecord,
  LearningStats,
  ReviewSchedule,
  StudyEvent,
  Word,
  WordBook,
} from "./types";

type StorageMode = "idb" | "memory";

const DB_NAME = "edunexus-words";
const DB_VERSION = 1;

interface WordsDB extends DBSchema {
  books: {
    key: string;
    value: WordBook;
  };
  words: {
    key: string;
    value: Word;
    indexes: { "by-book": string };
  };
  records: {
    key: string;
    value: LearningRecord;
    indexes: { "by-word": string; "by-next-review": string; "by-learn-date": string };
  };
  schedules: {
    key: string;
    value: ReviewSchedule;
  };
}

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
};

export function createWordsStorage(options?: { mode?: StorageMode }): WordsStorage {
  const mode = options?.mode ?? "idb";
  if (mode === "memory") {
    return createMemoryStorage();
  }
  return createIndexedDbStorage();
}

function toIsoDate(value: Date): string {
  return value.toISOString().split("T")[0];
}

function safeDate(today?: string): string {
  return today ?? toIsoDate(new Date());
}

function createEvents(
  records: LearningRecord[],
  today: string
): Array<{ date: string; type: "learn" | "review"; success: boolean }> {
  return records.flatMap((record) => {
    const events: StudyEvent[] = [];
    if (record.learnDate === today) {
      events.push({ date: today, type: "learn", success: true });
    }
    if (record.lastReviewedAt === today) {
      events.push({ date: today, type: "review", success: record.retentionScore === 1 });
    }
    return events;
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
}): WordsStorage {
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
    getLearningRecords: async (wordId) => storage.recordsByWord(wordId),
    getAllLearningRecords: async () => storage.allRecords(),
    getTodayReviewWords: async (today) => {
      const date = safeDate(today);
      const [records, words] = await Promise.all([storage.allRecords(), storage.allWords()]);
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
        storage.allRecords(),
      ]);

      const events = createEvents(records, date);
      const todayProgress = calculateTodayProgress(events, date);
      const activeDates = Array.from(
        new Set(records.map((record) => record.lastReviewedAt).filter(Boolean))
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
      };
    },
  };
}

function createMemoryStorage(): WordsStorage {
  const books = new Map<string, WordBook>();
  const words = new Map<string, Word>();
  const records = new Map<string, LearningRecord>();
  const schedules = new Map<string, ReviewSchedule>();

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
  });
}

function createIndexedDbStorage(): WordsStorage {
  let dbInstance: IDBPDatabase<WordsDB> | null = null;

  async function getDb(): Promise<IDBPDatabase<WordsDB>> {
    if (dbInstance) {
      return dbInstance;
    }
    dbInstance = await openDB<WordsDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("books")) {
          db.createObjectStore("books", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("words")) {
          const wordStore = db.createObjectStore("words", { keyPath: "id" });
          wordStore.createIndex("by-book", "bookId");
        }
        if (!db.objectStoreNames.contains("records")) {
          const recordStore = db.createObjectStore("records", { keyPath: "wordId" });
          recordStore.createIndex("by-word", "wordId");
          recordStore.createIndex("by-next-review", "nextReviewDate");
          recordStore.createIndex("by-learn-date", "learnDate");
        }
        if (!db.objectStoreNames.contains("schedules")) {
          db.createObjectStore("schedules", { keyPath: "date" });
        }
      },
    });
    return dbInstance;
  }

  return createCore({
    putBook: async (book) => {
      const db = await getDb();
      await db.put("books", book);
    },
    allBooks: async () => {
      const db = await getDb();
      return db.getAll("books");
    },
    putWords: async (items) => {
      const db = await getDb();
      const tx = db.transaction("words", "readwrite");
      await Promise.all(items.map((item) => tx.store.put(item)));
      await tx.done;
    },
    wordsByBook: async (bookId) => {
      const db = await getDb();
      return db.getAllFromIndex("words", "by-book", bookId);
    },
    allWords: async () => {
      const db = await getDb();
      return db.getAll("words");
    },
    putRecord: async (record) => {
      const db = await getDb();
      await db.put("records", record);
    },
    recordsByWord: async (wordId) => {
      const db = await getDb();
      return db.getAllFromIndex("records", "by-word", wordId);
    },
    allRecords: async () => {
      const db = await getDb();
      return db.getAll("records");
    },
    putSchedule: async (schedule) => {
      const db = await getDb();
      await db.put("schedules", schedule);
    },
    getSchedule: async (date) => {
      const db = await getDb();
      return (await db.get("schedules", date)) ?? null;
    },
  });
}

export const wordsStorage = createWordsStorage();

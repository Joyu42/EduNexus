import { describe, expect, it } from "vitest";

import type {
  LearningRecord,
  ReviewSchedule,
  StudyEvent,
  Word,
  WordBook,
} from "./types";
import { createWordsStorage } from "./storage";
import { calculateTodayProgress } from "./stats";

describe("words storage", () => {
  it("persists and reads books, words, records and stats", async () => {
    const memory = createWordsStorage({ mode: "memory" });

    const book: WordBook = {
      id: "cet4",
      name: "CET-4",
      description: "College English Test Band 4",
      wordCount: 2,
      category: "cet",
    };

    const words: Word[] = [
      {
        id: "w1",
        word: "abandon",
        phonetic: "/əˈbændən/",
        definition: "to leave behind",
        example: "He abandoned his bag.",
        exampleZh: "他把包落下了。",
        bookId: "cet4",
        difficulty: "medium",
      },
      {
        id: "w2",
        word: "benefit",
        phonetic: "/ˈbenɪfɪt/",
        definition: "an advantage",
        example: "Exercise benefits your health.",
        exampleZh: "锻炼有益于健康。",
        bookId: "cet4",
        difficulty: "easy",
      },
    ];

    const record: LearningRecord = {
      wordId: "w1",
      bookId: "cet4",
      learnDate: "2026-03-15",
      status: "reviewing",
      nextReviewDate: "2026-03-15",
      interval: 1,
      easeFactor: 2.5,
      reviewCount: 1,
      successCount: 1,
      failureCount: 0,
      lastReviewedAt: "2026-03-15",
      retentionScore: 1,
    };

    await memory.saveWordBook(book);
    await memory.saveWords(words);
    await memory.saveLearningRecord(record);

    const books = await memory.getWordBooks();
    const bookWords = await memory.getWordsByBook("cet4");
    const records = await memory.getLearningRecords("w1");
    const due = await memory.getTodayReviewWords("2026-03-15");
    const stats = await memory.getLearningStats("2026-03-15");

    expect(books).toHaveLength(1);
    expect(bookWords).toHaveLength(2);
    expect(records).toHaveLength(1);
    expect(due.map((item) => item.id)).toEqual(["w1"]);
    expect(stats.totalBooks).toBe(1);
    expect(stats.totalWords).toBe(2);
    expect(stats.dueToday).toBe(1);
  });

  it("can persist and read review schedules", async () => {
    const memory = createWordsStorage({ mode: "memory" });
    const schedule: ReviewSchedule = {
      date: "2026-03-15",
      wordIds: ["w1", "w2"],
      newCount: 1,
      reviewCount: 1,
    };

    await memory.saveReviewSchedule(schedule);
    const loaded = await memory.getReviewSchedule("2026-03-15");

    expect(loaded).not.toBeNull();
    expect(loaded?.wordIds).toEqual(["w1", "w2"]);
  });

  it("counts today's learn, review, and relearn events without double-counting", async () => {
    const memory = createWordsStorage({ mode: "memory" });
    await memory.saveWordBook({
      id: "cet4",
      name: "CET4",
      description: "",
      wordCount: 3,
      category: "cet",
    });

    await memory.saveWords([
      { id: "w1", word: "a", phonetic: "", definition: "", example: "", bookId: "cet4", difficulty: "easy" },
      { id: "w2", word: "b", phonetic: "", definition: "", example: "", bookId: "cet4", difficulty: "easy" },
    ]);

    await memory.saveLearningRecord({
      wordId: "w1",
      bookId: "cet4",
      learnDate: "2026-03-16",
      status: "reviewing",
      nextReviewDate: "2026-03-17",
      interval: 1,
      easeFactor: 2.5,
      reviewCount: 2,
      successCount: 1,
      failureCount: 1,
      lastReviewedAt: "2026-03-17",
      retentionScore: 0,
    });

    await memory.saveLearningRecord({
      wordId: "w2",
      bookId: "cet4",
      learnDate: "2026-03-17",
      status: "learning",
      nextReviewDate: "2026-03-17",
      interval: 1,
      easeFactor: 2.5,
      reviewCount: 1,
      successCount: 1,
      failureCount: 0,
      lastReviewedAt: "2026-03-17",
      retentionScore: 1,
    });

    const stats = await memory.getLearningStats("2026-03-17");
    expect(stats.dueToday).toBe(2);

    const events: StudyEvent[] = [
      { date: "2026-03-17", type: "learn", grade: "good", success: true },
      { date: "2026-03-17", type: "review", grade: "hard", success: true },
      { date: "2026-03-17", type: "review", grade: "good", success: true },
      { date: "2026-03-17", type: "relearn", grade: "again", success: false },
    ];

    expect(calculateTodayProgress(events, "2026-03-17")).toEqual({
      learned: 1,
      reviewed: 2,
      relearned: 1,
      accuracy: 2 / 3,
    });
  });

  it("returns default study-plan settings when none are stored", async () => {
    const memory = createWordsStorage({ mode: "memory" });

    await expect(memory.getWordsPlanSettings()).resolves.toEqual({
      dailyNewLimit: 20,
      reviewFirst: true,
      defaultRevealMode: "hidden",
    });
  });

  it("normalizes legacy records missing review metadata", async () => {
    const memory = createWordsStorage({ mode: "memory" });

    await memory.saveWordBook({
      id: "cet4",
      name: "CET4",
      description: "",
      wordCount: 1,
      category: "cet",
    });

    await memory.saveWords([
      {
        id: "legacy",
        word: "legacy",
        phonetic: "",
        definition: "",
        example: "",
        bookId: "cet4",
        difficulty: "easy",
      },
    ]);

    await memory.saveLearningRecord({
      wordId: "legacy",
      bookId: "cet4",
      learnDate: "2026-03-19",
      status: "learning",
      nextReviewDate: undefined as unknown as string,
      interval: 1,
      easeFactor: 2.5,
      reviewCount: 1,
      successCount: 1,
      failureCount: 0,
      lastReviewedAt: undefined as unknown as string,
      retentionScore: undefined as unknown as 0,
      lastGrade: "good",
    } as LearningRecord);

    const stats = await memory.getLearningStats("2026-03-20");
    expect(stats.streakDays).toBe(1);
    expect(stats.dueToday).toBe(1);

    const dueWords = await memory.getTodayReviewWords("2026-03-20");
    expect(dueWords.map((word) => word.id)).toEqual(["legacy"]);

    const records = await memory.getAllLearningRecords();
    expect(records[0].lastReviewedAt).toBe("2026-03-19");
    expect(records[0].nextReviewDate).toBe("2026-03-19");
    expect(records[0].retentionScore).toBe(1);
  });
});

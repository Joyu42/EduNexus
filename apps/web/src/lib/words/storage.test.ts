import { describe, expect, it } from "vitest";

import type {
  LearningRecord,
  ReviewSchedule,
  Word,
  WordBook,
} from "./types";
import { createWordsStorage } from "./storage";

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
});

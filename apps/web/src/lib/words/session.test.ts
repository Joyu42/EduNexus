import { describe, expect, it } from "vitest";

import { selectSessionWordIds } from "./session";
import type { LearningRecord, Word } from "./types";

describe("selectSessionWordIds", () => {
  it("fills session with unseen words and excludes already learned words", () => {
    const words: Word[] = Array.from({ length: 25 }, (_, i) => ({
      id: `w${i + 1}`,
      word: `word${i + 1}`,
      phonetic: "",
      definition: "",
      example: "",
      bookId: "cet4",
      difficulty: "easy",
    }));

    const records: LearningRecord[] = [
      {
        wordId: "w1",
        bookId: "cet4",
        learnDate: "2026-03-15",
        status: "learning",
        nextReviewDate: "2026-03-16",
        interval: 1,
        easeFactor: 2.5,
        reviewCount: 1,
        successCount: 1,
        failureCount: 0,
        lastReviewedAt: "2026-03-15",
        retentionScore: 1,
      },
    ];

    const session = selectSessionWordIds(words, records, "2026-03-15", 20);

    expect(session).toHaveLength(20);
    expect(session.includes("w1")).toBe(false);
    expect(session[0]).toBe("w2");
  });

  it("prioritizes due review words in current day session", () => {
    const words: Word[] = Array.from({ length: 30 }, (_, i) => ({
      id: `w${i + 1}`,
      word: `word${i + 1}`,
      phonetic: "",
      definition: "",
      example: "",
      bookId: "cet4",
      difficulty: "easy",
    }));

    const records: LearningRecord[] = [
      {
        wordId: "w5",
        bookId: "cet4",
        learnDate: "2026-03-14",
        status: "reviewing",
        nextReviewDate: "2026-03-15",
        interval: 2,
        easeFactor: 2.5,
        reviewCount: 2,
        successCount: 1,
        failureCount: 1,
        lastReviewedAt: "2026-03-14",
        retentionScore: 0,
      },
    ];

    const session = selectSessionWordIds(words, records, "2026-03-15", 20);

    expect(session.includes("w5")).toBe(false);
    expect(session).toHaveLength(20);
  });
});

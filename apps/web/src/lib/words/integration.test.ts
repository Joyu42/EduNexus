import { describe, expect, it } from "vitest";

import {
  countCompletedToday,
  getWordGoalId,
  suggestRelatedWords,
} from "./integration";
import type { Word } from "./types";

describe("words integration helpers", () => {
  it("builds deterministic daily goal id", () => {
    expect(getWordGoalId("2026-03-15")).toBe("words-daily:2026-03-15");
  });

  it("counts completed records by day", () => {
    const count = countCompletedToday(
      [
        {
          wordId: "a",
          bookId: "cet4",
          learnDate: "2026-03-10",
          status: "learning",
          nextReviewDate: "2026-03-15",
          interval: 1,
          easeFactor: 2.5,
          reviewCount: 1,
          successCount: 1,
          failureCount: 0,
          lastReviewedAt: "2026-03-15",
          retentionScore: 1,
        },
        {
          wordId: "b",
          bookId: "cet4",
          learnDate: "2026-03-11",
          status: "reviewing",
          nextReviewDate: "2026-03-16",
          interval: 2,
          easeFactor: 2.3,
          reviewCount: 2,
          successCount: 1,
          failureCount: 1,
          lastReviewedAt: "2026-03-14",
          retentionScore: 0,
        },
      ],
      "2026-03-15"
    );

    expect(count).toBe(1);
  });

  it("returns related words in same book first", async () => {
    const words: Word[] = [
      {
        id: "w1",
        word: "abandon",
        phonetic: "/əˈbændən/",
        definition: "to leave",
        example: "example",
        bookId: "cet4",
        difficulty: "medium",
      },
      {
        id: "w2",
        word: "ability",
        phonetic: "/əˈbɪləti/",
        definition: "skill",
        example: "example",
        bookId: "cet4",
        difficulty: "medium",
      },
      {
        id: "w3",
        word: "zebra",
        phonetic: "/ˈziːbrə/",
        definition: "animal",
        example: "example",
        bookId: "cet6",
        difficulty: "hard",
      },
    ];

    const items = await suggestRelatedWords("w1", "cet4", 2, {
      getWordsByBook: async (bookId: string) => words.filter((word) => word.bookId === bookId),
    });

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("w2");
  });
});

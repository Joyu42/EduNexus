import { describe, expect, it } from "vitest";

import { selectNewWordIds, selectSessionWordIds } from "./session";
import type { LearningRecord, Word } from "./types";

const baseWord = (id: string): Word => ({
  id,
  word: id,
  phonetic: "",
  definition: "",
  example: "",
  bookId: "book",
  difficulty: "easy",
});

const record = (wordId: string, overrides: Partial<LearningRecord>): LearningRecord => ({
  wordId,
  bookId: "book",
  learnDate: "2026-03-10",
  status: "learning",
  nextReviewDate: "2026-03-16",
  interval: 1,
  easeFactor: 2.5,
  reviewCount: 1,
  successCount: 0,
  failureCount: 1,
  lastReviewedAt: "2026-03-10",
  retentionScore: 0,
  ...overrides,
});

describe("selectSessionWordIds", () => {
  it("prioritizes due review words before new words", () => {
    const words: Word[] = [
      baseWord("due-1"),
      baseWord("due-2"),
      baseWord("new-1"),
      baseWord("new-2"),
      baseWord("new-3"),
      baseWord("extra"),
    ];

    const records: LearningRecord[] = [
      record("due-1", { nextReviewDate: "2026-03-16" }),
      record("due-2", { nextReviewDate: "2026-03-16" }),
    ];

    const session = selectSessionWordIds(words, records, "2026-03-17", 5);

    expect(session).toEqual(["due-1", "due-2", "new-1", "new-2", "new-3"]);
  });

  it("does not duplicate words when pool smaller than session size", () => {
    const words: Word[] = [baseWord("new-1"), baseWord("new-2")];

    const session = selectSessionWordIds(words, [], "2026-03-17", 5);

    expect(session).toEqual(["new-1", "new-2"]);
  });

  it("respects daily new limits and review priority settings", () => {
    const words: Word[] = [
      baseWord("due-1"),
      baseWord("due-2"),
      baseWord("new-1"),
      baseWord("new-2"),
      baseWord("new-3"),
    ];
    const records: LearningRecord[] = [
      record("due-1", { nextReviewDate: "2026-03-17" }),
      record("due-2", { nextReviewDate: "2026-03-17" }),
    ];

    const session = selectSessionWordIds(words, records, "2026-03-17", {
      size: 6,
      reviewFirst: false,
      dailyNewLimit: 2,
    });

    expect(session).toEqual(["new-1", "new-2", "due-1", "due-2"]);
  });
});

describe("selectNewWordIds", () => {
  it("returns only unseen words and does not include due review words", () => {
    const words: Word[] = [
      baseWord("due-1"),
      baseWord("due-2"),
      baseWord("new-1"),
      baseWord("new-2"),
    ];

    const records: LearningRecord[] = [
      record("due-1", { nextReviewDate: "2026-03-17" }),
      record("due-2", { nextReviewDate: "2026-03-17" }),
    ];

    const selected = selectNewWordIds(words, records, 10);

    expect(selected).toEqual(["new-1", "new-2"]);
  });
});

import { describe, expect, it } from "vitest";

import type { LearningRecord, Word } from "./types";
import { generateDailySchedule, updateWordStatus } from "./scheduler";

const words: Word[] = [
  {
    id: "w1",
    word: "abandon",
    phonetic: "/əˈbændən/",
    definition: "to leave behind",
    example: "He abandoned the old plan.",
    bookId: "cet4",
    difficulty: "medium",
  },
  {
    id: "w2",
    word: "benefit",
    phonetic: "/ˈbenɪfɪt/",
    definition: "an advantage",
    example: "Regular reading has many benefits.",
    bookId: "cet4",
    difficulty: "easy",
  },
];

const records: LearningRecord[] = [
  {
    wordId: "w1",
    bookId: "cet4",
    learnDate: "2026-03-10",
    status: "reviewing",
    nextReviewDate: "2026-03-15",
    interval: 3,
    easeFactor: 2.5,
    reviewCount: 2,
    successCount: 2,
    failureCount: 0,
    lastReviewedAt: "2026-03-12",
    retentionScore: 1,
  },
];

describe("words scheduler", () => {
  it("generates schedule with due and new words", async () => {
    const schedule = await generateDailySchedule(
      {
        getAllWords: async () => words,
        getAllLearningRecords: async () => records,
      },
      "2026-03-15",
      20
    );

    expect(schedule.date).toBe("2026-03-15");
    expect(schedule.reviewCount).toBe(1);
    expect(schedule.newCount).toBe(1);
    expect(schedule.wordIds).toEqual(["w1", "w2"]);
  });

  it("updates word status and computes next review", async () => {
    const calls: LearningRecord[] = [];

    await updateWordStatus(
      {
        getLearningRecords: async () => [],
        saveLearningRecord: async (record) => {
          calls.push(record);
        },
      },
      "cet4",
      "w2",
      true,
      "2026-03-15"
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].status).toBe("learning");
    expect(calls[0].nextReviewDate).toBe("2026-03-16");
    expect(calls[0].retentionScore).toBe(1);
  });
});

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

  it("maps answer grades to distinct next-review intervals", async () => {
    const saved: LearningRecord[] = [];

    const storage = {
      getLearningRecords: async () => [],
      saveLearningRecord: async (record: LearningRecord) => {
        saved.push(record);
      },
    };

    await updateWordStatus(storage, "cet4", "w1", "again" as any, "2026-03-17");
    await updateWordStatus(storage, "cet4", "w2", "good" as any, "2026-03-17");

    expect(saved[0].nextReviewDate).toBe("2026-03-18");
    expect(saved[1].nextReviewDate > saved[0].nextReviewDate).toBe(true);
  });

  it("does not mark a first successful exposure as mastered", async () => {
    const saved: LearningRecord[] = [];

    await updateWordStatus(
      {
        getLearningRecords: async () => [],
        saveLearningRecord: async (record: LearningRecord) => {
          saved.push(record);
        },
      },
      "cet4",
      "w3",
      "good" as any,
      "2026-03-17"
    );

    expect(saved[0].status).toBe("reviewing");
  });

  it("persists study type and grade on updateWordStatus", async () => {
    const saved: LearningRecord[] = [];

    await updateWordStatus(
      {
        getLearningRecords: async () => [
          {
            wordId: "w1",
            bookId: "cet4",
            learnDate: "2026-03-10",
            status: "reviewing",
            nextReviewDate: "2026-03-15",
            interval: 1,
            easeFactor: 2.5,
            reviewCount: 2,
            successCount: 1,
            failureCount: 1,
            lastReviewedAt: "2026-03-15",
            retentionScore: 0,
          },
        ],
        saveLearningRecord: async (record: LearningRecord) => {
          saved.push(record);
        },
      },
      "cet4",
      "w1",
      "again" as any,
      "2026-03-17"
    );

    expect((saved[0] as any).lastStudyType).toBe("relearn");
    expect((saved[0] as any).lastGrade).toBe("again");
  });
});

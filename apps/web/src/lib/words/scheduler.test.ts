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

  it("schedules first exposure reviews for the following day (easy gets two days)", async () => {
    const saved: LearningRecord[] = [];

    const storage = {
      getLearningRecords: async () => [],
      saveLearningRecord: async (record: LearningRecord) => {
        saved.push(record);
      },
    };

    await updateWordStatus(storage, "cet4", "w1", "good" as any, "2026-03-19");
    await updateWordStatus(storage, "cet4", "w2", "again" as any, "2026-03-19");
    await updateWordStatus(storage, "cet4", "w3", "easy" as any, "2026-03-19");

    expect(saved[0].nextReviewDate).toBe("2026-03-20");
    expect(saved[1].nextReviewDate).toBe("2026-03-20");
    expect(saved[2].nextReviewDate).toBe("2026-03-21");
  });

  it("expands intervals for existing records using spaced repetition", async () => {
    const saved: LearningRecord[] = [];

    await updateWordStatus(
      {
        getLearningRecords: async () => [
          {
            wordId: "w1",
            bookId: "cet4",
            learnDate: "2026-03-10",
            status: "reviewing",
            nextReviewDate: "2026-03-18",
            interval: 3,
            easeFactor: 2.5,
            reviewCount: 2,
            successCount: 2,
            failureCount: 0,
            lastReviewedAt: "2026-03-18",
            retentionScore: 1,
          },
        ],
        saveLearningRecord: async (record: LearningRecord) => {
          saved.push(record);
        },
      },
      "cet4",
      "w1",
      "good" as any,
      "2026-03-20"
    );

    expect(saved[0].nextReviewDate).toBe("2026-03-26");
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

  it("hard first exposure schedules next day (day+1), not day+2", async () => {
    const saved: LearningRecord[] = [];

    await updateWordStatus(
      {
        getLearningRecords: async () => [],
        saveLearningRecord: async (record: LearningRecord) => {
          saved.push(record);
        },
      },
      "cet4",
      "w1",
      "hard" as any,
      "2026-03-19"
    );

    // hard should behave like good/again (day+1), NOT like easy (day+2)
    expect(saved[0].nextReviewDate).toBe("2026-03-20");
  });

  it("contract: first exposure good/hard/again = day+1, easy = day+2", async () => {
    const saved: LearningRecord[] = [];
    const storage = {
      getLearningRecords: async () => [],
      saveLearningRecord: async (record: LearningRecord) => {
        saved.push(record);
      },
    };

    await updateWordStatus(storage, "cet4", "w1", "good" as any, "2026-03-25");
    await updateWordStatus(storage, "cet4", "w2", "hard" as any, "2026-03-25");
    await updateWordStatus(storage, "cet4", "w3", "again" as any, "2026-03-25");
    await updateWordStatus(storage, "cet4", "w4", "easy" as any, "2026-03-25");

    // good, hard, again → day+1
    expect(saved[0].nextReviewDate).toBe("2026-03-26"); // good
    expect(saved[1].nextReviewDate).toBe("2026-03-26"); // hard
    expect(saved[2].nextReviewDate).toBe("2026-03-26"); // again
    // easy → day+2
    expect(saved[3].nextReviewDate).toBe("2026-03-27"); // easy
  });

  it("same-day repeated touch does not make word due again today", async () => {
    // Simulate: w1 has nextReviewDate = today, so it appears in today's review queue
    const existingRecord: LearningRecord = {
      wordId: "w1",
      bookId: "cet4",
      learnDate: "2026-03-20",
      status: "reviewing",
      nextReviewDate: "2026-03-26",
      interval: 3,
      easeFactor: 2.5,
      reviewCount: 2,
      successCount: 2,
      failureCount: 0,
      lastReviewedAt: "2026-03-23",
      retentionScore: 1,
    };

    let currentRecord = { ...existingRecord };
    const storage = {
      getLearningRecords: async () => [currentRecord],
      saveLearningRecord: async (record: LearningRecord) => {
        currentRecord = record;
      },
    };

    await updateWordStatus(storage, "cet4", "w1", "good" as any, "2026-03-26");
    expect(currentRecord.nextReviewDate).toBe("2026-04-01");

    // Simulate second same-day touch by resetting the "due" filter
    // The word's nextReviewDate is now 2026-03-29 (tomorrow is 2026-03-27)
    // It should NOT appear in today's schedule because nextReviewDate > today
    const schedule = await generateDailySchedule(
      {
        getAllWords: async () => words.filter((w) => w.id === "w1"),
        getAllLearningRecords: async () => [currentRecord],
      },
      "2026-03-26", // today
      20
    );

    // w1 should NOT be in the schedule for today because nextReviewDate is 2026-03-29
    expect(schedule.wordIds).not.toContain("w1");
  });

  it("word due today remains due even after same-day repeated touch does not reschedule backward", async () => {
    // Edge case: a word is due today (nextReviewDate = today)
    // After reviewing with "again", it should reschedule to tomorrow, not stay today
    const existingRecord: LearningRecord = {
      wordId: "w1",
      bookId: "cet4",
      learnDate: "2026-03-20",
      status: "learning",
      nextReviewDate: "2026-03-26",
      interval: 1,
      easeFactor: 2.5,
      reviewCount: 1,
      successCount: 0,
      failureCount: 1,
      lastReviewedAt: "2026-03-25",
      retentionScore: 0,
    };

    let currentRecord = { ...existingRecord };
    const storage = {
      getLearningRecords: async () => [currentRecord],
      saveLearningRecord: async (record: LearningRecord) => {
        currentRecord = record;
      },
    };

    // Review with "again" on the due date
    await updateWordStatus(storage, "cet4", "w1", "again" as any, "2026-03-26");

    // nextReviewDate must be AFTER today (2026-03-26), not today or before
    expect(currentRecord.nextReviewDate > "2026-03-26").toBe(true);
    // For "again" on first exposure, it's actually a relearn so uses interval=1 → next day
    // But since this is not first exposure (has existing record), it uses spaced repetition
    // Quality 1 (again) < 3, so interval = 1 → addDays(today, 1) = tomorrow
    expect(currentRecord.nextReviewDate).toBe("2026-03-27");
  });
});

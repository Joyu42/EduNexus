import { describe, expect, it } from "vitest";

import {
  calculateStreakDays,
  calculateTodayProgress,
  calculateTotalLearned,
  calculateWordMastery,
} from "./stats";

describe("words stats", () => {
  it("counts learned records only", () => {
    const total = calculateTotalLearned([
      { status: "learning" },
      { status: "mastered" },
      { status: "reviewing" },
      { status: "mastered" },
    ]);

    expect(total).toBe(2);
  });

  it("calculates today progress with relearn counts and accuracy", () => {
    const progress = calculateTodayProgress(
      [
        { date: "2026-03-15", type: "learn", grade: "good", success: true },
        { date: "2026-03-15", type: "review", grade: "hard", success: false },
        { date: "2026-03-15", type: "review", grade: "good", success: true },
        { date: "2026-03-15", type: "relearn", grade: "again", success: true },
        { date: "2026-03-14", type: "review", grade: "good", success: true },
      ],
      "2026-03-15"
    );

    expect(progress.learned).toBe(1);
    expect(progress.reviewed).toBe(2);
    expect(progress.relearned).toBe(1);
    expect(progress.accuracy).toBeCloseTo(2 / 3, 5);
  });

  it("calculates consecutive streak days", () => {
    const streak = calculateStreakDays(
      ["2026-03-13", "2026-03-14", "2026-03-15"],
      "2026-03-15"
    );

    expect(streak).toBe(3);
  });

  it("calculates mastery score from repetition factors", () => {
    const mastery = calculateWordMastery({
      reviewCount: 5,
      easeFactor: 2.5,
      successRate: 0.8,
    });

    expect(mastery).toBeGreaterThan(0);
    expect(mastery).toBeLessThanOrEqual(1);
  });
});

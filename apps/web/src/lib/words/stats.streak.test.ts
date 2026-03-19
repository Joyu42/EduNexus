import { describe, expect, it } from "vitest";

import { calculateStreakDays } from "./stats";

describe("calculateStreakDays", () => {
  it("keeps streak active when the latest study date is yesterday", () => {
    const streak = calculateStreakDays(
      ["2026-03-18", "2026-03-19"],
      "2026-03-20"
    );

    expect(streak).toBe(2);
  });

  it("resets streak when the latest activity is older than yesterday", () => {
    const streak = calculateStreakDays([
      "2026-03-15",
      "2026-03-16",
      "2026-03-17",
    ], "2026-03-20");

    expect(streak).toBe(0);
  });

  it("returns 0 when there is no active date", () => {
    expect(calculateStreakDays([], "2026-03-20")).toBe(0);
  });
});

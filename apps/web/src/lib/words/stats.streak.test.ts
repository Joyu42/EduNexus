import { describe, expect, it } from "vitest";

import { calculateStreakDays } from "./stats";

describe("calculateStreakDays", () => {
  it("uses latest active day when debug today is in future", () => {
    const streak = calculateStreakDays(
      ["2026-03-15", "2026-03-16"],
      "2026-03-20"
    );

    expect(streak).toBe(2);
  });

  it("returns 0 when there is no active date", () => {
    expect(calculateStreakDays([], "2026-03-20")).toBe(0);
  });
});

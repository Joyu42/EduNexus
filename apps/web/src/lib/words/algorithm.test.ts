import { describe, expect, it } from "vitest";

import {
  calculateNextReview,
  calculateRetention,
  getNewWordsForToday,
} from "./algorithm";

describe("words algorithm", () => {
  it("increases interval for high quality recall", () => {
    const result = calculateNextReview(3, 2.5, 5);

    expect(result.nextInterval).toBeGreaterThan(3);
    expect(result.newEaseFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("resets interval for failed recall", () => {
    const result = calculateNextReview(8, 2.3, 1);

    expect(result.nextInterval).toBe(1);
    expect(result.newEaseFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("limits new words by remaining capacity", () => {
    expect(getNewWordsForToday(20, 5)).toBe(15);
    expect(getNewWordsForToday(20, 22)).toBe(0);
  });

  it("calculates retention ratio from review records", () => {
    const retention = calculateRetention([
      { retentionScore: 1 },
      { retentionScore: 0 },
      { retentionScore: 1 },
      { retentionScore: 1 },
    ]);

    expect(retention).toBe(0.75);
  });
});

import { describe, expect, it } from "vitest";

import { generateAnalyticsInsights } from "./insight-generator";
import type { ExtendedAnalyticsReport } from "./insight-generator";

function createBaseReport(overrides: Partial<ExtendedAnalyticsReport> = {}): ExtendedAnalyticsReport {
  return {
    range: "weekly",
    window: {
      start: "2026-03-14",
      end: "2026-03-20",
      days: 7
    },
    totals: {
      eventCount: 0,
      snapshotCount: 0,
      uniqueEventNames: 0,
      uniqueEventCategories: 0,
      latestSnapshotMetrics: {},
      aggregateSnapshotMetrics: {}
    },
    timeline: [
      { day: "2026-03-14", events: 0, snapshots: 0 },
      { day: "2026-03-15", events: 0, snapshots: 0 },
      { day: "2026-03-16", events: 0, snapshots: 0 },
      { day: "2026-03-17", events: 0, snapshots: 0 },
      { day: "2026-03-18", events: 0, snapshots: 0 },
      { day: "2026-03-19", events: 0, snapshots: 0 },
      { day: "2026-03-20", events: 0, snapshots: 0 }
    ],
    topEvents: [],
    topCategories: [],
    streakDays: 0,
    dueToday: 0,
    totalWords: 0,
    learnedWords: 0,
    masteredWords: 0,
    accuracyToday: 0,
    recentProgress: {
      activeDays: 0,
      averageDailyLearnedWords: 0
    },
    bookProgress: [],
    ...overrides
  };
}

describe("generateAnalyticsInsights", () => {
  it("returns deterministic zero-state insight cards", () => {
    const insights = generateAnalyticsInsights(createBaseReport());

    expect(insights.map((item) => item.id)).toEqual([
      "study-streak",
      "due-pressure",
      "focus-book"
    ]);
    expect(insights[0]).toMatchObject({
      severity: "warning",
      title: "暂无连续学习"
    });
    expect(insights[1]).toMatchObject({
      severity: "positive",
      title: "复习压力轻松"
    });
    expect(insights[2]).toMatchObject({
      severity: "neutral",
      title: "尚未开始词书"
    });
  });

  it("returns deterministic positive insights when activity is stable", () => {
    const insights = generateAnalyticsInsights(
      createBaseReport({
        streakDays: 7,
        dueToday: 15,
        bookProgress: [
          { bookName: "CET-4", progressPercent: 45, dueToday: 15 }
        ]
      })
    );

    expect(insights[0]).toMatchObject({
      id: "study-streak",
      severity: "positive"
    });
    expect(insights[0].description).toContain("7 天");
    expect(insights[1]).toMatchObject({
      id: "due-pressure",
      severity: "neutral"
    });
    expect(insights[2]).toMatchObject({
      id: "focus-book",
      severity: "positive"
    });
    expect(insights[2].title).toContain("CET-4");
  });
});

import { describe, expect, it } from "vitest";

import { generateAnalyticsInsights } from "./insight-generator";
import type { AnalyticsReport } from "./report-builder";

function createBaseReport(overrides: Partial<AnalyticsReport> = {}): AnalyticsReport {
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
    ...overrides
  };
}

describe("generateAnalyticsInsights", () => {
  it("returns deterministic zero-state insight cards", () => {
    const insights = generateAnalyticsInsights(createBaseReport());

    expect(insights.map((item) => item.id)).toEqual([
      "activity-volume",
      "study-consistency",
      "snapshot-coverage"
    ]);
    expect(insights[0]).toMatchObject({
      severity: "warning",
      title: "暂无学习行为数据"
    });
    expect(insights[1]).toMatchObject({
      severity: "warning"
    });
    expect(insights[2]).toMatchObject({
      severity: "neutral"
    });
  });

  it("returns deterministic positive insights when activity is stable", () => {
    const insights = generateAnalyticsInsights(
      createBaseReport({
        totals: {
          eventCount: 14,
          snapshotCount: 4,
          uniqueEventNames: 3,
          uniqueEventCategories: 2,
          latestSnapshotMetrics: { studyMinutes: 35 },
          aggregateSnapshotMetrics: { studyMinutes: 150 }
        },
        timeline: [
          { day: "2026-03-14", events: 2, snapshots: 0 },
          { day: "2026-03-15", events: 1, snapshots: 1 },
          { day: "2026-03-16", events: 0, snapshots: 0 },
          { day: "2026-03-17", events: 3, snapshots: 1 },
          { day: "2026-03-18", events: 2, snapshots: 1 },
          { day: "2026-03-19", events: 3, snapshots: 1 },
          { day: "2026-03-20", events: 3, snapshots: 0 }
        ],
        topEvents: [{ name: "practice", count: 8 }]
      })
    );

    expect(insights[0]).toMatchObject({
      id: "activity-volume",
      severity: "positive"
    });
    expect(insights[0].description).toContain("practice");
    expect(insights[1]).toMatchObject({
      id: "study-consistency",
      severity: "positive"
    });
    expect(insights[2]).toMatchObject({
      id: "snapshot-coverage",
      severity: "positive"
    });
  });
});

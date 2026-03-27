import { describe, expect, it } from "vitest";

import { buildAnalyticsReport } from "./report-builder";

describe("buildAnalyticsReport", () => {
  it("builds deterministic weekly summary within UTC 7-day window", () => {
    const report = buildAnalyticsReport({
      range: "weekly",
      now: new Date("2026-03-20T12:00:00.000Z"),
      events: [
        {
          id: "e-1",
          userId: "u-1",
          name: "session_start",
          category: "learning",
          occurredAt: "2026-03-20T02:00:00.000Z",
          payload: {}
        },
        {
          id: "e-2",
          userId: "u-1",
          name: "session_complete",
          category: "learning",
          occurredAt: "2026-03-18T02:00:00.000Z",
          payload: {}
        },
        {
          id: "e-3",
          userId: "u-1",
          name: "broken",
          category: "learning",
          occurredAt: "not-a-date",
          payload: {}
        },
        {
          id: "e-4",
          userId: "u-1",
          name: "too_old",
          category: "learning",
          occurredAt: "2026-03-10T02:00:00.000Z",
          payload: {}
        }
      ],
      snapshots: [
        {
          id: "s-1",
          userId: "u-1",
          scope: "dashboard",
          period: "daily",
          metrics: { studyMinutes: 45, completedTasks: 2 },
          capturedAt: "2026-03-19T01:00:00.000Z"
        },
        {
          id: "s-2",
          userId: "u-1",
          scope: "dashboard",
          period: "daily",
          metrics: { studyMinutes: 30 },
          capturedAt: "2026-03-16T01:00:00.000Z"
        },
        {
          id: "s-3",
          userId: "u-1",
          scope: "dashboard",
          period: "daily",
          metrics: { studyMinutes: 999 },
          capturedAt: "2026-02-01T01:00:00.000Z"
        }
      ]
    });

    expect(report.range).toBe("weekly");
    expect(report.window.start).toBe("2026-03-14");
    expect(report.window.end).toBe("2026-03-20");
    expect(report.window.days).toBe(7);
    expect(report.totals.eventCount).toBe(2);
    expect(report.totals.snapshotCount).toBe(2);
    expect(report.totals.aggregateSnapshotMetrics).toEqual({
      studyMinutes: 75,
      completedTasks: 2
    });
    expect(report.totals.latestSnapshotMetrics).toEqual({
      studyMinutes: 45,
      completedTasks: 2
    });

    const day20260318 = report.timeline.find((item) => item.day === "2026-03-18");
    const day20260319 = report.timeline.find((item) => item.day === "2026-03-19");
    expect(day20260318).toMatchObject({ events: 1, snapshots: 0 });
    expect(day20260319).toMatchObject({ events: 0, snapshots: 1 });

    expect(report.topCategories).toEqual([{ category: "learning", count: 2 }]);
    expect(report.topEvents).toEqual([
      { name: "session_complete", count: 1 },
      { name: "session_start", count: 1 }
    ]);
  });

  it("returns empty-safe monthly report with zeroed metrics", () => {
    const report = buildAnalyticsReport({
      range: "monthly",
      now: new Date("2026-03-20T12:00:00.000Z"),
      events: [],
      snapshots: []
    });

    expect(report.range).toBe("monthly");
    expect(report.window.start).toBe("2026-02-19");
    expect(report.window.end).toBe("2026-03-20");
    expect(report.window.days).toBe(30);
    expect(report.totals.eventCount).toBe(0);
    expect(report.totals.snapshotCount).toBe(0);
    expect(report.totals.latestSnapshotMetrics).toEqual({});
    expect(report.totals.aggregateSnapshotMetrics).toEqual({});
    expect(report.timeline).toHaveLength(30);
    expect(report.timeline.every((item) => item.events === 0 && item.snapshots === 0)).toBe(true);
    expect(report.topEvents).toEqual([]);
    expect(report.topCategories).toEqual([]);
  });
});

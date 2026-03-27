// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { WeeklyReport } from "./weekly-report";

test("renders weekly report correctly with data", () => {
  const mockReport = {
    range: "weekly" as const,
    window: { start: "2023-01-01", end: "2023-01-07", days: 7 },
    totals: {
      eventCount: 42,
      snapshotCount: 5,
      uniqueEventNames: 3,
      uniqueEventCategories: 2,
      latestSnapshotMetrics: {},
      aggregateSnapshotMetrics: {}
    },
    timeline: [
      { day: "2023-01-01", events: 5, snapshots: 1 }
    ],
    topEvents: [{ name: "study", count: 10 }],
    topCategories: [{ category: "learning", count: 15 }]
  };

  render(<WeeklyReport report={mockReport} />);

  expect(screen.getByText("周度事件总数")).toBeDefined();
  expect(screen.getByText("42")).toBeDefined();
  expect(screen.getByText("周度快照总数")).toBeDefined();
  expect(screen.getByText("5")).toBeDefined();
});

test("renders empty state for weekly report", () => {
  const mockReport = {
    range: "weekly" as const,
    window: { start: "2023-01-01", end: "2023-01-07", days: 7 },
    totals: {
      eventCount: 0,
      snapshotCount: 0,
      uniqueEventNames: 0,
      uniqueEventCategories: 0,
      latestSnapshotMetrics: {},
      aggregateSnapshotMetrics: {}
    },
    timeline: [],
    topEvents: [],
    topCategories: []
  };

  render(<WeeklyReport report={mockReport} />);

  expect(screen.getByText("暂无周度数据")).toBeDefined();
});

// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { MonthlyReport } from "./monthly-report";

test("renders monthly report correctly with data", () => {
  const mockReport = {
    range: "monthly" as const,
    window: { start: "2023-01-01", end: "2023-01-30", days: 30 },
    totals: {
      eventCount: 150,
      snapshotCount: 20,
      uniqueEventNames: 5,
      uniqueEventCategories: 3,
      latestSnapshotMetrics: {},
      aggregateSnapshotMetrics: {}
    },
    timeline: [
      { day: "2023-01-15", events: 10, snapshots: 2 }
    ],
    topEvents: [{ name: "quiz", count: 50 }],
    topCategories: [{ category: "exam", count: 60 }]
  };

  render(<MonthlyReport report={mockReport} />);

  expect(screen.getByText("月度事件总数")).toBeDefined();
  expect(screen.getByText("150")).toBeDefined();
  expect(screen.getByText("月度快照总数")).toBeDefined();
  expect(screen.getByText("20")).toBeDefined();
});

test("renders empty state for monthly report", () => {
  const mockReport = {
    range: "monthly" as const,
    window: { start: "2023-01-01", end: "2023-01-30", days: 30 },
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

  render(<MonthlyReport report={mockReport} />);

  expect(screen.getByText("暂无月度数据")).toBeDefined();
});

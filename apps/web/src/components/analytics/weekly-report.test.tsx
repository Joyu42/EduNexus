// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { WeeklyReport } from "./weekly-report";

test("renders weekly report correctly with data", () => {
  const mockReport: any = {
    range: "weekly",
    window: { start: "2023-01-01", end: "2023-01-07", days: 7 },
    totals: { eventCount: 42, snapshotCount: 5 },
    timeline: [],
    topEvents: [],
    topCategories: [],
    streakDays: 3,
    learnedToday: 10,
    reviewedToday: 15,
    relearnedToday: 2,
    accuracyToday: 0.85,
    recentProgress: {
      activeDays: 5,
      learnedWordsInRange: 50,
      averageDailyLearnedWords: 10,
    }
  };

  render(<WeeklyReport report={mockReport} />);

  expect(screen.getByText("连续学习天数")).toBeDefined();
  expect(screen.getByText("3")).toBeDefined();
  expect(screen.getByText("今日新学")).toBeDefined();
  expect(screen.getByText("10")).toBeDefined();
  expect(screen.getByText("今日复习")).toBeDefined();
  expect(screen.getByText("15")).toBeDefined();
  expect(screen.getByText("今日重学")).toBeDefined();
  expect(screen.getByText("2")).toBeDefined();
  expect(screen.getByText("今日正确率")).toBeDefined();
  expect(screen.getByText("85%")).toBeDefined();
  expect(screen.getByText("最近7天进度")).toBeDefined();
  expect(screen.getByText(/活跃 5 天/)).toBeDefined();
});

test("renders empty state for weekly report", () => {
  const mockReport: any = {
    range: "weekly",
    totals: { eventCount: 0, snapshotCount: 0 },
    streakDays: 0,
    learnedToday: 0,
    reviewedToday: 0,
    relearnedToday: 0,
    totalWords: 0,
    recentProgress: {
      activeDays: 0,
      learnedWordsInRange: 0,
      averageDailyLearnedWords: 0
    }
  };

  render(<WeeklyReport report={mockReport} />);

  expect(screen.getByText("暂无分析数据")).toBeDefined();
  expect(screen.getByText("产生真实的学习记录后，这里将展示您的数据分析。")).toBeDefined();
});

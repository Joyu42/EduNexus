// @vitest-environment jsdom
import React from "react";
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { MonthlyReport } from "./monthly-report";

test("renders monthly report correctly with data", () => {
  const mockReport: any = {
    range: "monthly",
    window: { start: "2023-01-01", end: "2023-01-30", days: 30 },
    totals: { eventCount: 150, snapshotCount: 20 },
    timeline: [],
    topEvents: [],
    topCategories: [],
    totalWords: 1000,
    learnedWords: 500,
    masteredWords: 100,
    dueToday: 25,
    bookProgress: [
      { bookId: "1", bookName: "Book A", totalWords: 200, learnedWords: 100, masteredWords: 50, progressPercent: 25 },
      { bookId: "2", bookName: "Book B", totalWords: 300, learnedWords: 200, masteredWords: 100, progressPercent: 33 },
      { bookId: "3", bookName: "Book C", totalWords: 400, learnedWords: 100, masteredWords: 10, progressPercent: 2 },
      { bookId: "4", bookName: "Book D", totalWords: 100, learnedWords: 100, masteredWords: 100, progressPercent: 100 },
    ]
  };

  render(<MonthlyReport report={mockReport} />);

  expect(screen.getByText("总词量")).toBeDefined();
  expect(screen.getByText("1000")).toBeDefined();
  expect(screen.getByText("已学词数")).toBeDefined();
  expect(screen.getByText("500")).toBeDefined();
  expect(screen.getByText("已掌握词数")).toBeDefined();
  expect(screen.getByText("100")).toBeDefined();
  expect(screen.getByText("今日待复习")).toBeDefined();
  expect(screen.getByText("25")).toBeDefined();
  
  // top 3 books
  expect(screen.getByText("Book A")).toBeDefined();
  expect(screen.getByText("Book B")).toBeDefined();
  expect(screen.getByText("Book C")).toBeDefined();
  // should not have book D because it's limited to top 3
  expect(screen.queryByText("Book D")).toBeNull();
});

test("renders empty state for monthly report", () => {
  const mockReport: any = {
    range: "monthly",
    totals: { eventCount: 0, snapshotCount: 0 },
    totalWords: 0,
    bookProgress: []
  };

  render(<MonthlyReport report={mockReport} />);

  expect(screen.getByText("暂无分析数据")).toBeDefined();
  expect(screen.getByText("产生真实的学习记录后，这里将展示您的数据分析。")).toBeDefined();
});

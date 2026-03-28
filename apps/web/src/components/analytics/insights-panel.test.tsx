// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { InsightsPanel } from "./insights-panel";

test("renders insights correctly", () => {
  const mockInsights = [
    {
      id: "activity-volume" as const,
      title: "学习行为活跃",
      description: "窗口内记录 42 次行为",
      severity: "positive" as const
    },
    {
      id: "study-consistency" as const,
      title: "学习连续性偏低",
      description: "7 天内仅活跃 2 天",
      severity: "warning" as const
    }
  ];

  render(<InsightsPanel insights={mockInsights} />);

  expect(screen.getByText("分析洞察")).toBeDefined();
  expect(screen.getByText("学习行为活跃")).toBeDefined();
  expect(screen.getByText("学习连续性偏低")).toBeDefined();
});

test("renders empty state when no insights", () => {
  render(<InsightsPanel insights={[]} />);

  expect(screen.getByText("暂无分析洞察")).toBeDefined();
});

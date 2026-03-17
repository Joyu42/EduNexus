import { describe, expect, it } from "vitest";

import {
  getGoalsPageState,
  getLearningPathsPageState,
  getPathPageState,
} from "@/lib/client/path-goal-view-state";

describe("path and goals empty states", () => {
  it("keeps normal users on empty states when no records exist", () => {
    expect(getPathPageState({ isLoading: false, pathCount: 0, isDemoUser: false })).toEqual({
      kind: "empty",
    });

    expect(
      getLearningPathsPageState({ isLoading: false, pathCount: 0, isDemoUser: false })
    ).toEqual({ kind: "empty" });

    expect(getGoalsPageState({ isLoading: false, goalCount: 0, isDemoUser: false })).toEqual({
      kind: "empty",
    });
  });

  it("requests demo bootstrap state for demo users with empty datasets", () => {
    expect(getPathPageState({ isLoading: false, pathCount: 0, isDemoUser: true })).toEqual({
      kind: "bootstrap_demo",
    });

    expect(
      getLearningPathsPageState({ isLoading: false, pathCount: 0, isDemoUser: true })
    ).toEqual({ kind: "bootstrap_demo" });

    expect(getGoalsPageState({ isLoading: false, goalCount: 0, isDemoUser: true })).toEqual({
      kind: "bootstrap_demo",
    });
  });

  it("shows content when data exists", () => {
    expect(getPathPageState({ isLoading: false, pathCount: 1, isDemoUser: false })).toEqual({
      kind: "content",
    });

    expect(
      getLearningPathsPageState({ isLoading: false, pathCount: 2, isDemoUser: false })
    ).toEqual({ kind: "content" });

    expect(getGoalsPageState({ isLoading: false, goalCount: 3, isDemoUser: false })).toEqual({
      kind: "content",
    });
  });
});

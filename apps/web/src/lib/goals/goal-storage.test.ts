import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  clearClientUserSnapshot,
  writeClientUserSnapshot,
} from "@/lib/auth/client-user-cache";
import { goalStorage, type Goal } from "@/lib/goals/goal-storage";

function createGoal(id: string, title: string): Goal {
  const now = new Date().toISOString();
  return {
    id,
    title,
    description: "desc",
    type: "mid-term",
    category: "skill",
    status: "active",
    smart: {
      specific: "specific",
      measurable: "measurable",
      achievable: "achievable",
      relevant: "relevant",
      timeBound: "timeBound",
    },
    progress: 0,
    linkedPathIds: [],
    relatedKnowledge: [],
    startDate: now,
    endDate: now,
    createdAt: now,
    updatedAt: now,
  };
}

describe("goal storage scope", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    const localStorageMock = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    };

    Object.defineProperty(globalThis, "window", {
      value: { localStorage: localStorageMock },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    clearClientUserSnapshot();
  });

  it("returns empty and skips writes when no client identity exists", () => {
    goalStorage.saveGoal(createGoal("goal-1", "No user"));

    expect(goalStorage.getGoals()).toEqual([]);
    expect(localStorage.getItem("edunexus_goals_anonymous")).toBeNull();
  });

  it("isolates goals by user snapshot identity", () => {
    writeClientUserSnapshot({ id: "user-a", email: "a@example.com" });
    goalStorage.saveGoal(createGoal("goal-a", "A"));

    writeClientUserSnapshot({ id: "user-b", email: "b@example.com" });
    expect(goalStorage.getGoals()).toEqual([]);
    goalStorage.saveGoal(createGoal("goal-b", "B"));

    writeClientUserSnapshot({ id: "user-a", email: "a@example.com" });
    expect(goalStorage.getGoals().map((goal) => goal.id)).toEqual(["goal-a"]);

    writeClientUserSnapshot({ id: "user-b", email: "b@example.com" });
    expect(goalStorage.getGoals().map((goal) => goal.id)).toEqual(["goal-b"]);
  });
});

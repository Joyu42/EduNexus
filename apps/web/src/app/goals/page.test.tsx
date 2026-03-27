/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import GoalsPage from "./page";
import type { Goal } from "@/lib/goals/goal-storage";

const {
  mockGetGoals,
  mockSaveGoal,
  mockDeleteGoal,
  mockUpdateProgress,
} = vi.hoisted(() => ({
  mockGetGoals: vi.fn<() => Goal[]>(),
  mockSaveGoal: vi.fn<(goal: Goal) => void>(),
  mockDeleteGoal: vi.fn<(id: string) => void>(),
  mockUpdateProgress: vi.fn<(id: string, progress: number) => void>(),
}));

const now = "2026-03-27T00:00:00.000Z";

function createGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: "goal-1",
    title: "Learn TypeScript",
    description: "Practice daily",
    type: "short-term",
    category: "skill",
    status: "active",
    smart: {
      specific: "specific",
      measurable: "measurable",
      achievable: "achievable",
      relevant: "relevant",
      timeBound: "time-bound",
    },
    progress: 0,
    linkedPathIds: [],
    relatedKnowledge: [],
    startDate: now,
    endDate: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    status: "authenticated",
    data: { user: { id: "user-a", isDemo: false } },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

vi.mock("@/lib/client/demo-bootstrap-policy", () => ({
  shouldSyncDemoDataInGoalsPage: () => false,
}));

vi.mock("@/lib/client/demo-client-sync", () => ({
  syncDemoClientData: vi.fn(),
}));

vi.mock("@/lib/client/path-goal-view-state", () => ({
  getGoalsPageState: () => ({ kind: "ready" }),
}));

vi.mock("@/lib/client/path-storage", () => ({
  pathStorage: {
    getAllPaths: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/goals/goal-storage", () => ({
  goalStorage: {
    getGoals: mockGetGoals,
    saveGoal: mockSaveGoal,
    deleteGoal: mockDeleteGoal,
    updateProgress: mockUpdateProgress,
  },
  habitStorage: {
    getHabits: vi.fn().mockReturnValue([]),
    saveHabit: vi.fn(),
    checkIn: vi.fn(),
    deleteHabit: vi.fn(),
  },
}));

vi.mock("@/components/goals/goal-wizard", () => ({
  GoalWizard: ({ onComplete }: { onComplete: (goal: Goal) => void }) => (
    <button onClick={() => onComplete(createGoal())} type="button">
      finish-create
    </button>
  ),
}));

vi.mock("@/components/goals/goal-card", () => ({
  GoalCard: ({
    goal,
    onUpdateProgress,
    onDelete,
    onEdit,
    onArchive,
  }: {
    goal: Goal;
    onUpdateProgress: (id: string, progress: number) => void;
    onDelete: (id: string) => void;
    onEdit?: (id: string, updates: Partial<Goal>) => void;
    onArchive?: (id: string) => void;
  }) => (
    <div data-testid={`goal-${goal.id}`}>
      <p>{goal.title}</p>
      <p>{goal.progress}%</p>
      <p>{goal.status}</p>
      <button onClick={() => onEdit?.(goal.id, { title: `${goal.title} (edited)` })} type="button">
        edit-goal
      </button>
      <button onClick={() => onUpdateProgress(goal.id, goal.progress + 10)} type="button">
        track-goal
      </button>
      <button onClick={() => onArchive?.(goal.id)} type="button">
        archive-goal
      </button>
      <button onClick={() => onDelete(goal.id)} type="button">
        delete-goal
      </button>
    </div>
  ),
}));

describe("GoalsPage local-first loop", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGoals.mockReturnValue([]);
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("supports create → edit → track → archive → delete without reloading from storage", async () => {
    render(<GoalsPage />);

    fireEvent.click(screen.getByRole("button", { name: "创建新目标" }));
    fireEvent.click(screen.getByRole("button", { name: "finish-create" }));

    await waitFor(() => {
      expect(screen.getByText("Learn TypeScript")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "edit-goal" }));
    await waitFor(() => {
      expect(screen.getByText("Learn TypeScript (edited)")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "track-goal" }));
    await waitFor(() => {
      const goalCard = screen.getByTestId("goal-goal-1");
      expect(within(goalCard).getByText("10%")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "archive-goal" }));
    await waitFor(() => {
      const goalCard = screen.getByTestId("goal-goal-1");
      expect(within(goalCard).getByText("paused")).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "delete-goal" }));
    await waitFor(() => {
      expect(screen.queryByText("Learn TypeScript (edited)")).toBeNull();
    });
  });
});

// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

import WordsDashboardPage from "./page";

import { useSession } from "next-auth/react";
import { wordsStorage } from "@/lib/words/storage";
import { ensureWordsBootstrap } from "@/lib/words/bootstrap";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/components/ui/login-prompt", () => ({
  LoginPrompt: ({ title }: { title: string }) => <div>login:{title}</div>,
}));

vi.mock("@/components/words", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/words")>();
  return {
    ...actual,
    BookSelector: ({ selectedBookId }: { selectedBookId: string }) => (
      <div data-testid="selected-book">{selectedBookId}</div>
    ),
    ProgressRing: () => null,
    StreakCalendar: () => null,
  };
});

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select
      data-testid="major-select"
      value={value}
      onChange={(e) => onValueChange((e.target as HTMLSelectElement).value)}
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

vi.mock("@/lib/words/bootstrap", () => ({
  ensureWordsBootstrap: vi.fn(),
}));

vi.mock("@/lib/words/date", () => ({
  getWordsToday: () => "2026-01-01",
  listenForWordsTodayChange: () => () => {},
}));

vi.mock("@/lib/words/integration", async () => {
  const actual = await vi.importActual<any>("@/lib/words/integration");
  return {
    ...actual,
    syncWordsProgressToGoal: vi.fn(),
  };
});

vi.mock("@/lib/words/storage", () => ({
  wordsStorage: {
    getWordBooks: vi.fn(),
    getAllLearningRecords: vi.fn(),
    getTodayReviewWords: vi.fn(),
    getLearningStats: vi.fn(),
    getWordsPlanSettings: vi.fn(),
    saveWordsPlanSettings: vi.fn(),
  },
}));

describe("WordsDashboardPage todaySummary regressions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    (ensureWordsBootstrap as any).mockResolvedValue(undefined);
    (wordsStorage.getAllLearningRecords as any).mockResolvedValue([]);
    (wordsStorage.getTodayReviewWords as any).mockResolvedValue([]);
    (wordsStorage.getWordBooks as any).mockResolvedValue([]);
    (wordsStorage.getWordsPlanSettings as any).mockResolvedValue({
      dailyNewLimit: 20,
      reviewFirst: true,
      defaultRevealMode: "hidden",
      selectedMajor: "",
      lastSelectedBookId: "",
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows exact 20 learned count after learning 20 new words (Anomaly 1)", async () => {
    (useSession as any).mockReturnValue({ status: "authenticated" });

    const statsWith20Learned = {
      totalBooks: 2,
      totalWords: 200,
      learnedWords: 120,
      masteredWords: 30,
      dueToday: 5,
      accuracy: 0.85,
      streakDays: 3,
      todaySummary: { learned: 20, reviewed: 8, relearned: 2, accuracy: 0.8 },
    };
    (wordsStorage.getLearningStats as any).mockResolvedValue(statsWith20Learned);

    render(<WordsDashboardPage />);

    await waitFor(() => {
      const learnedCard = screen.getByText("今日学习").parentElement;
      expect(learnedCard?.textContent).toBe("今日学习20");
    });
  });

  it("shows 0 reviewed count for brand-new user on first day (Anomaly 2)", async () => {
    (useSession as any).mockReturnValue({ status: "authenticated" });

    const firstDayStats = {
      totalBooks: 3,
      totalWords: 150,
      learnedWords: 105,
      masteredWords: 0,
      dueToday: 0,
      accuracy: 0,
      streakDays: 0,
      todaySummary: { learned: 105, reviewed: 0, relearned: 0, accuracy: 0 },
    };
    (wordsStorage.getLearningStats as any).mockResolvedValue(firstDayStats);

    render(<WordsDashboardPage />);

    await waitFor(() => {
      const reviewedCard = screen.getByText("今日复习").parentElement;
      expect(reviewedCard?.textContent).toBe("今日复习0");
    });
  });
});

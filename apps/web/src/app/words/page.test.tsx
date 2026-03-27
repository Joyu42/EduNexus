// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

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

vi.mock("@/components/words", () => ({
  BookSelector: ({ selectedBookId }: { selectedBookId: string }) => (
    <div data-testid="selected-book">{selectedBookId}</div>
  ),
  ProgressRing: () => null,
  StatsCard: () => null,
  StreakCalendar: () => null,
}));

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

const baseStats = {
  totalBooks: 0,
  totalWords: 0,
  learnedWords: 0,
  masteredWords: 0,
  dueToday: 0,
  accuracy: 0,
  streakDays: 0,
  todaySummary: { learned: 0, reviewed: 0, relearned: 0, accuracy: 0 },
};

describe("WordsDashboardPage selection hydration/persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    (ensureWordsBootstrap as any).mockResolvedValue(undefined);
    (wordsStorage.getAllLearningRecords as any).mockResolvedValue([]);
    (wordsStorage.getTodayReviewWords as any).mockResolvedValue([]);
    (wordsStorage.getLearningStats as any).mockResolvedValue(baseStats);
  });

  afterEach(() => {
    cleanup();
  });

  it("hydrates from server settings when authenticated", async () => {
    (useSession as any).mockReturnValue({ status: "authenticated" });

    (wordsStorage.getWordBooks as any).mockResolvedValue([
      {
        id: "builtin_book_medical",
        name: "Medical",
        description: "",
        wordCount: 10,
        category: "general",
      },
    ]);

    (wordsStorage.getWordsPlanSettings as any).mockResolvedValue({
      dailyNewLimit: 20,
      reviewFirst: true,
      defaultRevealMode: "hidden",
      selectedMajor: "medical",
      lastSelectedBookId: "builtin_book_medical",
    });

    render(<WordsDashboardPage />);

    await waitFor(() => {
      expect((screen.getByTestId("major-select") as HTMLSelectElement).value).toBe("medical");
      expect(screen.getByTestId("selected-book").textContent).toBe("builtin_book_medical");
    });

    expect(wordsStorage.saveWordsPlanSettings).not.toHaveBeenCalled();
  });

  it("does not call server settings APIs when unauthenticated", async () => {
    (useSession as any).mockReturnValue({ status: "unauthenticated" });

    render(<WordsDashboardPage />);

    expect(screen.getByText("login:单词学习")).toBeDefined();

    await waitFor(() => {
      expect(wordsStorage.getWordsPlanSettings).not.toHaveBeenCalled();
      expect(wordsStorage.saveWordsPlanSettings).not.toHaveBeenCalled();
    });
  });

  it("persists major+book to server on major change when authenticated", async () => {
    (useSession as any).mockReturnValue({ status: "authenticated" });

    (wordsStorage.getWordBooks as any).mockResolvedValue([
      {
        id: "builtin_book_medical",
        name: "Medical",
        description: "",
        wordCount: 10,
        category: "general",
      },
      {
        id: "builtin_book_computer",
        name: "Computer",
        description: "",
        wordCount: 10,
        category: "general",
      },
    ]);

    const currentSettings = {
      dailyNewLimit: 20,
      reviewFirst: true,
      defaultRevealMode: "hidden",
      selectedMajor: "medical",
      lastSelectedBookId: "builtin_book_medical",
    };

    (wordsStorage.getWordsPlanSettings as any).mockResolvedValue(currentSettings);
    (wordsStorage.saveWordsPlanSettings as any).mockResolvedValue(undefined);

    render(<WordsDashboardPage />);

    await waitFor(() => {
      expect((screen.getByTestId("major-select") as HTMLSelectElement).value).toBe("medical");
    });

    fireEvent.change(screen.getByTestId("major-select"), { target: { value: "computer" } });

    await waitFor(() => {
      expect(wordsStorage.saveWordsPlanSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedMajor: "computer",
          lastSelectedBookId: "builtin_book_computer",
        })
      );
    });
  });

  it("valid server pair does not save back", async () => {
    (useSession as any).mockReturnValue({ status: "authenticated" });

    (wordsStorage.getWordBooks as any).mockResolvedValue([
      {
        id: "builtin_book_medical",
        name: "Medical",
        description: "",
        wordCount: 10,
        category: "general",
      },
    ]);

    (wordsStorage.getWordsPlanSettings as any).mockResolvedValue({
      dailyNewLimit: 20,
      reviewFirst: true,
      defaultRevealMode: "hidden",
      selectedMajor: "medical",
      lastSelectedBookId: "builtin_book_medical",
    });

    render(<WordsDashboardPage />);

    await waitFor(() => {
      expect((screen.getByTestId("major-select") as HTMLSelectElement).value).toBe("medical");
      expect(screen.getByTestId("selected-book").textContent).toBe("builtin_book_medical");
    });

    expect(wordsStorage.saveWordsPlanSettings).not.toHaveBeenCalled();
  });

  it("migrates local selection to server one time when server is blank", async () => {
    (useSession as any).mockReturnValue({ status: "authenticated" });

    localStorage.setItem("edunexus_words_selected_major", "computer");
    localStorage.setItem("edunexus_words_selected_book", "builtin_book_computer");

    (wordsStorage.getWordBooks as any).mockResolvedValue([
      {
        id: "builtin_book_computer",
        name: "Computer",
        description: "",
        wordCount: 10,
        category: "general",
      },
    ]);

    const blankServerSettings = {
      dailyNewLimit: 20,
      reviewFirst: true,
      defaultRevealMode: "hidden",
      selectedMajor: "",
      lastSelectedBookId: "",
    };
    (wordsStorage.getWordsPlanSettings as any).mockResolvedValue(blankServerSettings);
    (wordsStorage.saveWordsPlanSettings as any).mockResolvedValue(undefined);

    render(<WordsDashboardPage />);

    await waitFor(() => {
      expect((screen.getByTestId("major-select") as HTMLSelectElement).value).toBe("computer");
      expect(screen.getByTestId("selected-book").textContent).toBe("builtin_book_computer");
    });

    await waitFor(() => {
      expect(wordsStorage.saveWordsPlanSettings).toHaveBeenCalledTimes(1);
      expect(wordsStorage.saveWordsPlanSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedMajor: "computer",
          lastSelectedBookId: "builtin_book_computer",
        })
      );
    });
  });

  it("repairs invalid server bookId and persists repaired pair", async () => {
    (useSession as any).mockReturnValue({ status: "authenticated" });

    (wordsStorage.getWordBooks as any).mockResolvedValue([
      {
        id: "builtin_book_computer",
        name: "Computer",
        description: "",
        wordCount: 10,
        category: "general",
      },
      {
        id: "cet4",
        name: "CET-4",
        description: "",
        wordCount: 10,
        category: "general",
      },
      {
        id: "custom_book_foo",
        name: "Foo",
        description: "",
        wordCount: 10,
        category: "general",
      },
    ]);

    (wordsStorage.getWordsPlanSettings as any).mockResolvedValue({
      dailyNewLimit: 20,
      reviewFirst: true,
      defaultRevealMode: "hidden",
      selectedMajor: "computer",
      lastSelectedBookId: "builtin_book_nonexistent",
    });
    (wordsStorage.saveWordsPlanSettings as any).mockResolvedValue(undefined);

    render(<WordsDashboardPage />);

    await waitFor(() => {
      expect((screen.getByTestId("major-select") as HTMLSelectElement).value).toBe("computer");
      expect(screen.getByTestId("selected-book").textContent).toBe("custom_book_foo");
    });

    await waitFor(() => {
      expect(wordsStorage.saveWordsPlanSettings).toHaveBeenCalledTimes(1);
      expect(wordsStorage.saveWordsPlanSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          selectedMajor: "computer",
          lastSelectedBookId: "custom_book_foo",
        })
      );
    });
  });

  it("unauthenticated does not call server settings APIs even with invalid local pair", async () => {
    (useSession as any).mockReturnValue({ status: "unauthenticated" });

    localStorage.setItem("edunexus_words_selected_major", "computer");
    localStorage.setItem("edunexus_words_selected_book", "builtin_book_nonexistent");

    render(<WordsDashboardPage />);

    expect(screen.getByText("login:单词学习")).toBeDefined();

    await waitFor(() => {
      expect(wordsStorage.getWordsPlanSettings).not.toHaveBeenCalled();
      expect(wordsStorage.saveWordsPlanSettings).not.toHaveBeenCalled();
    });
  });
});



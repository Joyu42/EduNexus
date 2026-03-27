/** @vitest-environment jsdom */
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import PracticeDrillPage from "./page";
import { getPracticeStorage } from "@/lib/practice";
import React, { Suspense } from "react";

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    use: (promise: any) => {
      if (promise instanceof Promise) {
        let status = 'pending';
        let result: any;
        promise.then(
          r => { status = 'fulfilled'; result = r; },
          e => { status = 'rejected'; result = e; }
        );
        if (promise.hasOwnProperty('_mockValue')) {
          return (promise as any)._mockValue;
        }
        throw promise;
      }
      return promise;
    }
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("@/lib/practice", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/practice")>();
  return {
    ...actual,
    getPracticeStorage: vi.fn(),
  };
});

describe("PracticeDrillPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("loads questions and starts a practice session", async () => {
    const mockQuestions = [
      {
        id: "q1",
        title: "What is 2+2?",
        type: "MULTIPLE_CHOICE",
        points: 5,
        options: [{ id: "opt1", text: "4", isCorrect: true }],
      },
    ];

    (getPracticeStorage as any).mockImplementation(() => ({
      getRandomQuestions: async () => mockQuestions,
      createRecord: async () => {},
      addToWrongQuestions: async () => {}
    }));

    const resolvedParams = Promise.resolve({ bankId: "bank-1" });
    (resolvedParams as any)._mockValue = { bankId: "bank-1" };
    
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <PracticeDrillPage params={resolvedParams} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText("What is 2+2?")).toBeTruthy();
    });
  });

  it("handles empty questions gracefully", async () => {
    (getPracticeStorage as any).mockImplementation(() => ({
      getRandomQuestions: async () => [],
    }));

    const resolvedParams = Promise.resolve({ bankId: "bank-1" });
    (resolvedParams as any)._mockValue = { bankId: "bank-1" };
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <PracticeDrillPage params={resolvedParams} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText(/该题库暂无题目/)).toBeTruthy();
    });
  });

  it("restores in-progress session from sessionStorage on reload", async () => {
    const mockQuestions = [
      {
        id: "q1",
        title: "What is 2+2?",
        type: "MULTIPLE_CHOICE",
        points: 5,
        options: [{ id: "opt1", text: "4", isCorrect: true }],
      },
      {
        id: "q2",
        title: "What is 3+3?",
        type: "MULTIPLE_CHOICE",
        points: 5,
        options: [{ id: "opt2", text: "6", isCorrect: true }],
      },
    ];

    const savedSession = {
      bankId: "bank-reload",
      questions: mockQuestions,
      currentIndex: 1,
      answers: { q1: "opt1" },
      results: {
        q1: {
          questionId: "q1",
          answer: "opt1",
          isCorrect: true,
          score: 5,
          maxScore: 5,
          timeSpent: 10,
        },
      },
      startedAt: Date.now() - 10000,
      isFinished: false,
      totalQuestions: 2,
    };

    sessionStorage.setItem("practice_session_bank-reload", JSON.stringify(savedSession));

    (getPracticeStorage as any).mockImplementation(() => ({
      getRandomQuestions: async () => mockQuestions,
      createRecord: async () => {},
      addToWrongQuestions: async () => {}
    }));

    const resolvedParams = Promise.resolve({ bankId: "bank-reload" });
    (resolvedParams as any)._mockValue = { bankId: "bank-reload" };
    
    render(
      <Suspense fallback={<div>Loading...</div>}>
        <PracticeDrillPage params={resolvedParams} />
      </Suspense>
    );

    await waitFor(() => {
      expect(screen.getByText("What is 3+3?")).toBeTruthy();
    });
    
    sessionStorage.removeItem("practice_session_bank-reload");
  });
});

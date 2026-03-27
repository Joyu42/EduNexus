import { describe, expect, it, vi } from "vitest";

import { createPracticeStorageAdapter } from "./adapters";
import {
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
  type PracticeStorageClient,
  type Question,
} from "./types";

function buildStorage(overrides: Partial<PracticeStorageClient> = {}): PracticeStorageClient {
  return {
    getAllBanks: vi.fn().mockResolvedValue([]),
    createBank: vi.fn().mockResolvedValue({
      id: "bank-1",
      name: "Default",
      description: "",
      tags: [],
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      questionCount: 0,
    }),
    updateBank: vi.fn().mockResolvedValue(undefined),
    deleteBank: vi.fn().mockResolvedValue(undefined),
    getQuestionsByBank: vi.fn().mockResolvedValue([]),
    getQuestion: vi.fn().mockResolvedValue(null),
    createQuestion: vi.fn().mockResolvedValue(null),
    updateQuestion: vi.fn().mockResolvedValue(undefined),
    deleteQuestion: vi.fn().mockResolvedValue(undefined),
    getRandomQuestions: vi.fn().mockResolvedValue([]),
    createRecord: vi.fn().mockResolvedValue(null),
    addToWrongQuestions: vi.fn().mockResolvedValue(null),
    markAsMastered: vi.fn().mockResolvedValue(undefined),
    getWrongQuestions: vi.fn().mockResolvedValue([]),
    deleteWrongQuestion: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as PracticeStorageClient;
}

describe("createPracticeStorageAdapter", () => {
  it("delegates storage methods to the client storage implementation", async () => {
    const storage = buildStorage();
    const adapter = createPracticeStorageAdapter(storage);

    await adapter.getAllBanks();
    await adapter.getQuestionsByBank("bank-1");
    await adapter.deleteQuestion("q-1");

    expect(storage.getAllBanks).toHaveBeenCalledTimes(1);
    expect(storage.getQuestionsByBank).toHaveBeenCalledWith("bank-1");
    expect(storage.deleteQuestion).toHaveBeenCalledWith("q-1");
  });

  it("creates an empty-safe session when the selected bank has no questions", async () => {
    const storage = buildStorage({
      getRandomQuestions: vi.fn().mockResolvedValue([]),
    });
    const adapter = createPracticeStorageAdapter(storage);

    const session = await adapter.createSession({ bankId: "empty-bank" });

    expect(storage.getRandomQuestions).toHaveBeenCalledWith("empty-bank", 10, undefined);
    expect(session.bankId).toBe("empty-bank");
    expect(session.questions).toEqual([]);
    expect(session.totalQuestions).toBe(0);
    expect(session.results).toEqual({});
  });

  it("creates a populated session when storage returns questions", async () => {
    const question: Question = {
      id: "q-1",
      bankId: "bank-1",
      type: QuestionType.MULTIPLE_CHOICE,
      title: "title",
      content: "content",
      difficulty: QuestionDifficulty.EASY,
      status: QuestionStatus.ACTIVE,
      tags: [],
      points: 5,
      options: [
        { id: "A", text: "A", isCorrect: true },
        { id: "B", text: "B", isCorrect: false },
      ],
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const storage = buildStorage({
      getRandomQuestions: vi.fn().mockResolvedValue([question]),
    });
    const adapter = createPracticeStorageAdapter(storage);

    const session = await adapter.createSession({ bankId: "bank-1", count: 5 });

    expect(storage.getRandomQuestions).toHaveBeenCalledWith("bank-1", 5, undefined);
    expect(session.totalQuestions).toBe(1);
    expect(session.questions[0]?.id).toBe("q-1");
  });
});

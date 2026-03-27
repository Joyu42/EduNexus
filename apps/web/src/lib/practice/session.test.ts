import { describe, expect, it } from "vitest";

import {
  createPracticeSession,
  gradePracticeAnswer,
  summarizePracticeSession,
} from "./session";
import {
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
  type Question,
  type PracticeStoragePort,
} from "./types";

function buildQuestion(overrides: Partial<Question>): Question {
  return {
    id: "q-1",
    bankId: "bank-1",
    type: QuestionType.MULTIPLE_CHOICE,
    title: "Question",
    content: "Question content",
    difficulty: QuestionDifficulty.MEDIUM,
    status: QuestionStatus.ACTIVE,
    tags: [],
    points: 10,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("createPracticeSession", () => {
  it("returns a safe empty session when the bank has no questions", async () => {
    const storage: Pick<PracticeStoragePort, "getRandomQuestions"> = {
      getRandomQuestions: async () => [],
    };

    const session = await createPracticeSession(storage, { bankId: "empty-bank" });

    expect(session).toMatchObject({
      bankId: "empty-bank",
      currentIndex: 0,
      isFinished: false,
      totalQuestions: 0,
      questions: [],
    });
    expect(session.answers).toEqual({});
    expect(session.results).toEqual({});
    expect(summarizePracticeSession(session)).toEqual({
      totalQuestions: 0,
      answeredQuestions: 0,
      correctCount: 0,
      totalPoints: 0,
      earnedPoints: 0,
      accuracy: 0,
    });
  });
});

describe("session scoring helpers", () => {
  it("grades answers and summarizes normal scoring flow", () => {
    const first = buildQuestion({
      id: "q-correct",
      points: 5,
      options: [
        { id: "A", text: "A", isCorrect: true },
        { id: "B", text: "B", isCorrect: false },
      ],
    });
    const second = buildQuestion({
      id: "q-wrong",
      type: QuestionType.SHORT_ANSWER,
      points: 10,
    });

    const firstResult = gradePracticeAnswer({
      question: first,
      answer: "A",
      timeSpent: 12,
    });
    const secondResult = gradePracticeAnswer({
      question: second,
      answer: "too short",
      timeSpent: 9,
    });

    const summary = summarizePracticeSession({
      bankId: "bank-1",
      questions: [first, second],
      currentIndex: 1,
      answers: { [first.id]: "A", [second.id]: "too short" },
      results: { [first.id]: firstResult, [second.id]: secondResult },
      startedAt: Date.now(),
      isFinished: true,
      totalQuestions: 2,
    });

    expect(firstResult).toMatchObject({ isCorrect: true, score: 5, maxScore: 5 });
    expect(secondResult).toMatchObject({ isCorrect: false, score: 0, maxScore: 10 });
    expect(summary).toEqual({
      totalQuestions: 2,
      answeredQuestions: 2,
      correctCount: 1,
      totalPoints: 15,
      earnedPoints: 5,
      accuracy: 50,
    });
  });
});

import { QuestionType } from "./types";
import type {
  CreatePracticeSessionInput,
  GradePracticeAnswerInput,
  PracticeQuestionResult,
  PracticeSession,
  PracticeSessionSummary,
  PracticeStoragePort,
  Question,
} from "./types";

function isAnswerCorrect(question: Question, answer: string): boolean {
  switch (question.type) {
    case QuestionType.MULTIPLE_CHOICE: {
      const correctOption = question.options?.find((option) => option.isCorrect);
      return Boolean(correctOption && answer === correctOption.id);
    }
    case QuestionType.FILL_IN_BLANK: {
      const blanks = question.blanks;
      if (!blanks || blanks.length === 0) {
        return false;
      }

      const userBlanks = answer.split("|");
      return blanks.every(
        (blank, index) => userBlanks[index]?.trim().toLowerCase() === blank.trim().toLowerCase()
      );
    }
    case QuestionType.SHORT_ANSWER:
      return answer.trim().length > 10;
    case QuestionType.CODING:
      return Boolean(question.testCases?.length && answer.trim().length > 0);
    default:
      return false;
  }
}

export async function createPracticeSession(
  storage: Pick<PracticeStoragePort, "getRandomQuestions">,
  input: CreatePracticeSessionInput
): Promise<PracticeSession> {
  const questions = await storage.getRandomQuestions(input.bankId, input.count ?? 10, input.filters);

  return {
    bankId: input.bankId,
    questions,
    currentIndex: 0,
    answers: {},
    results: {},
    startedAt: Date.now(),
    isFinished: false,
    totalQuestions: questions.length,
  };
}

export function gradePracticeAnswer(input: GradePracticeAnswerInput): PracticeQuestionResult {
  const { question, answer, timeSpent } = input;
  const isCorrect = isAnswerCorrect(question, answer);

  return {
    questionId: question.id,
    answer,
    isCorrect,
    score: isCorrect ? question.points : 0,
    maxScore: question.points,
    timeSpent,
  };
}

export function summarizePracticeSession(session: PracticeSession): PracticeSessionSummary {
  const totalPoints = session.questions.reduce((sum, question) => sum + question.points, 0);
  const resultList = Object.values(session.results);
  const earnedPoints = resultList.reduce((sum, result) => sum + result.score, 0);
  const correctCount = resultList.filter((result) => result.isCorrect).length;
  const answeredQuestions = resultList.length;

  return {
    totalQuestions: session.totalQuestions,
    answeredQuestions,
    correctCount,
    totalPoints,
    earnedPoints,
    accuracy: answeredQuestions > 0 ? Math.round((correctCount / answeredQuestions) * 100) : 0,
  };
}

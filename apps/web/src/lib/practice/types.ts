import type {
  PracticeRecord,
  Question,
  QuestionBank,
  WrongQuestion,
} from "@/lib/client/practice-storage";

export {
  QuestionDifficulty,
  QuestionStatus,
  QuestionType,
  type MultipleChoiceOption,
  type PracticeRecord,
  type Question,
  type QuestionBank,
  type WrongQuestion,
} from "@/lib/client/practice-storage";

export type RandomQuestionFilters = {
  type?: import("@/lib/client/practice-storage").QuestionType;
  difficulty?: import("@/lib/client/practice-storage").QuestionDifficulty;
  tags?: string[];
};

export type CreatePracticeSessionInput = {
  bankId: string;
  count?: number;
  filters?: RandomQuestionFilters;
};

export type PracticeQuestionResult = {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  score: number;
  maxScore: number;
  timeSpent: number;
};

export type PracticeSession = {
  bankId: string;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string>;
  results: Record<string, PracticeQuestionResult>;
  startedAt: number;
  isFinished: boolean;
  totalQuestions: number;
};

export type PracticeSessionSummary = {
  totalQuestions: number;
  answeredQuestions: number;
  correctCount: number;
  totalPoints: number;
  earnedPoints: number;
  accuracy: number;
};

export type GradePracticeAnswerInput = {
  question: Question;
  answer: string;
  timeSpent: number;
};

export type CreateQuestionInput = Omit<Question, "id" | "createdAt" | "updatedAt">;
export type CreatePracticeRecordInput = Omit<PracticeRecord, "id" | "createdAt">;

export type PracticeStorageClient = {
  getAllBanks(): Promise<QuestionBank[]>;
  createBank(name: string, description?: string, tags?: string[]): Promise<QuestionBank>;
  updateBank(bank: QuestionBank): Promise<void>;
  deleteBank(bankId: string): Promise<void>;
  getQuestionsByBank(bankId: string): Promise<Question[]>;
  getQuestion(questionId: string): Promise<Question | null>;
  createQuestion(question: CreateQuestionInput): Promise<Question>;
  updateQuestion(question: Question): Promise<void>;
  deleteQuestion(questionId: string): Promise<void>;
  getRandomQuestions(bankId: string, count: number, filters?: RandomQuestionFilters): Promise<Question[]>;
  createRecord(record: CreatePracticeRecordInput): Promise<PracticeRecord>;
  addToWrongQuestions(questionId: string, bankId: string, notes?: string): Promise<WrongQuestion>;
  markAsMastered(questionId: string): Promise<void>;
  getWrongQuestions(bankId?: string, onlyUnmastered?: boolean): Promise<WrongQuestion[]>;
  deleteWrongQuestion(questionId: string): Promise<void>;
};

export type PracticeStoragePort = PracticeStorageClient & {
  createSession(input: CreatePracticeSessionInput): Promise<PracticeSession>;
};

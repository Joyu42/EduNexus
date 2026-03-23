export type WordDifficulty = "easy" | "medium" | "hard";

export type LearningStatus = "new" | "learning" | "reviewing" | "mastered";

export type WordAnswerGrade = "again" | "hard" | "good" | "easy";

export type StudyEventType = "learn" | "review" | "relearn";

export type WordBookCategory = "cet" | "exam" | "general" | "custom";

export type Word = {
  id: string;
  word: string;
  phonetic: string;
  definition: string;
  example: string;
  exampleZh?: string;
  bookId: string;
  difficulty: WordDifficulty;
};

export type WordBook = {
  id: string;
  name: string;
  description: string;
  wordCount: number;
  category: WordBookCategory;
};

export type LearningRecord = {
  wordId: string;
  bookId: string;
  learnDate: string;
  status: LearningStatus;
  nextReviewDate: string;
  interval: number;
  easeFactor: number;
  reviewCount: number;
  successCount: number;
  failureCount: number;
  lastReviewedAt: string;
  retentionScore: 0 | 1;
  lastStudyType?: StudyEventType;
  lastGrade?: WordAnswerGrade;
};

export type ReviewSchedule = {
  date: string;
  wordIds: string[];
  newCount: number;
  reviewCount: number;
};

export type WordsTodaySummary = {
  learned: number;
  reviewed: number;
  relearned: number;
  accuracy: number;
};

export type WordsPlanSettings = {
  dailyNewLimit: number;
  reviewFirst: boolean;
  defaultRevealMode: "hidden" | "definition";
};

export type LearningStats = {
  totalBooks: number;
  totalWords: number;
  learnedWords: number;
  masteredWords: number;
  dueToday: number;
  accuracy: number;
  streakDays: number;
  todaySummary: WordsTodaySummary;
};

export type Stats = LearningStats;

export type StudyEvent = {
  date: string;
  type: StudyEventType;
  grade: WordAnswerGrade;
  success: boolean;
};

export type WordMasteryInput = {
  reviewCount: number;
  easeFactor: number;
  successRate: number;
};

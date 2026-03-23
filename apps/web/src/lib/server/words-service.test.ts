import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BUILTIN_BOOK_ID_PREFIX } from "./builtin-wordbook-service";

const { findMany, mockCustomFindMany, mockBuiltinFindMany } = vi.hoisted(() => {
  const findMany = vi.fn();
  const mockCustomFindMany = vi.fn().mockResolvedValue([]);
  const mockBuiltinFindMany = vi.fn().mockResolvedValue([]);
  return { findMany, mockCustomFindMany, mockBuiltinFindMany };
});

vi.mock("./prisma", () => ({
  prisma: {
    wordsLearningRecord: {
      findMany,
    },
    wordsPlanSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    wordsReviewSchedule: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    customWordBook: {
      findMany: mockCustomFindMany,
    },
    customWordEntry: {
      findMany: mockCustomFindMany,
    },
    builtinWordBook: {
      findMany: mockBuiltinFindMany,
    },
    builtinWordEntry: {
      findMany: mockBuiltinFindMany,
    },
  },
}));

vi.mock("@/lib/words/catalog", () => ({
  listLocalWordBooks: () => [
    { id: "cet4", name: "CET-4", description: "", wordCount: 100, category: "cet" },
    { id: "cet6", name: "CET-6", description: "", wordCount: 120, category: "cet" },
  ],
  listAllLocalWords: () => [
    { id: "w1", word: "a", phonetic: "", definition: "", example: "", bookId: "cet4", difficulty: "easy" },
    { id: "w2", word: "b", phonetic: "", definition: "", example: "", bookId: "cet4", difficulty: "easy" },
    { id: "w3", word: "c", phonetic: "", definition: "", example: "", bookId: "cet6", difficulty: "easy" },
  ],
  listLocalWordsByBook: (bookId: string) => {
    const all = [
      { id: "w1", word: "a", phonetic: "", definition: "", example: "", bookId: "cet4", difficulty: "easy" },
      { id: "w2", word: "b", phonetic: "", definition: "", example: "", bookId: "cet4", difficulty: "easy" },
      { id: "w3", word: "c", phonetic: "", definition: "", example: "", bookId: "cet6", difficulty: "easy" },
    ];
    return all.filter((item) => item.bookId === bookId);
  },
}));

const { getWordsProgressSummary } = await import("./words-service");

describe("words service progress summary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-19T00:00:00.000Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("includes recent-period metrics for progress report", async () => {
    findMany.mockResolvedValueOnce([
      {
        wordId: "w1",
        bookId: "cet4",
        learnDate: "2026-03-15",
        status: "reviewing",
        nextReviewDate: "2026-03-20",
        interval: 3,
        easeFactor: 2.4,
        reviewCount: 2,
        successCount: 1,
        failureCount: 1,
        lastReviewedAt: "2026-03-19",
        retentionScore: 1,
        lastStudyType: "review",
        lastGrade: "good",
      },
      {
        wordId: "w2",
        bookId: "cet4",
        learnDate: "2026-03-18",
        status: "learning",
        nextReviewDate: "2026-03-19",
        interval: 1,
        easeFactor: 2.1,
        reviewCount: 1,
        successCount: 0,
        failureCount: 1,
        lastReviewedAt: "2026-03-18",
        retentionScore: 0,
        lastStudyType: "relearn",
        lastGrade: "again",
      },
    ]);

    const summary = await getWordsProgressSummary("user-a", "2026-03-19", 7);

    expect(summary.recentProgress).toMatchObject({
      rangeDays: 7,
      startDate: "2026-03-13",
      endDate: "2026-03-19",
      learnedWordsInRange: 2,
      reviewedCountInRange: 1,
      relearnedCountInRange: 1,
      activeDays: 3,
      averageDailyLearnedWords: 0.3,
    });
  });

  it("aligns due count with provided date", async () => {
    const records = [
      {
        wordId: "w1",
        bookId: "cet4",
        learnDate: "2026-03-10",
        status: "learning",
        nextReviewDate: "2026-03-20",
        interval: 2,
        easeFactor: 2.3,
        reviewCount: 1,
        successCount: 1,
        failureCount: 0,
        lastReviewedAt: "2026-03-19",
        retentionScore: 1,
        lastStudyType: "review",
        lastGrade: "good",
      },
      {
        wordId: "w2",
        bookId: "cet6",
        learnDate: "2026-03-11",
        status: "reviewing",
        nextReviewDate: "2026-03-22",
        interval: 4,
        easeFactor: 2.5,
        reviewCount: 1,
        successCount: 1,
        failureCount: 0,
        lastReviewedAt: "2026-03-21",
        retentionScore: 1,
        lastStudyType: "review",
        lastGrade: "good",
      },
    ];

    findMany.mockResolvedValueOnce(records);
    const summary21 = await getWordsProgressSummary("user-date", "2026-03-21", 5);
    expect(summary21.date).toBe("2026-03-21");
    expect(summary21.dueToday).toBe(1);

    findMany.mockResolvedValueOnce(records);
    const summary23 = await getWordsProgressSummary("user-date", "2026-03-23", 5);
    expect(summary23.date).toBe("2026-03-23");
    expect(summary23.dueToday).toBe(2);
  });

  it("normalizes legacy records missing review metadata", async () => {
    findMany.mockResolvedValueOnce([
      {
        wordId: "w1",
        bookId: "cet4",
        learnDate: "",
        status: "reviewing",
        nextReviewDate: "",
        interval: 0,
        easeFactor: 2.3,
        reviewCount: 0,
        successCount: 0,
        failureCount: 1,
        lastReviewedAt: "",
        retentionScore: null,
        lastStudyType: null,
        lastGrade: null,
      },
    ]);

    const summary = await getWordsProgressSummary("legacy-user", "2026-03-19", 7);

    expect(summary.dueToday).toBe(1);
    expect(summary.streakDays).toBeGreaterThan(0);
    expect(summary.recentProgress.learnedWordsInRange).toBe(1);
  });

  it("keeps progress query scoped by user id", async () => {
    findMany.mockResolvedValue([]);

    await getWordsProgressSummary("user-a", "2026-03-19", 7);
    await getWordsProgressSummary("user-b", "2026-03-19", 7);

    expect(findMany).toHaveBeenNthCalledWith(1, {
      where: { userId: "user-a" },
      orderBy: { updatedAt: "desc" },
    });
    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: { userId: "user-b" },
      orderBy: { updatedAt: "desc" },
    });
  });
});

describe("listWords builtin routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes builtin_book_medical to builtin words path", async () => {
    const bookId = `${BUILTIN_BOOK_ID_PREFIX}medical`;

    vi.mocked(mockBuiltinFindMany).mockResolvedValueOnce([
      {
        id: "medical_abc123",
        bookId: "medical",
        word: "artery",
        phonetic: "/ɑːrtəri/",
        definition: "动脉",
        example: null,
        exampleZh: null,
        difficulty: "medium",
        sortOrder: 0,
      },
    ]);

    const { listWords } = await import("./words-service");
    const words = await listWords("user1", bookId);

    expect(words).toHaveLength(1);
    expect(words[0].bookId).toBe(bookId);
    expect(words[0].id).toBe("builtin_word_medical_abc123");
  });

  it("includes builtin words in unfiltered listWords", async () => {
    const bookId = `${BUILTIN_BOOK_ID_PREFIX}medical`;

    vi.mocked(mockCustomFindMany).mockResolvedValueOnce([]);
    vi.mocked(mockBuiltinFindMany).mockResolvedValueOnce([
      {
        id: "medical_abc123",
        bookId: "medical",
        word: "artery",
        phonetic: "/ɑːrtəri/",
        definition: "动脉",
        example: null,
        exampleZh: null,
        difficulty: "medium",
        sortOrder: 0,
      },
    ]);

    const { listWords } = await import("./words-service");
    const words = await listWords("user1");

    expect(words.length).toBeGreaterThanOrEqual(1);
    const builtinWord = words.find((w) => w.bookId === bookId);
    expect(builtinWord).toBeDefined();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const getWordsProgressSummary = vi.fn();

vi.mock("@/lib/server/words-service", () => ({
  getWordsProgressSummary,
}));

const { getAllTools } = await import("./tools-real");

function mockSummary(overrides?: Partial<Record<string, unknown>>) {
  return {
    date: "2026-03-19",
    streakDays: 3,
    dueToday: 4,
    hasDueReview: true,
    learnedToday: 2,
    reviewedToday: 3,
    relearnedToday: 1,
    totalWords: 200,
    learnedWords: 20,
    masteredWords: 8,
    accuracyToday: 0.75,
    recentProgress: {
      rangeDays: 7,
      startDate: "2026-03-13",
      endDate: "2026-03-19",
      activeDays: 5,
      learnedWordsInRange: 18,
      reviewedCountInRange: 9,
      relearnedCountInRange: 3,
      averageDailyLearnedWords: 2.6,
    },
    suggestedBookId: "cet4",
    bookProgress: [
      {
        bookId: "cet4",
        bookName: "CET-4",
        totalWords: 100,
        learnedWords: 20,
        masteredWords: 8,
        dueToday: 4,
        progressPercent: 8,
      },
    ],
    ...overrides,
  };
}

describe("words agent tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries words progress with authenticated user scope", async () => {
    getWordsProgressSummary.mockResolvedValueOnce(mockSummary());
    const tool = getAllTools({ userId: "user-a" }).find((item) => item.name === "query_words_progress");
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({});
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(getWordsProgressSummary).toHaveBeenCalledWith("user-a", undefined, undefined);
    expect(result).toMatchObject({
      streakDays: 3,
      dueToday: 4,
      hasDueReview: true,
      suggestedBookId: "cet4",
      recentProgress: {
        rangeDays: 7,
        learnedWordsInRange: 18,
        averageDailyLearnedWords: 2.6,
      },
    });
    expect(result.report).toMatchObject({
      rangeDays: 7,
      startDate: "2026-03-13",
      endDate: "2026-03-19",
      learnedWordsInRange: 18,
      averageDailyLearnedWords: 2.6,
      activeDays: 5,
      learnedWords: 20,
      masteredWords: 8,
      dueToday: 4,
      streakDays: 3,
    });
  });

  it("queries words progress with custom rangeDays", async () => {
    getWordsProgressSummary.mockResolvedValueOnce(mockSummary());
    const tool = getAllTools({ userId: "user-range" }).find((item) => item.name === "query_words_progress");
    expect(tool).toBeDefined();

    await tool!.invoke({ rangeDays: 14 });

    expect(getWordsProgressSummary).toHaveBeenCalledWith("user-range", undefined, 14);
  });

  it("returns safe error when words progress tool has no user", async () => {
    const tool = getAllTools().find((item) => item.name === "query_words_progress");
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({});
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.error).toBe("查询英语单词进度失败");
    expect(String(result.message || "")).toContain("缺少 userId");
  });

  it("recommends review route when due items exist", async () => {
    getWordsProgressSummary.mockResolvedValueOnce(mockSummary({ dueToday: 2, hasDueReview: true }));
    const tool = getAllTools({ userId: "user-b" }).find((item) => item.name === "recommend_words_action");
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({ intent: "review" });
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result).toMatchObject({
      action: "navigate",
      route: "/words/review",
      intent: "review",
    });
  });

  it("routes generic learn intent to dashboard for explicit CET4/CET6 choice", async () => {
    getWordsProgressSummary.mockResolvedValueOnce(mockSummary({ suggestedBookId: null }));
    const tool = getAllTools({ userId: "user-c" }).find((item) => item.name === "recommend_words_action");
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({ intent: "learn" });
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.route).toBe("/words");
    expect(result.choices).toEqual([
      { label: "直接开始 CET-4", route: "/words/learn/cet4" },
      { label: "直接开始 CET-6", route: "/words/learn/cet6" },
    ]);
  });

  it("prefers CET6 route when user explicitly asks CET6", async () => {
    getWordsProgressSummary.mockResolvedValueOnce(mockSummary({ suggestedBookId: "cet4" }));
    const tool = getAllTools({ userId: "user-e" }).find((item) => item.name === "recommend_words_action");
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({ intent: "auto", userMessage: "带我学 CET6 单词" });
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.route).toBe("/words/learn/cet6");
  });

  it("prefers CET4 route when user explicitly asks CET4", async () => {
    getWordsProgressSummary.mockResolvedValueOnce(mockSummary({ suggestedBookId: "cet6" }));
    const tool = getAllTools({ userId: "user-f" }).find((item) => item.name === "recommend_words_action");
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({ intent: "auto", userMessage: "请带我学四级单词" });
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.route).toBe("/words/learn/cet4");
  });

  it("keeps user scope isolated when querying different users", async () => {
    getWordsProgressSummary.mockResolvedValueOnce(mockSummary({ learnedWords: 11 }));
    getWordsProgressSummary.mockResolvedValueOnce(mockSummary({ learnedWords: 31 }));

    const toolA = getAllTools({ userId: "user-a" }).find((item) => item.name === "query_words_progress");
    const toolB = getAllTools({ userId: "user-b" }).find((item) => item.name === "query_words_progress");

    const rawA = await toolA!.invoke({});
    const rawB = await toolB!.invoke({});
    const resultA = JSON.parse(typeof rawA === "string" ? rawA : JSON.stringify(rawA));
    const resultB = JSON.parse(typeof rawB === "string" ? rawB : JSON.stringify(rawB));

    expect(getWordsProgressSummary).toHaveBeenNthCalledWith(1, "user-a", undefined, undefined);
    expect(getWordsProgressSummary).toHaveBeenNthCalledWith(2, "user-b", undefined, undefined);
    expect(resultA.learnedWords).toBe(11);
    expect(resultB.learnedWords).toBe(31);
  });

  it("infers review intent from message when intent is auto", async () => {
    getWordsProgressSummary.mockResolvedValueOnce(mockSummary({ dueToday: 1, hasDueReview: true }));
    const tool = getAllTools({ userId: "user-d" }).find((item) => item.name === "recommend_words_action");
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({ intent: "auto", userMessage: "我想复习英语" });
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.intent).toBe("review");
    expect(result.route).toBe("/words/review");
  });
});

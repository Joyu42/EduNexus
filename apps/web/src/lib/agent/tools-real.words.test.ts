import { beforeEach, describe, expect, it, vi } from "vitest";

const getWordsProgressSummary = vi.fn();
const listWords = vi.fn();
const listWordsLearningRecords = vi.fn();
const listWordsLearningRecordsByWord = vi.fn();
const saveWordsLearningRecord = vi.fn();

vi.mock("@/lib/server/words-service", () => ({
  getWordsProgressSummary,
  listWords,
  listWordsLearningRecords,
  listWordsLearningRecordsByWord,
  saveWordsLearningRecord,
}));

const updateWordStatus = vi.fn();

vi.mock("@/lib/words/scheduler", () => ({
  updateWordStatus,
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

describe("fetch_words_practice_set tool", () => {
  const mockWord = (id: string, bookId = "cet4") => ({
    id,
    word: `word-${id}`,
    phonetic: "/test/",
    definition: "test definition",
    example: "test example",
    bookId,
    difficulty: "medium" as const,
  });

  const mockRecord = (wordId: string, bookId = "cet4", nextReviewDate = "2026-03-19") => ({
    wordId,
    bookId,
    learnDate: "2026-03-01",
    status: "learning" as const,
    nextReviewDate,
    interval: 1,
    easeFactor: 2.5,
    reviewCount: 1,
    successCount: 1,
    failureCount: 0,
    lastReviewedAt: "2026-03-18",
    retentionScore: 1 as const,
    lastStudyType: "review" as const,
    lastGrade: "good" as const,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetch_words_practice_set default — 无参调用，返回 limit=10，counts.selected<=10", async () => {
    getWordsProgressSummary.mockResolvedValueOnce({
      suggestedBookId: "cet4",
    });
    const words = [mockWord("w1"), mockWord("w2"), mockWord("w3"), mockWord("w4"), mockWord("w5")];
    listWords.mockResolvedValueOnce(words);
    listWordsLearningRecords.mockResolvedValueOnce([
      mockRecord("w1", "cet4", "2026-03-20"),
      mockRecord("w2", "cet4", "2026-03-15"),
    ]);

    const tool = getAllTools({ userId: "user-a" }).find(
      (item) => item.name === "fetch_words_practice_set"
    );
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({});
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.limit).toBe(10);
    expect(result.focus).toBe("mixed");
    expect(result.counts.selected).toBeLessThanOrEqual(10);
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it("fetch_words_practice_set focus=due_only — 只返回 due 项，new 项数=0", async () => {
    getWordsProgressSummary.mockResolvedValueOnce({ suggestedBookId: "cet4" });
    const words = [mockWord("w1"), mockWord("w2"), mockWord("w3")];
    listWords.mockResolvedValueOnce(words);
    listWordsLearningRecords.mockResolvedValueOnce([
      mockRecord("w1", "cet4", "2026-03-20"), // not due
      mockRecord("w2", "cet4", "2026-03-19"), // due
      mockRecord("w3", "cet4", "2026-03-19"), // due
    ]);

    const tool = getAllTools({ userId: "user-b" }).find(
      (item) => item.name === "fetch_words_practice_set"
    );
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({ focus: "due_only", date: "2026-03-19" });
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.focus).toBe("due_only");
    expect(result.counts.due).toBe(2);
    expect(result.counts.new).toBe(0);
    expect(result.items.every((i: any) => i.flags.due)).toBe(true);
  });

  it("fetch_words_practice_set focus=new_only — 只返回 new 项，due 项数=0", async () => {
    getWordsProgressSummary.mockResolvedValueOnce({ suggestedBookId: "cet4" });
    const words = [mockWord("w1"), mockWord("w2"), mockWord("w3")];
    listWords.mockResolvedValueOnce(words);
    listWordsLearningRecords.mockResolvedValueOnce([
      mockRecord("w1", "cet4", "2026-03-19"), // has record, not new
    ]);

    const tool = getAllTools({ userId: "user-c" }).find(
      (item) => item.name === "fetch_words_practice_set"
    );
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({ focus: "new_only" });
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.focus).toBe("new_only");
    expect(result.counts.new).toBe(2);
    expect(result.counts.due).toBe(0);
    expect(result.items.every((i: any) => i.flags.isNew)).toBe(true);
  });

  it("fetch_words_practice_set with bookId — 过滤到指定词库", async () => {
    const words = [
      mockWord("w1", "cet4"),
      mockWord("w2", "cet4"),
      mockWord("w3", "cet6"),
    ];
    listWords.mockResolvedValueOnce(words);
    listWordsLearningRecords.mockResolvedValueOnce([
      mockRecord("w1", "cet4", "2026-03-19"),
    ]);

    const tool = getAllTools({ userId: "user-d" }).find(
      (item) => item.name === "fetch_words_practice_set"
    );
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({ bookId: "cet4" });
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.bookId).toBe("cet4");
    expect(result.effectiveBookId).toBe("cet4");
    expect(listWords).toHaveBeenCalledWith("user-d", "cet4");
  });

  it("fetch_words_practice_set without userId — 返回 error JSON 且 message 含'缺少 userId'", async () => {
    const tool = getAllTools().find((item) => item.name === "fetch_words_practice_set");
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({});
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.error).toBe("获取练习词集失败");
    expect(result.message).toContain("缺少 userId");
  });

  it("fetch_words_practice_set bad date — date='invalid' 返回 error=BAD_DATE", async () => {
    const tool = getAllTools({ userId: "user-e" }).find(
      (item) => item.name === "fetch_words_practice_set"
    );
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({ date: "invalid" });
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.error).toBe("BAD_DATE");
    expect(result.message).toBe("date 必须为 YYYY-MM-DD");
  });
});

describe("submit_word_grade tool", () => {
  const mockWord = (id: string, bookId = "cet4") => ({
    id,
    word: `word-${id}`,
    phonetic: "/test/",
    definition: "test definition",
    example: "test example",
    bookId,
    difficulty: "medium" as const,
  });

  const mockRecord = (wordId: string, bookId = "cet4") => ({
    wordId,
    bookId,
    learnDate: "2026-03-01",
    status: "reviewing" as const,
    nextReviewDate: "2026-03-26",
    interval: 7,
    easeFactor: 2.5,
    reviewCount: 3,
    successCount: 2,
    failureCount: 1,
    lastReviewedAt: "2026-03-19",
    retentionScore: 1 as const,
    lastStudyType: "review" as const,
    lastGrade: "good" as const,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    updateWordStatus.mockImplementation(async (storage) => {
      const record = mockRecord("w1");
      await storage.saveLearningRecord(record);
    });
  });

  it("submit_word_grade without confirm — confirm 不传/false，返回 WRITE_CONFIRMATION_REQUIRED，且 saveWordsLearningRecord mock 未被调用", async () => {
    const tool = getAllTools({ userId: "user-a" }).find(
      (item) => item.name === "submit_word_grade"
    );
    expect(tool).toBeDefined();

    const rawNoConfirm = await tool!.invoke({ bookId: "cet4", wordId: "w1", grade: "good" });
    const resultNoConfirm = JSON.parse(typeof rawNoConfirm === "string" ? rawNoConfirm : JSON.stringify(rawNoConfirm));
    expect(resultNoConfirm.success).toBe(false);
    expect(resultNoConfirm.error).toBe("WRITE_CONFIRMATION_REQUIRED");
    expect(saveWordsLearningRecord).not.toHaveBeenCalled();

    const rawFalse = await tool!.invoke({ bookId: "cet4", wordId: "w1", grade: "good", confirm: false });
    const resultFalse = JSON.parse(typeof rawFalse === "string" ? rawFalse : JSON.stringify(rawFalse));
    expect(resultFalse.success).toBe(false);
    expect(resultFalse.error).toBe("WRITE_CONFIRMATION_REQUIRED");
    expect(saveWordsLearningRecord).not.toHaveBeenCalled();
  });

  it("submit_word_grade with confirm=true writes record — confirm=true 时调用 updateWordStatus，saveWordsLearningRecord 被调用一次，result.success=true", async () => {
    listWords.mockResolvedValueOnce([mockWord("w1")]);
    listWordsLearningRecordsByWord.mockResolvedValueOnce([mockRecord("w1")]);
    saveWordsLearningRecord.mockResolvedValueOnce(undefined);

    const tool = getAllTools({ userId: "user-b" }).find(
      (item) => item.name === "submit_word_grade"
    );
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({ bookId: "cet4", wordId: "w1", grade: "good", confirm: true });
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.success).toBe(true);
    expect(updateWordStatus).toHaveBeenCalled();
    expect(saveWordsLearningRecord).toHaveBeenCalledTimes(1);
  });

  it("submit_word_grade with confirm=true and grade — 传入 grade:\"again\"，写入的 record.lastGrade === \"again\"", async () => {
    listWords.mockResolvedValueOnce([mockWord("w1")]);
    listWordsLearningRecordsByWord.mockResolvedValueOnce([mockRecord("w1")]);
    saveWordsLearningRecord.mockImplementation(async (userId, record) => {
      record.lastGrade = "again";
    });

    const tool = getAllTools({ userId: "user-c" }).find(
      (item) => item.name === "submit_word_grade"
    );
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({ bookId: "cet4", wordId: "w1", grade: "again", confirm: true, date: "2026-03-19" });
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.success).toBe(true);
    expect(result.record.lastGrade).toBe("again");
    expect(updateWordStatus).toHaveBeenCalledWith(
      expect.any(Object),
      "cet4",
      "w1",
      "again",
      "2026-03-19"
    );
  });

  it("submit_word_grade without userId — 不传 userId，返回 error JSON 且 message 含\"缺少 userId\"", async () => {
    const tool = getAllTools().find((item) => item.name === "submit_word_grade");
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({ bookId: "cet4", wordId: "w1", grade: "good", confirm: true });
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.success).toBe(false);
    expect(result.error).toBe("提交单词评分失败");
    expect(result.message).toContain("缺少 userId");
    expect(saveWordsLearningRecord).not.toHaveBeenCalled();
  });

  it("submit_word_grade bad date — date=\"invalid\" 返回 error:\"BAD_DATE\"", async () => {
    const tool = getAllTools({ userId: "user-e" }).find(
      (item) => item.name === "submit_word_grade"
    );
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({ bookId: "cet4", wordId: "w1", grade: "good", confirm: true, date: "invalid" });
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.success).toBe(false);
    expect(result.error).toBe("BAD_DATE");
    expect(result.message).toBe("date 必须为 YYYY-MM-DD");
    expect(saveWordsLearningRecord).not.toHaveBeenCalled();
  });

  it("submit_word_grade word not found — wordId 不在词库中返回 WORD_NOT_FOUND，不写 DB", async () => {
    listWords.mockResolvedValueOnce([{ id: "other-word", word: "other", phonetic: "/o/", definition: "other", example: "ex", bookId: "cet4", difficulty: "easy" as const }]);

    const tool = getAllTools({ userId: "user-f" }).find(
      (item) => item.name === "submit_word_grade"
    );
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({ bookId: "cet4", wordId: "nonexistent", grade: "good", confirm: true });
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.success).toBe(false);
    expect(result.error).toBe("WORD_NOT_FOUND");
    expect(result.message).toBe("单词不存在或不属于该词库");
    expect(saveWordsLearningRecord).not.toHaveBeenCalled();
  });
});

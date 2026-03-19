import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const listWordsLearningRecords = vi.fn();
const listWordsLearningRecordsByWord = vi.fn();
const saveWordsLearningRecord = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId,
}));

vi.mock("@/lib/server/words-service", () => ({
  listWordsLearningRecords,
  listWordsLearningRecordsByWord,
  saveWordsLearningRecord,
}));

const { GET, PUT } = await import("./route");

describe("words records api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    getCurrentUserId.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/words/records"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("passes user scope when listing records", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");
    listWordsLearningRecords.mockResolvedValueOnce([]);

    const response = await GET(new Request("http://localhost/api/words/records"));

    expect(response.status).toBe(200);
    expect(listWordsLearningRecords).toHaveBeenCalledWith("user_a");
  });

  it("passes user scope when saving records", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_b");

    const payload = {
      wordId: "w1",
      bookId: "cet4",
      learnDate: "2026-03-19",
      status: "learning",
      nextReviewDate: "2026-03-20",
      interval: 1,
      easeFactor: 2.5,
      reviewCount: 1,
      successCount: 0,
      failureCount: 1,
      lastReviewedAt: "2026-03-19",
      retentionScore: 0,
      lastStudyType: "learn",
      lastGrade: "again",
    } as const;

    const response = await PUT(
      new Request("http://localhost/api/words/records", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    );

    expect(response.status).toBe(200);
    expect(saveWordsLearningRecord).toHaveBeenCalledWith("user_b", payload);
  });
});

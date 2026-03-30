import { describe, expect, it, vi } from "vitest";

const getCurrentUserIdMock = vi.fn();
const getActivePackMock = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId: getCurrentUserIdMock,
}));

vi.mock("@/lib/server/learning-pack-store", () => ({
  getActivePack: getActivePackMock,
}));

const { GET } = await import("./route");

describe("GET /api/graph/learning-pack/active", () => {
  it("returns 401 when not authenticated", async () => {
    getCurrentUserIdMock.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns null when there is no active pack", async () => {
    getCurrentUserIdMock.mockResolvedValueOnce("u1");
    getActivePackMock.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pack).toBe(null);
  });

  it("returns the active pack summary with current module details", async () => {
    getCurrentUserIdMock.mockResolvedValueOnce("u1");
    getActivePackMock.mockResolvedValueOnce({
      packId: "lp_java_1",
      userId: "u1",
      title: "Java 学习路线图",
      topic: "java",
      stage: "applied",
      totalStudyMinutes: 45,
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
      activeModuleId: "m2",
      modules: [
        { moduleId: "m1", title: "Java 基础", kbDocumentId: "doc1", stage: "seen", order: 0, studyMinutes: 15, lastStudiedAt: null },
        { moduleId: "m2", title: "Java 进阶", kbDocumentId: "doc2", stage: "applied", order: 1, studyMinutes: 30, lastStudiedAt: null },
      ],
    });

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pack).toMatchObject({
      packId: "lp_java_1",
      title: "Java 学习路线图",
      topic: "java",
      stage: "applied",
      moduleCount: 2,
    });
    expect(body.pack.currentModule).toMatchObject({
      moduleId: "m2",
      title: "Java 进阶",
      kbDocumentId: "doc2",
      stage: "applied",
      order: 1,
    });
  });
});

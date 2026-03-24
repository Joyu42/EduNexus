import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mockPacks = [
  {
    packId: "lp_java_1",
    userId: "u1",
    title: "Java 学习路线图",
    topic: "java",
    stage: "seen",
    modules: [
      { moduleId: "m1", title: "Java 基础", kbDocumentId: "doc1", stage: "seen" as const, order: 0, studyMinutes: 30, lastStudiedAt: null },
      { moduleId: "m2", title: "Java 进阶", kbDocumentId: "", stage: "seen" as const, order: 1, studyMinutes: 0, lastStudiedAt: null },
    ],
    activeModuleId: "m1",
    totalStudyMinutes: 30,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-02T00:00:00.000Z",
  },
  {
    packId: "lp_python_1",
    userId: "u1",
    title: "Python 学习路线图",
    topic: "python",
    stage: "seen",
    modules: [
      { moduleId: "pm1", title: "Python 基础", kbDocumentId: "", stage: "seen" as const, order: 0, studyMinutes: 0, lastStudiedAt: null },
    ],
    activeModuleId: "pm1",
    totalStudyMinutes: 0,
    createdAt: "2025-01-03T00:00:00.000Z",
    updatedAt: "2025-01-03T00:00:00.000Z",
  },
];

const getCurrentUserIdMock = vi.hoisted(() => vi.fn());
const getPacksByUserMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId: getCurrentUserIdMock,
}));

vi.mock("@/lib/server/learning-pack-store", () => ({
  getPacksByUser: getPacksByUserMock,
}));

describe("GET /api/graph/learning-pack/list", () => {
  it("returns 401 when not authenticated", async () => {
    getCurrentUserIdMock.mockResolvedValueOnce(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns packs sorted newest-first for authenticated user", async () => {
    getCurrentUserIdMock.mockResolvedValueOnce("u1");
    getPacksByUserMock.mockResolvedValueOnce([mockPacks[1], mockPacks[0]]);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.packs).toHaveLength(2);
    expect(body.packs[0].packId).toBe("lp_python_1");
    expect(body.packs[1].packId).toBe("lp_java_1");
  });

  it("includes correct metadata for each pack", async () => {
    getCurrentUserIdMock.mockResolvedValueOnce("u1");
    getPacksByUserMock.mockResolvedValueOnce([mockPacks[0]]);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.packs[0]).toMatchObject({
      packId: "lp_java_1",
      title: "Java 学习路线图",
      topic: "java",
      stage: "seen",
      moduleCount: 2,
      totalStudyMinutes: 30,
    });
    expect(body.packs[0].currentModule).toMatchObject({
      moduleId: "m1",
      title: "Java 基础",
      kbDocumentId: "doc1",
    });
  });

  it("returns empty array when user has no packs", async () => {
    getCurrentUserIdMock.mockResolvedValueOnce("u1");
    getPacksByUserMock.mockResolvedValueOnce([]);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.packs).toEqual([]);
  });
});

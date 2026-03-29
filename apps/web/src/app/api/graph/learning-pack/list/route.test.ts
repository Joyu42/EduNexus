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
const getActivePackMock = vi.hoisted(() => vi.fn());
const pruneStaleLearningPacksMock = vi.hoisted(() => vi.fn());
const listDocumentsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId: getCurrentUserIdMock,
}));

vi.mock("@/lib/server/learning-pack-store", () => ({
  getPacksByUser: getPacksByUserMock,
  getActivePack: getActivePackMock,
  pruneStaleLearningPacks: pruneStaleLearningPacksMock,
}));

vi.mock("@/lib/server/document-service", () => ({
  listDocuments: listDocumentsMock,
}));

describe("GET /api/graph/learning-pack/list", () => {
  it("returns 401 when not authenticated", async () => {
    getCurrentUserIdMock.mockResolvedValueOnce(null);
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns active pack first for authenticated user", async () => {
    getCurrentUserIdMock.mockResolvedValueOnce("u1");
    listDocumentsMock.mockResolvedValueOnce([{ id: "doc1" }]);
    pruneStaleLearningPacksMock.mockResolvedValueOnce({ updatedPackIds: [], removedPackIds: [] });
    getActivePackMock.mockResolvedValueOnce(mockPacks[0]);
    getPacksByUserMock.mockResolvedValueOnce([mockPacks[1], mockPacks[0]]);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.packs).toHaveLength(2);
    expect(body.packs[0].packId).toBe("lp_java_1");
    expect(body.packs[0].active).toBe(true);
    expect(body.packs[1].packId).toBe("lp_python_1");
    expect(body.packs[1].active).toBe(false);
  });

  it("includes correct metadata for each pack", async () => {
    getCurrentUserIdMock.mockResolvedValueOnce("u1");
    listDocumentsMock.mockResolvedValueOnce([{ id: "doc1" }]);
    pruneStaleLearningPacksMock.mockResolvedValueOnce({ updatedPackIds: [], removedPackIds: [] });
    getActivePackMock.mockResolvedValueOnce(mockPacks[0]);
    getPacksByUserMock.mockResolvedValueOnce([mockPacks[0]]);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.packs[0]).toMatchObject({
      packId: "lp_java_1",
      title: "Java 学习路线图",
      topic: "java",
      stage: "seen",
      active: true,
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
    listDocumentsMock.mockResolvedValueOnce([{ id: "doc1" }]);
    pruneStaleLearningPacksMock.mockResolvedValueOnce({ updatedPackIds: [], removedPackIds: [] });
    getActivePackMock.mockResolvedValueOnce(null);
    getPacksByUserMock.mockResolvedValueOnce([]);
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.packs).toEqual([]);
  });

  it("prunes stale packs before returning summaries", async () => {
    getCurrentUserIdMock.mockResolvedValueOnce("u1");
    listDocumentsMock.mockResolvedValueOnce([{ id: "doc1" }, { id: "doc2" }]);
    pruneStaleLearningPacksMock.mockResolvedValueOnce({
      updatedPackIds: ["lp_java_1"],
      removedPackIds: ["lp_stale_1"],
    });
    getActivePackMock.mockResolvedValueOnce(mockPacks[0]);
    getPacksByUserMock.mockResolvedValueOnce([mockPacks[0]]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(pruneStaleLearningPacksMock).toHaveBeenCalledTimes(1);
    const [userId, validDocIds] = pruneStaleLearningPacksMock.mock.calls[0] as [string, Set<string>];
    expect(userId).toBe("u1");
    expect(validDocIds instanceof Set).toBe(true);
    expect(Array.from(validDocIds)).toEqual(["doc1", "doc2"]);
  });

  it("keeps current module bindings consistent with pack order", async () => {
    getCurrentUserIdMock.mockResolvedValueOnce("u1");
    listDocumentsMock.mockResolvedValueOnce([{ id: "doc1" }, { id: "doc2" }]);
    pruneStaleLearningPacksMock.mockResolvedValueOnce({ updatedPackIds: [], removedPackIds: [] });
    getActivePackMock.mockResolvedValueOnce(mockPacks[0]);
    getPacksByUserMock.mockResolvedValueOnce([
      {
        ...mockPacks[0],
        modules: [
          { moduleId: "m2", title: "Java 进阶", kbDocumentId: "doc2", stage: "seen" as const, order: 1, studyMinutes: 0, lastStudiedAt: null },
          { moduleId: "m1", title: "Java 基础", kbDocumentId: "doc1", stage: "seen" as const, order: 0, studyMinutes: 30, lastStudiedAt: null },
        ],
        currentModule: undefined,
      } as never,
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.packs[0].currentModule).toMatchObject({
      moduleId: "m1",
      kbDocumentId: "doc1",
    });
  });

  it("still returns pack summaries when pruning step fails", async () => {
    getCurrentUserIdMock.mockResolvedValueOnce("u1");
    listDocumentsMock.mockRejectedValueOnce(new Error("list failed"));
    pruneStaleLearningPacksMock.mockRejectedValueOnce(new Error("prune failed"));
    getActivePackMock.mockResolvedValueOnce(mockPacks[0]);
    getPacksByUserMock.mockResolvedValueOnce([mockPacks[0]]);

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.packs).toHaveLength(1);
    expect(body.packs[0].packId).toBe("lp_java_1");
  });
});

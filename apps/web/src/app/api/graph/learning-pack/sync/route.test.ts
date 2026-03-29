import { describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const getAllPacksMock = vi.hoisted(() => vi.fn());
const putAllPacksMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/server/learning-pack-store", () => ({
  getAllPacks: getAllPacksMock,
  putAllPacks: putAllPacksMock,
}));

const { POST } = await import("./route");

describe("POST /api/graph/learning-pack/sync", () => {
  it("rejects conflicting final bindings without writing partial state", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    getAllPacksMock.mockResolvedValueOnce([
      {
        packId: "pack-1",
        userId: "user-1",
        title: "Pack",
        topic: "topic",
        stage: "seen",
        modules: [
          { moduleId: "m1", title: "One", kbDocumentId: "", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
          { moduleId: "m2", title: "Two", kbDocumentId: "", stage: "seen", order: 1, studyMinutes: 0, lastStudiedAt: null },
        ],
        activeModuleId: "m1",
        totalStudyMinutes: 0,
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:00:00.000Z",
      },
    ]);

    const request = new Request("http://localhost/api/graph/learning-pack/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        packId: "pack-1",
        tasks: [
          { taskId: "m1", documentBinding: { documentId: "doc-1" } },
          { taskId: "m2", documentBinding: { documentId: "doc-1" } },
        ],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(putAllPacksMock).not.toHaveBeenCalled();
  });

  it("persists all module binding and order changes in a single write", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    getAllPacksMock.mockResolvedValueOnce([
      {
        packId: "pack-1",
        userId: "user-1",
        title: "Pack",
        topic: "topic",
        stage: "seen",
        modules: [
          { moduleId: "m1", title: "One", kbDocumentId: "", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
          { moduleId: "m2", title: "Two", kbDocumentId: "doc-2", stage: "seen", order: 1, studyMinutes: 0, lastStudiedAt: null },
          { moduleId: "m3", title: "Three", kbDocumentId: "", stage: "seen", order: 2, studyMinutes: 0, lastStudiedAt: null },
        ],
        activeModuleId: "m1",
        totalStudyMinutes: 0,
        createdAt: "2026-03-24T00:00:00.000Z",
        updatedAt: "2026-03-24T00:00:00.000Z",
      },
    ]);

    const request = new Request("http://localhost/api/graph/learning-pack/sync", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        packId: "pack-1",
        tasks: [
          { taskId: "m2", documentBinding: { documentId: "doc-1" } },
          { taskId: "m1", documentBinding: null },
        ],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(putAllPacksMock).toHaveBeenCalledTimes(1);
    expect(getAllPacksMock).toHaveBeenCalledTimes(1);
  });
});

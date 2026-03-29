import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const updatePackTitleTopicMock = vi.hoisted(() => vi.fn());
const deleteLearningPackMock = vi.hoisted(() => vi.fn());

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/server/learning-pack-store", () => ({
  updatePackTitleTopic: updatePackTitleTopicMock,
  deleteLearningPack: deleteLearningPackMock,
}));

const { PATCH, DELETE } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/graph/learning-pack/[packId]", () => {
  it("updates title and topic atomically for the authenticated user", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    updatePackTitleTopicMock.mockResolvedValueOnce(undefined);

    const request = new Request("http://localhost/api/graph/learning-pack/pack-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "New Title", topic: "new-topic" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ packId: "pack-1" }) });

    expect(response.status).toBe(200);
    expect(updatePackTitleTopicMock).toHaveBeenCalledTimes(1);
    expect(updatePackTitleTopicMock).toHaveBeenCalledWith("pack-1", "user-1", {
      title: "New Title",
      topic: "new-topic",
    });
    expect(deleteLearningPackMock).not.toHaveBeenCalled();
  });

  it("returns 401 if not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/graph/learning-pack/pack-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "New Title", topic: "new-topic" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ packId: "pack-1" }) });

    expect(response.status).toBe(401);
    expect(updatePackTitleTopicMock).not.toHaveBeenCalled();
    expect(deleteLearningPackMock).not.toHaveBeenCalled();
  });

  it("returns 404 if pack doesn't exist", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    updatePackTitleTopicMock.mockRejectedValueOnce(new Error("Pack not found"));

    const request = new Request("http://localhost/api/graph/learning-pack/missing", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "New Title", topic: "new-topic" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ packId: "missing" }) });

    expect(response.status).toBe(404);
    expect(updatePackTitleTopicMock).toHaveBeenCalledTimes(1);
  });

  it("returns 404 if pack belongs to a different user", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    updatePackTitleTopicMock.mockRejectedValueOnce(new Error("Pack not found"));

    const request = new Request("http://localhost/api/graph/learning-pack/pack-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "New Title", topic: "new-topic" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ packId: "pack-1" }) });

    expect(response.status).toBe(404);
    expect(updatePackTitleTopicMock).toHaveBeenCalledTimes(1);
  });
});

describe("DELETE /api/graph/learning-pack/[packId]", () => {
  it("permanently removes the pack without modifying bound docs", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    deleteLearningPackMock.mockResolvedValueOnce(undefined);

    const request = new Request("http://localhost/api/graph/learning-pack/pack-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ packId: "pack-1" }) });

    expect(response.status).toBe(200);
    expect(deleteLearningPackMock).toHaveBeenCalledTimes(1);
    expect(deleteLearningPackMock).toHaveBeenCalledWith("pack-1", "user-1");
    expect(updatePackTitleTopicMock).not.toHaveBeenCalled();
  });

  it("returns 401 if not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);

    const request = new Request("http://localhost/api/graph/learning-pack/pack-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ packId: "pack-1" }) });

    expect(response.status).toBe(401);
    expect(updatePackTitleTopicMock).not.toHaveBeenCalled();
    expect(deleteLearningPackMock).not.toHaveBeenCalled();
  });

  it("returns 404 if pack doesn't exist", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    deleteLearningPackMock.mockRejectedValueOnce(new Error("Pack not found"));

    const request = new Request("http://localhost/api/graph/learning-pack/missing", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ packId: "missing" }) });

    expect(response.status).toBe(404);
    expect(deleteLearningPackMock).toHaveBeenCalledTimes(1);
  });

  it("returns 404 if pack belongs to a different user", async () => {
    authMock.mockResolvedValueOnce({ user: { id: "user-1" } });
    deleteLearningPackMock.mockRejectedValueOnce(new Error("Pack not found"));

    const request = new Request("http://localhost/api/graph/learning-pack/pack-1", {
      method: "DELETE",
    });

    const response = await DELETE(request, { params: Promise.resolve({ packId: "pack-1" }) });

    expect(response.status).toBe(404);
    expect(deleteLearningPackMock).toHaveBeenCalledTimes(1);
  });
});

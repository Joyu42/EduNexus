import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const getDocument = vi.fn();
const updateDocument = vi.fn();
const deleteDocument = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId,
}));

vi.mock("@/lib/server/document-service", () => ({
  getDocument,
  updateDocument,
  deleteDocument,
}));

const { GET, PUT, DELETE } = await import("./route");

describe("kb doc [id] api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("session-user");
  });

  it("returns 401 for unauthenticated update", async () => {
    getCurrentUserId.mockResolvedValueOnce(null);

    const response = await PUT(
      new Request("http://localhost/api/kb/doc/doc_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "A", content: "B" }),
      }),
      { params: Promise.resolve({ id: "doc_1" }) }
    );

    expect(response.status).toBe(401);
    expect(updateDocument).not.toHaveBeenCalled();
  });

  it("updates document successfully", async () => {
    getDocument.mockResolvedValueOnce({
      id: "doc_1",
      title: "Updated",
      content: "Content",
      authorId: "session-user",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    updateDocument.mockResolvedValueOnce({
      id: "doc_1",
      title: "Updated",
      content: "Content",
      authorId: "session-user",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    const response = await PUT(
      new Request("http://localhost/api/kb/doc/doc_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated", content: "Content" }),
      }),
      { params: Promise.resolve({ id: "doc_1" }) }
    );

    expect(response.status).toBe(200);
    expect(updateDocument).toHaveBeenCalledWith(
      "doc_1",
      { title: "Updated", content: "Content" },
      "session-user"
    );
    await expect(response.json()).resolves.toMatchObject({
      data: {
        id: "doc_1",
        title: "Updated",
        content: "Content",
      },
    });
  });

  it("updates document when request contains partial fields", async () => {
    getDocument.mockResolvedValueOnce({
      id: "doc_1",
      title: "Original",
      content: "Original content",
      authorId: "session-user",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    updateDocument.mockResolvedValueOnce({
      id: "doc_1",
      title: "New title",
      content: "Original content",
      authorId: "session-user",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-03T00:00:00.000Z"),
    });

    const response = await PUT(
      new Request("http://localhost/api/kb/doc/doc_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "New title" }),
      }),
      { params: Promise.resolve({ id: "doc_1" }) }
    );

    expect(response.status).toBe(200);
    expect(getDocument).toHaveBeenCalledWith("doc_1", "session-user");
    expect(updateDocument).toHaveBeenCalledWith(
      "doc_1",
      { title: "New title", content: "Original content" },
      "session-user"
    );
  });

  it("returns 404 when deleting missing document", async () => {
    deleteDocument.mockResolvedValueOnce(false);

    const response = await DELETE(new Request("http://localhost/api/kb/doc/doc_404"), {
      params: Promise.resolve({ id: "doc_404" }),
    });

    expect(response.status).toBe(404);
  });

  it("deletes document successfully", async () => {
    deleteDocument.mockResolvedValueOnce(true);

    const response = await DELETE(new Request("http://localhost/api/kb/doc/doc_1"), {
      params: Promise.resolve({ id: "doc_1" }),
    });

    expect(response.status).toBe(200);
    expect(deleteDocument).toHaveBeenCalledWith("doc_1", "session-user");
    await expect(response.json()).resolves.toMatchObject({
      data: { deleted: true },
    });
  });

  it("keeps get behavior unchanged", async () => {
    getDocument.mockResolvedValueOnce({
      id: "doc_1",
      title: "T",
      content: "C",
      authorId: "session-user",
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    });

    const response = await GET(new Request("http://localhost/api/kb/doc/doc_1"), {
      params: Promise.resolve({ id: "doc_1" }),
    });

    expect(response.status).toBe(200);
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";

const getCurrentUserId = vi.fn();
const createDocument = vi.fn();
const getDocument = vi.fn();
const loadDb = vi.fn();
const saveDb = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId,
}));

vi.mock("@/lib/server/document-service", () => ({
  createDocument,
  getDocument,
}));

vi.mock("@/lib/server/store", () => ({
  loadDb,
  saveDb,
}));

const { POST } = await import("./route");

describe("graph planet route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("user_1");
  });

  it("creates a document-backed planet in non-demo graph mode", async () => {
    createDocument.mockResolvedValueOnce({ id: "doc_java_1" });
    loadDb.mockResolvedValueOnce({ syncedPaths: [] });

    const request = new Request("http://localhost/api/graph/planet", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Java 并发" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data.node).toMatchObject({
      nodeId: "doc_java_1",
      kbDocumentId: "doc_java_1",
      mode: "document",
    });
  });
});

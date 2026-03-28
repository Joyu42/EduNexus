import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const listDocuments = vi.fn();
const createDocument = vi.fn();
const getDocument = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId,
}));

vi.mock("@/lib/server/document-service", () => ({
  listDocuments,
  createDocument,
  getDocument,
}));

const { GET: listDocs, POST: createDoc } = await import("./docs/route");
const { GET: getDocById } = await import("./doc/[id]/route");

describe("kb ownership boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("session-user");
  });

  it("returns 401 for unauthenticated kb document endpoints", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const [listResponse, createResponse, detailResponse] = await Promise.all([
      listDocs(),
      createDoc(
        new Request("http://localhost/api/kb/docs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Blocked", content: "Blocked" }),
        })
      ),
      getDocById(new Request("http://localhost/api/kb/doc/doc-1"), {
        params: Promise.resolve({ id: "doc-1" }),
      }),
    ]);

    expect(listResponse.status).toBe(401);
    expect(createResponse.status).toBe(401);
    expect(detailResponse.status).toBe(401);
    expect(listDocuments).not.toHaveBeenCalled();
    expect(createDocument).not.toHaveBeenCalled();
    expect(getDocument).not.toHaveBeenCalled();
  });

  it("lists documents for the session user only", async () => {
    listDocuments.mockResolvedValue([{ id: "doc-1", authorId: "session-user" }]);

    const response = await listDocs();

    expect(response.status).toBe(200);
    expect(listDocuments).toHaveBeenCalledWith("session-user");
  });

  it("ignores a client-supplied userId when creating a document", async () => {
    createDocument.mockResolvedValue({
      id: "doc-1",
      title: "Owned by session user",
      content: "content",
      authorId: "session-user",
    });

    const response = await createDoc(
      new Request("http://localhost/api/kb/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Owned by session user",
          content: "content",
          userId: "attacker-user",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(createDocument).toHaveBeenCalledWith({
      title: "Owned by session user",
      content: "content",
      authorId: "session-user",
    });
    expect(createDocument).not.toHaveBeenCalledWith(
      expect.objectContaining({ authorId: "attacker-user" })
    );
  });

  it("denies cross-user document access by using the session user in lookup", async () => {
    getDocument.mockResolvedValue(null);

    const response = await getDocById(new Request("http://localhost/api/kb/doc/doc-1"), {
      params: Promise.resolve({ id: "doc-1" }),
    });

    expect(getDocument).toHaveBeenCalledWith("doc-1", "session-user");
    expect(response.status).toBe(404);
  });

  it("adds an ownership index for Document.authorId in Prisma schema", async () => {
    const schemaPath = path.resolve(process.cwd(), "../../prisma/schema.prisma");
    const schema = await readFile(schemaPath, "utf8");

    expect(schema).toContain("@@index([authorId])");
  });
});

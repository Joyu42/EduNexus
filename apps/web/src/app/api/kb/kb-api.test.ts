import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const searchDocuments = vi.fn();
const listDocuments = vi.fn();
const createDocument = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId,
}));

vi.mock("@/lib/server/document-service", () => ({
  searchDocuments,
  getDocument: vi.fn(),
  listDocuments,
  createDocument,
}));

const { GET: searchKb } = await import("./search/route");
const { GET: getTags } = await import("./tags/route");
const { GET: getBacklinkGraph } = await import("./backlinks/graph/route");
const { POST: rebuildIndex } = await import("./index/rebuild/route");
const { GET: listDocs, POST: createDoc } = await import("./docs/route");

describe("kb api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("session-user");
    searchDocuments.mockResolvedValue([
      {
        docId: "note_seq",
        snippet: "先判断是等差还是等比，再代入对应公式。"
      }
    ]);
  });

  it("returns 401 for unauthenticated kb search and summary endpoints", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const [searchRes, tagsRes, graphRes, rebuildRes, docsListRes, docsCreateRes] =
      await Promise.all([
        searchKb(new Request("http://localhost/api/kb/search?q=数列")),
        getTags(),
        getBacklinkGraph(
          new Request("http://localhost/api/kb/backlinks/graph?focusDocId=source_ch5")
        ),
        rebuildIndex(),
        listDocs(),
        createDoc(
          new Request("http://localhost/api/kb/docs", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: "t", content: "c" })
          })
        )
      ]);

    expect(searchRes.status).toBe(401);
    expect(tagsRes.status).toBe(401);
    expect(graphRes.status).toBe(401);
    expect(rebuildRes.status).toBe(401);
    expect(docsListRes.status).toBe(401);
    expect(docsCreateRes.status).toBe(401);
    expect(searchDocuments).not.toHaveBeenCalled();
  });

  it("returns authenticated kb search results and reduced summaries", async () => {
    const searchRes = await searchKb(
      new Request("http://localhost/api/kb/search?q=数列&limit=1")
    );
    expect(searchRes.status).toBe(200);
    const searchJson = (await searchRes.json()) as {
      data: { candidates: Array<{ docId: string; snippet: string }> };
    };
    expect(searchDocuments).toHaveBeenCalledWith("数列", "session-user");
    expect(searchJson.data.candidates).toEqual([
      {
        docId: "note_seq",
        score: 1,
        snippet: "先判断是等差还是等比，再代入对应公式。"
      }
    ]);

    const tagsRes = await getTags();
    expect(tagsRes.status).toBe(200);
    await expect(tagsRes.json()).resolves.toMatchObject({
      data: { tags: [] }
    });

    const graphRes = await getBacklinkGraph(
      new Request("http://localhost/api/kb/backlinks/graph?focusDocId=source_ch5")
    );
    expect(graphRes.status).toBe(200);
    await expect(graphRes.json()).resolves.toMatchObject({
      data: { nodes: [], edges: [] }
    });

    const rebuildRes = await rebuildIndex();
    expect(rebuildRes.status).toBe(200);
    await expect(rebuildRes.json()).resolves.toMatchObject({
      data: { message: "索引重建任务已启动（空操作）。" }
    });
  });

  it("returns 500 KB_LIST_FAILED when listDocuments throws", async () => {
    getCurrentUserId.mockResolvedValue("session-user");
    listDocuments.mockRejectedValue(new Error("Database error"));

    const listRes = await listDocs();
    expect(listRes.status).toBe(500);
    const listJson = await listRes.json();
    expect(listJson.success).toBe(false);
    expect(listJson.error.code).toBe("KB_LIST_FAILED");
    expect(listJson.error.message).toBe("获取文档列表失败。");
  });

  it("creates and lists documents with tags", async () => {
    const now = new Date("2026-03-27T00:00:00.000Z");
    createDocument.mockResolvedValue({
      id: "doc_1",
      title: "My Doc",
      content: "Hello",
      tags: ["math", "algebra"],
      authorId: "session-user",
      createdAt: now,
      updatedAt: now
    });
    listDocuments.mockResolvedValue([
      {
        id: "doc_1",
        title: "My Doc",
        content: "Hello",
        tags: ["math", "algebra"],
        authorId: "session-user",
        createdAt: now,
        updatedAt: now
      }
    ]);

    const createRes = await createDoc(
      new Request("http://localhost/api/kb/docs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "My Doc",
          content: "Hello",
          tags: ["math", "algebra"]
        })
      })
    );
    expect(createRes.status).toBe(200);
    const createJson = (await createRes.json()) as {
      data: { document: { tags: string[] } };
    };
    expect(createDocument).toHaveBeenCalledWith({
      title: "My Doc",
      content: "Hello",
      tags: ["math", "algebra"],
      authorId: "session-user"
    });
    expect(createJson.data.document.tags).toEqual(["math", "algebra"]);

    const listRes = await listDocs();
    expect(listRes.status).toBe(200);
    await expect(listRes.json()).resolves.toMatchObject({
      data: {
        documents: [
          {
            id: "doc_1",
            tags: ["math", "algebra"]
          }
        ]
      }
    });
  });
});

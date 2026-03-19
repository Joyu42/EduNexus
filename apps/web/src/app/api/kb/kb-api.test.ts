import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const searchDocuments = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId,
}));

vi.mock("@/lib/server/document-service", () => ({
  searchDocuments,
  getDocument: vi.fn(),
  listDocuments: vi.fn(),
  createDocument: vi.fn(),
}));

const { GET: searchKb } = await import("./search/route");
const { GET: getTags } = await import("./tags/route");
const { GET: getBacklinkGraph } = await import("./backlinks/graph/route");
const { POST: rebuildIndex } = await import("./index/rebuild/route");

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

    const [searchRes, tagsRes, graphRes, rebuildRes] = await Promise.all([
      searchKb(new Request("http://localhost/api/kb/search?q=数列")),
      getTags(),
      getBacklinkGraph(
        new Request("http://localhost/api/kb/backlinks/graph?focusDocId=source_ch5")
      ),
      rebuildIndex()
    ]);

    expect(searchRes.status).toBe(401);
    expect(tagsRes.status).toBe(401);
    expect(graphRes.status).toBe(401);
    expect(rebuildRes.status).toBe(401);
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
});

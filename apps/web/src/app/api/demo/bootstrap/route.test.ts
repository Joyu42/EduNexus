import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_KB_DOCUMENTS, DEMO_WORKSPACE_SESSIONS } from "@/lib/server/demo-content";

const auth = vi.fn();
const listDocuments = vi.fn();
const createDocument = vi.fn();
const loadDb = vi.fn();
const saveDb = vi.fn();
const seedDemoContentBundle = vi.fn();

vi.mock("@/auth", () => ({
  auth
}));

vi.mock("@/lib/server/document-service", () => ({
  listDocuments,
  createDocument
}));

vi.mock("@/lib/server/store", () => ({
  loadDb,
  saveDb
}));

vi.mock("@/lib/client/demo-seeding", () => ({
  seedDemoContentBundle
}));

const { POST: bootstrapDemo } = await import("./route");

describe("demo bootstrap api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.mockResolvedValue({ user: { id: "demo-user", isDemo: true } });
    loadDb.mockResolvedValue({ sessions: [], plans: [], masteryByNode: {}, syncedPaths: [] });
    listDocuments.mockResolvedValue([]);
    createDocument.mockImplementation(async ({ title, content, authorId }) => ({
      id: `doc-${title}`,
      title,
      content,
      authorId
    }));
    seedDemoContentBundle.mockResolvedValue(undefined);
  });

  it("returns 403 for authenticated non-demo users", async () => {
    auth.mockResolvedValue({ user: { id: "normal-user", isDemo: false } });

    const response = await bootstrapDemo();

    expect(response.status).toBe(403);
    expect(createDocument).not.toHaveBeenCalled();
    expect(saveDb).not.toHaveBeenCalled();
  });

  it("seeds curated demo docs and starter sessions for demo user", async () => {
    const response = await bootstrapDemo();

    expect(response.status).toBe(200);
    expect(listDocuments).toHaveBeenCalledWith("demo-user");
    expect(createDocument).toHaveBeenCalledTimes(DEMO_KB_DOCUMENTS.length);
    expect(createDocument).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ title: DEMO_KB_DOCUMENTS[0]?.title, authorId: "demo-user" })
    );
    expect(createDocument).toHaveBeenNthCalledWith(
      DEMO_KB_DOCUMENTS.length,
      expect.objectContaining({ title: DEMO_KB_DOCUMENTS.at(-1)?.title, authorId: "demo-user" })
    );

    expect(saveDb).toHaveBeenCalledTimes(1);
    const savedDb = saveDb.mock.calls[0][0] as {
      sessions: Array<{ title: string; userId: string }>;
    };
    expect(savedDb.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: DEMO_WORKSPACE_SESSIONS[0]?.title,
          userId: "demo-user"
        }),
        expect.objectContaining({
          title: DEMO_WORKSPACE_SESSIONS[1]?.title,
          userId: "demo-user"
        })
      ])
    );

    const payload = (await response.json()) as {
      data: {
        kb: { documents: Array<{ title: string }> };
        workspace: { sessions: Array<{ title: string }> };
        practice: { banks: Array<{ name: string; questions: Array<{ title: string }> }> };
        graph: { nodes: Array<{ id: string; kbDocumentId?: string; documentIds?: string[] }>; edges: Array<{ id: string }> };
        goals: { items: Array<{ id: string; linkedPathIds: string[] }> };
        paths: { items: Array<{ id: string; title: string }> };
        path: { goal: string };
      };
    };
    expect(payload.data.kb.documents.map((item) => item.title)).toEqual(DEMO_KB_DOCUMENTS.map((item) => item.title));
    expect(payload.data.workspace.sessions.map((item) => item.title)).toEqual(DEMO_WORKSPACE_SESSIONS.map((item) => item.title));
    expect(payload.data.practice.banks).toHaveLength(1);
    expect(payload.data.practice.banks[0]?.name).toBe("前端基础演示题库");
    expect(payload.data.practice.banks[0]?.questions.map((item) => item.title)).toEqual(["语义化标签选择", "Flexbox 主轴对齐"]);
    expect(payload.data.goals.items).toHaveLength(2);
    expect(payload.data.paths.items.length).toBeGreaterThan(1);
    expect(payload.data.graph.nodes.length).toBeGreaterThan(1);
    expect(payload.data.graph.nodes.every((item) => Boolean(item.kbDocumentId))).toBe(true);
    expect(payload.data.graph.nodes.every((item) => Array.isArray(item.documentIds) && item.documentIds.length > 0)).toBe(true);
    expect(payload.data.path.goal).toBe(payload.data.paths.items[0]?.title);
    expect(seedDemoContentBundle).toHaveBeenCalledTimes(1);
  });

  it("is idempotent when demo content already exists", async () => {
    listDocuments.mockResolvedValue(
      DEMO_KB_DOCUMENTS.map((item, index) => ({
        id: `doc-${index}`,
        title: item.title,
        content: item.content,
        authorId: "demo-user"
      }))
    );
    loadDb.mockResolvedValue({
      sessions: [
        {
          id: "ws_demo_frontend_intro",
          title: DEMO_WORKSPACE_SESSIONS[0]?.title,
          userId: "demo-user",
          createdAt: "2026-03-16T00:00:00.000Z",
          updatedAt: "2026-03-16T00:00:00.000Z",
          lastLevel: 1,
          messages: []
        },
        {
          id: "ws_demo_react_intro",
          title: DEMO_WORKSPACE_SESSIONS[1]?.title,
          userId: "demo-user",
          createdAt: "2026-03-16T00:00:00.000Z",
          updatedAt: "2026-03-16T00:00:00.000Z",
          lastLevel: 1,
          messages: []
        }
      ],
      plans: [],
      masteryByNode: {},
      syncedPaths: []
    });

    const response = await bootstrapDemo();

    expect(response.status).toBe(200);
    expect(createDocument).not.toHaveBeenCalled();
    expect(saveDb).toHaveBeenCalled();
  });
});

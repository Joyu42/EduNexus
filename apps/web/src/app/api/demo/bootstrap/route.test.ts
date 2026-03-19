import { beforeEach, describe, expect, it, vi } from "vitest";

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
    expect(createDocument).toHaveBeenCalledTimes(2);
    expect(createDocument).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ title: "前端开发入门路线", authorId: "demo-user" })
    );
    expect(createDocument).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ title: "React 项目实战清单", authorId: "demo-user" })
    );

    expect(saveDb).toHaveBeenCalledTimes(1);
    const savedDb = saveDb.mock.calls[0][0] as {
      sessions: Array<{ title: string; userId: string }>;
    };
    expect(savedDb.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "前端开发入门会话",
          userId: "demo-user"
        }),
        expect.objectContaining({
          title: "React 项目推进会话",
          userId: "demo-user"
        })
      ])
    );

    const payload = (await response.json()) as {
      data: {
        kb: { documents: Array<{ title: string }> };
        workspace: { sessions: Array<{ title: string }> };
        practice: { banks: Array<{ name: string; questions: Array<{ title: string }> }> };
        graph: { nodes: Array<{ id: string }>; edges: Array<{ id: string }> };
        goals: { items: Array<{ id: string; linkedPathIds: string[] }> };
        paths: { items: Array<{ id: string; title: string }> };
        path: { goal: string };
      };
    };
    expect(payload.data.kb.documents.map((item) => item.title)).toEqual([
      "前端开发入门路线",
      "React 项目实战清单"
    ]);
    expect(payload.data.workspace.sessions.map((item) => item.title)).toEqual([
      "前端开发入门会话",
      "React 项目推进会话"
    ]);
    expect(payload.data.practice.banks).toHaveLength(1);
    expect(payload.data.practice.banks[0]?.name).toBe("前端与算法演示题库");
    expect(payload.data.practice.banks[0]?.questions.map((item) => item.title)).toEqual([
      "语义化标签选择",
      "为什么先复盘 JavaScript 再学 React？"
    ]);
    expect(payload.data.goals.items).toHaveLength(3);
    expect(payload.data.paths.items.length).toBeGreaterThan(1);
    expect(payload.data.graph.nodes.length).toBeGreaterThan(1);
    expect(payload.data.path.goal).toBe(payload.data.paths.items[0]?.title);
    expect(seedDemoContentBundle).toHaveBeenCalledTimes(1);
  });

  it("is idempotent when demo content already exists", async () => {
    listDocuments.mockResolvedValue([
      {
        id: "doc-frontend",
        title: "前端开发入门路线",
        content: "existing",
        authorId: "demo-user"
      },
      {
        id: "doc-react",
        title: "React 项目实战清单",
        content: "existing",
        authorId: "demo-user"
      }
    ]);
    loadDb.mockResolvedValue({
      sessions: [
        {
          id: "ws_demo_frontend_intro",
          title: "前端开发入门会话",
          userId: "demo-user",
          createdAt: "2026-03-16T00:00:00.000Z",
          updatedAt: "2026-03-16T00:00:00.000Z",
          lastLevel: 1,
          messages: []
        },
        {
          id: "ws_demo_react_intro",
          title: "React 项目推进会话",
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

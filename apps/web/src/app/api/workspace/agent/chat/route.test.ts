import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/words-service", () => ({
  getWordsProgressSummary: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/server/workspace-graph-context", () => ({
  buildWorkspaceGraphContext: vi.fn(),
}));

vi.mock("@/lib/agent/learning-agent", () => ({
  runAgentConversation: vi.fn(),
  createChatHistory: vi.fn(() => []),
}));

const createLearningPackMock = vi.fn();
const setActivePackMock = vi.fn();
const setPackKbDocumentMock = vi.fn();
const createDocumentMock = vi.fn();
const listDocumentsMock = vi.fn();
const deleteDocumentMock = vi.fn();

vi.mock("@/lib/server/learning-pack-store", () => ({
  createLearningPack: createLearningPackMock,
  setActivePack: setActivePackMock,
  setPackKbDocument: setPackKbDocumentMock,
}));

vi.mock("@/lib/server/document-service", () => ({
  createDocument: createDocumentMock,
  listDocuments: listDocumentsMock,
  deleteDocument: deleteDocumentMock,
}));

vi.mock("@/lib/server/store", () => ({
  loadDb: vi.fn().mockResolvedValue({ syncedPaths: [] }),
  saveDb: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/server/demo-content", () => ({
  DEMO_KB_DOCUMENTS: [],
}));

const { isWordsProgressQuery, POST } = await import("./route");

const WORDS_CONTEXT = "你正处于 EduNexus 的 Words 模块，需要结合真实学习进度给出行动建议：";

describe("words progress query detection", () => {
  it.each([
    "汇报进度",
    "学习进度",
    "最近学习情况",
    "最近7天",
    "最近七天",
    "最近一周",
  ])("matches direct phrase %s", (message) => {
    expect(isWordsProgressQuery(message)).toBe(true);
  });

  it("matches english tokens combined with progress wording", () => {
    expect(isWordsProgressQuery("please report my english words progress")).toBe(true);
  });

  it("leverages words context when message is short", () => {
    expect(isWordsProgressQuery("进度", WORDS_CONTEXT)).toBe(true);
    expect(isWordsProgressQuery("进度")).toBe(false);
  });

  it("does not trigger when neither words nor context are provided", () => {
    expect(isWordsProgressQuery("随便聊聊")).toBe(false);
  });
});

describe("learning-pack quick creation", () => {
  it("creates and returns learningPack for '我想学习 java'", async () => {
    const { auth } = await import("@/auth");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", isDemo: false },
    } as never);

    createLearningPackMock.mockResolvedValueOnce({
      packId: "lp_java_1",
      userId: "u1",
      title: "Java 学习路线图",
      topic: "java",
      stage: "seen",
      active: false,
      modules: [
        { moduleId: "m1", title: "基础语法", kbDocumentId: "", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
      ],
      currentModuleId: "m1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    createDocumentMock.mockResolvedValueOnce({ id: "doc_java_1" });

    const request = new Request("http://localhost/api/workspace/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "我想学习 java" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.learningPack).toMatchObject({
      packId: "lp_java_1",
      topic: "java",
      graphUrl: "/graph?view=path&packId=lp_java_1",
    });
    expect(createLearningPackMock).toHaveBeenCalled();
    expect(setActivePackMock).toHaveBeenCalledWith("lp_java_1", "u1");
  });
});

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
const planLearningPackMock = vi.fn();
const buildLearningPackKbContextMock = vi.fn();

vi.mock("@/lib/server/learning-pack-store", () => ({
  createLearningPack: createLearningPackMock,
  setActivePack: setActivePackMock,
  setPackKbDocument: setPackKbDocumentMock,
}));

vi.mock("@/lib/server/learning-pack-planner", () => ({
  planLearningPack: planLearningPackMock,
}));

vi.mock("@/lib/server/learning-pack-kb-context", () => ({
  buildLearningPackKbContext: buildLearningPackKbContextMock,
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

    planLearningPackMock.mockResolvedValueOnce({
      title: "Java 学习路线图",
      modules: [{ title: "基础语法", order: 0 }],
      confidence: "medium",
      usedExistingDocs: false,
      fallbackUsed: false,
    });

    buildLearningPackKbContextMock.mockResolvedValueOnce({ existingDocs: [], topicMatches: 0 });

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

  it("uses AI planner — calls planLearningPack with topic and creates pack from AI modules", async () => {
    const { auth } = await import("@/auth");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", isDemo: false },
    } as never);

    planLearningPackMock.mockResolvedValueOnce({
      title: "Java 系统性学习路线",
      modules: [
        { title: "Java 环境搭建与工具链", order: 0 },
        { title: "Java 语法基础与数据类型", order: 1 },
        { title: "面向对象编程与设计模式", order: 2 },
      ],
      confidence: "high",
      usedExistingDocs: false,
      fallbackUsed: false,
    });

    buildLearningPackKbContextMock.mockResolvedValueOnce({ existingDocs: [], topicMatches: 0 });

    createLearningPackMock.mockResolvedValueOnce({
      packId: "lp_ai_1",
      userId: "u1",
      title: "Java 系统性学习路线",
      topic: "java",
      stage: "seen",
      active: false,
      modules: [
        { moduleId: "m1", title: "Java 环境搭建与工具链", kbDocumentId: "", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
        { moduleId: "m2", title: "Java 语法基础与数据类型", kbDocumentId: "", stage: "seen", order: 1, studyMinutes: 0, lastStudiedAt: null },
        { moduleId: "m3", title: "面向对象编程与设计模式", kbDocumentId: "", stage: "seen", order: 2, studyMinutes: 0, lastStudiedAt: null },
      ],
      currentModuleId: "m1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 3 docs created for 3 modules
    createDocumentMock.mockResolvedValueOnce({ id: "doc_1" });
    createDocumentMock.mockResolvedValueOnce({ id: "doc_2" });
    createDocumentMock.mockResolvedValueOnce({ id: "doc_3" });

    const request = new Request("http://localhost/api/workspace/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "我想学习 java" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(planLearningPackMock).toHaveBeenCalledWith(
      expect.objectContaining({ topic: "java" })
    );
    expect(createLearningPackMock).toHaveBeenCalledWith(
      "u1",
      "Java 系统性学习路线",
      "java",
      ["Java 环境搭建与工具链", "Java 语法基础与数据类型", "面向对象编程与设计模式"]
    );
    expect(createDocumentMock).toHaveBeenCalledTimes(3);
    expect(setPackKbDocumentMock).toHaveBeenCalledTimes(3);
    expect(payload.learningPack.packId).toBe("lp_ai_1");
  });

  it("falls back to template when planLearningPack returns fallbackUsed=true", async () => {
    const { auth } = await import("@/auth");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", isDemo: false },
    } as never);

    planLearningPackMock.mockResolvedValueOnce({
      title: "java 学习路线图",
      modules: [
        { title: "java 基础与环境搭建", order: 0 },
        { title: "java 语法核心", order: 1 },
        { title: "java 面向对象实践", order: 2 },
        { title: "java 常用库与工程化", order: 3 },
        { title: "java 综合项目实战", order: 4 },
      ],
      confidence: "medium",
      usedExistingDocs: false,
      fallbackUsed: true,
    });

    buildLearningPackKbContextMock.mockResolvedValueOnce({ existingDocs: [], topicMatches: 0 });

    createLearningPackMock.mockResolvedValueOnce({
      packId: "lp_fallback_1",
      userId: "u1",
      title: "java 学习路线图",
      topic: "java",
      stage: "seen",
      active: false,
      modules: [
        { moduleId: "m1", title: "java 基础与环境搭建", kbDocumentId: "", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
        { moduleId: "m2", title: "java 语法核心", kbDocumentId: "", stage: "seen", order: 1, studyMinutes: 0, lastStudiedAt: null },
        { moduleId: "m3", title: "java 面向对象实践", kbDocumentId: "", stage: "seen", order: 2, studyMinutes: 0, lastStudiedAt: null },
        { moduleId: "m4", title: "java 常用库与工程化", kbDocumentId: "", stage: "seen", order: 3, studyMinutes: 0, lastStudiedAt: null },
        { moduleId: "m5", title: "java 综合项目实战", kbDocumentId: "", stage: "seen", order: 4, studyMinutes: 0, lastStudiedAt: null },
      ],
      currentModuleId: "m1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    for (let i = 0; i < 5; i++) {
      createDocumentMock.mockResolvedValueOnce({ id: `doc_fallback_${i}` });
    }

    const request = new Request("http://localhost/api/workspace/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "我想学习 java" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(planLearningPackMock).toHaveBeenCalled();
    expect(createLearningPackMock).toHaveBeenCalled();
    expect(setActivePackMock).toHaveBeenCalledWith("lp_fallback_1", "u1");
    expect(payload.learningPack.packId).toBe("lp_fallback_1");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

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
const planLearningPackMock = vi.fn();
const buildLearningPackKbContextMock = vi.fn();
const findPacksByTopicMock = vi.fn();
const upsertSyncedPathMock = vi.fn();

vi.mock("@/lib/server/learning-pack-store", () => ({
  createLearningPack: createLearningPackMock,
  setActivePack: setActivePackMock,
  setPackKbDocument: setPackKbDocumentMock,
  findPacksByTopic: findPacksByTopicMock,
}));

vi.mock("@/lib/server/learning-pack-planner", () => ({
  planLearningPack: planLearningPackMock,
}));

vi.mock("@/lib/server/learning-pack-kb-context", () => ({
  buildLearningPackKbContext: buildLearningPackKbContextMock,
}));

vi.mock("@/lib/server/document-service", () => ({
  createDocument: createDocumentMock,
}));

vi.mock("@/lib/server/path-sync-service", () => ({
  upsertSyncedPath: upsertSyncedPathMock,
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
  beforeEach(() => {
    createLearningPackMock.mockReset();
    setActivePackMock.mockReset();
    setPackKbDocumentMock.mockReset();
    createDocumentMock.mockReset();
    planLearningPackMock.mockReset();
    buildLearningPackKbContextMock.mockReset();
    findPacksByTopicMock.mockReset();
    upsertSyncedPathMock.mockReset();
  });

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

    buildLearningPackKbContextMock.mockResolvedValueOnce({
      existingDocs: [
        { docId: "doc_java_env", title: "Java 环境搭建", snippet: "已有文档" },
      ],
      topicMatches: 1,
    });
    findPacksByTopicMock.mockResolvedValueOnce([]);

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

    buildLearningPackKbContextMock.mockResolvedValueOnce({
      existingDocs: [
        { docId: "doc_java_env", title: "Java 环境搭建", snippet: "已有文档" },
      ],
      topicMatches: 1,
    });
    findPacksByTopicMock.mockResolvedValueOnce([]);

    const aiPack = {
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
    };

    createLearningPackMock.mockResolvedValueOnce(aiPack);
    setPackKbDocumentMock.mockImplementation(async (_packId, moduleId, kbDocumentId) => {
      const module = aiPack.modules.find((item) => item.moduleId === moduleId);
      if (module) {
        module.kbDocumentId = kbDocumentId;
      }
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
    expect(upsertSyncedPathMock).toHaveBeenCalledWith({
      pathId: "lp_ai_1",
      userId: "u1",
      title: "Java 系统性学习路线",
      description: "AI 规划的学习路径：java",
      status: "not_started",
      progress: 0,
      tags: ["java"],
        tasks: [
          {
            taskId: "m1",
            title: "Java 环境搭建与工具链",
            status: "not_started",
            progress: 0,
            documentBinding: {
              documentId: "doc_1",
              boundAt: expect.any(String),
            },
          },
          {
            taskId: "m2",
            title: "Java 语法基础与数据类型",
            status: "not_started",
            progress: 0,
            documentBinding: {
              documentId: "doc_2",
              boundAt: expect.any(String),
            },
          },
          {
            taskId: "m3",
            title: "面向对象编程与设计模式",
            status: "not_started",
            progress: 0,
            documentBinding: {
              documentId: "doc_3",
              boundAt: expect.any(String),
            },
          },
        ],
      });
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

    buildLearningPackKbContextMock.mockResolvedValueOnce({
      existingDocs: [
        { docId: "doc_java_env", title: "Java 环境搭建", snippet: "已有文档" },
      ],
      topicMatches: 1,
    });
    findPacksByTopicMock.mockResolvedValueOnce([]);

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

  it("reuses existing KB doc by exact title match even when fallback modules omit existingDocId", async () => {
    const { auth } = await import("@/auth");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", isDemo: false },
    } as never);

    planLearningPackMock.mockResolvedValueOnce({
      title: "java 学习路线图",
      modules: [
        { title: "java 基础与环境搭建", order: 0 },
        { title: "java 语法核心", order: 1 },
      ],
      confidence: "medium",
      usedExistingDocs: false,
      fallbackUsed: true,
    });

    buildLearningPackKbContextMock.mockResolvedValueOnce({
      existingDocs: [
        { docId: "doc_exact_match", title: "java 基础与环境搭建", snippet: "已有同名文档" },
      ],
      topicMatches: 1,
    });
    findPacksByTopicMock.mockResolvedValueOnce([]);

    createLearningPackMock.mockResolvedValueOnce({
      packId: "lp_fallback_reuse_1",
      userId: "u1",
      title: "java 学习路线图",
      topic: "java",
      stage: "seen",
      active: false,
      modules: [
        { moduleId: "m1", title: "java 基础与环境搭建", kbDocumentId: "", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
        { moduleId: "m2", title: "java 语法核心", kbDocumentId: "", stage: "seen", order: 1, studyMinutes: 0, lastStudiedAt: null },
      ],
      currentModuleId: "m1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    createDocumentMock.mockResolvedValueOnce({ id: "doc_created_1" });
    createDocumentMock.mockResolvedValueOnce({ id: "doc_created_2" });

    const request = new Request("http://localhost/api/workspace/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "我想学习 java" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(createDocumentMock).toHaveBeenCalledTimes(1);
    expect(setPackKbDocumentMock).toHaveBeenCalledWith(
      "lp_fallback_reuse_1",
      "m1",
      "doc_exact_match",
      "u1"
    );
    expect(setPackKbDocumentMock).toHaveBeenCalledWith(
      "lp_fallback_reuse_1",
      "m2",
      "doc_created_1",
      "u1"
    );
  });

  it("returns continueExistingPack when same topic pack already exists", async () => {
    const { auth } = await import("@/auth");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", isDemo: false },
    } as never);

    const existingPack = {
      packId: "lp_existing_java",
      userId: "u1",
      title: "Java 学习路线图",
      topic: "java",
      stage: "seen",
      active: false,
      modules: [
        { moduleId: "m1", title: "Java 基础与环境搭建", kbDocumentId: "", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
      ],
      currentModuleId: "m1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    findPacksByTopicMock.mockResolvedValueOnce([existingPack]);

    const request = new Request("http://localhost/api/workspace/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "我想学习 Java" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(findPacksByTopicMock).toHaveBeenCalledWith("u1", "Java");
    expect(planLearningPackMock).not.toHaveBeenCalled();
    expect(createLearningPackMock).not.toHaveBeenCalled();
    expect(payload.continueExistingPack).toMatchObject({
      packId: "lp_existing_java",
      moduleCount: 1,
    });
    expect(payload.replanAvailable).toMatchObject({
      packId: "lp_existing_java",
      topic: "java",
    });
    expect(payload.learningPack.graphUrl).toContain("lp_existing_java");
  });

  it("bypasses same-topic short-circuit when message includes replan keyword", async () => {
    const { auth } = await import("@/auth");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", isDemo: false },
    } as never);

    const existingPack = {
      packId: "lp_existing_java",
      userId: "u1",
      title: "Java 学习路线图",
      topic: "java",
      stage: "seen",
      active: false,
      modules: [
        { moduleId: "m1", title: "Java 基础与环境搭建", kbDocumentId: "", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
      ],
      currentModuleId: "m1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    findPacksByTopicMock.mockResolvedValueOnce([existingPack]);

    planLearningPackMock.mockResolvedValueOnce({
      title: "Java 重新规划路线",
      modules: [
        { title: "Java 基础复盘", order: 0 },
        { title: "Java 并发进阶", order: 1 },
      ],
      confidence: "high",
      usedExistingDocs: false,
      fallbackUsed: false,
    });

    buildLearningPackKbContextMock.mockResolvedValueOnce({
      existingDocs: [],
      topicMatches: 0,
    });

    createLearningPackMock.mockResolvedValueOnce({
      packId: "lp_java_replan_1",
      userId: "u1",
      title: "Java 重新规划路线",
      topic: "java",
      stage: "seen",
      active: false,
      modules: [
        { moduleId: "m1", title: "Java 基础复盘", kbDocumentId: "", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
        { moduleId: "m2", title: "Java 并发进阶", kbDocumentId: "", stage: "seen", order: 1, studyMinutes: 0, lastStudiedAt: null },
      ],
      currentModuleId: "m1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    createDocumentMock.mockResolvedValueOnce({ id: "doc_replan_1" });
    createDocumentMock.mockResolvedValueOnce({ id: "doc_replan_2" });

    const request = new Request("http://localhost/api/workspace/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "我想学习 Java，重新规划" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(findPacksByTopicMock).toHaveBeenCalledWith("u1", "Java");
    expect(planLearningPackMock).toHaveBeenCalled();
    expect(createLearningPackMock).toHaveBeenCalledWith(
      "u1",
      "Java 重新规划路线",
      "Java",
      ["Java 基础复盘", "Java 并发进阶"]
    );
    expect(payload.continueExistingPack).toBeUndefined();
    expect(payload.learningPack.packId).toBe("lp_java_replan_1");
  });

  it("reuses existing KB doc when planner marks existingDocId", async () => {
    const { auth } = await import("@/auth");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", isDemo: false },
    } as never);

    planLearningPackMock.mockResolvedValueOnce({
      title: "Java 系统性学习路线",
      modules: [
        { title: "Java 环境搭建", order: 0, existingDocId: "doc_java_env" },
        { title: "Java 语法基础", order: 1 },
      ],
      confidence: "high",
      usedExistingDocs: true,
      fallbackUsed: false,
    });

    buildLearningPackKbContextMock.mockResolvedValueOnce({
      existingDocs: [
        { docId: "doc_java_env", title: "Java 环境搭建", snippet: "已有文档" },
      ],
      topicMatches: 1,
    });
    findPacksByTopicMock.mockResolvedValueOnce([]);

    createLearningPackMock.mockResolvedValueOnce({
      packId: "lp_ai_reuse_1",
      userId: "u1",
      title: "Java 系统性学习路线",
      topic: "java",
      stage: "seen",
      active: false,
      modules: [
        { moduleId: "m1", title: "Java 环境搭建", kbDocumentId: "", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
        { moduleId: "m2", title: "Java 语法基础", kbDocumentId: "", stage: "seen", order: 1, studyMinutes: 0, lastStudiedAt: null },
      ],
      currentModuleId: "m1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    createDocumentMock.mockResolvedValueOnce({ id: "doc_new" });

    const request = new Request("http://localhost/api/workspace/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "我想学习 java" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(createDocumentMock).toHaveBeenCalledTimes(1);
    expect(setPackKbDocumentMock).toHaveBeenCalledTimes(2);
    expect(setPackKbDocumentMock).toHaveBeenCalledWith("lp_ai_reuse_1", "m1", "doc_java_env", "u1");
    expect(setPackKbDocumentMock).toHaveBeenCalledWith("lp_ai_reuse_1", "m2", "doc_new", "u1");
  });

  it("creates new docs when planner returns unknown existingDocId", async () => {
    const { auth } = await import("@/auth");

    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", isDemo: false },
    } as never);

    planLearningPackMock.mockResolvedValueOnce({
      title: "Python 学习路线",
      modules: [
        { title: "Python 基础", order: 0, existingDocId: "doc_hallucinated" },
      ],
      confidence: "medium",
      usedExistingDocs: true,
      fallbackUsed: false,
    });

    buildLearningPackKbContextMock.mockResolvedValueOnce({
      existingDocs: [
        { docId: "doc_real_1", title: "Python 语法", snippet: "真实存在" },
      ],
      topicMatches: 1,
    });
    findPacksByTopicMock.mockResolvedValueOnce([]);

    createLearningPackMock.mockResolvedValueOnce({
      packId: "lp_py_1",
      userId: "u1",
      title: "Python 学习路线",
      topic: "python",
      stage: "seen",
      active: false,
      modules: [
        { moduleId: "m1", title: "Python 基础", kbDocumentId: "", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
      ],
      currentModuleId: "m1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    createDocumentMock.mockResolvedValueOnce({ id: "doc_created_py" });

    const request = new Request("http://localhost/api/workspace/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "我想学习 python" }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(createDocumentMock).toHaveBeenCalledTimes(1);
    expect(setPackKbDocumentMock).toHaveBeenCalledWith("lp_py_1", "m1", "doc_created_py", "u1");
  });
});

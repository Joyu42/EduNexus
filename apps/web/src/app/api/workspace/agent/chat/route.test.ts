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
const planLearningPackMock = vi.fn();
const buildLearningPackKbContextMock = vi.fn();
const findPacksByTopicMock = vi.fn();
const generateModuleDetailedContentMock = vi.fn();

vi.mock("@/lib/server/learning-pack-store", () => ({
  createLearningPack: createLearningPackMock,
  setActivePack: setActivePackMock,
  setPackKbDocument: setPackKbDocumentMock,
  findPacksByTopic: findPacksByTopicMock,
}));

vi.mock("@/lib/server/learning-pack-planner", () => ({
  planLearningPack: planLearningPackMock,
  generateModuleDetailedContent: generateModuleDetailedContentMock,
}));

vi.mock("@/lib/server/learning-pack-kb-context", () => ({
  buildLearningPackKbContext: buildLearningPackKbContextMock,
}));

const { POST } = await import("./route");

describe("learning-pack two-stage flow", () => {
  beforeEach(() => {
    createLearningPackMock.mockReset();
    setActivePackMock.mockReset();
    setPackKbDocumentMock.mockReset();
    planLearningPackMock.mockReset();
    buildLearningPackKbContextMock.mockReset();
    findPacksByTopicMock.mockReset();
    generateModuleDetailedContentMock.mockReset();
  });

  it("returns the outline immediately after pack creation", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", isDemo: false } } as never);

    findPacksByTopicMock.mockResolvedValueOnce([]);
    buildLearningPackKbContextMock.mockResolvedValueOnce({ existingDocs: [], topicMatches: 0 });
    planLearningPackMock.mockResolvedValueOnce({
      title: "Java 学习路线图",
      modules: [{ title: "Java 语法基础", order: 0 }],
      confidence: "high",
      usedExistingDocs: false,
      fallbackUsed: false,
    });
    createLearningPackMock.mockResolvedValueOnce({
      packId: "lp_1",
      userId: "u1",
      title: "Java 学习路线图",
      topic: "java",
      stage: "seen",
      active: false,
      modules: [{ moduleId: "m1", title: "Java 语法基础", kbDocumentId: "", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null }],
      currentModuleId: "m1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    generateModuleDetailedContentMock.mockResolvedValueOnce(undefined);

    const response = await POST(new Request("http://localhost/api/workspace/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: "我想学习 java",
        config: {
          apiKey: "stage2-key",
          apiEndpoint: "https://modelscope.example/v1",
          modelName: "stage2-model",
        },
      }),
    }));

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.learningPack.packId).toBe("lp_1");
    expect(setActivePackMock).toHaveBeenCalledWith("lp_1", "u1");
    expect(generateModuleDetailedContentMock).toHaveBeenCalledTimes(1);
    expect(generateModuleDetailedContentMock).toHaveBeenCalledWith(
      "lp_1",
      "m1",
      "u1",
      expect.objectContaining({
        topic: "java",
        moduleTitle: "Java 语法基础",
        apiKey: "stage2-key",
        apiEndpoint: "https://modelscope.example/v1",
        modelName: "stage2-model",
      })
    );
  });

  it("keeps other modules going when one stage 2 call fails", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", isDemo: false } } as never);

    findPacksByTopicMock.mockResolvedValueOnce([]);
    buildLearningPackKbContextMock.mockResolvedValueOnce({ existingDocs: [], topicMatches: 0 });
    planLearningPackMock.mockResolvedValueOnce({
      title: "Java 学习路线图",
      modules: [{ title: "A", order: 0 }, { title: "B", order: 1 }],
      confidence: "high",
      usedExistingDocs: false,
      fallbackUsed: false,
    });
    createLearningPackMock.mockResolvedValueOnce({
      packId: "lp_2",
      userId: "u1",
      title: "Java 学习路线图",
      topic: "java",
      stage: "seen",
      active: false,
      modules: [
        { moduleId: "m1", title: "A", kbDocumentId: "", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
        { moduleId: "m2", title: "B", kbDocumentId: "", stage: "seen", order: 1, studyMinutes: 0, lastStudiedAt: null },
      ],
      currentModuleId: "m1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    generateModuleDetailedContentMock
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    const response = await POST(new Request("http://localhost/api/workspace/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "我想学习 java" }),
    }));

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(generateModuleDetailedContentMock).toHaveBeenCalledTimes(2);
  });

  it("still reuses existing docs synchronously", async () => {
    const { auth } = await import("@/auth");
    vi.mocked(auth).mockResolvedValue({ user: { id: "u1", isDemo: false } } as never);

    findPacksByTopicMock.mockResolvedValueOnce([]);
    buildLearningPackKbContextMock.mockResolvedValueOnce({
      existingDocs: [{ docId: "doc_1", title: "Java 语法基础", snippet: "已有" }],
      topicMatches: 1,
    });
    planLearningPackMock.mockResolvedValueOnce({
      title: "Java 学习路线图",
      modules: [{ title: "Java 语法基础", order: 0, existingDocId: "doc_1" }],
      confidence: "high",
      usedExistingDocs: true,
      fallbackUsed: false,
    });
    createLearningPackMock.mockResolvedValueOnce({
      packId: "lp_3",
      userId: "u1",
      title: "Java 学习路线图",
      topic: "java",
      stage: "seen",
      active: false,
      modules: [{ moduleId: "m1", title: "Java 语法基础", kbDocumentId: "", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null }],
      currentModuleId: "m1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const response = await POST(new Request("http://localhost/api/workspace/agent/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "我想学习 java" }),
    }));

    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.planner.usedExistingDocs).toBe(true);
    expect(setPackKbDocumentMock).toHaveBeenCalledWith("lp_3", "m1", "doc_1", "u1");
  });
});

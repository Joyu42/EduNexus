import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  getModelscopeClientMock,
  buildWorkspaceGraphContextMock,
  getStoredModelConfigMock,
  openAIConstructorMock,
  completionCreateMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  getModelscopeClientMock: vi.fn(),
  buildWorkspaceGraphContextMock: vi.fn(),
  getStoredModelConfigMock: vi.fn(),
  openAIConstructorMock: vi.fn(),
  completionCreateMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/server/modelscope", () => ({
  getModelscopeClient: getModelscopeClientMock,
}));

vi.mock("@/lib/server/workspace-graph-context", () => ({
  buildWorkspaceGraphContext: buildWorkspaceGraphContextMock,
}));

vi.mock("@/lib/server/model-config-store", () => ({
  getStoredModelConfig: getStoredModelConfigMock,
}));

vi.mock("openai", () => ({
  default: class OpenAIMock {
    chat = {
      completions: {
        create: completionCreateMock,
      },
    };

    constructor(config: unknown) {
      openAIConstructorMock(config);
    }
  },
}));

const { POST } = await import("./route");

describe("POST /api/kb/qa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    getModelscopeClientMock.mockImplementation(() => {
      throw new Error("missing env config");
    });
    buildWorkspaceGraphContextMock.mockResolvedValue({
      taskNode: null,
      relatedNodes: [],
      relatedEdges: [],
    });
    completionCreateMock.mockResolvedValue({
      choices: [{ message: { content: "基于已保存配置的回答" } }],
    });
  });

  it("falls back to the stored model config when request config is missing", async () => {
    getStoredModelConfigMock.mockResolvedValue({
      userId: "user-1",
      apiKey: "stored-key",
      apiEndpoint: "https://api-inference.modelscope.cn/v1",
      modelName: "Qwen/Qwen3.5-122B-A10B",
      updatedAt: "2026-04-12T00:00:00.000Z",
    });

    const response = await POST(
      new NextRequest("http://localhost/api/kb/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "什么是二叉树？",
          documents: [
            {
              id: "doc-1",
              title: "树结构",
              content: "二叉树是一种每个节点最多有两个子节点的数据结构。",
            },
          ],
          history: [],
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      answer: "基于已保存配置的回答",
    });
    expect(getStoredModelConfigMock).toHaveBeenCalledWith("user-1");
    expect(openAIConstructorMock).toHaveBeenCalledWith({
      apiKey: "stored-key",
      baseURL: "https://api-inference.modelscope.cn/v1",
    });
    expect(completionCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "Qwen/Qwen3.5-122B-A10B",
      })
    );
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const createCompletionMock = vi.hoisted(() => vi.fn());

vi.mock("openai", () => ({
  default: vi.fn(function MockOpenAI() {
    return {
      chat: {
        completions: {
          create: createCompletionMock,
        },
      },
    };
  }),
}));

describe("planLearningPack", () => {
  beforeEach(() => {
    createCompletionMock.mockReset();
  });

  it("retries without json_object mode when model rejects response_format", async () => {
    const { planLearningPack } = await import("./learning-pack-planner");

    createCompletionMock
      .mockRejectedValueOnce(new Error("response_format json_object is not supported"))
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                title: "数据结构 学习路线图",
                modules: [
                  { title: "数组与链表", order: 0 },
                  { title: "栈与队列", order: 1 },
                  { title: "树与图", order: 2 },
                  { title: "查找与排序", order: 3 },
                ],
                confidence: "high",
                usedExistingDocs: false,
                fallbackUsed: false,
              }),
            },
          },
        ],
      });

    const result = await planLearningPack({
      topic: "数据结构",
      apiKey: "valid-key",
      apiEndpoint: "https://api-inference.modelscope.cn/v1",
      modelName: "Qwen/Qwen3.5-122B-A10B",
    });

    expect(result.fallbackUsed).toBe(false);
    expect(result.title).toBe("数据结构 学习路线图");
    expect(result.modules).toHaveLength(4);
    expect(createCompletionMock).toHaveBeenCalledTimes(2);

    const firstCall = createCompletionMock.mock.calls[0]?.[0] as { response_format?: unknown };
    const secondCall = createCompletionMock.mock.calls[1]?.[0] as { response_format?: unknown };
    expect(firstCall.response_format).toEqual({ type: "json_object" });
    expect(secondCall.response_format).toBeUndefined();
  });

  it("returns fallback with explicit missing_api_key reason", async () => {
    const { planLearningPack } = await import("./learning-pack-planner");

    const result = await planLearningPack({
      topic: "数据结构",
      apiKey: "",
      apiEndpoint: "https://api-inference.modelscope.cn/v1",
      modelName: "Qwen/Qwen3.5-122B-A10B",
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackReason).toBe("missing_api_key");
    expect(createCompletionMock).not.toHaveBeenCalled();
  });

  it("produces materially different fallback module skeletons for different topics", async () => {
    const { planLearningPack } = await import("./learning-pack-planner");

    const java = await planLearningPack({
      topic: "java",
      apiKey: "",
      apiEndpoint: "https://api-inference.modelscope.cn/v1",
      modelName: "Qwen/Qwen3.5-122B-A10B",
    });

    const python = await planLearningPack({
      topic: "python",
      apiKey: "",
      apiEndpoint: "https://api-inference.modelscope.cn/v1",
      modelName: "Qwen/Qwen3.5-122B-A10B",
    });

    const stripTopicPrefix = (topic: string, title: string) =>
      title.replace(new RegExp(`^${topic}\\s*`, "i"), "").trim();

    const javaSkeleton = java.modules.map((m) => stripTopicPrefix("java", m.title));
    const pythonSkeleton = python.modules.map((m) => stripTopicPrefix("python", m.title));

    expect(java.fallbackUsed).toBe(true);
    expect(python.fallbackUsed).toBe(true);
    expect(javaSkeleton).not.toEqual(pythonSkeleton);
  });

  it("produces different fallback skeletons for unrelated topics even without explicit templates", async () => {
    const { planLearningPack } = await import("./learning-pack-planner");

    const rust = await planLearningPack({
      topic: "rust",
      apiKey: "",
      apiEndpoint: "https://api-inference.modelscope.cn/v1",
      modelName: "Qwen/Qwen3.5-122B-A10B",
    });

    const go = await planLearningPack({
      topic: "go",
      apiKey: "",
      apiEndpoint: "https://api-inference.modelscope.cn/v1",
      modelName: "Qwen/Qwen3.5-122B-A10B",
    });

    const stripTopicPrefix = (topic: string, title: string) =>
      title.replace(new RegExp(`^${topic}\\s*`, "i"), "").trim();

    const rustSkeleton = rust.modules.map((m) => stripTopicPrefix("rust", m.title));
    const goSkeleton = go.modules.map((m) => stripTopicPrefix("go", m.title));

    expect(rust.fallbackUsed).toBe(true);
    expect(go.fallbackUsed).toBe(true);
    expect(rustSkeleton).not.toEqual(goSkeleton);
  });
});

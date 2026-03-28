import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/client/model-config", () => ({
  getModelConfig: vi.fn().mockReturnValue({
    model: "Qwen/Qwen3.5-122B-A10B",
    apiEndpoint: "https://api-inference.modelscope.cn/v1",
    apiKey: "test-api-key",
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 2000,
  }),
}));

describe("generateWordMnemonic", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("generateWordMnemonic returns data.response on success envelope", async () => {
    const jsonMock = vi.fn().mockResolvedValue({
      success: true,
      data: {
        response: "记忆技巧ABC",
        timestamp: "2026-03-21T00:00:00.000Z",
      },
    });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => {
          if (name === "content-type") return "application/json";
          return null;
        },
      },
      json: jsonMock,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateWordMnemonic } = await import("./ai");

    const result = await generateWordMnemonic({
      word: "test",
      definition: "a test word",
      example: "This is a test.",
    });

    expect(result).toBe("记忆技巧ABC");
  });

  it("generateWordMnemonic returns fallback on fetch/json failure (does not throw)", async () => {
    const jsonMock = vi.fn().mockRejectedValue(new SyntaxError("Unexpected end of JSON input"));
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: {
        get: (name: string) => {
          if (name === "content-type") return "text/html";
          return null;
        },
      },
      json: jsonMock,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { generateWordMnemonic } = await import("./ai");

    const result = await generateWordMnemonic({
      word: "test",
      definition: "a test word",
    });

    expect(result).toBe("记忆法：把 test 放进你自己的学习场景里，今天复习 2 次，明天再复习 1 次。");
  });
});

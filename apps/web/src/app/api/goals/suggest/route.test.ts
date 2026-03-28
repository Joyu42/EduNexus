import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();

const { POST } = await import("./route");

describe("goals suggest route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 400 when required params are missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/goals/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalTitle: "" }),
      }) as any
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "缺少必要参数",
    });
  });

  it("returns parsed enrichment suggestions from upstream model endpoint", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content:
                  '建议如下: {"smart":{"specific":"明确目标","measurable":"每周完成2章","achievable":"每天学习1小时","relevant":"匹配职业发展","timeBound":"8周内完成"},"suggestedPaths":[{"title":"基础阶段","description":"夯实基础","estimatedWeeks":2}],"relatedKnowledge":["基础语法"],"challenges":[{"challenge":"时间不足","solution":"固定学习时段"}] }',
              },
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const response = await POST(
      new Request("http://localhost/api/goals/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalTitle: "通过英语六级",
          goalDescription: "提升听说读写",
          category: "exam",
          type: "mid-term",
          apiKey: "token-123",
          apiEndpoint: "https://example.ai/v1",
          model: "qwen-plus",
        }),
      }) as any
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.ai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      smart: {
        specific: "明确目标",
        measurable: "每周完成2章",
      },
      relatedKnowledge: ["基础语法"],
    });
  });
});

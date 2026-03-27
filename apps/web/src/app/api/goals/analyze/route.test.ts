import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMessage } = vi.hoisted(() => ({
  createMessage: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => {
  class AnthropicMock {
    messages = {
      create: createMessage,
    };
  }

  return {
    default: AnthropicMock,
  };
});

const { POST } = await import("./route");

describe("goals analyze route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when goal payload is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/goals/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habits: [] }),
      }) as any
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "目标信息不能为空",
    });
  });

  it("analyzes with goal-contract-safe fallbacks and no phantom fields", async () => {
    createMessage.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            progressAssessment: { status: "on-track", summary: "进展稳定" },
            strengths: ["坚持打卡"],
            improvements: ["减少分心"],
            nextActions: [{ action: "复盘本周", priority: "high", estimatedTime: "30分钟" }],
            motivation: "继续加油",
          }),
        },
      ],
    });

    const response = await POST(
      new Request("http://localhost/api/goals/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: {
            id: "goal-1",
            title: "Learn TypeScript",
            description: "Daily practice",
            type: "short-term",
            category: "skill",
            status: "active",
            smart: {
              specific: "Build one small app",
              measurable: "Complete 10 exercises",
              achievable: "Study 1 hour per day",
              relevant: "Improve frontend capability",
              timeBound: "Two weeks",
            },
            progress: 45,
            linkedPathIds: [],
            relatedKnowledge: ["TypeScript basics", "Generics"],
            startDate: "2026-03-01",
            endDate: "2026-03-31",
            createdAt: "2026-03-01T00:00:00.000Z",
            updatedAt: "2026-03-20T00:00:00.000Z",
          },
          habits: [
            {
              id: "habit-1",
              name: "Daily coding",
              description: "Practice coding",
              frequency: "daily",
              targetDays: [1, 2, 3, 4, 5],
              checkIns: {
                "2026-03-24": true,
                "2026-03-25": true,
                "2026-03-26": false,
              },
              streak: 2,
              longestStreak: 5,
              createdAt: "2026-03-01T00:00:00.000Z",
            },
          ],
        }),
      }) as any
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      progressAssessment: { status: "on-track" },
      strengths: ["坚持打卡"],
      improvements: ["减少分心"],
      motivation: "继续加油",
    });

    const prompt = createMessage.mock.calls[0]?.[0]?.messages?.[0]?.content;
    expect(prompt).toContain("里程碑/关联路径进度：当前目标契约未包含独立里程碑字段");
    expect(prompt).toContain("连续2天，完成率67%");
    expect(prompt).not.toContain("undefined");
  });
});

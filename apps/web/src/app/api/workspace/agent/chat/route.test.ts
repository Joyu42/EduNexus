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

const { isWordsProgressQuery } = await import("./route");

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

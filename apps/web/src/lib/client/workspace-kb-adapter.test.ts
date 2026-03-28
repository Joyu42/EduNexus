import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createDocumentOnServerMock } = vi.hoisted(() => ({
  createDocumentOnServerMock: vi.fn(),
}));

vi.mock("./kb-storage", () => ({
  createDocumentOnServer: createDocumentOnServerMock,
}));

vi.mock("@/lib/kb/content-extractor", () => ({
  extractTags: vi.fn().mockReturnValue([]),
}));

import { saveReplyAsKBDocument } from "./workspace-kb-adapter";

describe("workspace-kb-adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("saveReplyAsKBDocument creates document via createDocumentOnServer with question as title and answer+metadata as content", async () => {
    createDocumentOnServerMock.mockResolvedValue({ id: "doc-1" });

    const reply = {
      userQuestion: "What is a closure?",
      assistantAnswer: "A closure is...",
      sessionId: "session-123",
      timestamp: "2026-03-27T00:00:00.000Z",
      teacherName: "Socratic",
    };

    const result = await saveReplyAsKBDocument(reply);

    expect(result).toEqual({ ok: true, documentId: "doc-1" });
    expect(createDocumentOnServerMock).toHaveBeenCalledTimes(1);

    const [title, content, tags] = createDocumentOnServerMock.mock.calls[0] ?? [];

    expect(title).toBe(reply.userQuestion);
    expect(tags).toEqual(["workspace-saved", "source:workspace", "mode:normal", "teacher:Socratic"]);

    expect(String(content)).toContain(reply.assistantAnswer);
    expect(String(content)).toContain('<section data-workspace-meta="true">');
    expect(String(content)).toContain("<p>来源: workspace-saved</p>");
    expect(String(content)).toContain(`<p>会话: ${reply.sessionId}</p>`);
    expect(String(content)).toContain(`<p>时间: ${reply.timestamp}</p>`);
    expect(String(content)).toContain(`<p>教师: ${reply.teacherName}</p>`);
    expect(String(content)).toContain("<p>模式: normal</p>");
    expect(String(content)).toContain("<p>页面: /workspace</p>");
  });

  it("saveReplyAsKBDocument appends hashtag tags when extractTags finds them", async () => {
    const { extractTags } = await import("@/lib/kb/content-extractor");
    vi.mocked(extractTags).mockReturnValue(["JavaScript", "闭包", "异步"]);

    createDocumentOnServerMock.mockResolvedValue({ id: "doc-1" });

    const result = await saveReplyAsKBDocument({
      userQuestion: "Q", assistantAnswer: "A", sessionId: "s", timestamp: "t",
    });

    expect(result).toEqual({ ok: true, documentId: "doc-1" });
    const tags = createDocumentOnServerMock.mock.calls[0]?.[2] ?? [];
    expect(tags).toContain("workspace-saved");
    expect(tags).toContain("source:workspace");
    expect(tags).toContain("mode:normal");
    expect(tags).toContain("JavaScript");
    expect(tags).toContain("闭包");
    expect(tags).toContain("异步");
  });

  it("saveReplyAsKBDocument uses only deterministic tags when extractTags returns empty", async () => {
    const { extractTags } = await import("@/lib/kb/content-extractor");
    vi.mocked(extractTags).mockReturnValue([]);

    createDocumentOnServerMock.mockResolvedValue({ id: "doc-1" });

    const result = await saveReplyAsKBDocument({
      userQuestion: "Q", assistantAnswer: "A", sessionId: "s", timestamp: "t",
    });

    expect(result).toEqual({ ok: true, documentId: "doc-1" });
    const tags = createDocumentOnServerMock.mock.calls[0]?.[2] ?? [];
    expect(tags).toEqual(["workspace-saved", "source:workspace", "mode:normal"]);
  });

  it("saveReplyAsKBDocument does NOT call local vault operations (getKBStorage, createVault, setCurrentVault)", async () => {
    createDocumentOnServerMock.mockResolvedValue({ id: "doc-1" });

    const reply = { userQuestion: "Q", assistantAnswer: "A", sessionId: "s", timestamp: "t" };
    await saveReplyAsKBDocument(reply);

    // Verify createDocumentOnServer was called (server path)
    expect(createDocumentOnServerMock).toHaveBeenCalledTimes(1);

    const actualExports = await vi.importActual<Record<string, unknown>>("./kb-storage");
    expect("createVault" in actualExports).toBe(false);
    expect("setCurrentVault" in actualExports).toBe(false);
    expect("getKBStorage" in actualExports).toBe(true);
  });

  it("saveReplyAsKBDocument returns error result when createDocumentOnServer throws", async () => {
    createDocumentOnServerMock.mockRejectedValue(new Error("Server error"));

    const reply = { userQuestion: "Q", assistantAnswer: "A", sessionId: "s", timestamp: "t" };
    const result = await saveReplyAsKBDocument(reply);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Failed to create KB document");
      expect(result.error).toContain("Server error");
    }
  });
});

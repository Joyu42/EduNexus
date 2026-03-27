import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getKBStorageMock } = vi.hoisted(() => ({
  getKBStorageMock: vi.fn(),
}));

vi.mock("@/lib/client/kb-storage", () => ({
  getKBStorage: getKBStorageMock,
}));

vi.mock("./kb-storage", () => ({
  getKBStorage: getKBStorageMock,
}));

vi.mock("@/lib/ai/document-analyzer", () => ({
  extractKeywords: vi.fn().mockResolvedValue({ suggestedTags: [] }),
}));

import { saveReplyAsKBDocument } from "./workspace-kb-adapter";

describe("workspace-kb-adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("saveReplyAsKBDocument creates document with question as title and answer+metadata as content", async () => {
    const createDocument = vi.fn().mockResolvedValue({ id: "doc-1" });
    getKBStorageMock.mockReturnValue({
      getCurrentVaultId: () => "vault-1",
      createDocument,
    });

    const reply = {
      userQuestion: "What is a closure?",
      assistantAnswer: "A closure is...",
      sessionId: "session-123",
      timestamp: "2026-03-27T00:00:00.000Z",
      teacherName: "Socratic",
    };

    await expect(saveReplyAsKBDocument(reply)).resolves.toEqual({
      ok: true,
      documentId: "doc-1",
    });

    expect(createDocument).toHaveBeenCalledTimes(1);
    const [vaultId, title, content, tags] = createDocument.mock.calls[0] ?? [];

    expect(vaultId).toBe("vault-1");
    expect(title).toBe(reply.userQuestion);
    expect(tags).toEqual(["workspace-saved", "source:workspace", "mode:normal", "teacher:Socratic"]);

    expect(String(content)).toContain(reply.assistantAnswer);
    expect(String(content)).toContain("source: workspace-saved");
    expect(String(content)).toContain(`sessionId: ${reply.sessionId}`);
    expect(String(content)).toContain(`timestamp: ${reply.timestamp}`);
    expect(String(content)).toContain(`teacher: ${reply.teacherName}`);
    expect(String(content)).toContain("mode: normal");
    expect(String(content)).toContain("sourcePage: /workspace");
  });

  it("saveReplyAsKBDocument auto-creates vault when no current vault exists", async () => {
    const createVault = vi.fn().mockResolvedValue({ id: "vault-new", name: "工作区保存", path: "workspace://saved-replies" });
    const setCurrentVault = vi.fn();
    const createDocument = vi.fn().mockResolvedValue({ id: "doc-1" });
    getKBStorageMock.mockReturnValue({
      getCurrentVaultId: () => null,
      createVault,
      setCurrentVault,
      createDocument,
    });

    const reply = {
      userQuestion: "What is a closure?",
      assistantAnswer: "A closure is...",
      sessionId: "session-123",
      timestamp: "2026-03-27T00:00:00.000Z",
    };

    const result = await saveReplyAsKBDocument(reply);

    expect(result).toEqual({ ok: true, documentId: "doc-1" });
    expect(createVault).toHaveBeenCalledTimes(1);
    expect(createVault).toHaveBeenCalledWith("工作区保存", "workspace://saved-replies");
    expect(setCurrentVault).toHaveBeenCalledWith("vault-new");
    expect(createDocument).toHaveBeenCalledTimes(1);
  });

  it("saveReplyAsKBDocument appends AI tags when extraction succeeds", async () => {
    const { extractKeywords } = await import("@/lib/ai/document-analyzer");
    vi.mocked(extractKeywords).mockResolvedValue({ keywords: [], suggestedTags: ["JavaScript", "闭包", "异步"] });

    const createDocument = vi.fn().mockResolvedValue({ id: "doc-1" });
    getKBStorageMock.mockReturnValue({
      getCurrentVaultId: () => "vault-1",
      createDocument,
    });

    const result = await saveReplyAsKBDocument({
      userQuestion: "Q", assistantAnswer: "A", sessionId: "s", timestamp: "t",
    });

    expect(result).toEqual({ ok: true, documentId: "doc-1" });
    const tags = createDocument.mock.calls[0]?.[3] ?? [];
    expect(tags).toContain("workspace-saved");
    expect(tags).toContain("source:workspace");
    expect(tags).toContain("mode:normal");
    expect(tags).toContain("JavaScript");
    expect(tags).toContain("闭包");
    expect(tags).toContain("异步");
  });

  it("saveReplyAsKBDocument falls back to deterministic tags when AI extraction throws", async () => {
    const { extractKeywords } = await import("@/lib/ai/document-analyzer");
    vi.mocked(extractKeywords).mockRejectedValue(new Error("AI timeout"));

    const createDocument = vi.fn().mockResolvedValue({ id: "doc-1" });
    getKBStorageMock.mockReturnValue({
      getCurrentVaultId: () => "vault-1",
      createDocument,
    });

    const result = await saveReplyAsKBDocument({
      userQuestion: "Q", assistantAnswer: "A", sessionId: "s", timestamp: "t",
    });

    expect(result).toEqual({ ok: true, documentId: "doc-1" });
    const tags = createDocument.mock.calls[0]?.[3] ?? [];
    expect(tags).toEqual(["workspace-saved", "source:workspace", "mode:normal"]);
  });

  it("saveReplyAsKBDocument handles concurrent saves with single vault creation", async () => {
    const createVault = vi.fn().mockResolvedValue({ id: "vault-new" });
    const setCurrentVault = vi.fn();
    const createDocument = vi.fn().mockResolvedValue({ id: "doc-1" });
    getKBStorageMock.mockReturnValue({
      getCurrentVaultId: () => null,
      createVault,
      setCurrentVault,
      createDocument,
    });

    const reply = { userQuestion: "Q", assistantAnswer: "A", sessionId: "s", timestamp: "t" };

    await Promise.all([
      saveReplyAsKBDocument(reply),
      saveReplyAsKBDocument(reply),
      saveReplyAsKBDocument(reply),
    ]);

    // Only ONE vault should be created despite 3 concurrent calls
    expect(createVault).toHaveBeenCalledTimes(1);
    // But 3 documents should be created
    expect(createDocument).toHaveBeenCalledTimes(3);
  });
});

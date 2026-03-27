import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createDocumentOnServer,
  fetchDocumentsFromServer,
  getDocumentFromServer
} from "./kb-storage";

describe("kb storage server helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns an empty list when the server responds with 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchDocumentsFromServer()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith("/api/kb/docs", {
      credentials: "include"
    });
  });

  it("posts new documents with credentials included", async () => {
    const document = {
      id: "doc-1",
      title: "Owned by session user",
      content: "content",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ document })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createDocumentOnServer("Owned by session user", "content")).resolves.toEqual(
      document
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/kb/docs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ title: "Owned by session user", content: "content" })
    });
  });

  it("returns null when the server hides another user's document with 404", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 404
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getDocumentFromServer("doc-1")).resolves.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/kb/doc/doc-1", {
      credentials: "include"
    });
  });

  it("posts new document with tags when provided", async () => {
    const document = {
      id: "doc-2",
      title: "Tagged Document",
      content: "content with tags",
      tags: ["typescript", "nextjs"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ document })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createDocumentOnServer("Tagged Document", "content with tags", ["typescript", "nextjs"])).resolves.toEqual(
      document
    );
    expect(fetchMock).toHaveBeenCalledWith("/api/kb/docs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ title: "Tagged Document", content: "content with tags", tags: ["typescript", "nextjs"] })
    });
  });

  it("throws a meaningful message when server responds 401 on create", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: vi.fn().mockResolvedValue({ error: { message: "Unauthorized" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createDocumentOnServer("Auth Doc", "content")).rejects.toThrow(
      /unauthorized/i
    );
  });

  it("propagates network errors when fetch rejects during create", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Network failure"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createDocumentOnServer("Net Doc", "content")).rejects.toThrow(
      /network failure/i
    );
  });

  it("throws with server/fetch message on create failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: vi.fn().mockResolvedValue({ error: { message: "Internal Server Error" } })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(createDocumentOnServer("Fail Doc", "content")).rejects.toThrow(/server|fetch/i);
  });

  it("returns empty list when server responds with 401 on list", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchDocumentsFromServer()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith("/api/kb/docs", {
      credentials: "include"
    });
  });

  it("throws with Chinese error message when server returns 500 on list", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({
        error: { message: "获取文档列表失败。" }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchDocumentsFromServer()).rejects.toThrow("获取文档列表失败。");
  });
});

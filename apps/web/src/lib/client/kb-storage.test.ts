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
});

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("custom-wordbooks-client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("deleteCustomBook resolves when server returns { success:true, data:{ deleted:true } }", async () => {
    const jsonMock = vi.fn().mockResolvedValue({
      success: true,
      data: { deleted: true },
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

    const { deleteCustomBook } = await import("./custom-wordbooks-client");

    await expect(deleteCustomBook("test-id")).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/words/custom-books/test-id",
      { method: "DELETE" }
    );
  });
});

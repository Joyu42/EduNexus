import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ApiRequestError } from "@/lib/client/api";

describe("words storage api parsing safety", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("getWordBooks rejects with ApiRequestError (NOT SyntaxError) on non-JSON content-type", async () => {
    const jsonMock = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => {
          if (name === "content-type") return "text/html; charset=utf-8";
          return null;
        },
      },
      json: jsonMock,
    });
    vi.stubGlobal("fetch", fetchMock);

    const { wordsStorage } = await import("./storage");

    await expect(wordsStorage.getWordBooks()).rejects.toThrow(ApiRequestError);
    await expect(wordsStorage.getWordBooks()).rejects.toThrow(expect.not.objectContaining({ name: "SyntaxError" }));
    expect(jsonMock).not.toHaveBeenCalled();
  });

  it("getWordBooks rejects with ApiRequestError (NOT SyntaxError) when json() throws SyntaxError", async () => {
    const jsonMock = vi.fn().mockRejectedValue(new SyntaxError("Unexpected end of JSON input"));
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

    const { wordsStorage } = await import("./storage");

    await expect(wordsStorage.getWordBooks()).rejects.toThrow(ApiRequestError);
    await expect(wordsStorage.getWordBooks()).rejects.toThrow(expect.not.objectContaining({ name: "SyntaxError" }));
  });
});

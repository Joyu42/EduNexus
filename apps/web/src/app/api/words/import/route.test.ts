import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const createCustomWordBook = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId,
}));

vi.mock("@/lib/server/custom-wordbook-service", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/server/custom-wordbook-service")>();
  return {
    ...mod,
    createCustomWordBook,
  };
});

const { POST } = await import("./route");

function makeUploadBlob(content: string, type: string) {
  return new Blob([content], { type });
}

describe("custom wordbook import route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    getCurrentUserId.mockResolvedValueOnce(null);

    const response = await POST(new Request("http://localhost/api/words/import"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("returns 400 when missing file", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");

    const formData = new FormData();
    const response = await POST(
      new Request("http://localhost/api/words/import", {
        method: "POST",
        body: formData,
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "MISSING_FILE" },
    });
  });

  it("returns 400 for malformed JSON uploads", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");

    const formData = new FormData();
    formData.set("file", makeUploadBlob("{", "application/json"), "words.json");
    formData.set("format", "json");

    const response = await POST(
      new Request("http://localhost/api/words/import", {
        method: "POST",
        body: formData,
      })
    );

    expect(response.status).toBe(400);
    expect(createCustomWordBook).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INVALID_WORDBOOK_IMPORT" },
    });
  });

  it("returns 400 for malformed CSV uploads", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");

    const formData = new FormData();
    formData.set("file", makeUploadBlob("word,definition\n", "text/csv"), "words.csv");
    formData.set("format", "csv");

    const response = await POST(
      new Request("http://localhost/api/words/import", {
        method: "POST",
        body: formData,
      })
    );

    expect(response.status).toBe(400);
    expect(createCustomWordBook).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INVALID_WORDBOOK_IMPORT" },
    });
  });

  it("parses, dedupes by sense, and preserves sortOrder", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");
    createCustomWordBook.mockResolvedValueOnce({
      id: "custom_book_1",
      name: "My",
      description: "",
      wordCount: 2,
      category: "general",
    });

    const csv = [
      "word,definition",
      "hello,hi",
      "hello,hi",
      "hello,hey",
      "",
    ].join("\n");

    const formData = new FormData();
    formData.set("file", makeUploadBlob(csv, "text/csv"), "words.csv");
    formData.set("format", "csv");
    formData.set("name", "My");

    const response = await POST(
      new Request("http://localhost/api/words/import", {
        method: "POST",
        body: formData,
      })
    );

    expect(response.status).toBe(200);
    expect(createCustomWordBook).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_a",
        format: "csv",
        originalFilename: "words.csv",
        parsed: expect.objectContaining({
          name: "My",
          words: expect.arrayContaining([
            expect.objectContaining({ word: "hello", definition: "hi", sortOrder: 0 }),
            expect.objectContaining({ word: "hello", definition: "hey", sortOrder: 2 }),
          ]),
        }),
      })
    );
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { book: { id: "custom_book_1" } },
    });
  });
});

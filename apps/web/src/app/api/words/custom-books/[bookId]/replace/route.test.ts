import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const replaceCustomWordBook = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId,
}));

vi.mock("@/lib/server/custom-wordbook-service", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/server/custom-wordbook-service")>();
  return {
    ...mod,
    replaceCustomWordBook,
  };
});

const { WordImportError } = await import("@/lib/server/custom-wordbook-service");
const { POST } = await import("./route");

function makeUploadBlob(content: string, mimeType: string) {
  return new Blob([content], { type: mimeType });
}

describe("custom wordbook replace route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    getCurrentUserId.mockResolvedValueOnce(null);

    const response = await POST(new Request("http://localhost/api/words/custom-books/custom_book_1/replace"), {
      params: Promise.resolve({ bookId: "custom_book_1" }),
    });

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
      new Request("http://localhost/api/words/custom-books/custom_book_1/replace", {
        method: "POST",
        body: formData,
      }),
      { params: Promise.resolve({ bookId: "custom_book_1" }) }
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

    const response = await POST(
      new Request("http://localhost/api/words/custom-books/custom_book_1/replace", {
        method: "POST",
        body: formData,
      }),
      { params: Promise.resolve({ bookId: "custom_book_1" }) }
    );

    expect(response.status).toBe(400);
    expect(replaceCustomWordBook).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INVALID_WORDBOOK_IMPORT" },
    });
  });

  it("returns 400 for malformed CSV uploads", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");

    const formData = new FormData();
    formData.set("file", makeUploadBlob("", "text/csv"), "words.csv");

    const response = await POST(
      new Request("http://localhost/api/words/custom-books/custom_book_1/replace", {
        method: "POST",
        body: formData,
      }),
      { params: Promise.resolve({ bookId: "custom_book_1" }) }
    );

    expect(response.status).toBe(400);
    expect(replaceCustomWordBook).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INVALID_WORDBOOK_IMPORT" },
    });
  });

  it("returns 400 for oversized file uploads", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");

    const oversizedContent = "a".repeat(512 * 1024 + 1);
    const formData = new FormData();
    formData.set("file", makeUploadBlob(oversizedContent, "text/csv"), "words.csv");

    const response = await POST(
      new Request("http://localhost/api/words/custom-books/custom_book_1/replace", {
        method: "POST",
        body: formData,
      }),
      { params: Promise.resolve({ bookId: "custom_book_1" }) }
    );

    expect(response.status).toBe(400);
    expect(replaceCustomWordBook).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INVALID_WORDBOOK_IMPORT" },
    });
  });

  it("returns 404 when replacing a missing book", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");
    replaceCustomWordBook.mockRejectedValueOnce(new WordImportError("BOOK_NOT_FOUND"));

    const formData = new FormData();
    formData.set("file", makeUploadBlob("word,definition\na,b\n", "text/csv"), "words.csv");

    const response = await POST(
      new Request("http://localhost/api/words/custom-books/custom_book_missing/replace", {
        method: "POST",
        body: formData,
      }),
      { params: Promise.resolve({ bookId: "custom_book_missing" }) }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "BOOK_NOT_FOUND" },
    });
  });

  it("replaces book content when valid", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");
    replaceCustomWordBook.mockResolvedValueOnce({
      id: "custom_book_1",
      name: "Book",
      description: "",
      wordCount: 1,
      category: "general",
    });

    const formData = new FormData();
    formData.set("file", makeUploadBlob("word,definition\na,b\n", "text/csv"), "words.csv");

    const response = await POST(
      new Request("http://localhost/api/words/custom-books/custom_book_1/replace", {
        method: "POST",
        body: formData,
      }),
      { params: Promise.resolve({ bookId: "custom_book_1" }) }
    );

    expect(response.status).toBe(200);
    expect(replaceCustomWordBook).toHaveBeenCalledWith(
      "user_a",
      "custom_book_1",
      expect.objectContaining({ words: expect.any(Array) }),
      "csv",
      "words.csv"
    );
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { book: { id: "custom_book_1" } },
    });
  });
});

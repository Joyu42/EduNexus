import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const getCustomWordBook = vi.fn();
const listCustomWords = vi.fn();
const updateCustomWordBook = vi.fn();
const deleteCustomWordBook = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId,
}));

vi.mock("@/lib/server/custom-wordbook-service", () => ({
  getCustomWordBook,
  listCustomWords,
  updateCustomWordBook,
  deleteCustomWordBook,
}));

const { GET, PUT, DELETE } = await import("./route");

describe("custom wordbook bookId routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    getCurrentUserId.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/words/custom-books/custom_book_x"), {
      params: Promise.resolve({ bookId: "custom_book_x" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("returns 401 when unauthenticated on update", async () => {
    getCurrentUserId.mockResolvedValueOnce(null);

    const response = await PUT(
      new Request("http://localhost/api/words/custom-books/custom_book_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New" }),
      }),
      { params: Promise.resolve({ bookId: "custom_book_1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("returns 401 when unauthenticated on delete", async () => {
    getCurrentUserId.mockResolvedValueOnce(null);

    const response = await DELETE(new Request("http://localhost/api/words/custom-books/custom_book_1"), {
      params: Promise.resolve({ bookId: "custom_book_1" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("returns 404 when book not found", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");
    getCustomWordBook.mockResolvedValueOnce(null);

    const response = await GET(new Request("http://localhost/api/words/custom-books/custom_book_missing"), {
      params: Promise.resolve({ bookId: "custom_book_missing" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "BOOK_NOT_FOUND" },
    });
  });

  it("returns book and words when found", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");
    getCustomWordBook.mockResolvedValueOnce({ id: "custom_book_1", name: "B", description: "", wordCount: 1, category: "general" });
    listCustomWords.mockResolvedValueOnce([{ id: "custom_word_1", word: "a", phonetic: "", definition: "b", example: "", bookId: "custom_book_1", difficulty: "medium" }]);

    const response = await GET(new Request("http://localhost/api/words/custom-books/custom_book_1"), {
      params: Promise.resolve({ bookId: "custom_book_1" }),
    });

    expect(response.status).toBe(200);
    expect(getCustomWordBook).toHaveBeenCalledWith("user_a", "custom_book_1");
    expect(listCustomWords).toHaveBeenCalledWith("user_a", { bookId: "custom_book_1" });
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        book: { id: "custom_book_1" },
        words: [{ id: "custom_word_1" }],
      },
    });
  });

  it("rejects metadata update payloads missing changes", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");

    const response = await PUT(
      new Request("http://localhost/api/words/custom-books/custom_book_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ bookId: "custom_book_1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INVALID_PAYLOAD" },
    });
  });

  it("rejects empty name on metadata update", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");

    const response = await PUT(
      new Request("http://localhost/api/words/custom-books/custom_book_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "   " }),
      }),
      { params: Promise.resolve({ bookId: "custom_book_1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INVALID_PAYLOAD" },
    });
  });

  it("returns 404 when updating missing book", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");
    updateCustomWordBook.mockResolvedValueOnce(null);

    const response = await PUT(
      new Request("http://localhost/api/words/custom-books/custom_book_missing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New" }),
      }),
      { params: Promise.resolve({ bookId: "custom_book_missing" }) }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "BOOK_NOT_FOUND" },
    });
  });

  it("trims and passes updates to service", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");
    updateCustomWordBook.mockResolvedValueOnce({
      id: "custom_book_1",
      name: "New",
      description: "Desc",
      wordCount: 1,
      category: "general",
    });

    const response = await PUT(
      new Request("http://localhost/api/words/custom-books/custom_book_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "  New  ", description: "  Desc  " }),
      }),
      { params: Promise.resolve({ bookId: "custom_book_1" }) }
    );

    expect(response.status).toBe(200);
    expect(updateCustomWordBook).toHaveBeenCalledWith("user_a", "custom_book_1", {
      name: "New",
      description: "Desc",
    });
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { book: { id: "custom_book_1" } },
    });
  });

  it("returns 404 when deleting missing book", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");
    deleteCustomWordBook.mockResolvedValueOnce(false);

    const response = await DELETE(new Request("http://localhost/api/words/custom-books/custom_book_missing"), {
      params: Promise.resolve({ bookId: "custom_book_missing" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "BOOK_NOT_FOUND" },
    });
  });

  it("deletes book when authorized", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");
    deleteCustomWordBook.mockResolvedValueOnce(true);

    const response = await DELETE(new Request("http://localhost/api/words/custom-books/custom_book_1"), {
      params: Promise.resolve({ bookId: "custom_book_1" }),
    });

    expect(response.status).toBe(200);
    expect(deleteCustomWordBook).toHaveBeenCalledWith("user_a", "custom_book_1");
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: { deleted: true },
    });
  });
});

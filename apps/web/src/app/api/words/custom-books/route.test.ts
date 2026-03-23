import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const listCustomWordBooks = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId,
}));

vi.mock("@/lib/server/custom-wordbook-service", () => ({
  listCustomWordBooks,
}));

const { GET } = await import("./route");

describe("custom wordbook list route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    getCurrentUserId.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("lists books scoped to user", async () => {
    getCurrentUserId.mockResolvedValueOnce("user_a");
    listCustomWordBooks.mockResolvedValueOnce([
      { id: "custom_book_1", name: "A", description: "", wordCount: 2, category: "general" },
      { id: "custom_book_2", name: "B", description: "", wordCount: 1, category: "general" },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(listCustomWordBooks).toHaveBeenCalledWith("user_a");
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        books: [{ id: "custom_book_1" }, { id: "custom_book_2" }],
      },
    });
  });
});

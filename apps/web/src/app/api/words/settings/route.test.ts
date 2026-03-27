import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const getWordsPlanSettings = vi.fn();
const saveWordsPlanSettings = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId,
}));

vi.mock("@/lib/server/words-service", () => ({
  getWordsPlanSettings,
  saveWordsPlanSettings,
}));

const { GET, PUT } = await import("./route");

describe("words settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      getCurrentUserId.mockResolvedValueOnce(null);

      const response = await GET();

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: { code: "UNAUTHORIZED" },
      });
    });

    it("returns settings with selectedMajor and lastSelectedBookId for authenticated user", async () => {
      getCurrentUserId.mockResolvedValueOnce("user_a");
      getWordsPlanSettings.mockResolvedValueOnce({
        dailyNewLimit: 20,
        reviewFirst: true,
        defaultRevealMode: "hidden",
        selectedMajor: "",
        lastSelectedBookId: "book_123",
      });

      const response = await GET();

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        success: true,
        data: {
          settings: {
            selectedMajor: "",
            lastSelectedBookId: "book_123",
          },
        },
      });
    });

    it("returns selectedMajor with actual major value", async () => {
      getCurrentUserId.mockResolvedValueOnce("user_a");
      getWordsPlanSettings.mockResolvedValueOnce({
        dailyNewLimit: 20,
        reviewFirst: true,
        defaultRevealMode: "hidden",
        selectedMajor: "computer",
        lastSelectedBookId: "book_456",
      });

      const response = await GET();

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toMatchObject({
        success: true,
        data: {
          settings: {
            selectedMajor: "computer",
            lastSelectedBookId: "book_456",
          },
        },
      });
    });
  });

  describe("PUT", () => {
    it("returns 401 when unauthenticated", async () => {
      getCurrentUserId.mockResolvedValueOnce(null);

      const response = await PUT(new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyNewLimit: 20,
          reviewFirst: true,
          defaultRevealMode: "hidden",
          selectedMajor: "computer",
          lastSelectedBookId: "book_123",
        }),
      }));

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: { code: "UNAUTHORIZED" },
      });
    });

    it("accepts valid selectedMajor and lastSelectedBookId", async () => {
      getCurrentUserId.mockResolvedValueOnce("user_a");
      saveWordsPlanSettings.mockResolvedValueOnce(undefined);

      const response = await PUT(new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyNewLimit: 20,
          reviewFirst: true,
          defaultRevealMode: "hidden",
          selectedMajor: "computer",
          lastSelectedBookId: "book_123",
        }),
      }));

      expect(response.status).toBe(200);
      expect(saveWordsPlanSettings).toHaveBeenCalledWith("user_a", {
        dailyNewLimit: 20,
        reviewFirst: true,
        defaultRevealMode: "hidden",
        selectedMajor: "computer",
        lastSelectedBookId: "book_123",
      });
    });

    it("accepts empty string selectedMajor", async () => {
      getCurrentUserId.mockResolvedValueOnce("user_a");
      saveWordsPlanSettings.mockResolvedValueOnce(undefined);

      const response = await PUT(new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyNewLimit: 20,
          reviewFirst: true,
          defaultRevealMode: "hidden",
          selectedMajor: "",
          lastSelectedBookId: "book_456",
        }),
      }));

      expect(response.status).toBe(200);
      expect(saveWordsPlanSettings).toHaveBeenCalledWith("user_a", {
        dailyNewLimit: 20,
        reviewFirst: true,
        defaultRevealMode: "hidden",
        selectedMajor: "",
        lastSelectedBookId: "book_456",
      });
    });

    it("rejects invalid selectedMajor value", async () => {
      getCurrentUserId.mockResolvedValueOnce("user_a");

      const response = await PUT(new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyNewLimit: 20,
          reviewFirst: true,
          defaultRevealMode: "hidden",
          selectedMajor: "invalid_major",
          lastSelectedBookId: "book_123",
        }),
      }));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          details: expect.objectContaining({
            selectedMajor: expect.any(Array),
          }),
        },
      });
    });
  });
});

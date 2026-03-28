import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn<() => Promise<string | null>>();
const loadDb = vi.fn<
  () => Promise<{ publicResources: Array<{ id: string; title?: string }> }>
>();
const listResourceBookmarks = vi.fn<
  (userId?: string, resourceId?: string) => Promise<any[]>
>();
const createResourceBookmark = vi.fn<
  (input: { userId: string; resourceId: string }) => Promise<any>
>();
const deleteResourceBookmark = vi.fn<(bookmarkId: string) => Promise<boolean>>();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId
}));

vi.mock("@/lib/server/store", () => ({
  loadDb
}));

vi.mock("@/lib/server/resources-service", () => ({
  listResourceBookmarks,
  createResourceBookmark,
  deleteResourceBookmark
}));

const route = await import("./route");

describe("resources bookmarks api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("session-user");
    loadDb.mockResolvedValue({
      publicResources: [{ id: "resource_1", title: "Resource" }]
    });
    listResourceBookmarks.mockResolvedValue([]);
    createResourceBookmark.mockResolvedValue({
      id: "resource_bookmark_1",
      userId: "session-user",
      resourceId: "resource_1",
      createdAt: "2026-03-17T00:00:00.000Z"
    });
    deleteResourceBookmark.mockResolvedValue(true);
  });

  it("GET returns 401 when not signed in", async () => {
    getCurrentUserId.mockResolvedValueOnce(null);
    const response = await route.GET();
    expect(response.status).toBe(401);
  });

  it("GET returns current user's bookmarks", async () => {
    listResourceBookmarks.mockResolvedValueOnce([
      {
        id: "resource_bookmark_1",
        userId: "session-user",
        resourceId: "resource_1",
        createdAt: "2026-03-17T00:00:00.000Z"
      }
    ]);

    const response = await route.GET();
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { success: boolean; data?: { bookmarks: unknown[] } };
    expect(payload.success).toBe(true);
    expect(payload.data?.bookmarks).toHaveLength(1);
  });

  it("POST returns 401 when not signed in", async () => {
    getCurrentUserId.mockResolvedValueOnce(null);
    const response = await route.POST(
      new Request("http://localhost/api/resources/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: "resource_1" })
      })
    );
    expect(response.status).toBe(401);
  });

  it("POST validates resourceId", async () => {
    const response = await route.POST(
      new Request("http://localhost/api/resources/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: "" })
      })
    );
    expect(response.status).toBe(400);
  });

  it("POST returns 404 when resource does not exist", async () => {
    loadDb.mockResolvedValueOnce({ publicResources: [] });
    const response = await route.POST(
      new Request("http://localhost/api/resources/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: "resource_missing" })
      })
    );
    expect(response.status).toBe(404);
  });

  it("POST returns 409 when bookmark already exists", async () => {
    listResourceBookmarks.mockResolvedValueOnce([
      {
        id: "resource_bookmark_existing",
        userId: "session-user",
        resourceId: "resource_1",
        createdAt: "2026-03-17T00:00:00.000Z"
      }
    ]);
    const response = await route.POST(
      new Request("http://localhost/api/resources/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: "resource_1" })
      })
    );
    expect(response.status).toBe(409);
  });

  it("POST creates a bookmark for current user", async () => {
    const response = await route.POST(
      new Request("http://localhost/api/resources/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: "resource_1" })
      })
    );

    expect(response.status).toBe(200);
    expect(createResourceBookmark).toHaveBeenCalledWith({
      userId: "session-user",
      resourceId: "resource_1"
    });
  });

  it("DELETE returns 401 when not signed in", async () => {
    getCurrentUserId.mockResolvedValueOnce(null);
    const response = await route.DELETE(new Request("http://localhost/api/resources/bookmarks?bookmarkId=x"));
    expect(response.status).toBe(401);
  });

  it("DELETE validates bookmarkId query", async () => {
    const response = await route.DELETE(new Request("http://localhost/api/resources/bookmarks"));
    expect(response.status).toBe(400);
  });

  it("DELETE returns 404 when bookmark does not exist", async () => {
    listResourceBookmarks.mockResolvedValueOnce([]);
    const response = await route.DELETE(
      new Request("http://localhost/api/resources/bookmarks?bookmarkId=resource_bookmark_missing")
    );
    expect(response.status).toBe(404);
  });

  it("DELETE returns 403 when bookmark belongs to another user", async () => {
    listResourceBookmarks.mockResolvedValueOnce([
      {
        id: "resource_bookmark_1",
        userId: "other-user",
        resourceId: "resource_1",
        createdAt: "2026-03-17T00:00:00.000Z"
      }
    ]);
    const response = await route.DELETE(
      new Request("http://localhost/api/resources/bookmarks?bookmarkId=resource_bookmark_1")
    );
    expect(response.status).toBe(403);
  });

  it("DELETE removes bookmark", async () => {
    listResourceBookmarks.mockResolvedValueOnce([
      {
        id: "resource_bookmark_1",
        userId: "session-user",
        resourceId: "resource_1",
        createdAt: "2026-03-17T00:00:00.000Z"
      }
    ]);
    const response = await route.DELETE(
      new Request("http://localhost/api/resources/bookmarks?bookmarkId=resource_bookmark_1")
    );
    expect(response.status).toBe(200);
    expect(deleteResourceBookmark).toHaveBeenCalledWith("resource_bookmark_1");
  });
});

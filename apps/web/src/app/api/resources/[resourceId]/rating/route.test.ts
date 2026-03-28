import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn<() => Promise<string | null>>();
const loadDb = vi.fn();
const listResourceRatings = vi.fn();
const createResourceRating = vi.fn();
const updateResourceRating = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId
}));

vi.mock("@/lib/server/store", () => ({
  loadDb
}));

vi.mock("@/lib/server/resources-service", () => ({
  listResourceRatings,
  createResourceRating,
  updateResourceRating
}));

const route = await import("./route");

describe("resource rating api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("session-user");
    loadDb.mockResolvedValue({
      publicResources: [{ id: "resource_1", title: "Resource" }]
    });
    listResourceRatings.mockResolvedValue([]);
    createResourceRating.mockResolvedValue({
      id: "resource_rating_1",
      userId: "session-user",
      resourceId: "resource_1",
      rating: 4,
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z"
    });
    updateResourceRating.mockResolvedValue({
      id: "resource_rating_1",
      userId: "session-user",
      resourceId: "resource_1",
      rating: 5,
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z"
    });
  });

  it("GET returns 401 when not signed in", async () => {
    getCurrentUserId.mockResolvedValueOnce(null);
    const response = await route.GET(new Request("http://localhost/api/resources/resource_1/rating"), {
      params: Promise.resolve({ resourceId: "resource_1" })
    });
    expect(response.status).toBe(401);
  });

  it("GET returns null when user has no rating", async () => {
    listResourceRatings.mockResolvedValueOnce([]);
    const response = await route.GET(new Request("http://localhost/api/resources/resource_1/rating"), {
      params: Promise.resolve({ resourceId: "resource_1" })
    });
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { success: boolean; data?: { rating: unknown } };
    expect(payload.success).toBe(true);
    expect(payload.data?.rating).toBe(null);
  });

  it("GET returns current user's rating record", async () => {
    listResourceRatings.mockResolvedValueOnce([
      {
        id: "resource_rating_1",
        userId: "session-user",
        resourceId: "resource_1",
        rating: 3,
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z"
      }
    ]);
    const response = await route.GET(new Request("http://localhost/api/resources/resource_1/rating"), {
      params: Promise.resolve({ resourceId: "resource_1" })
    });
    expect(response.status).toBe(200);
    const payload = (await response.json()) as { success: boolean; data?: { rating: { rating: number } } };
    expect(payload.data?.rating.rating).toBe(3);
  });

  it("POST returns 401 when not signed in", async () => {
    getCurrentUserId.mockResolvedValueOnce(null);
    const response = await route.POST(
      new Request("http://localhost/api/resources/resource_1/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: 4 })
      }),
      { params: Promise.resolve({ resourceId: "resource_1" }) }
    );
    expect(response.status).toBe(401);
  });

  it("POST validates rating payload", async () => {
    const response = await route.POST(
      new Request("http://localhost/api/resources/resource_1/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: "bad" })
      }),
      { params: Promise.resolve({ resourceId: "resource_1" }) }
    );
    expect(response.status).toBe(400);
  });

  it("POST returns 404 when resource does not exist", async () => {
    loadDb.mockResolvedValueOnce({ publicResources: [] });
    const response = await route.POST(
      new Request("http://localhost/api/resources/resource_missing/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: 4 })
      }),
      { params: Promise.resolve({ resourceId: "resource_missing" }) }
    );
    expect(response.status).toBe(404);
  });

  it("POST returns 409 when rating already exists", async () => {
    listResourceRatings.mockResolvedValueOnce([
      {
        id: "resource_rating_existing",
        userId: "session-user",
        resourceId: "resource_1",
        rating: 4,
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z"
      }
    ]);
    const response = await route.POST(
      new Request("http://localhost/api/resources/resource_1/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: 4 })
      }),
      { params: Promise.resolve({ resourceId: "resource_1" }) }
    );
    expect(response.status).toBe(409);
  });

  it("POST creates rating", async () => {
    const response = await route.POST(
      new Request("http://localhost/api/resources/resource_1/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: 4 })
      }),
      { params: Promise.resolve({ resourceId: "resource_1" }) }
    );
    expect(response.status).toBe(200);
    expect(createResourceRating).toHaveBeenCalledWith({
      userId: "session-user",
      resourceId: "resource_1",
      rating: 4
    });
  });

  it("PATCH upserts when rating does not exist", async () => {
    listResourceRatings.mockResolvedValueOnce([]);
    const response = await route.PATCH(
      new Request("http://localhost/api/resources/resource_1/rating", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: 4 })
      }),
      { params: Promise.resolve({ resourceId: "resource_1" }) }
    );
    expect(response.status).toBe(200);
    expect(createResourceRating).toHaveBeenCalled();
  });

  it("PATCH updates when rating exists", async () => {
    listResourceRatings.mockResolvedValueOnce([
      {
        id: "resource_rating_1",
        userId: "session-user",
        resourceId: "resource_1",
        rating: 3,
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z"
      }
    ]);

    const response = await route.PATCH(
      new Request("http://localhost/api/resources/resource_1/rating", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: 5 })
      }),
      { params: Promise.resolve({ resourceId: "resource_1" }) }
    );

    expect(response.status).toBe(200);
    expect(updateResourceRating).toHaveBeenCalledWith("resource_rating_1", { rating: 5 });
  });
});

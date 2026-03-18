import { beforeEach, describe, expect, it, vi } from "vitest";

const loadDb = vi.fn();

vi.mock("@/lib/server/store", () => ({
  loadDb
}));

const route = await import("./route");

describe("analytics stats api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadDb.mockResolvedValue({
      sessions: [{ createdAt: "2026-03-10T00:00:00.000Z" }, { createdAt: "2026-03-11T00:00:00.000Z" }],
      plans: [{ createdAt: "2026-03-11T00:00:00.000Z" }],
      syncedPaths: [{ updatedAt: "2026-03-12T00:00:00.000Z" }],
      publicResources: [{ createdAt: "2026-03-12T00:00:00.000Z" }],
      publicGroups: [{ createdAt: "2026-03-12T00:00:00.000Z" }],
      publicPosts: [{ createdAt: "2026-03-12T00:00:00.000Z" }],
      analyticsEvents: [{ occurredAt: "2026-03-12T00:00:00.000Z" }]
    });
  });

  it("returns totals and range in response", async () => {
    const response = await route.GET(new Request("http://localhost/api/analytics/stats?range=30d"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.range).toBe("30d");
    expect(body.data.totalSessions).toBe(2);
    expect(body.data.totalPosts).toBe(1);
    expect(Array.isArray(body.data.dailySeries)).toBe(true);
  });

  it("falls back to default range when invalid", async () => {
    const response = await route.GET(new Request("http://localhost/api/analytics/stats?range=foo"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.range).toBe("30d");
  });
});

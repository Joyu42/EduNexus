import { beforeEach, describe, expect, it, vi } from "vitest";

const { listAnalyticsEvents, listAnalyticsSnapshots } = vi.hoisted(() => ({
  listAnalyticsEvents: vi.fn(),
  listAnalyticsSnapshots: vi.fn()
}));

vi.mock("@/lib/server/analytics-service", () => ({
  listAnalyticsEvents,
  listAnalyticsSnapshots
}));

const route = await import("./route");

describe("analytics insights route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAnalyticsEvents.mockResolvedValue([]);
    listAnalyticsSnapshots.mockResolvedValue([]);
  });

  it("returns deterministic insights with cache headers", async () => {
    const response = await route.GET(new Request("http://localhost/api/analytics/insights"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, max-age=60");
    expect(body.success).toBe(true);
    expect(body.data.insights.map((item: { id: string }) => item.id)).toEqual([
      "activity-volume",
      "study-consistency",
      "snapshot-coverage"
    ]);
  });

  it("returns 400 for invalid range", async () => {
    const response = await route.GET(new Request("http://localhost/api/analytics/insights?range=yearly"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVALID_RANGE");
  });

  it("returns 500 on analytics query error", async () => {
    listAnalyticsSnapshots.mockRejectedValueOnce(new Error("db down"));

    const response = await route.GET(new Request("http://localhost/api/analytics/insights"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("ANALYTICS_INSIGHTS_FAILED");
  });
});

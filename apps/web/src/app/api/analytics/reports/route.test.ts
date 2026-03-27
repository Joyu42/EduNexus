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

describe("analytics reports route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const nowIso = new Date().toISOString();
    listAnalyticsEvents.mockResolvedValue([
      {
        id: "event-1",
        userId: "u-1",
        name: "session_start",
        category: "learning",
        occurredAt: nowIso,
        payload: {}
      }
    ]);
    listAnalyticsSnapshots.mockResolvedValue([
      {
        id: "snapshot-1",
        userId: "u-1",
        scope: "dashboard",
        period: "daily",
        metrics: { studyMinutes: 30 },
        capturedAt: nowIso
      }
    ]);
  });

  it("returns weekly structured report with cache headers", async () => {
    const response = await route.GET(new Request("http://localhost/api/analytics/reports?range=weekly"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, max-age=60");
    expect(body.success).toBe(true);
    expect(body.data.report.range).toBe("weekly");
    expect(body.data.report.totals.eventCount).toBe(1);
    expect(body.data.report.totals.snapshotCount).toBe(1);
  });

  it("returns 400 for invalid range", async () => {
    const response = await route.GET(new Request("http://localhost/api/analytics/reports?range=yearly"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVALID_RANGE");
  });

  it("returns 500 when upstream analytics query fails", async () => {
    listAnalyticsEvents.mockRejectedValueOnce(new Error("db down"));

    const response = await route.GET(new Request("http://localhost/api/analytics/reports?range=monthly"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("ANALYTICS_REPORTS_FAILED");
  });
});

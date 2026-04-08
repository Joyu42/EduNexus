import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const getWordsAnalyticsReport = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId
}));

vi.mock("@/lib/server/analytics-service", () => ({
  getWordsAnalyticsReport
}));

const route = await import("./route");

describe("analytics reports route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("u-1");
    getWordsAnalyticsReport.mockResolvedValue({
      range: "weekly",
      window: { start: "2026-03-14", end: "2026-03-20", days: 7 },
      totals: {
        eventCount: 2,
        snapshotCount: 1,
        uniqueEventNames: 1,
        uniqueEventCategories: 1,
        latestSnapshotMetrics: {},
        aggregateSnapshotMetrics: {}
      },
      timeline: [],
      topEvents: [],
      topCategories: [],
      streakDays: 4,
      learnedToday: 1,
      reviewedToday: 1,
      relearnedToday: 0,
      accuracyToday: 1,
      totalWords: 10,
      learnedWords: 2,
      masteredWords: 1,
      dueToday: 3,
      recentProgress: {
        rangeDays: 7,
        startDate: "2026-03-14",
        endDate: "2026-03-20",
        activeDays: 2,
        learnedWordsInRange: 2,
        reviewedCountInRange: 1,
        relearnedCountInRange: 0,
        averageDailyLearnedWords: 0.3
      },
      bookProgress: []
    });
  });

  it("returns weekly structured report with cache headers", async () => {
    const response = await route.GET(new Request("http://localhost/api/analytics/reports?range=weekly"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, max-age=60");
    expect(body.success).toBe(true);
    expect(body.data.report.range).toBe("weekly");
    expect(body.data.report.streakDays).toBe(4);
    expect(body.data.report.learnedToday).toBe(1);
    expect(body.data.report.reviewedToday).toBe(1);
    expect(body.data.report.totalWords).toBe(10);
  });

  it("returns 400 for invalid range", async () => {
    const response = await route.GET(new Request("http://localhost/api/analytics/reports?range=yearly"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INVALID_RANGE");
  });

  it("returns 500 when upstream analytics query fails", async () => {
    getWordsAnalyticsReport.mockRejectedValueOnce(new Error("db down"));

    const response = await route.GET(new Request("http://localhost/api/analytics/reports?range=monthly"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("ANALYTICS_REPORTS_FAILED");
  });

  it("returns 401 when unauthenticated", async () => {
    getCurrentUserId.mockResolvedValueOnce(null);

    const response = await route.GET(new Request("http://localhost/api/analytics/reports?range=weekly"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});

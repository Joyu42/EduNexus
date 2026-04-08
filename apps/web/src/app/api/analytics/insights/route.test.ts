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

describe("analytics insights route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("u-1");
    getWordsAnalyticsReport.mockResolvedValue({
      range: "weekly",
      window: { start: "2026-03-14", end: "2026-03-20", days: 7 },
      totals: {
        eventCount: 0,
        snapshotCount: 0,
        uniqueEventNames: 0,
        uniqueEventCategories: 0,
        latestSnapshotMetrics: {},
        aggregateSnapshotMetrics: {}
      },
      timeline: [
        { day: "2026-03-14", events: 0, snapshots: 0 },
        { day: "2026-03-15", events: 0, snapshots: 0 },
        { day: "2026-03-16", events: 0, snapshots: 0 },
        { day: "2026-03-17", events: 0, snapshots: 0 },
        { day: "2026-03-18", events: 0, snapshots: 0 },
        { day: "2026-03-19", events: 0, snapshots: 0 },
        { day: "2026-03-20", events: 0, snapshots: 0 }
      ],
      topEvents: [],
      topCategories: [],
      streakDays: 0,
      learnedToday: 0,
      reviewedToday: 0,
      relearnedToday: 0,
      accuracyToday: 0,
      totalWords: 0,
      learnedWords: 0,
      masteredWords: 0,
      dueToday: 0,
      recentProgress: {
        rangeDays: 7,
        startDate: "2026-03-14",
        endDate: "2026-03-20",
        activeDays: 0,
        learnedWordsInRange: 0,
        reviewedCountInRange: 0,
        relearnedCountInRange: 0,
        averageDailyLearnedWords: 0
      },
      bookProgress: []
    });
  });

  it("returns deterministic insights with cache headers", async () => {
    const response = await route.GET(new Request("http://localhost/api/analytics/insights"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, max-age=60");
    expect(body.success).toBe(true);
    expect(body.data.insights.map((item: { id: string }) => item.id)).toEqual([
      "study-streak",
      "due-pressure",
      "focus-book"
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
    getWordsAnalyticsReport.mockRejectedValueOnce(new Error("db down"));

    const response = await route.GET(new Request("http://localhost/api/analytics/insights"));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("ANALYTICS_INSIGHTS_FAILED");
  });

  it("returns 401 when unauthenticated", async () => {
    getCurrentUserId.mockResolvedValueOnce(null);

    const response = await route.GET(new Request("http://localhost/api/analytics/insights"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });
});

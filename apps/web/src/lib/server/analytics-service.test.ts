import { beforeEach, describe, expect, it, vi } from "vitest";

const listWordsLearningRecords = vi.fn();
const listWordBooks = vi.fn();
const listWords = vi.fn();

vi.mock("./words-service", () => ({
  getWordsProgressSummary: vi.fn(),
  listWordsLearningRecords,
  listWordBooks,
  listWords
}));

const { getWordsProgressSummary } = await import("./words-service");
const { getWordsAnalyticsReport, mapWordsProgressSummaryToAnalyticsReport } = await import("./analytics-service");

describe("analytics service words mapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWordsProgressSummary).mockResolvedValue({
      date: "2026-03-20",
      recentProgress: {
        rangeDays: 7,
        startDate: "2026-03-14",
        endDate: "2026-03-20",
        activeDays: 3,
        learnedWordsInRange: 2,
        reviewedCountInRange: 1,
        relearnedCountInRange: 1,
        averageDailyLearnedWords: 0.3
      },
      streakDays: 5,
      dueToday: 4,
      hasDueReview: true,
      learnedToday: 1,
      reviewedToday: 2,
      relearnedToday: 1,
      totalWords: 20,
      learnedWords: 8,
      masteredWords: 3,
      accuracyToday: 0.5,
      suggestedBookId: "book-1",
      bookProgress: [
        {
          bookId: "book-1",
          bookName: "Book 1",
          totalWords: 10,
          learnedWords: 6,
          masteredWords: 2,
          dueToday: 3,
          progressPercent: 20
        }
      ]
    });
  });

  it("maps populated learning summary into analytics report", async () => {
    const report = await getWordsAnalyticsReport("user-1", "weekly", "2026-03-20");

    expect(getWordsProgressSummary).toHaveBeenCalledWith("user-1", "2026-03-20", 7);
    expect(report.range).toBe("weekly");
    expect(report.streakDays).toBe(5);
    expect(report.learnedToday).toBe(1);
    expect(report.reviewedToday).toBe(2);
    expect(report.relearnedToday).toBe(1);
    expect(report.accuracyToday).toBe(0.5);
    expect(report.totalWords).toBe(20);
    expect(report.learnedWords).toBe(8);
    expect(report.masteredWords).toBe(3);
    expect(report.dueToday).toBe(4);
    expect(report.recentProgress).toMatchObject({
      rangeDays: 7,
      learnedWordsInRange: 2,
      reviewedCountInRange: 1,
      relearnedCountInRange: 1
    });
    expect(report.bookProgress).toHaveLength(1);
    expect(report.totals.eventCount).toBe(4);
    expect(report.totals.snapshotCount).toBe(1);
  });

  it("maps empty learning summary into empty-safe report", () => {
    const report = mapWordsProgressSummaryToAnalyticsReport(
      {
        date: "2026-03-20",
        recentProgress: {
          rangeDays: 30,
          startDate: "2026-02-19",
          endDate: "2026-03-20",
          activeDays: 0,
          learnedWordsInRange: 0,
          reviewedCountInRange: 0,
          relearnedCountInRange: 0,
          averageDailyLearnedWords: 0
        },
        streakDays: 0,
        dueToday: 0,
        hasDueReview: false,
        learnedToday: 0,
        reviewedToday: 0,
        relearnedToday: 0,
        totalWords: 0,
        learnedWords: 0,
        masteredWords: 0,
        accuracyToday: 0,
        suggestedBookId: null,
        bookProgress: []
      },
      "monthly"
    );

    expect(report.range).toBe("monthly");
    expect(report.totals.eventCount).toBe(0);
    expect(report.totals.snapshotCount).toBe(0);
    expect(report.topEvents).toEqual([]);
    expect(report.topCategories).toEqual([]);
    expect(report.timeline).toHaveLength(30);
    expect(report.timeline.every((item) => item.events === 0 && item.snapshots === 0)).toBe(true);
  });
});

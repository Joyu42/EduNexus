export type AnalyticsRange = "weekly" | "monthly";

export type AnalyticsEventLike = {
  name: string;
  category: string;
  occurredAt: string;
  [key: string]: unknown;
};

export type AnalyticsSnapshotLike = {
  capturedAt: string;
  metrics: Record<string, number>;
  [key: string]: unknown;
};

export type AnalyticsReport = {
  range: AnalyticsRange;
  window: {
    start: string;
    end: string;
    days: number;
  };
  totals: {
    eventCount: number;
    snapshotCount: number;
    uniqueEventNames: number;
    uniqueEventCategories: number;
    latestSnapshotMetrics: Record<string, number>;
    aggregateSnapshotMetrics: Record<string, number>;
  };
  timeline: Array<{
    day: string;
    events: number;
    snapshots: number;
  }>;
  topEvents: Array<{
    name: string;
    count: number;
  }>;
  topCategories: Array<{
    category: string;
    count: number;
  }>;
};

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  weekly: 7,
  monthly: 30
};

function toUtcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function endOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function createWindow(range: AnalyticsRange, now: Date) {
  const days = RANGE_DAYS[range];
  const end = endOfUtcDay(now);
  const start = startOfUtcDay(now);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return {
    start,
    end,
    days
  };
}

function parseTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }
  return parsed;
}

function createTimeline(start: Date, days: number) {
  const timeline: Array<{ day: string; events: number; snapshots: number }> = [];
  for (let index = 0; index < days; index += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    timeline.push({
      day: toUtcDayKey(date),
      events: 0,
      snapshots: 0
    });
  }
  return timeline;
}

function topEntries(entries: Map<string, number>, key: "name" | "category") {
  return Array.from(entries.entries())
    .sort((left, right) => {
      const [, leftCount] = left;
      const [, rightCount] = right;
      if (leftCount !== rightCount) {
        return rightCount - leftCount;
      }
      return left[0].localeCompare(right[0]);
    })
    .map(([value, count]) => ({ [key]: value, count }))
    .slice(0, 5);
}

export function buildAnalyticsReport(input: {
  range: AnalyticsRange;
  events: AnalyticsEventLike[];
  snapshots: AnalyticsSnapshotLike[];
  now?: Date;
}): AnalyticsReport {
  const now = input.now ?? new Date();
  const window = createWindow(input.range, now);
  const timeline = createTimeline(window.start, window.days);
  const timelineByDay = new Map(timeline.map((item) => [item.day, item]));
  const eventCountsByName = new Map<string, number>();
  const eventCountsByCategory = new Map<string, number>();
  const aggregateSnapshotMetrics: Record<string, number> = {};

  let latestSnapshotAt = Number.NEGATIVE_INFINITY;
  let latestSnapshotMetrics: Record<string, number> = {};
  let eventCount = 0;
  let snapshotCount = 0;

  for (const event of input.events) {
    const parsed = parseTimestamp(event.occurredAt);
    if (!parsed || parsed < window.start || parsed > window.end) {
      continue;
    }

    eventCount += 1;
    const day = toUtcDayKey(parsed);
    const timelineEntry = timelineByDay.get(day);
    if (timelineEntry) {
      timelineEntry.events += 1;
    }

    eventCountsByName.set(event.name, (eventCountsByName.get(event.name) ?? 0) + 1);
    eventCountsByCategory.set(event.category, (eventCountsByCategory.get(event.category) ?? 0) + 1);
  }

  for (const snapshot of input.snapshots) {
    const parsed = parseTimestamp(snapshot.capturedAt);
    if (!parsed || parsed < window.start || parsed > window.end) {
      continue;
    }

    snapshotCount += 1;
    const day = toUtcDayKey(parsed);
    const timelineEntry = timelineByDay.get(day);
    if (timelineEntry) {
      timelineEntry.snapshots += 1;
    }

    const timestamp = parsed.valueOf();
    if (timestamp >= latestSnapshotAt) {
      latestSnapshotAt = timestamp;
      latestSnapshotMetrics = { ...snapshot.metrics };
    }

    for (const [metric, value] of Object.entries(snapshot.metrics)) {
      if (!Number.isFinite(value)) {
        continue;
      }
      aggregateSnapshotMetrics[metric] = (aggregateSnapshotMetrics[metric] ?? 0) + value;
    }
  }

  return {
    range: input.range,
    window: {
      start: toUtcDayKey(window.start),
      end: toUtcDayKey(window.end),
      days: window.days
    },
    totals: {
      eventCount,
      snapshotCount,
      uniqueEventNames: eventCountsByName.size,
      uniqueEventCategories: eventCountsByCategory.size,
      latestSnapshotMetrics,
      aggregateSnapshotMetrics
    },
    timeline,
    topEvents: topEntries(eventCountsByName, "name") as Array<{ name: string; count: number }>,
    topCategories: topEntries(eventCountsByCategory, "category") as Array<{
      category: string;
      count: number;
    }>
  };
}

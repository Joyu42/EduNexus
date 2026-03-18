import { fail, ok } from "@/lib/server/response";
import { loadDb } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Range = "7d" | "30d" | "all";

function normalizeRange(value: string | null): Range {
  if (value === "7d" || value === "30d" || value === "all") return value;
  return "30d";
}

function isoDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function makeSeriesDays(range: Range) {
  if (range === "all") return [] as string[];
  const days = range === "7d" ? 7 : 30;
  const now = new Date();
  const output: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    output.push(isoDayKey(d));
  }
  return output;
}

export async function GET(request: Request) {
  try {
    const range = normalizeRange(new URL(request.url).searchParams.get("range"));
    const db = await loadDb();

    const totals = {
      totalSessions: db.sessions.length,
      totalPlans: db.plans.length,
      totalSyncedPaths: db.syncedPaths.length,
      totalResources: db.publicResources.length,
      totalGroups: db.publicGroups.length,
      totalPosts: db.publicPosts.length
    };

    const days = makeSeriesDays(range);
    const baseRows = days.map((day) => ({
      day,
      sessions: 0,
      plans: 0,
      syncedPaths: 0,
      resources: 0,
      groups: 0,
      posts: 0,
      events: 0
    }));

    const byDay = new Map(baseRows.map((row) => [row.day, row]));

    type MetricField = "sessions" | "plans" | "syncedPaths" | "resources" | "groups" | "posts" | "events";
    const add = (rawDate: string | undefined, field: MetricField) => {
      if (!rawDate) return;
      const date = new Date(rawDate);
      if (Number.isNaN(date.valueOf())) return;
      const key = isoDayKey(date);
      if (range !== "all" && !byDay.has(key)) return;
      const current = byDay.get(key) ?? {
        day: key,
        sessions: 0,
        plans: 0,
        syncedPaths: 0,
        resources: 0,
        groups: 0,
        posts: 0,
        events: 0
      };
      current[field] += 1;
      byDay.set(key, current);
    };

    db.sessions.forEach((item) => add(item.createdAt, "sessions"));
    db.plans.forEach((item) => add(item.createdAt, "plans"));
    db.syncedPaths.forEach((item) => add(item.updatedAt, "syncedPaths"));
    db.publicResources.forEach((item) => add(item.createdAt, "resources"));
    db.publicGroups.forEach((item) => add(item.createdAt, "groups"));
    db.publicPosts.forEach((item) => add(item.createdAt, "posts"));
    db.analyticsEvents.forEach((item) => add(item.occurredAt, "events"));

    const dailySeries = Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));

    return ok({
      ...totals,
      range,
      dailySeries
    });
  } catch (error) {
    return fail(
      {
        code: "ANALYTICS_STATS_FAILED",
        message: "获取统计数据失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

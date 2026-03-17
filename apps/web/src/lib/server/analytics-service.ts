import {
  loadDb,
  saveDb,
  type AnalyticsEventRecord,
  type AnalyticsSnapshotRecord,
  type JsonScalar
} from "./store";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listAnalyticsEvents(input?: {
  userId?: string;
  category?: string;
  name?: string;
}) {
  const db = await loadDb();
  return db.analyticsEvents.filter((event) => {
    if (input?.userId && event.userId !== input.userId) return false;
    if (input?.category && event.category !== input.category) return false;
    if (input?.name && event.name !== input.name) return false;
    return true;
  });
}

export async function createAnalyticsEvent(input: {
  userId?: string | null;
  name: string;
  category: string;
  occurredAt?: string;
  payload?: Record<string, JsonScalar>;
}) {
  const db = await loadDb();
  const record: AnalyticsEventRecord = {
    id: createId("analytics_event"),
    userId: input.userId ?? null,
    name: input.name,
    category: input.category,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    payload: input.payload ?? {}
  };

  db.analyticsEvents.unshift(record);
  await saveDb(db);
  return record;
}

export async function deleteAnalyticsEvent(eventId: string) {
  const db = await loadDb();
  const before = db.analyticsEvents.length;
  db.analyticsEvents = db.analyticsEvents.filter((item) => item.id !== eventId);
  if (db.analyticsEvents.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

export async function listAnalyticsSnapshots(input?: {
  userId?: string;
  scope?: string;
  period?: string;
}) {
  const db = await loadDb();
  return db.analyticsSnapshots.filter((snapshot) => {
    if (input?.userId && snapshot.userId !== input.userId) return false;
    if (input?.scope && snapshot.scope !== input.scope) return false;
    if (input?.period && snapshot.period !== input.period) return false;
    return true;
  });
}

export async function createAnalyticsSnapshot(input: {
  userId?: string | null;
  scope: string;
  period: string;
  metrics?: Record<string, number>;
  capturedAt?: string;
}) {
  const db = await loadDb();
  const record: AnalyticsSnapshotRecord = {
    id: createId("analytics_snapshot"),
    userId: input.userId ?? null,
    scope: input.scope,
    period: input.period,
    metrics: input.metrics ?? {},
    capturedAt: input.capturedAt ?? new Date().toISOString()
  };

  db.analyticsSnapshots.unshift(record);
  await saveDb(db);
  return record;
}

export async function updateAnalyticsSnapshot(
  snapshotId: string,
  input: Partial<Pick<AnalyticsSnapshotRecord, "scope" | "period" | "metrics" | "capturedAt">>
) {
  const db = await loadDb();
  const record = db.analyticsSnapshots.find((item) => item.id === snapshotId);
  if (!record) {
    return null;
  }

  if (typeof input.scope === "string") {
    record.scope = input.scope;
  }
  if (typeof input.period === "string") {
    record.period = input.period;
  }
  if (input.metrics) {
    record.metrics = input.metrics;
  }
  if (typeof input.capturedAt === "string") {
    record.capturedAt = input.capturedAt;
  }

  await saveDb(db);
  return record;
}

export async function deleteAnalyticsSnapshot(snapshotId: string) {
  const db = await loadDb();
  const before = db.analyticsSnapshots.length;
  db.analyticsSnapshots = db.analyticsSnapshots.filter((item) => item.id !== snapshotId);
  if (db.analyticsSnapshots.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

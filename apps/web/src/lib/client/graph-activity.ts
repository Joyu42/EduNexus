export const GRAPH_ACTIVITY_STORAGE_KEY = "edunexus_graph_activity_events";
export const GRAPH_ACTIVITY_FOCUS_STORAGE_KEY = "edunexus_graph_activity_focus";

export type GraphActivityEvent = {
  id: string;
  at: string;
  source: "path_feedback" | "workspace";
  nodeId: string;
  nodeLabel: string;
  title: string;
  detail: string;
  riskScore?: number;
};

export function normalizeGraphActivityPayload(
  payload: unknown,
  limit: number
): GraphActivityEvent[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .filter((item): item is GraphActivityEvent => {
      if (!item || typeof item !== "object") {
        return false;
      }
      const source = item as {
        id?: unknown;
        at?: unknown;
        source?: unknown;
        nodeId?: unknown;
        nodeLabel?: unknown;
        title?: unknown;
        detail?: unknown;
        riskScore?: unknown;
      };
      return (
        typeof source.id === "string" &&
        typeof source.at === "string" &&
        (source.source === "path_feedback" || source.source === "workspace") &&
        typeof source.nodeId === "string" &&
        typeof source.nodeLabel === "string" &&
        typeof source.title === "string" &&
        typeof source.detail === "string" &&
        (typeof source.riskScore === "number" || typeof source.riskScore === "undefined")
      );
    })
    .slice(0, Math.max(1, limit));
}

export function appendGraphActivityEvent(
  events: GraphActivityEvent[],
  nextEvent: Omit<GraphActivityEvent, "id" | "at"> & {
    id?: string;
    at?: string;
  },
  limit: number
) {
  const event: GraphActivityEvent = {
    id:
      nextEvent.id ??
      `graph_event_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    at: nextEvent.at ?? new Date().toISOString(),
    source: nextEvent.source,
    nodeId: nextEvent.nodeId,
    nodeLabel: nextEvent.nodeLabel,
    title: nextEvent.title,
    detail: nextEvent.detail,
    riskScore: nextEvent.riskScore
  };
  return [event, ...events].slice(0, Math.max(1, limit));
}

export function pushGraphActivityEventToStorage(
  input: Omit<GraphActivityEvent, "id" | "at"> & { id?: string; at?: string },
  adapters: {
    readItem: (key: string) => string | null;
    writeItem: (key: string, value: string) => void;
  },
  limit: number
) {
  const raw = adapters.readItem(GRAPH_ACTIVITY_STORAGE_KEY);
  const previous = raw
    ? normalizeGraphActivityPayload(
        (() => {
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            return [];
          }
        })(),
        limit
      )
    : [];
  const next = appendGraphActivityEvent(previous, input, limit);
  adapters.writeItem(GRAPH_ACTIVITY_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function writeGraphActivityFocusIdToStorage(
  activityId: string,
  writeItem: (key: string, value: string) => void
) {
  writeItem(GRAPH_ACTIVITY_FOCUS_STORAGE_KEY, activityId);
}

export function readGraphActivityFocusIdFromStorage(
  readItem: (key: string) => string | null
) {
  const raw = readItem(GRAPH_ACTIVITY_FOCUS_STORAGE_KEY);
  if (!raw || typeof raw !== "string") {
    return "";
  }
  return raw.trim();
}

export function clearGraphActivityFocusIdFromStorage(
  removeItem: (key: string) => void
) {
  removeItem(GRAPH_ACTIVITY_FOCUS_STORAGE_KEY);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function resolveGraphActivityRiskScore(event: GraphActivityEvent) {
  if (typeof event.riskScore === "number") {
    return clamp(event.riskScore, 0, 1);
  }
  const matched = event.detail.match(/(\d{1,3})%/);
  if (matched) {
    const percent = Number(matched[1]);
    if (Number.isFinite(percent)) {
      const normalized = clamp(percent / 100, 0, 1);
      return event.source === "path_feedback" ? Number((1 - normalized).toFixed(2)) : normalized;
    }
  }
  return event.source === "path_feedback" ? 0.45 : 0.5;
}

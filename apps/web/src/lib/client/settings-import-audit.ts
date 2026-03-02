import type { ProfileImportMode } from "@/lib/client/profile-import";

export type ImportAuditFilterSource = "all" | "单画像" | "画像仓库";
export type ImportAuditFilterMode = "all" | ProfileImportMode;

export type ImportAuditFilterInput = {
  source: ImportAuditFilterSource;
  mode: ImportAuditFilterMode;
  keyword: string;
  dateFrom?: string;
  dateTo?: string;
};

export type ImportAuditFilterableItem = {
  id: string;
  at: string;
  sourceLabel: "单画像" | "画像仓库";
  importMode: ProfileImportMode;
  summary: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

export function normalizeImportAuditPayload(input: unknown) {
  const source = asRecord(input);
  const sourceList = Array.isArray(input)
    ? input
    : Array.isArray(source?.items)
      ? source.items
      : [];
  return sourceList
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null);
}

export function filterImportAuditItems<T extends ImportAuditFilterableItem>(
  items: T[],
  filter: ImportAuditFilterInput
) {
  const keyword = filter.keyword.trim().toLowerCase();
  const resolveBoundary = (
    value: string | undefined,
    boundary: "start" | "end"
  ) => {
    const raw = value?.trim() ?? "";
    if (!raw) {
      return null;
    }
    const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (dayPattern.test(raw)) {
      const date = new Date(`${raw}T00:00:00`);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      if (boundary === "end") {
        date.setHours(23, 59, 59, 999);
      }
      return date.getTime();
    }
    const timestamp = new Date(raw).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  };
  const dateFromTs = resolveBoundary(filter.dateFrom, "start");
  const dateToTs = resolveBoundary(filter.dateTo, "end");
  return items.filter((item) => {
    if (filter.source !== "all" && item.sourceLabel !== filter.source) {
      return false;
    }
    if (filter.mode !== "all" && item.importMode !== filter.mode) {
      return false;
    }
    if (dateFromTs !== null || dateToTs !== null) {
      const atTs = new Date(item.at).getTime();
      if (Number.isNaN(atTs)) {
        return false;
      }
      if (dateFromTs !== null && atTs < dateFromTs) {
        return false;
      }
      if (dateToTs !== null && atTs > dateToTs) {
        return false;
      }
    }
    if (!keyword) {
      return true;
    }
    return (
      item.id.toLowerCase().includes(keyword) ||
      item.summary.toLowerCase().includes(keyword) ||
      item.at.toLowerCase().includes(keyword)
    );
  });
}

export function buildImportAuditExportPayload<T extends ImportAuditFilterableItem>(
  items: T[]
) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    count: items.length,
    items
  };
}

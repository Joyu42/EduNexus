import { useMemo, useState } from "react";
import {
  filterImportAuditItems,
  type ImportAuditFilterMode,
  type ImportAuditFilterSource,
  type ImportAuditFilterableItem
} from "@/lib/client/settings-import-audit";

export type ImportAuditQuickRange = "all" | "1d" | "7d";

function formatDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveImportAuditQuickRangeDates(
  range: Exclude<ImportAuditQuickRange, "all">
) {
  const end = new Date();
  const start = new Date(end);
  if (range === "7d") {
    start.setDate(start.getDate() - 6);
  }
  return {
    from: formatDateInputValue(start),
    to: formatDateInputValue(end)
  };
}

export function useImportAuditFilters<T extends ImportAuditFilterableItem>(
  items: T[]
) {
  const [sourceFilter, setSourceFilter] = useState<ImportAuditFilterSource>("all");
  const [modeFilter, setModeFilter] = useState<ImportAuditFilterMode>("all");
  const [quickRange, setQuickRange] = useState<ImportAuditQuickRange>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [keyword, setKeyword] = useState("");

  const filteredItems = useMemo(
    () =>
      filterImportAuditItems(items, {
        source: sourceFilter,
        mode: modeFilter,
        keyword,
        dateFrom,
        dateTo
      }),
    [dateFrom, dateTo, items, keyword, modeFilter, sourceFilter]
  );

  function resetFilters() {
    setSourceFilter("all");
    setModeFilter("all");
    setQuickRange("all");
    setDateFrom("");
    setDateTo("");
    setKeyword("");
  }

  function applyQuickRange(range: Exclude<ImportAuditQuickRange, "all">) {
    const { from, to } = resolveImportAuditQuickRangeDates(range);
    setQuickRange(range);
    setDateFrom(from);
    setDateTo(to);
  }

  function setDateFromWithManualOverride(value: string) {
    setQuickRange("all");
    setDateFrom(value);
  }

  function setDateToWithManualOverride(value: string) {
    setQuickRange("all");
    setDateTo(value);
  }

  return {
    sourceFilter,
    setSourceFilter,
    modeFilter,
    setModeFilter,
    quickRange,
    setQuickRange,
    dateFrom,
    dateTo,
    keyword,
    setKeyword,
    filteredItems,
    resetFilters,
    applyQuickRange,
    setDateFromWithManualOverride,
    setDateToWithManualOverride
  };
}

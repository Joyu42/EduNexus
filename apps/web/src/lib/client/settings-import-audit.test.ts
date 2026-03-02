import { describe, expect, it } from "vitest";
import {
  buildImportAuditExportPayload,
  filterImportAuditItems,
  normalizeImportAuditPayload
} from "@/lib/client/settings-import-audit";

const baseItems = [
  {
    id: "a1",
    at: "2026-02-26T10:00:00.000Z",
    sourceLabel: "单画像" as const,
    importMode: "append" as const,
    summary: "单画像 · 新增 2 / 覆盖 0"
  },
  {
    id: "a2",
    at: "2026-02-27T11:00:00.000Z",
    sourceLabel: "画像仓库" as const,
    importMode: "overwrite" as const,
    summary: "画像仓库 · 新增 1 / 覆盖 3"
  }
];

describe("settings-import-audit", () => {
  it("filters by source and mode", () => {
    const result = filterImportAuditItems(baseItems, {
      source: "画像仓库",
      mode: "overwrite",
      keyword: ""
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("a2");
  });

  it("filters by keyword", () => {
    const result = filterImportAuditItems(baseItems, {
      source: "all",
      mode: "all",
      keyword: "新增 2"
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("a1");
  });

  it("filters by date range", () => {
    const result = filterImportAuditItems(baseItems, {
      source: "all",
      mode: "all",
      keyword: "",
      dateFrom: "2026-02-27",
      dateTo: "2026-02-27"
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("a2");
  });

  it("includes item at exact datetime boundaries", () => {
    const result = filterImportAuditItems(baseItems, {
      source: "all",
      mode: "all",
      keyword: "",
      dateFrom: "2026-02-27T11:00:00.000Z",
      dateTo: "2026-02-27T11:00:00.000Z"
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("a2");
  });

  it("ignores invalid date range input", () => {
    const result = filterImportAuditItems(baseItems, {
      source: "all",
      mode: "all",
      keyword: "",
      dateFrom: "bad-date",
      dateTo: "also-bad"
    });
    expect(result).toHaveLength(2);
  });

  it("builds export payload", () => {
    const payload = buildImportAuditExportPayload(baseItems);
    expect(payload.version).toBe(1);
    expect(payload.count).toBe(2);
    expect(payload.items[1]?.id).toBe("a2");
    expect(typeof payload.exportedAt).toBe("string");
  });

  it("normalizes audit payload from export object", () => {
    const payload = {
      version: 1,
      items: [{ id: "x1", at: "2026-02-26", sourceLabel: "单画像" }, "bad"]
    };
    const rows = normalizeImportAuditPayload(payload);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("x1");
  });

  it("normalizes audit payload from direct array", () => {
    const rows = normalizeImportAuditPayload([{ id: "x2" }, 1, null]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe("x2");
  });
});

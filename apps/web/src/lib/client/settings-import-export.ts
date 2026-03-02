import type { JsonImportConflictRow } from "@/lib/client/settings-import-state";

function escapeCsvCell(value: string) {
  const escaped = value.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

function formatImportActionLabel(action: JsonImportConflictRow["action"]) {
  return action === "overwrite" ? "覆盖" : "新增";
}

function formatDuplicateStrategyLabel(
  strategy: JsonImportConflictRow["strategy"]
) {
  return strategy === "overwrite_last_wins" ? "覆盖后者生效" : "新增自动改名";
}

export function buildImportConflictCsv(rows: JsonImportConflictRow[]): string {
  const header = ["序号", "原始ID", "目标ID", "处理", "策略"];
  const lines = [header.map((item) => escapeCsvCell(item)).join(",")];
  for (const row of rows) {
    lines.push(
      [
        `#${row.sourceIndex}`,
        row.baseId,
        row.targetId,
        formatImportActionLabel(row.action),
        formatDuplicateStrategyLabel(row.strategy)
      ]
        .map((item) => escapeCsvCell(item))
        .join(",")
    );
  }
  return lines.join("\n");
}

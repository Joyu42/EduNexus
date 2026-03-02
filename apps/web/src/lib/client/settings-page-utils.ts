import type { AestheticMode } from "@/lib/client/config-schema";

export type ConfigModuleKey = "dashboard" | "workspace" | "kb";

export type BundleDiffRow = {
  key: string;
  module: ConfigModuleKey;
  field: string;
  currentValue: string;
  historyValue: string;
};

export function downloadJson(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function formatTime(value: string) {
  try {
    return new Date(value).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return value;
  }
}

export function formatModuleLabel(module: ConfigModuleKey) {
  if (module === "dashboard") return "Dashboard";
  if (module === "workspace") return "Workspace";
  return "KB";
}

export function formatAestheticModeLabel(mode: AestheticMode) {
  if (mode === "nebula") return "星夜银河";
  if (mode === "aurora") return "晨曦玻璃";
  return "Obsidian + NotebookLM";
}

export function formatImportActionLabel(action: "append" | "overwrite") {
  return action === "overwrite" ? "覆盖" : "新增";
}

export function formatDuplicateStrategyLabel(
  strategy: "append_renamed" | "overwrite_last_wins"
) {
  return strategy === "overwrite_last_wins" ? "覆盖后者生效" : "新增自动改名";
}

export function resolveThemeModeFromAesthetic(mode: AestheticMode): "nebula" | "aurora" {
  if (mode === "aurora") {
    return "aurora";
  }
  return "nebula";
}

export function syncThemeWithAesthetic(mode: AestheticMode) {
  const themeMode = resolveThemeModeFromAesthetic(mode);
  window.localStorage.setItem("edunexus-theme", themeMode);
  window.dispatchEvent(
    new CustomEvent("edunexus-theme-updated", {
      detail: { themeMode }
    })
  );
}

function flattenObject(
  value: Record<string, unknown>,
  prefix: string,
  module: ConfigModuleKey
): Array<{ key: string; module: ConfigModuleKey; field: string; value: string }> {
  const entries: Array<{ key: string; module: ConfigModuleKey; field: string; value: string }> = [];
  for (const [key, entryValue] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (entryValue && typeof entryValue === "object" && !Array.isArray(entryValue)) {
      entries.push(...flattenObject(entryValue as Record<string, unknown>, path, module));
      continue;
    }
    entries.push({
      key: path,
      module,
      field: path,
      value:
        typeof entryValue === "string"
          ? entryValue
          : typeof entryValue === "number" || typeof entryValue === "boolean"
            ? String(entryValue)
            : JSON.stringify(entryValue) ?? "null"
    });
  }
  return entries;
}

function flattenBundle(bundle: {
  dashboard: unknown;
  workspace: unknown;
  kb: unknown;
}) {
  return [
    ...flattenObject(
      bundle.dashboard as Record<string, unknown>,
      "dashboard",
      "dashboard"
    ),
    ...flattenObject(
      bundle.workspace as Record<string, unknown>,
      "workspace",
      "workspace"
    ),
    ...flattenObject(bundle.kb as Record<string, unknown>, "kb", "kb")
  ];
}

export function buildBundleDiffRows(
  current: { dashboard: unknown; workspace: unknown; kb: unknown },
  history: { dashboard: unknown; workspace: unknown; kb: unknown }
): BundleDiffRow[] {
  const currentEntries = flattenBundle(current);
  const historyEntries = flattenBundle(history);
  const currentMap = new Map(currentEntries.map((item) => [item.key, item]));
  const historyMap = new Map(historyEntries.map((item) => [item.key, item]));
  const keySet = new Set<string>([...currentMap.keys(), ...historyMap.keys()]);

  return Array.from(keySet)
    .map((key) => {
      const currentItem = currentMap.get(key);
      const historyItem = historyMap.get(key);
      const moduleKey = historyItem?.module ?? currentItem?.module ?? "dashboard";
      return {
        key,
        module: moduleKey,
        field: key,
        currentValue: currentItem?.value ?? "(缺失)",
        historyValue: historyItem?.value ?? "(缺失)"
      };
    })
    .filter((item) => item.currentValue !== item.historyValue)
    .sort((a, b) => a.field.localeCompare(b.field, "zh-CN"));
}

export function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

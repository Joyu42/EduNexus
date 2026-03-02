export const PATH_FOCUS_STORAGE_KEY = "edunexus_graph_path_focus";
export const WORKSPACE_FOCUS_STORAGE_KEY = "edunexus_graph_workspace_focus";

export type PathFocusSource = "graph" | "graph_bridge" | "dashboard" | "workspace" | "unknown";

export type PathFocusPayload = {
  nodeId: string;
  nodeLabel: string;
  domain: string;
  mastery: number;
  risk: number;
  relatedNodes: string[];
  at: string;
  focusSource?: PathFocusSource;
  bridgePartnerLabel?: string;
  bridgeTaskTemplate?: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeFocusSource(value: unknown): PathFocusSource | undefined {
  if (
    value === "graph" ||
    value === "graph_bridge" ||
    value === "dashboard" ||
    value === "workspace" ||
    value === "unknown"
  ) {
    return value;
  }
  return undefined;
}

export function normalizePathFocusPayload(input: unknown): PathFocusPayload | null {
  if (!input || typeof input !== "object") {
    return null;
  }
  const value = input as {
    nodeId?: unknown;
    nodeLabel?: unknown;
    domain?: unknown;
    mastery?: unknown;
    risk?: unknown;
    relatedNodes?: unknown;
    at?: unknown;
    focusSource?: unknown;
    bridgePartnerLabel?: unknown;
    bridgeTaskTemplate?: unknown;
  };
  if (typeof value.nodeId !== "string" || typeof value.nodeLabel !== "string") {
    return null;
  }
  return {
    nodeId: value.nodeId,
    nodeLabel: value.nodeLabel,
    domain: typeof value.domain === "string" ? value.domain : "general",
    mastery: clamp(typeof value.mastery === "number" ? value.mastery : 0.45, 0, 1),
    risk: clamp(typeof value.risk === "number" ? value.risk : 0.55, 0, 1),
    relatedNodes: Array.isArray(value.relatedNodes)
      ? value.relatedNodes.filter((item): item is string => typeof item === "string").slice(0, 6)
      : [],
    at: typeof value.at === "string" ? value.at : new Date().toISOString(),
    focusSource: normalizeFocusSource(value.focusSource),
    bridgePartnerLabel:
      typeof value.bridgePartnerLabel === "string" ? value.bridgePartnerLabel : undefined,
    bridgeTaskTemplate:
      typeof value.bridgeTaskTemplate === "string" ? value.bridgeTaskTemplate : undefined
  };
}

export function buildPathGoalFromFocus(focus: PathFocusPayload) {
  if (
    focus.focusSource === "graph_bridge" &&
    typeof focus.bridgeTaskTemplate === "string" &&
    focus.bridgeTaskTemplate.trim()
  ) {
    return focus.bridgeTaskTemplate.trim();
  }
  const riskPercent = Math.round(focus.risk * 100);
  return `围绕「${focus.nodeLabel}」进行 7 日定向巩固（当前风险 ${riskPercent}%），并串联相关节点迁移练习。`;
}

export function buildWorkspacePromptFromFocus(focus: PathFocusPayload) {
  const relatedText =
    focus.relatedNodes.length > 0
      ? `并关联 ${focus.relatedNodes.slice(0, 3).join("、")} 进行迁移。`
      : "并补充与其关联的关键概念。";
  return `请围绕「${focus.nodeLabel}」做苏格拉底式引导，不直接给答案。我当前掌握度约 ${Math.round(
    focus.mastery * 100
  )}%，希望先拆解前置条件，${relatedText}`;
}

export function writePathFocusToStorage(
  focus: PathFocusPayload,
  writeItem: (key: string, value: string) => void
) {
  writeItem(PATH_FOCUS_STORAGE_KEY, JSON.stringify(focus));
}

export function readPathFocusFromStorage(
  readItem: (key: string) => string | null
): PathFocusPayload | null {
  const raw = readItem(PATH_FOCUS_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return normalizePathFocusPayload(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export function writeWorkspaceFocusToStorage(
  focus: PathFocusPayload,
  writeItem: (key: string, value: string) => void
) {
  writeItem(WORKSPACE_FOCUS_STORAGE_KEY, JSON.stringify(focus));
}

export function readWorkspaceFocusFromStorage(
  readItem: (key: string) => string | null
): PathFocusPayload | null {
  const raw = readItem(WORKSPACE_FOCUS_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return normalizePathFocusPayload(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

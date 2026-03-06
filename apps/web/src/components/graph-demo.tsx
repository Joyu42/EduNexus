"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatErrorMessage, requestJson } from "@/lib/client/api";
import { SectionAnchorNav } from "@/components/section-anchor-nav";
import {
  clearGraphActivityFocusIdFromStorage,
  GRAPH_ACTIVITY_STORAGE_KEY,
  normalizeGraphActivityPayload,
  readGraphActivityFocusIdFromStorage,
  resolveGraphActivityRiskScore,
  type GraphActivityEvent
} from "@/lib/client/graph-activity";
import {
  appendGraphHistory,
  buildGraphHistoryDeltas,
  buildGraphHistorySnapshot,
  normalizeGraphHistoryPayload,
  type GraphHistorySnapshot
} from "@/lib/client/graph-history";
import {
  clearGraphFocusNodeFromStorage,
  readGraphFocusNodeFromStorage
} from "@/lib/client/graph-focus-bridge";
import {
  buildDomainBuckets,
  buildGraphLayout,
  rankHighRiskNodes,
  resolveNodeRisk,
  type GraphNodePlacement,
  type GraphViewEdge,
  type GraphViewNode
} from "@/lib/client/graph-view-model";
import {
  type PathFocusPayload,
  writePathFocusBatchToStorage,
  writePathFocusToStorage,
  writeWorkspaceFocusBatchToStorage,
  writeWorkspaceFocusToStorage
} from "@/lib/client/path-focus-bridge";
import {
  buildBridgeReplayFrames,
  type BridgeReplayMode
} from "@/lib/client/bridge-insight";
import {
  GRAPH_REPLAY_PUSH_HISTORY_LIMIT,
  GRAPH_REPLAY_PUSH_HISTORY_STORAGE_KEY,
  normalizeReplayPushHistoryPayload,
  resolveReplayPushSourceLabel,
  resolveReplayPushTargetLabel,
  sortReplayPushHistory,
  type ReplayPushHistoryEntry,
  type ReplayPushHistorySort,
  type ReplayPushSource,
  type ReplayPushTarget
} from "@/lib/client/replay-push-history";

const GRAPH_CANVAS_WIDTH = 920;
const GRAPH_CANVAS_HEIGHT = 520;
const GRAPH_HISTORY_STORAGE_KEY = "edunexus_graph_history_timeline";
const GRAPH_HISTORY_LIMIT = 10;
const GRAPH_HEATMAP_ENABLED_STORAGE_KEY = "edunexus_graph_heatmap_enabled";
const GRAPH_RISK_THRESHOLD_STORAGE_KEY = "edunexus_graph_risk_threshold";
const GRAPH_CANVAS_ZOOM_STORAGE_KEY = "edunexus_graph_canvas_zoom";
const GRAPH_BRIDGE_HISTORY_STORAGE_KEY = "edunexus_graph_bridge_history_timeline";
const GRAPH_INSIGHT_COLLAPSE_STORAGE_KEY = "edunexus_graph_insight_collapsed_sections";
const GRAPH_HISTORY_COMPACT_STORAGE_KEY = "edunexus_graph_history_compact_mode";
const GRAPH_SYNC_LAYOUT_STORAGE_KEY = "edunexus_graph_sync_layout_mode";
const GRAPH_INSIGHT_COMPACT_STORAGE_KEY = "edunexus_graph_insight_compact_mode";
const GRAPH_BRIDGE_BATCH_LIMIT_STORAGE_KEY = "edunexus_graph_bridge_batch_limit";
const GRAPH_BRIDGE_REPLAY_COMPACT_STORAGE_KEY = "edunexus_graph_bridge_replay_compact_mode";
const GRAPH_BRIDGE_REPLAY_RISK_ONLY_STORAGE_KEY = "edunexus_graph_bridge_replay_risk_only";
const GRAPH_BRIDGE_HISTORY_LIMIT = 14;
const BRIDGE_REPLAY_INTERVAL_MS: Record<BridgeReplaySpeed, number> = {
  "1x": 1300,
  "1.5x": 950,
  "2x": 640
};

type GraphNode = GraphViewNode;
type GraphEdge = GraphViewEdge;

type GraphPayload = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

type DomainClusterSummary = {
  domain: string;
  nodeCount: number;
  relationCount: number;
  averageRisk: number;
  averageMastery: number;
  highRiskCount: number;
};

type RiskBridgeSuggestion = {
  id: string;
  source: GraphNodePlacement;
  target: GraphNodePlacement;
  primary: GraphNodePlacement;
  secondary: GraphNodePlacement;
  risk: number;
  weight: number;
  summary: string;
};

type BridgeHistoryEntry = {
  id: string;
  sourceLabel: string;
  targetLabel: string;
  risk: number;
  weight: number;
};

type BridgeHistorySnapshot = {
  id: string;
  at: string;
  signature: string;
  bridges: BridgeHistoryEntry[];
};

type BridgeReplayNodeStat = {
  label: string;
  count: number;
  averageRisk: number;
  maxRisk: number;
  latestAt: string;
  trendPoints: number[];
  trendDelta: number;
};

type GraphLensMode = "full" | "bridge_focus";
type BridgeReplaySpeed = "1x" | "1.5x" | "2x";
type GraphWorkbenchView = "overview" | "bridge" | "history";
type GraphInsightSectionKey =
  | "domain_cluster"
  | "risk_top"
  | "active_focus"
  | "bridge_suggestions"
  | "bridge_timeline"
  | "replay_history"
  | "graph_timeline";

type CreateWorkspaceSessionResponse = {
  session: {
    id: string;
  };
};

type SaveNoteResponse = {
  noteId: string;
  path: string;
};

type WorkspaceSessionSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

type HoverSaveMode = "create_new" | "append_existing";

type HoverSaveResult = {
  sessionId: string;
  noteId: string;
  nodeId: string;
  nodeLabel: string;
};

type OpenWorkspaceSessionOptions = {
  from?: "graph" | "graph_save";
  noteId?: string;
  nodeLabel?: string;
};

type ReplayPushMeta = {
  replayBatchId?: string;
  replayBatchIndex?: number;
  replayBatchTotal?: number;
  replayFrameAt?: string;
  replayMode?: BridgeReplayMode;
};
type ReplayPushHistoryModeFilter = "all" | PathFocusPayload["replayMode"] | "unknown";
type ReplayHistoryPresetKey =
  | "manual"
  | "all"
  | "path_roundtrip"
  | "workspace_roundtrip"
  | "single_frame"
  | "batch_queue"
  | "repush_focus";

const GRAPH_INSIGHT_SECTIONS: Array<{
  key: GraphInsightSectionKey;
  label: string;
  view: GraphWorkbenchView | "all";
}> = [
  { key: "domain_cluster", label: "领域聚类", view: "overview" },
  { key: "risk_top", label: "高风险节点", view: "overview" },
  { key: "active_focus", label: "当前焦点", view: "overview" },
  { key: "bridge_suggestions", label: "关系链建议", view: "bridge" },
  { key: "bridge_timeline", label: "关系链回放", view: "bridge" },
  { key: "replay_history", label: "回放批次历史", view: "history" },
  { key: "graph_timeline", label: "图谱演化", view: "history" }
];

const GRAPH_INSIGHT_SECTION_VIEW_MAP: Record<GraphInsightSectionKey, GraphWorkbenchView> = {
  domain_cluster: "overview",
  risk_top: "overview",
  active_focus: "overview",
  bridge_suggestions: "bridge",
  bridge_timeline: "bridge",
  replay_history: "history",
  graph_timeline: "history"
};
const GRAPH_INSIGHT_SECTION_ANCHOR_ID_MAP: Record<GraphInsightSectionKey, string> = {
  domain_cluster: "graph_overview_panel",
  risk_top: "graph_risk_top_panel",
  active_focus: "graph_active_focus_panel",
  bridge_suggestions: "graph_bridge_panel",
  bridge_timeline: "graph_bridge_timeline_panel",
  replay_history: "graph_history_panel",
  graph_timeline: "graph_timeline_panel"
};

const DEFAULT_GRAPH_INSIGHT_COLLAPSE_BY_VIEW: Record<
  GraphWorkbenchView,
  GraphInsightSectionKey[]
> = {
  overview: ["domain_cluster", "risk_top"],
  bridge: ["bridge_timeline"],
  history: ["graph_timeline"]
};

function resolveRiskTone(risk: number) {
  if (risk >= 0.65) {
    return "high";
  }
  if (risk >= 0.45) {
    return "medium";
  }
  return "low";
}

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return value;
  }
}

function formatDelta(value: number, options?: { precision?: number; suffix?: string }) {
  if (value === 0) {
    return "0";
  }
  const precision = options?.precision ?? 0;
  const suffix = options?.suffix ?? "";
  const raw = value.toFixed(precision);
  return `${value > 0 ? "+" : ""}${raw}${suffix}`;
}

function resolveActivityRiskTone(risk: number) {
  if (risk >= 0.65) {
    return "high";
  }
  if (risk >= 0.45) {
    return "medium";
  }
  return "low";
}

function clampZoomPercent(value: number) {
  return Math.max(75, Math.min(145, Math.round(value)));
}

function buildEdgeKey(sourceId: string, targetId: string) {
  return sourceId < targetId
    ? `${sourceId}__${targetId}`
    : `${targetId}__${sourceId}`;
}

function buildBridgeReplayFrameKey(input: { snapshotId: string; bridgeId: string }) {
  return `${input.snapshotId}__${input.bridgeId}`;
}

function buildBridgeTaskTemplate(primaryLabel: string, secondaryLabel: string) {
  return `桥接任务模板：围绕「${primaryLabel}」与「${secondaryLabel}」先做概念映射，再完成“同构例题 + 反例辨析 + 迁移应用”三段训练。`;
}

function normalizeReplayBatchMatchId(value: string) {
  return value.trim().toLowerCase();
}

function escapeSelectorValue(value: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/["\\]/g, "\\$&");
}

function matchReplayBatchId(candidate: string, target: string) {
  const left = normalizeReplayBatchMatchId(candidate);
  const right = normalizeReplayBatchMatchId(target);
  if (!left || !right) {
    return false;
  }
  return left === right || left.startsWith(`${right}_repush_`) || right.startsWith(left);
}

function downloadTextFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildNodeInterventionTips(node: GraphNodePlacement) {
  const tips: string[] = [];
  if (node.risk >= 0.65) {
    tips.push("先做错因归类，再进行 2 轮变式迁移训练。");
  } else if (node.risk >= 0.45) {
    tips.push("补一轮桥接题，重点验证条件映射是否稳定。");
  } else {
    tips.push("保持低频复习，优先支持高风险节点迁移。");
  }
  if (node.degree <= 1) {
    tips.push("该节点关联较弱，建议新增 1 条跨章节连接练习。");
  } else {
    tips.push("可作为枢纽节点，带动关联概念的系统复盘。");
  }
  if (node.mastery < 0.5) {
    tips.push("先用结构化提示词拆解解题步骤，避免直接求答案。");
  }
  return tips.slice(0, 3);
}

function buildNodeInterventionMarkdown(input: {
  node: GraphNodePlacement;
  relatedLabels: string[];
  tips: string[];
}) {
  const generatedAt = new Date().toISOString();
  return [
    "# 图谱节点干预建议",
    "",
    `- 生成时间：${generatedAt}`,
    `- 节点：${input.node.label}`,
    `- 域：${input.node.domain}`,
    `- 风险：${Math.round(input.node.risk * 100)}%`,
    `- 掌握度：${Math.round(input.node.mastery * 100)}%`,
    `- 关联度：${input.node.degree}`,
    "",
    "## 邻接节点",
    input.relatedLabels.length > 0
      ? input.relatedLabels.map((label) => `- ${label}`).join("\n")
      : "- 暂无可见邻接节点",
    "",
    "## 干预建议",
    input.tips.map((tip) => `- ${tip}`).join("\n"),
    "",
    "## 执行动作",
    "- 使用工作区 Socratic 引导先拆条件再求解。",
    "- 完成 1 轮桥接任务后回写路径掌握度。",
    "- 下一次图谱刷新观察风险变化并复盘。"
  ].join("\n");
}

function buildBridgeHistorySignature(entries: BridgeHistoryEntry[]) {
  if (entries.length === 0) {
    return "empty";
  }
  return entries
    .map((item) => `${item.id}:${item.risk.toFixed(2)}:${item.weight.toFixed(2)}`)
    .join("|");
}

function normalizeBridgeHistoryPayload(
  payload: unknown,
  limit: number
): BridgeHistorySnapshot[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .filter((item): item is BridgeHistorySnapshot => {
      if (!item || typeof item !== "object") {
        return false;
      }
      const value = item as {
        id?: unknown;
        at?: unknown;
        signature?: unknown;
        bridges?: unknown;
      };
      return (
        typeof value.id === "string" &&
        typeof value.at === "string" &&
        typeof value.signature === "string" &&
        Array.isArray(value.bridges)
      );
    })
    .slice(0, Math.max(1, limit));
}

export function GraphDemo() {
  const router = useRouter();
  const [payload, setPayload] = useState<GraphPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [domainFilter, setDomainFilter] = useState("all");
  const [collapsedDomains, setCollapsedDomains] = useState<string[]>([]);
  const [nodeKeyword, setNodeKeyword] = useState("");
  const [activeNodeId, setActiveNodeId] = useState("");
  const [graphHistory, setGraphHistory] = useState<GraphHistorySnapshot[]>([]);
  const [graphActivities, setGraphActivities] = useState<GraphActivityEvent[]>([]);
  const [focusedActivityId, setFocusedActivityId] = useState("");
  const [selectedBridgeId, setSelectedBridgeId] = useState("");
  const [hoveredNodeId, setHoveredNodeId] = useState("");
  const [bridgeHistory, setBridgeHistory] = useState<BridgeHistorySnapshot[]>([]);
  const [bridgeReplayMode, setBridgeReplayMode] = useState<BridgeReplayMode>("focus");
  const [bridgeReplayNodeFilter, setBridgeReplayNodeFilter] = useState("all");
  const [isBridgeReplayPlaying, setIsBridgeReplayPlaying] = useState(false);
  const [bridgeReplayCursor, setBridgeReplayCursor] = useState(0);
  const [bridgeReplaySpeed, setBridgeReplaySpeed] = useState<BridgeReplaySpeed>("1x");
  const [bridgeReplayBatchLimit, setBridgeReplayBatchLimit] = useState(4);
  const [bridgeReplayKeyword, setBridgeReplayKeyword] = useState("");
  const [bridgeReplayRiskOnly, setBridgeReplayRiskOnly] = useState(false);
  const [riskThresholdPercent, setRiskThresholdPercent] = useState(0);
  const [enableEdgeHeatmap, setEnableEdgeHeatmap] = useState(true);
  const [canvasZoomPercent, setCanvasZoomPercent] = useState(100);
  const [graphLensMode, setGraphLensMode] = useState<GraphLensMode>("full");
  const [graphWorkbenchView, setGraphWorkbenchView] =
    useState<GraphWorkbenchView>("overview");
  const [collapsedInsightSectionsByView, setCollapsedInsightSectionsByView] = useState<
    Record<GraphWorkbenchView, GraphInsightSectionKey[]>
  >(DEFAULT_GRAPH_INSIGHT_COLLAPSE_BY_VIEW);
  const [bridgeLensCrossDomainOnly, setBridgeLensCrossDomainOnly] = useState(false);
  const [savingHoverSuggestion, setSavingHoverSuggestion] = useState(false);
  const [hoverSaveMode, setHoverSaveMode] = useState<HoverSaveMode>("create_new");
  const [hoverTargetSessionId, setHoverTargetSessionId] = useState("");
  const [hoverWorkspaceSessions, setHoverWorkspaceSessions] = useState<
    WorkspaceSessionSummary[]
  >([]);
  const [loadingHoverSessions, setLoadingHoverSessions] = useState(false);
  const [hoverSaveResult, setHoverSaveResult] = useState<HoverSaveResult | null>(null);
  const [pathPushHint, setPathPushHint] = useState("");
  const [replayPushHistory, setReplayPushHistory] = useState<ReplayPushHistoryEntry[]>([]);
  const [replayHistoryTargetFilter, setReplayHistoryTargetFilter] = useState<
    "all" | ReplayPushTarget
  >("all");
  const [replayHistorySourceFilter, setReplayHistorySourceFilter] = useState<
    "all" | ReplayPushSource
  >("all");
  const [replayHistoryModeFilter, setReplayHistoryModeFilter] =
    useState<ReplayPushHistoryModeFilter>("all");
  const [replayHistorySort, setReplayHistorySort] =
    useState<ReplayPushHistorySort>("latest");
  const [replayHistoryTopN, setReplayHistoryTopN] = useState<"all" | 3 | 5 | 10>("all");
  const [historyCompactMode, setHistoryCompactMode] = useState(true);
  const [syncLayoutMode, setSyncLayoutMode] = useState(true);
  const [insightCompactMode, setInsightCompactMode] = useState(true);
  const [bridgeReplayCompactMode, setBridgeReplayCompactMode] = useState(true);
  const [bridgeSuggestionBatchLimit, setBridgeSuggestionBatchLimit] = useState(3);
  const [replayHistoryPreset, setReplayHistoryPreset] =
    useState<ReplayHistoryPresetKey>("all");
  const [replayCompareLeftId, setReplayCompareLeftId] = useState("");
  const [replayCompareRightId, setReplayCompareRightId] = useState("");
  const [queryReplayBatchId, setQueryReplayBatchId] = useState("");
  const [queryReplayFrom, setQueryReplayFrom] = useState("");
  const bridgeReplayTimerRef = useRef<number | null>(null);
  const replayBatchQueryAppliedRef = useRef("");
  const insightPanelRef = useRef<HTMLElement | null>(null);
  const [pulseNodeId, setPulseNodeId] = useState("");

  const clearBridgeReplayTimer = useCallback(() => {
    if (bridgeReplayTimerRef.current !== null) {
      window.clearTimeout(bridgeReplayTimerRef.current);
      bridgeReplayTimerRef.current = null;
    }
  }, []);

  const appendReplayPushHistory = useCallback((entry: ReplayPushHistoryEntry) => {
    setReplayPushHistory((prev) => {
      const next = [entry, ...prev].slice(0, GRAPH_REPLAY_PUSH_HISTORY_LIMIT);
      try {
        window.localStorage.setItem(
          GRAPH_REPLAY_PUSH_HISTORY_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        // ignore localStorage failures
      }
      return next;
    });
  }, []);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await requestJson<GraphPayload>("/api/graph/view");
      setPayload(data);
      setDomainFilter("all");
      setNodeKeyword("");
      const focusNodeId = readGraphFocusNodeFromStorage((key) =>
        window.localStorage.getItem(key)
      );
      if (focusNodeId) {
        const matchedNode = data.nodes.find((item) => item.id === focusNodeId);
        if (matchedNode) {
          setActiveNodeId(matchedNode.id);
          setDomainFilter(matchedNode.domain ?? "all");
        }
        clearGraphFocusNodeFromStorage((key) => window.localStorage.removeItem(key));
      }
      try {
        const rawActivities = window.localStorage.getItem(GRAPH_ACTIVITY_STORAGE_KEY);
        if (rawActivities) {
          const normalizedActivities = normalizeGraphActivityPayload(
            JSON.parse(rawActivities) as unknown,
            16
          );
          setGraphActivities(normalizedActivities);
          const focusActivityId = readGraphActivityFocusIdFromStorage((key) =>
            window.localStorage.getItem(key)
          );
          if (focusActivityId) {
            setFocusedActivityId(focusActivityId);
            const matchedEvent = normalizedActivities.find(
              (item) => item.id === focusActivityId
            );
            if (matchedEvent) {
              const matchedNode = data.nodes.find((item) => item.id === matchedEvent.nodeId);
              if (matchedNode) {
                setActiveNodeId(matchedNode.id);
                setDomainFilter(matchedNode.domain ?? "all");
              }
            }
            clearGraphActivityFocusIdFromStorage((key) =>
              window.localStorage.removeItem(key)
            );
          }
        }
      } catch {
        // ignore activity parse error
      }
    } catch (err) {
      setError(formatErrorMessage(err, "加载图谱失败。"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  useEffect(() => {
    const readReplayQuery = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        setQueryReplayBatchId(params.get("replayBatchId")?.trim() ?? "");
        setQueryReplayFrom((params.get("from")?.trim().toLowerCase() ?? "").slice(0, 24));
      } catch {
        setQueryReplayBatchId("");
        setQueryReplayFrom("");
      }
    };
    readReplayQuery();
    window.addEventListener("popstate", readReplayQuery);
    return () => window.removeEventListener("popstate", readReplayQuery);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GRAPH_HISTORY_STORAGE_KEY);
      if (!raw) {
        setGraphHistory([]);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      setGraphHistory(normalizeGraphHistoryPayload(parsed, GRAPH_HISTORY_LIMIT));
    } catch {
      setGraphHistory([]);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GRAPH_BRIDGE_HISTORY_STORAGE_KEY);
      if (!raw) {
        setBridgeHistory([]);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      setBridgeHistory(
        normalizeBridgeHistoryPayload(parsed, GRAPH_BRIDGE_HISTORY_LIMIT)
      );
    } catch {
      setBridgeHistory([]);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GRAPH_REPLAY_PUSH_HISTORY_STORAGE_KEY);
      if (!raw) {
        setReplayPushHistory([]);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      setReplayPushHistory(
        normalizeReplayPushHistoryPayload(parsed, GRAPH_REPLAY_PUSH_HISTORY_LIMIT)
      );
    } catch {
      setReplayPushHistory([]);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GRAPH_INSIGHT_COLLAPSE_STORAGE_KEY);
      if (!raw) {
        setCollapsedInsightSectionsByView(DEFAULT_GRAPH_INSIGHT_COLLAPSE_BY_VIEW);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") {
        return;
      }
      const value = parsed as Partial<Record<GraphWorkbenchView, unknown>>;
      const next: Record<GraphWorkbenchView, GraphInsightSectionKey[]> = {
        overview: [],
        bridge: [],
        history: []
      };
      (["overview", "bridge", "history"] as GraphWorkbenchView[]).forEach((view) => {
        const row = value[view];
        if (!Array.isArray(row)) {
          return;
        }
        next[view] = row
          .filter(
            (item): item is GraphInsightSectionKey =>
              typeof item === "string" &&
              item in GRAPH_INSIGHT_SECTION_VIEW_MAP &&
              GRAPH_INSIGHT_SECTION_VIEW_MAP[item as GraphInsightSectionKey] === view
          )
          .slice(0, 6);
      });
      setCollapsedInsightSectionsByView({
        overview:
          next.overview.length > 0
            ? next.overview
            : DEFAULT_GRAPH_INSIGHT_COLLAPSE_BY_VIEW.overview,
        bridge:
          next.bridge.length > 0
            ? next.bridge
            : DEFAULT_GRAPH_INSIGHT_COLLAPSE_BY_VIEW.bridge,
        history:
          next.history.length > 0
            ? next.history
            : DEFAULT_GRAPH_INSIGHT_COLLAPSE_BY_VIEW.history
      });
    } catch {
      // ignore collapsed section parse errors
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        GRAPH_INSIGHT_COLLAPSE_STORAGE_KEY,
        JSON.stringify(collapsedInsightSectionsByView)
      );
    } catch {
      // ignore collapsed section storage errors
    }
  }, [collapsedInsightSectionsByView]);

  const replayPushHistoryStats = useMemo(() => {
    return replayPushHistory.reduce(
      (acc, item) => {
        acc.totalBatches += 1;
        acc.totalFocusCount += item.count;
        if (item.target === "path") {
          acc.pathBatches += 1;
        } else {
          acc.workspaceBatches += 1;
        }
        if (item.source === "single_frame") {
          acc.singleFrameBatches += 1;
        } else if (item.source === "batch_queue") {
          acc.batchQueueBatches += 1;
        } else {
          acc.historyRepushBatches += 1;
        }
        return acc;
      },
      {
        totalBatches: 0,
        totalFocusCount: 0,
        pathBatches: 0,
        workspaceBatches: 0,
        singleFrameBatches: 0,
        batchQueueBatches: 0,
        historyRepushBatches: 0
      }
    );
  }, [replayPushHistory]);

  const replayPushHistoryModeOptions = useMemo(() => {
    const set = new Set<PathFocusPayload["replayMode"]>();
    for (const item of replayPushHistory) {
      if (item.mode) {
        set.add(item.mode);
      }
    }
    return Array.from(set);
  }, [replayPushHistory]);

  const replayPushHistoryModeHasUnknown = useMemo(
    () => replayPushHistory.some((item) => !item.mode),
    [replayPushHistory]
  );

  const applyReplayHistoryPreset = useCallback((preset: ReplayHistoryPresetKey) => {
    setReplayHistoryPreset(preset);
    if (preset === "manual") {
      return;
    }
    if (preset === "all") {
      setReplayHistoryTargetFilter("all");
      setReplayHistorySourceFilter("all");
      setReplayHistoryModeFilter("all");
      setReplayHistorySort("latest");
      setReplayHistoryTopN("all");
      return;
    }
    if (preset === "path_roundtrip") {
      setReplayHistoryTargetFilter("path");
      setReplayHistorySourceFilter("all");
      setReplayHistoryModeFilter("all");
      setReplayHistorySort("latest");
      setReplayHistoryTopN(10);
      return;
    }
    if (preset === "workspace_roundtrip") {
      setReplayHistoryTargetFilter("workspace");
      setReplayHistorySourceFilter("all");
      setReplayHistoryModeFilter("all");
      setReplayHistorySort("latest");
      setReplayHistoryTopN(10);
      return;
    }
    if (preset === "single_frame") {
      setReplayHistoryTargetFilter("all");
      setReplayHistorySourceFilter("single_frame");
      setReplayHistoryModeFilter("all");
      setReplayHistorySort("latest");
      setReplayHistoryTopN(10);
      return;
    }
    if (preset === "batch_queue") {
      setReplayHistoryTargetFilter("all");
      setReplayHistorySourceFilter("batch_queue");
      setReplayHistoryModeFilter("all");
      setReplayHistorySort("count_desc");
      setReplayHistoryTopN(10);
      return;
    }
    setReplayHistoryTargetFilter("all");
    setReplayHistorySourceFilter("history_repush");
    setReplayHistoryModeFilter("all");
    setReplayHistorySort("latest");
    setReplayHistoryTopN("all");
  }, []);

  useEffect(() => {
    if (replayHistoryPreset === "manual") {
      return;
    }
    const presetMatches =
      (replayHistoryPreset === "all" &&
        replayHistoryTargetFilter === "all" &&
        replayHistorySourceFilter === "all" &&
        replayHistoryModeFilter === "all" &&
        replayHistorySort === "latest" &&
        replayHistoryTopN === "all") ||
      (replayHistoryPreset === "path_roundtrip" &&
        replayHistoryTargetFilter === "path" &&
        replayHistorySourceFilter === "all" &&
        replayHistoryModeFilter === "all" &&
        replayHistorySort === "latest" &&
        replayHistoryTopN === 10) ||
      (replayHistoryPreset === "workspace_roundtrip" &&
        replayHistoryTargetFilter === "workspace" &&
        replayHistorySourceFilter === "all" &&
        replayHistoryModeFilter === "all" &&
        replayHistorySort === "latest" &&
        replayHistoryTopN === 10) ||
      (replayHistoryPreset === "single_frame" &&
        replayHistoryTargetFilter === "all" &&
        replayHistorySourceFilter === "single_frame" &&
        replayHistoryModeFilter === "all" &&
        replayHistorySort === "latest" &&
        replayHistoryTopN === 10) ||
      (replayHistoryPreset === "batch_queue" &&
        replayHistoryTargetFilter === "all" &&
        replayHistorySourceFilter === "batch_queue" &&
        replayHistoryModeFilter === "all" &&
        replayHistorySort === "count_desc" &&
        replayHistoryTopN === 10) ||
      (replayHistoryPreset === "repush_focus" &&
        replayHistoryTargetFilter === "all" &&
        replayHistorySourceFilter === "history_repush" &&
        replayHistoryModeFilter === "all" &&
        replayHistorySort === "latest" &&
        replayHistoryTopN === "all");
    if (!presetMatches) {
      setReplayHistoryPreset("manual");
    }
  }, [
    replayHistoryModeFilter,
    replayHistoryPreset,
    replayHistorySort,
    replayHistorySourceFilter,
    replayHistoryTargetFilter,
    replayHistoryTopN
  ]);

  const filteredReplayPushHistory = useMemo(() => {
    return replayPushHistory.filter((item) => {
      if (replayHistoryTargetFilter !== "all" && item.target !== replayHistoryTargetFilter) {
        return false;
      }
      if (replayHistorySourceFilter !== "all" && item.source !== replayHistorySourceFilter) {
        return false;
      }
      if (replayHistoryModeFilter === "unknown") {
        return !item.mode;
      }
      if (replayHistoryModeFilter !== "all") {
        return item.mode === replayHistoryModeFilter;
      }
      return true;
    });
  }, [
    replayHistoryModeFilter,
    replayHistorySourceFilter,
    replayHistoryTargetFilter,
    replayPushHistory
  ]);

  const sortedReplayPushHistory = useMemo(
    () => sortReplayPushHistory(filteredReplayPushHistory, replayHistorySort),
    [filteredReplayPushHistory, replayHistorySort]
  );

  const visibleReplayPushHistory = useMemo(() => {
    if (replayHistoryTopN === "all") {
      return sortedReplayPushHistory;
    }
    return sortedReplayPushHistory.slice(0, replayHistoryTopN);
  }, [replayHistoryTopN, sortedReplayPushHistory]);
  const renderReplayPushHistory = useMemo(
    () =>
      historyCompactMode
        ? visibleReplayPushHistory.slice(0, 5)
        : visibleReplayPushHistory,
    [historyCompactMode, visibleReplayPushHistory]
  );

  const replayCompareCandidates = useMemo(
    () => sortedReplayPushHistory.slice(0, 24),
    [sortedReplayPushHistory]
  );

  useEffect(() => {
    if (replayCompareCandidates.length < 2) {
      setReplayCompareLeftId("");
      setReplayCompareRightId("");
      return;
    }
    const leftExists = replayCompareCandidates.some((item) => item.id === replayCompareLeftId);
    const rightExists = replayCompareCandidates.some((item) => item.id === replayCompareRightId);
    if (!leftExists || !replayCompareLeftId) {
      setReplayCompareLeftId(replayCompareCandidates[0]?.id ?? "");
    }
    if (
      !rightExists ||
      !replayCompareRightId ||
      replayCompareRightId === replayCompareCandidates[0]?.id
    ) {
      setReplayCompareRightId(replayCompareCandidates[1]?.id ?? "");
    }
  }, [replayCompareCandidates, replayCompareLeftId, replayCompareRightId]);

  const replayCompareSummary = useMemo(() => {
    if (!replayCompareLeftId || !replayCompareRightId || replayCompareLeftId === replayCompareRightId) {
      return null;
    }
    const left = replayCompareCandidates.find((item) => item.id === replayCompareLeftId);
    const right = replayCompareCandidates.find((item) => item.id === replayCompareRightId);
    if (!left || !right) {
      return null;
    }
    const leftNodeSet = new Set(left.queue.map((item) => item.nodeId));
    const rightNodeSet = new Set(right.queue.map((item) => item.nodeId));
    const overlapNodeIds = [...leftNodeSet].filter((nodeId) => rightNodeSet.has(nodeId));
    const leftRiskAvg =
      left.queue.length > 0
        ? left.queue.reduce((acc, item) => acc + item.risk, 0) / left.queue.length
        : 0;
    const rightRiskAvg =
      right.queue.length > 0
        ? right.queue.reduce((acc, item) => acc + item.risk, 0) / right.queue.length
        : 0;
    const leftTime = Date.parse(left.at);
    const rightTime = Date.parse(right.at);
    const timeGapHours =
      Number.isFinite(leftTime) && Number.isFinite(rightTime)
        ? Math.abs(leftTime - rightTime) / (1000 * 60 * 60)
        : null;
    return {
      left,
      right,
      countDelta: right.count - left.count,
      riskDelta: Number((rightRiskAvg - leftRiskAvg).toFixed(3)),
      overlapNodeIds,
      overlapRatio:
        leftNodeSet.size > 0 ? Number((overlapNodeIds.length / leftNodeSet.size).toFixed(2)) : 0,
      timeGapHours:
        timeGapHours !== null && Number.isFinite(timeGapHours)
          ? Number(timeGapHours.toFixed(1))
          : null,
      targetChanged: left.target !== right.target,
      sourceChanged: left.source !== right.source,
      modeChanged: (left.mode ?? "unknown") !== (right.mode ?? "unknown")
    };
  }, [replayCompareCandidates, replayCompareLeftId, replayCompareRightId]);

  const locatedReplayHistoryBatch = useMemo(() => {
    if (!queryReplayBatchId) {
      return null;
    }
    return replayPushHistory.find((entry) => matchReplayBatchId(entry.batchId, queryReplayBatchId));
  }, [queryReplayBatchId, replayPushHistory]);

  useEffect(() => {
    if (!queryReplayBatchId) {
      replayBatchQueryAppliedRef.current = "";
      return;
    }
    if (queryReplayFrom === "path") {
      applyReplayHistoryPreset("path_roundtrip");
      return;
    }
    if (queryReplayFrom === "workspace") {
      applyReplayHistoryPreset("workspace_roundtrip");
      return;
    }
    applyReplayHistoryPreset("all");
  }, [applyReplayHistoryPreset, queryReplayBatchId, queryReplayFrom]);

  useEffect(() => {
    if (!queryReplayBatchId) {
      return;
    }
    const signature = `${queryReplayFrom}::${queryReplayBatchId}`;
    if (replayBatchQueryAppliedRef.current === signature) {
      return;
    }
    if (locatedReplayHistoryBatch) {
      setPathPushHint(
        `已从${queryReplayFrom === "path" ? "路径" : queryReplayFrom === "workspace" ? "工作区" : "外部页面"}定位回放批次：${
          locatedReplayHistoryBatch.batchId
        }（${locatedReplayHistoryBatch.count} 条）。`
      );
      replayBatchQueryAppliedRef.current = signature;
      return;
    }
    if (replayPushHistory.length > 0) {
      setPathPushHint(
        `未匹配到批次 ${queryReplayBatchId}，可在回放历史面板中检查筛选或重新推送。`
      );
      replayBatchQueryAppliedRef.current = signature;
    }
  }, [
    locatedReplayHistoryBatch,
    queryReplayBatchId,
    queryReplayFrom,
    replayPushHistory.length
  ]);

  useEffect(() => {
    const loadGraphActivities = () => {
      try {
        const raw = window.localStorage.getItem(GRAPH_ACTIVITY_STORAGE_KEY);
        if (!raw) {
          setGraphActivities([]);
          return;
        }
        const parsed = JSON.parse(raw) as unknown;
        setGraphActivities(normalizeGraphActivityPayload(parsed, 16));
      } catch {
        setGraphActivities([]);
      }
    };
    loadGraphActivities();
    window.addEventListener("focus", loadGraphActivities);
    return () => window.removeEventListener("focus", loadGraphActivities);
  }, []);

  useEffect(() => {
    try {
      const rawHeatmap = window.localStorage.getItem(GRAPH_HEATMAP_ENABLED_STORAGE_KEY);
      if (rawHeatmap === "0") {
        setEnableEdgeHeatmap(false);
      } else if (rawHeatmap === "1") {
        setEnableEdgeHeatmap(true);
      }
      const rawThreshold = window.localStorage.getItem(GRAPH_RISK_THRESHOLD_STORAGE_KEY);
      if (rawThreshold) {
        const parsed = Number(rawThreshold);
        if (Number.isFinite(parsed)) {
          setRiskThresholdPercent(Math.max(0, Math.min(80, Math.round(parsed))));
        }
      }
      const rawZoom = window.localStorage.getItem(GRAPH_CANVAS_ZOOM_STORAGE_KEY);
      if (rawZoom) {
        const parsed = Number(rawZoom);
        if (Number.isFinite(parsed)) {
          setCanvasZoomPercent(clampZoomPercent(parsed));
        }
      }
      const rawHistoryCompact = window.localStorage.getItem(GRAPH_HISTORY_COMPACT_STORAGE_KEY);
      if (rawHistoryCompact === "0") {
        setHistoryCompactMode(false);
      } else if (rawHistoryCompact === "1") {
        setHistoryCompactMode(true);
      }
      const rawSyncLayout = window.localStorage.getItem(GRAPH_SYNC_LAYOUT_STORAGE_KEY);
      if (rawSyncLayout === "0") {
        setSyncLayoutMode(false);
      } else if (rawSyncLayout === "1") {
        setSyncLayoutMode(true);
      }
      const rawInsightCompact = window.localStorage.getItem(GRAPH_INSIGHT_COMPACT_STORAGE_KEY);
      if (rawInsightCompact === "0") {
        setInsightCompactMode(false);
      } else if (rawInsightCompact === "1") {
        setInsightCompactMode(true);
      }
      const rawBridgeBatchLimit = window.localStorage.getItem(
        GRAPH_BRIDGE_BATCH_LIMIT_STORAGE_KEY
      );
      if (rawBridgeBatchLimit) {
        const parsed = Number(rawBridgeBatchLimit);
        if ([2, 3, 5, 8].includes(parsed)) {
          setBridgeSuggestionBatchLimit(parsed);
        }
      }
      const rawBridgeReplayCompact = window.localStorage.getItem(
        GRAPH_BRIDGE_REPLAY_COMPACT_STORAGE_KEY
      );
      if (rawBridgeReplayCompact === "0") {
        setBridgeReplayCompactMode(false);
      } else if (rawBridgeReplayCompact === "1") {
        setBridgeReplayCompactMode(true);
      }
      const rawBridgeReplayRiskOnly = window.localStorage.getItem(
        GRAPH_BRIDGE_REPLAY_RISK_ONLY_STORAGE_KEY
      );
      if (rawBridgeReplayRiskOnly === "1") {
        setBridgeReplayRiskOnly(true);
      } else if (rawBridgeReplayRiskOnly === "0") {
        setBridgeReplayRiskOnly(false);
      }
    } catch {
      // ignore storage read errors
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        GRAPH_HEATMAP_ENABLED_STORAGE_KEY,
        enableEdgeHeatmap ? "1" : "0"
      );
      window.localStorage.setItem(
        GRAPH_RISK_THRESHOLD_STORAGE_KEY,
        String(riskThresholdPercent)
      );
      window.localStorage.setItem(
        GRAPH_CANVAS_ZOOM_STORAGE_KEY,
        String(canvasZoomPercent)
      );
      window.localStorage.setItem(
        GRAPH_HISTORY_COMPACT_STORAGE_KEY,
        historyCompactMode ? "1" : "0"
      );
      window.localStorage.setItem(
        GRAPH_SYNC_LAYOUT_STORAGE_KEY,
        syncLayoutMode ? "1" : "0"
      );
      window.localStorage.setItem(
        GRAPH_INSIGHT_COMPACT_STORAGE_KEY,
        insightCompactMode ? "1" : "0"
      );
      window.localStorage.setItem(
        GRAPH_BRIDGE_BATCH_LIMIT_STORAGE_KEY,
        String(bridgeSuggestionBatchLimit)
      );
      window.localStorage.setItem(
        GRAPH_BRIDGE_REPLAY_COMPACT_STORAGE_KEY,
        bridgeReplayCompactMode ? "1" : "0"
      );
      window.localStorage.setItem(
        GRAPH_BRIDGE_REPLAY_RISK_ONLY_STORAGE_KEY,
        bridgeReplayRiskOnly ? "1" : "0"
      );
    } catch {
      // ignore storage write errors
    }
  }, [
    bridgeSuggestionBatchLimit,
    bridgeReplayCompactMode,
    bridgeReplayRiskOnly,
    canvasZoomPercent,
    enableEdgeHeatmap,
    historyCompactMode,
    insightCompactMode,
    riskThresholdPercent,
    syncLayoutMode
  ]);

  useEffect(() => {
    if (!focusedActivityId) {
      return;
    }
    const exists = graphActivities.some((item) => item.id === focusedActivityId);
    if (!exists) {
      setFocusedActivityId("");
    }
  }, [focusedActivityId, graphActivities]);

  useEffect(() => {
    if (!payload) {
      return;
    }
    const snapshot = buildGraphHistorySnapshot({
      nodes: payload.nodes,
      edges: payload.edges
    });
    setGraphHistory((prev) => {
      const next = appendGraphHistory(prev, snapshot, GRAPH_HISTORY_LIMIT);
      try {
        window.localStorage.setItem(GRAPH_HISTORY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore localStorage failures
      }
      return next;
    });
  }, [payload]);

  const domainBuckets = useMemo(
    () => buildDomainBuckets(payload?.nodes ?? []),
    [payload?.nodes]
  );
  const collapsedDomainSet = useMemo(
    () => new Set(collapsedDomains),
    [collapsedDomains]
  );
  const collapsedInsightSections = useMemo(
    () => collapsedInsightSectionsByView[graphWorkbenchView] ?? [],
    [collapsedInsightSectionsByView, graphWorkbenchView]
  );
  const collapsedInsightSectionSet = useMemo(
    () => new Set(collapsedInsightSections),
    [collapsedInsightSections]
  );
  const visibleInsightSections = useMemo(
    () =>
      GRAPH_INSIGHT_SECTIONS.filter(
        (section) => section.view === "all" || section.view === graphWorkbenchView
      ),
    [graphWorkbenchView]
  );
  const visibleInsightSectionAnchors = useMemo(
    () =>
      visibleInsightSections.map((section) => ({
        ...section,
        anchorId: GRAPH_INSIGHT_SECTION_ANCHOR_ID_MAP[section.key]
      })),
    [visibleInsightSections]
  );
  const visibleCollapsedInsightCount = useMemo(
    () =>
      visibleInsightSections.filter((item) =>
        collapsedInsightSectionSet.has(item.key)
      ).length,
    [collapsedInsightSectionSet, visibleInsightSections]
  );
  const updateCollapsedInsightsForView = useCallback(
    (
      targetView: GraphWorkbenchView,
      updater: (prev: GraphInsightSectionKey[]) => GraphInsightSectionKey[]
    ) => {
      setCollapsedInsightSectionsByView((prev) => {
        const current = prev[targetView] ?? [];
        const dedupedNext = Array.from(
          new Set(
            updater(current).filter(
              (item) => GRAPH_INSIGHT_SECTION_VIEW_MAP[item] === targetView
            )
          )
        );
        if (
          current.length === dedupedNext.length &&
          current.every((item, index) => item === dedupedNext[index])
        ) {
          return prev;
        }
        return {
          ...prev,
          [targetView]: dedupedNext
        };
      });
    },
    []
  );
  const updateCurrentViewCollapsedInsights = useCallback(
    (updater: (prev: GraphInsightSectionKey[]) => GraphInsightSectionKey[]) =>
      updateCollapsedInsightsForView(graphWorkbenchView, updater),
    [graphWorkbenchView, updateCollapsedInsightsForView]
  );
  const applyCurrentViewInsightPreset = useCallback(
    (preset: "lean" | "expand") => {
      if (preset === "expand") {
        updateCurrentViewCollapsedInsights((prev) => {
          const next = new Set(prev);
          visibleInsightSections.forEach((item) => {
            next.delete(item.key);
          });
          return Array.from(next);
        });
        return;
      }
      const keepByView: Record<GraphWorkbenchView, GraphInsightSectionKey[]> = {
        overview: ["active_focus"],
        bridge: ["bridge_suggestions"],
        history: ["replay_history"]
      };
      const keepSet = new Set(keepByView[graphWorkbenchView]);
      updateCurrentViewCollapsedInsights(() =>
        visibleInsightSections
          .map((item) => item.key)
          .filter((key) => !keepSet.has(key))
      );
    },
    [graphWorkbenchView, updateCurrentViewCollapsedInsights, visibleInsightSections]
  );
  const jumpToInsightSection = useCallback(
    (sectionKey: GraphInsightSectionKey) => {
      if (collapsedInsightSectionSet.has(sectionKey)) {
        updateCurrentViewCollapsedInsights((prev) =>
          prev.filter((item) => item !== sectionKey)
        );
      }
      const anchorId = GRAPH_INSIGHT_SECTION_ANCHOR_ID_MAP[sectionKey];
      window.setTimeout(() => {
        const section = document.getElementById(anchorId);
        section?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 18);
    },
    [collapsedInsightSectionSet, updateCurrentViewCollapsedInsights]
  );

  useEffect(() => {
    setCollapsedDomains((prev) =>
      prev.filter((domain) => domainBuckets.some((item) => item.domain === domain))
    );
  }, [domainBuckets]);

  const filteredNodes = useMemo(() => {
    if (!payload) {
      return [];
    }
    const keyword = nodeKeyword.trim().toLowerCase();
    const riskThreshold = riskThresholdPercent / 100;
    return payload.nodes.filter((node) => {
      const nodeDomain = node.domain ?? "general";
      if (collapsedDomainSet.has(nodeDomain)) {
        return false;
      }
      if (domainFilter !== "all" && nodeDomain !== domainFilter) {
        return false;
      }
      if (resolveNodeRisk(node) < riskThreshold) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return (
        node.label.toLowerCase().includes(keyword) ||
        node.id.toLowerCase().includes(keyword) ||
        nodeDomain.toLowerCase().includes(keyword)
      );
    });
  }, [collapsedDomainSet, domainFilter, nodeKeyword, payload, riskThresholdPercent]);

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((node) => node.id)),
    [filteredNodes]
  );

  const filteredEdges = useMemo(() => {
    if (!payload) {
      return [];
    }
    return payload.edges.filter(
      (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    );
  }, [filteredNodeIds, payload]);

  const placements = useMemo<GraphNodePlacement[]>(() => {
    return buildGraphLayout({
      nodes: filteredNodes,
      edges: filteredEdges,
      width: GRAPH_CANVAS_WIDTH,
      height: GRAPH_CANVAS_HEIGHT
    });
  }, [filteredEdges, filteredNodes]);

  const placementMap = useMemo(
    () => new Map(placements.map((item) => [item.id, item])),
    [placements]
  );

  const activeNode = useMemo(() => {
    if (placements.length === 0) {
      return null;
    }
    const selectedNode = placements.find((item) => item.id === activeNodeId);
    if (selectedNode) {
      return selectedNode;
    }
    return (
      [...placements].sort((a, b) => b.risk - a.risk || b.degree - a.degree)[0] ??
      placements[0]
    );
  }, [activeNodeId, placements]);

  useEffect(() => {
    if (!activeNode) {
      setActiveNodeId("");
      return;
    }
    if (activeNode.id !== activeNodeId) {
      setActiveNodeId(activeNode.id);
    }
  }, [activeNode, activeNodeId]);

  useEffect(() => {
    if (!activeNode) {
      setPulseNodeId("");
      return;
    }
    setPulseNodeId(activeNode.id);
    const timer = window.setTimeout(() => {
      setPulseNodeId((prev) => (prev === activeNode.id ? "" : prev));
    }, 820);
    const panel = insightPanelRef.current;
    if (panel) {
      const riskTarget = panel.querySelector<HTMLElement>(
        `[data-risk-node-id="${escapeSelectorValue(activeNode.id)}"]`
      );
      riskTarget?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      const domainTarget = panel.querySelector<HTMLElement>(
        `[data-domain-cluster="${escapeSelectorValue(activeNode.domain ?? "general")}"]`
      );
      domainTarget?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    return () => window.clearTimeout(timer);
  }, [activeNode]);

  const connectedNodeIds = useMemo(() => {
    if (!activeNode) {
      return new Set<string>();
    }
    const ids = new Set<string>();
    for (const edge of filteredEdges) {
      if (edge.source === activeNode.id) {
        ids.add(edge.target);
      }
      if (edge.target === activeNode.id) {
        ids.add(edge.source);
      }
    }
    return ids;
  }, [activeNode, filteredEdges]);

  const relatedNodes = useMemo(
    () =>
      placements
        .filter((item) => connectedNodeIds.has(item.id))
        .sort((a, b) => b.degree - a.degree || b.risk - a.risk)
        .slice(0, 8),
    [connectedNodeIds, placements]
  );
  const resolveRelatedNodeLabelsForFocus = useCallback(
    (nodeId: string, limit = 5) => {
      const connectedIds = new Set<string>();
      for (const edge of filteredEdges) {
        if (edge.source === nodeId) {
          connectedIds.add(edge.target);
        }
        if (edge.target === nodeId) {
          connectedIds.add(edge.source);
        }
      }
      return placements
        .filter((item) => connectedIds.has(item.id))
        .sort((a, b) => b.degree - a.degree || b.risk - a.risk)
        .slice(0, Math.max(1, limit))
        .map((item) => item.label);
    },
    [filteredEdges, placements]
  );

  const highRiskNodes = useMemo(
    () =>
      rankHighRiskNodes(filteredNodes, 6).map((item) => {
        const placement = placementMap.get(item.id);
        return placement
          ? placement
          : {
              id: item.id,
              label: item.label,
              domain: item.domain ?? "general",
              mastery: item.mastery ?? 0.45,
              risk: resolveNodeRisk(item),
              degree: 0,
              x: 0,
              y: 0,
              radius: 10
            };
      }),
    [filteredNodes, placementMap]
  );

  const domainClusterOverview = useMemo<DomainClusterSummary[]>(() => {
    if (filteredNodes.length === 0) {
      return [];
    }
    const map = new Map<
      string,
      {
        nodeCount: number;
        relationCount: number;
        riskTotal: number;
        masteryTotal: number;
        highRiskCount: number;
      }
    >();

    for (const node of filteredNodes) {
      const domain = node.domain ?? "general";
      const risk = resolveNodeRisk(node);
      const mastery = 1 - risk;
      const snapshot = map.get(domain) ?? {
        nodeCount: 0,
        relationCount: 0,
        riskTotal: 0,
        masteryTotal: 0,
        highRiskCount: 0
      };
      snapshot.nodeCount += 1;
      snapshot.riskTotal += risk;
      snapshot.masteryTotal += mastery;
      if (risk >= 0.6) {
        snapshot.highRiskCount += 1;
      }
      map.set(domain, snapshot);
    }

    for (const edge of filteredEdges) {
      const sourceDomain = placementMap.get(edge.source)?.domain;
      const targetDomain = placementMap.get(edge.target)?.domain;
      if (!sourceDomain || !targetDomain) {
        continue;
      }
      if (sourceDomain === targetDomain) {
        const sourceCluster = map.get(sourceDomain);
        if (sourceCluster) {
          sourceCluster.relationCount += 1;
        }
      } else {
        const sourceCluster = map.get(sourceDomain);
        const targetCluster = map.get(targetDomain);
        if (sourceCluster) {
          sourceCluster.relationCount += 1;
        }
        if (targetCluster) {
          targetCluster.relationCount += 1;
        }
      }
    }

    return Array.from(map.entries())
      .map(([domain, value]) => ({
        domain,
        nodeCount: value.nodeCount,
        relationCount: value.relationCount,
        averageRisk: Number((value.riskTotal / Math.max(1, value.nodeCount)).toFixed(2)),
        averageMastery: Number(
          (value.masteryTotal / Math.max(1, value.nodeCount)).toFixed(2)
        ),
        highRiskCount: value.highRiskCount
      }))
      .sort((a, b) => b.averageRisk - a.averageRisk || b.nodeCount - a.nodeCount);
  }, [filteredEdges, filteredNodes, placementMap]);

  const riskBridgeSuggestions = useMemo<RiskBridgeSuggestion[]>(() => {
    if (filteredEdges.length === 0) {
      return [];
    }
    const bridgeMap = new Map<string, RiskBridgeSuggestion>();
    for (const edge of filteredEdges) {
      const source = placementMap.get(edge.source);
      const target = placementMap.get(edge.target);
      if (!source || !target) {
        continue;
      }
      const risk = Number((((source.risk + target.risk) / 2)).toFixed(2));
      if (risk < 0.48) {
        continue;
      }
      const weight = Number(edge.weight ?? 1);
      const key = buildEdgeKey(source.id, target.id);
      const primary = source.risk >= target.risk ? source : target;
      const secondary = primary.id === source.id ? target : source;
      const summary =
        source.domain === target.domain
          ? `同域脆弱链：${source.domain} 内部迁移不稳，建议先做“反例诊断 + 变式巩固”。`
          : `跨域断裂链：${source.domain} -> ${target.domain} 迁移弱，建议补“桥接任务”。`;
      const candidate: RiskBridgeSuggestion = {
        id: key,
        source,
        target,
        primary,
        secondary,
        risk,
        weight,
        summary
      };
      const previous = bridgeMap.get(key);
      if (
        !previous ||
        candidate.risk > previous.risk ||
        (candidate.risk === previous.risk && candidate.weight > previous.weight)
      ) {
        bridgeMap.set(key, candidate);
      }
    }
    return Array.from(bridgeMap.values())
      .sort((a, b) => b.risk - a.risk || b.weight - a.weight)
      .slice(0, 6);
  }, [filteredEdges, placementMap]);
  const renderRiskBridgeSuggestions = useMemo(
    () =>
      insightCompactMode ? riskBridgeSuggestions.slice(0, 4) : riskBridgeSuggestions,
    [insightCompactMode, riskBridgeSuggestions]
  );
  const bridgeSuggestionSummary = useMemo(() => {
    if (riskBridgeSuggestions.length === 0) {
      return {
        total: 0,
        crossDomainCount: 0,
        highRiskCount: 0,
        averageRisk: 0
      };
    }
    const crossDomainCount = riskBridgeSuggestions.filter(
      (item) => item.source.domain !== item.target.domain
    ).length;
    const highRiskCount = riskBridgeSuggestions.filter((item) => item.risk >= 0.65).length;
    const averageRisk = Number(
      (
        riskBridgeSuggestions.reduce((sum, item) => sum + item.risk, 0) /
        riskBridgeSuggestions.length
      ).toFixed(2)
    );
    return {
      total: riskBridgeSuggestions.length,
      crossDomainCount,
      highRiskCount,
      averageRisk
    };
  }, [riskBridgeSuggestions]);

  useEffect(() => {
    if (!selectedBridgeId) {
      return;
    }
    const exists = riskBridgeSuggestions.some((item) => item.id === selectedBridgeId);
    if (!exists) {
      setSelectedBridgeId("");
    }
  }, [riskBridgeSuggestions, selectedBridgeId]);

  useEffect(() => {
    if (riskBridgeSuggestions.length === 0) {
      return;
    }
    const entries: BridgeHistoryEntry[] = riskBridgeSuggestions.map((item) => ({
      id: item.id,
      sourceLabel: item.source.label,
      targetLabel: item.target.label,
      risk: item.risk,
      weight: item.weight
    }));
    const signature = buildBridgeHistorySignature(entries);
    setBridgeHistory((prev) => {
      if (prev[0]?.signature === signature) {
        return prev;
      }
      const snapshot: BridgeHistorySnapshot = {
        id: `bridge_hist_${Date.now().toString(36)}`,
        at: new Date().toISOString(),
        signature,
        bridges: entries
      };
      const next = [snapshot, ...prev].slice(0, GRAPH_BRIDGE_HISTORY_LIMIT);
      try {
        window.localStorage.setItem(
          GRAPH_BRIDGE_HISTORY_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        // ignore localStorage failures
      }
      return next;
    });
  }, [riskBridgeSuggestions]);

  const averageMastery = useMemo(() => {
    if (filteredNodes.length === 0) {
      return 0;
    }
    const total = filteredNodes.reduce((sum, node) => sum + (node.mastery ?? 0.45), 0);
    return total / filteredNodes.length;
  }, [filteredNodes]);

  const activeTimeline = graphHistory[0] ?? null;
  const previousTimeline = graphHistory[1] ?? null;
  const timelineDelta = useMemo(() => {
    if (!activeTimeline) {
      return null;
    }
    return buildGraphHistoryDeltas(activeTimeline, previousTimeline);
  }, [activeTimeline, previousTimeline]);

  const bridgeSuggestionMap = useMemo(
    () => new Map(riskBridgeSuggestions.map((item) => [item.id, item])),
    [riskBridgeSuggestions]
  );
  const bridgeLensSuggestionPool = useMemo(
    () =>
      bridgeLensCrossDomainOnly
        ? riskBridgeSuggestions.filter((item) => item.source.domain !== item.target.domain)
        : riskBridgeSuggestions,
    [bridgeLensCrossDomainOnly, riskBridgeSuggestions]
  );
  const selectedBridgeSuggestion = useMemo(() => {
    if (selectedBridgeId) {
      return bridgeLensSuggestionPool.find((item) => item.id === selectedBridgeId) ?? null;
    }
    return bridgeLensSuggestionPool[0] ?? null;
  }, [bridgeLensSuggestionPool, selectedBridgeId]);

  const bridgeLensNodeIds = useMemo(() => {
    if (graphLensMode !== "bridge_focus" || !selectedBridgeSuggestion) {
      return new Set(filteredNodes.map((item) => item.id));
    }
    const nodeIds = new Set<string>([
      selectedBridgeSuggestion.source.id,
      selectedBridgeSuggestion.target.id
    ]);
    for (const edge of filteredEdges) {
      if (nodeIds.has(edge.source)) {
        nodeIds.add(edge.target);
      }
      if (nodeIds.has(edge.target)) {
        nodeIds.add(edge.source);
      }
    }
    return nodeIds;
  }, [filteredEdges, filteredNodes, graphLensMode, selectedBridgeSuggestion]);

  const canvasPlacements = useMemo(() => {
    if (graphLensMode !== "bridge_focus") {
      return placements;
    }
    return placements.filter((item) => bridgeLensNodeIds.has(item.id));
  }, [bridgeLensNodeIds, graphLensMode, placements]);

  const canvasNodeIds = useMemo(
    () => new Set(canvasPlacements.map((item) => item.id)),
    [canvasPlacements]
  );

  const canvasEdges = useMemo(
    () =>
      filteredEdges.filter(
        (edge) => canvasNodeIds.has(edge.source) && canvasNodeIds.has(edge.target)
      ),
    [canvasNodeIds, filteredEdges]
  );

  const canvasIsolatedCount = useMemo(() => {
    if (canvasPlacements.length === 0) {
      return 0;
    }
    const degreeMap = new Map<string, number>();
    for (const node of canvasPlacements) {
      degreeMap.set(node.id, 0);
    }
    for (const edge of canvasEdges) {
      degreeMap.set(edge.source, (degreeMap.get(edge.source) ?? 0) + 1);
      degreeMap.set(edge.target, (degreeMap.get(edge.target) ?? 0) + 1);
    }
    return Array.from(degreeMap.values()).filter((value) => value === 0).length;
  }, [canvasEdges, canvasPlacements]);
  const hoveredNode = useMemo(
    () => canvasPlacements.find((item) => item.id === hoveredNodeId) ?? null,
    [canvasPlacements, hoveredNodeId]
  );
  const hoveredNodeNeighborCount = useMemo(() => {
    if (!hoveredNode) {
      return 0;
    }
    const ids = new Set<string>();
    for (const edge of canvasEdges) {
      if (edge.source === hoveredNode.id) {
        ids.add(edge.target);
      }
      if (edge.target === hoveredNode.id) {
        ids.add(edge.source);
      }
    }
    return ids.size;
  }, [canvasEdges, hoveredNode]);
  const hoveredNodeTips = useMemo(
    () => (hoveredNode ? buildNodeInterventionTips(hoveredNode) : []),
    [hoveredNode]
  );

  const replayTargetBridgeId = useMemo(() => {
    if (selectedBridgeId) {
      return selectedBridgeId;
    }
    if (riskBridgeSuggestions[0]?.id) {
      return riskBridgeSuggestions[0].id;
    }
    return bridgeHistory[0]?.bridges[0]?.id ?? "";
  }, [bridgeHistory, riskBridgeSuggestions, selectedBridgeId]);

  const bridgeReplayFrames = useMemo(
    () =>
      buildBridgeReplayFrames(bridgeHistory, {
        mode: bridgeReplayMode,
        targetBridgeId: replayTargetBridgeId,
        focusLimit: 8,
        allLimit: 18
      }),
    [bridgeHistory, bridgeReplayMode, replayTargetBridgeId]
  );

  const bridgeReplayNodeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          bridgeReplayFrames.flatMap((frame) => [
            frame.bridge.sourceLabel,
            frame.bridge.targetLabel
          ])
        )
      )
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "zh-CN")),
    [bridgeReplayFrames]
  );

  const displayedBridgeReplayFrames = useMemo(() => {
    const keyword = bridgeReplayKeyword.trim().toLowerCase();
    return bridgeReplayFrames.filter((frame) => {
      if (
        bridgeReplayNodeFilter !== "all" &&
        frame.bridge.sourceLabel !== bridgeReplayNodeFilter &&
        frame.bridge.targetLabel !== bridgeReplayNodeFilter
      ) {
        return false;
      }
      if (bridgeReplayRiskOnly && frame.bridge.risk < 0.65) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      const normalizedAt = formatDateTime(frame.at).toLowerCase();
      return (
        frame.bridge.sourceLabel.toLowerCase().includes(keyword) ||
        frame.bridge.targetLabel.toLowerCase().includes(keyword) ||
        normalizedAt.includes(keyword) ||
        frame.at.toLowerCase().includes(keyword)
      );
    });
  }, [bridgeReplayFrames, bridgeReplayKeyword, bridgeReplayNodeFilter, bridgeReplayRiskOnly]);

  const orderedBridgeReplayFrames = useMemo(
    () =>
      [...displayedBridgeReplayFrames].sort((a, b) =>
        a.at.localeCompare(b.at, "zh-CN")
      ),
    [displayedBridgeReplayFrames]
  );
  const renderBridgeReplayFrames = useMemo(
    () =>
      bridgeReplayCompactMode
        ? displayedBridgeReplayFrames.slice(0, 8)
        : displayedBridgeReplayFrames,
    [bridgeReplayCompactMode, displayedBridgeReplayFrames]
  );
  const bridgeReplaySummary = useMemo(() => {
    if (displayedBridgeReplayFrames.length === 0) {
      return { highRiskCount: 0, averageRisk: 0, latestAt: "" };
    }
    const highRiskCount = displayedBridgeReplayFrames.filter(
      (item) => item.bridge.risk >= 0.65
    ).length;
    const averageRisk = Number(
      (
        displayedBridgeReplayFrames.reduce((sum, item) => sum + item.bridge.risk, 0) /
        displayedBridgeReplayFrames.length
      ).toFixed(2)
    );
    const latestAt =
      [...displayedBridgeReplayFrames]
        .sort((a, b) => b.at.localeCompare(a.at, "zh-CN"))[0]?.at ?? "";
    return {
      highRiskCount,
      averageRisk,
      latestAt
    };
  }, [displayedBridgeReplayFrames]);

  const activeBridgeReplayFrame = useMemo(() => {
    if (orderedBridgeReplayFrames.length === 0) {
      return null;
    }
    const index = Math.max(
      0,
      Math.min(bridgeReplayCursor, orderedBridgeReplayFrames.length - 1)
    );
    return orderedBridgeReplayFrames[index] ?? null;
  }, [bridgeReplayCursor, orderedBridgeReplayFrames]);

  const bridgeReplayProgressPercent = useMemo(() => {
    if (orderedBridgeReplayFrames.length === 0) {
      return 0;
    }
    return Number(
      (
        ((Math.min(bridgeReplayCursor, orderedBridgeReplayFrames.length - 1) + 1) /
          orderedBridgeReplayFrames.length) *
        100
      ).toFixed(1)
    );
  }, [bridgeReplayCursor, orderedBridgeReplayFrames.length]);

  const activeBridgeReplayFrameKey = useMemo(() => {
    if (!activeBridgeReplayFrame) {
      return "";
    }
    return buildBridgeReplayFrameKey({
      snapshotId: activeBridgeReplayFrame.snapshotId,
      bridgeId: activeBridgeReplayFrame.bridge.id
    });
  }, [activeBridgeReplayFrame]);

  const activeReplayBridgeSuggestion = useMemo<RiskBridgeSuggestion | null>(() => {
    if (!activeBridgeReplayFrame) {
      return null;
    }
    const byId = bridgeSuggestionMap.get(activeBridgeReplayFrame.bridge.id);
    if (byId) {
      return byId;
    }
    const source = placements.find(
      (item) => item.label === activeBridgeReplayFrame.bridge.sourceLabel
    );
    const target = placements.find(
      (item) => item.label === activeBridgeReplayFrame.bridge.targetLabel
    );
    if (!source || !target) {
      return null;
    }
    const primary = source.risk >= target.risk ? source : target;
    const secondary = primary.id === source.id ? target : source;
    return {
      id: activeBridgeReplayFrame.bridge.id,
      source,
      target,
      primary,
      secondary,
      risk: activeBridgeReplayFrame.bridge.risk,
      weight: activeBridgeReplayFrame.bridge.weight,
      summary:
        source.domain === target.domain
          ? `同域脆弱链：${source.domain} 内部迁移不稳，建议先做“反例诊断 + 变式巩固”。`
          : `跨域断裂链：${source.domain} -> ${target.domain} 迁移弱，建议补“桥接任务”。`
    };
  }, [activeBridgeReplayFrame, bridgeSuggestionMap, placements]);

  const replayFrameSuggestions = useMemo<
    Array<{ frame: (typeof orderedBridgeReplayFrames)[number]; suggestion: RiskBridgeSuggestion }>
  >(
    () =>
      orderedBridgeReplayFrames
        .map((frame) => {
          const byId = bridgeSuggestionMap.get(frame.bridge.id);
          if (byId) {
            return { frame, suggestion: byId };
          }
          const source = placements.find((item) => item.label === frame.bridge.sourceLabel);
          const target = placements.find((item) => item.label === frame.bridge.targetLabel);
          if (!source || !target) {
            return null;
          }
          const primary = source.risk >= target.risk ? source : target;
          const secondary = primary.id === source.id ? target : source;
          return {
            frame,
            suggestion: {
              id: frame.bridge.id,
              source,
              target,
              primary,
              secondary,
              risk: frame.bridge.risk,
              weight: frame.bridge.weight,
              summary:
                source.domain === target.domain
                  ? `同域脆弱链：${source.domain} 内部迁移不稳，建议先做“反例诊断 + 变式巩固”。`
                  : `跨域断裂链：${source.domain} -> ${target.domain} 迁移弱，建议补“桥接任务”。`
            }
          };
        })
        .filter(
          (
            item
          ): item is {
            frame: (typeof orderedBridgeReplayFrames)[number];
            suggestion: RiskBridgeSuggestion;
          } => item !== null
        ),
    [bridgeSuggestionMap, orderedBridgeReplayFrames, placements]
  );

  const replayBatchFocuses = useMemo<PathFocusPayload[]>(() => {
    if (replayFrameSuggestions.length === 0) {
      return [];
    }
    const frameUpperBound = Math.max(
      0,
      Math.min(bridgeReplayCursor, replayFrameSuggestions.length - 1)
    );
    const candidateRows = replayFrameSuggestions
      .slice(0, frameUpperBound + 1)
      .map((item) => {
        const bridge = item.suggestion;
        return {
          bridge,
          at: item.frame.at,
          risk: item.frame.bridge.risk
        };
      })
      .sort((a, b) => b.risk - a.risk || b.at.localeCompare(a.at, "zh-CN"));
    const deduped = new Map<string, PathFocusPayload>();
    for (const row of candidateRows) {
      const key = `${row.bridge.primary.id}__${row.bridge.secondary.label}`;
      if (deduped.has(key)) {
        continue;
      }
      deduped.set(key, {
        nodeId: row.bridge.primary.id,
        nodeLabel: row.bridge.primary.label,
        domain: row.bridge.primary.domain,
        mastery: row.bridge.primary.mastery,
        risk: row.risk,
        relatedNodes: [
          row.bridge.secondary.label,
          ...resolveRelatedNodeLabelsForFocus(row.bridge.primary.id, 5)
        ].slice(0, 5),
        at: row.at,
        focusSource: "graph_bridge",
        bridgePartnerLabel: row.bridge.secondary.label,
        bridgeTaskTemplate: buildBridgeTaskTemplate(
          row.bridge.primary.label,
          row.bridge.secondary.label
        )
      });
      if (deduped.size >= Math.max(2, bridgeReplayBatchLimit)) {
        break;
      }
    }
    return Array.from(deduped.values());
  }, [
    bridgeReplayBatchLimit,
    bridgeReplayCursor,
    replayFrameSuggestions,
    resolveRelatedNodeLabelsForFocus
  ]);

  const bridgeReplayNodeStats = useMemo<BridgeReplayNodeStat[]>(() => {
    if (displayedBridgeReplayFrames.length === 0) {
      return [];
    }
    const map = new Map<
      string,
      {
        count: number;
        riskTotal: number;
        maxRisk: number;
        latestAt: string;
        points: Array<{ at: string; risk: number }>;
      }
    >();
    for (const frame of displayedBridgeReplayFrames) {
      const labels = [frame.bridge.sourceLabel, frame.bridge.targetLabel];
      for (const label of labels) {
        const previous = map.get(label) ?? {
          count: 0,
          riskTotal: 0,
          maxRisk: 0,
          latestAt: "",
          points: []
        };
        previous.count += 1;
        previous.riskTotal += frame.bridge.risk;
        previous.maxRisk = Math.max(previous.maxRisk, frame.bridge.risk);
        if (!previous.latestAt || frame.at > previous.latestAt) {
          previous.latestAt = frame.at;
        }
        previous.points.push({
          at: frame.at,
          risk: frame.bridge.risk
        });
        map.set(label, previous);
      }
    }
    return Array.from(map.entries())
      .map(([label, value]) => {
        const sortedPoints = [...value.points]
          .sort((a, b) => a.at.localeCompare(b.at))
          .map((item) => Number(item.risk.toFixed(2)));
        const first = sortedPoints[0] ?? 0;
        const last = sortedPoints[sortedPoints.length - 1] ?? 0;
        return {
          label,
          count: value.count,
          averageRisk: Number((value.riskTotal / Math.max(1, value.count)).toFixed(2)),
          maxRisk: Number(value.maxRisk.toFixed(2)),
          latestAt: value.latestAt,
          trendPoints: sortedPoints,
          trendDelta: Number((last - first).toFixed(2))
        };
      })
      .sort((a, b) => b.count - a.count || b.averageRisk - a.averageRisk)
      .slice(0, 6);
  }, [displayedBridgeReplayFrames]);

  useEffect(() => {
    if (bridgeReplayNodeFilter === "all") {
      return;
    }
    if (!bridgeReplayNodeOptions.includes(bridgeReplayNodeFilter)) {
      setBridgeReplayNodeFilter("all");
    }
  }, [bridgeReplayNodeFilter, bridgeReplayNodeOptions]);

  useEffect(() => {
    if (orderedBridgeReplayFrames.length === 0) {
      setBridgeReplayCursor(0);
      setIsBridgeReplayPlaying(false);
      clearBridgeReplayTimer();
      return;
    }
    setBridgeReplayCursor((prev) =>
      Math.max(0, Math.min(prev, orderedBridgeReplayFrames.length - 1))
    );
  }, [clearBridgeReplayTimer, orderedBridgeReplayFrames.length]);

  useEffect(() => {
    if (!isBridgeReplayPlaying) {
      clearBridgeReplayTimer();
      return;
    }
    if (orderedBridgeReplayFrames.length <= 1) {
      setIsBridgeReplayPlaying(false);
      clearBridgeReplayTimer();
      return;
    }
    if (bridgeReplayCursor >= orderedBridgeReplayFrames.length - 1) {
      setIsBridgeReplayPlaying(false);
      clearBridgeReplayTimer();
      return;
    }
    clearBridgeReplayTimer();
    bridgeReplayTimerRef.current = window.setTimeout(() => {
      setBridgeReplayCursor((prev) =>
        Math.min(prev + 1, orderedBridgeReplayFrames.length - 1)
      );
    }, BRIDGE_REPLAY_INTERVAL_MS[bridgeReplaySpeed]);
    return clearBridgeReplayTimer;
  }, [
    bridgeReplayCursor,
    bridgeReplaySpeed,
    clearBridgeReplayTimer,
    isBridgeReplayPlaying,
    orderedBridgeReplayFrames.length
  ]);

  useEffect(() => clearBridgeReplayTimer, [clearBridgeReplayTimer]);

  useEffect(() => {
    if (graphLensMode !== "bridge_focus" || !selectedBridgeSuggestion) {
      return;
    }
    if (!activeNodeId || !bridgeLensNodeIds.has(activeNodeId)) {
      setActiveNodeId(selectedBridgeSuggestion.primary.id);
    }
  }, [activeNodeId, bridgeLensNodeIds, graphLensMode, selectedBridgeSuggestion]);

  useEffect(() => {
    if (graphLensMode !== "bridge_focus") {
      return;
    }
    if (bridgeLensSuggestionPool.length > 0) {
      return;
    }
    setGraphLensMode("full");
    setPathPushHint("当前没有满足镜头条件的关系链，已回退到全局图。");
  }, [bridgeLensSuggestionPool.length, graphLensMode]);

  const loadWorkspaceSessionsForHover = useCallback(async () => {
    setLoadingHoverSessions(true);
    try {
      const payload = await requestJson<{ sessions: WorkspaceSessionSummary[] }>(
        "/api/workspace/sessions"
      );
      const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
      setHoverWorkspaceSessions(sessions);
    } catch (err) {
      setError(formatErrorMessage(err, "加载工作区会话失败。"));
      setHoverWorkspaceSessions([]);
    } finally {
      setLoadingHoverSessions(false);
    }
  }, []);

  useEffect(() => {
    if (hoverSaveMode !== "append_existing") {
      return;
    }
    if (hoverWorkspaceSessions.length > 0) {
      return;
    }
    void loadWorkspaceSessionsForHover();
  }, [hoverSaveMode, hoverWorkspaceSessions.length, loadWorkspaceSessionsForHover]);

  useEffect(() => {
    if (hoverSaveMode !== "append_existing") {
      return;
    }
    if (hoverWorkspaceSessions.length === 0) {
      setHoverTargetSessionId("");
      return;
    }
    const exists = hoverWorkspaceSessions.some((item) => item.id === hoverTargetSessionId);
    if (!exists) {
      setHoverTargetSessionId(hoverWorkspaceSessions[0]?.id ?? "");
    }
  }, [hoverSaveMode, hoverTargetSessionId, hoverWorkspaceSessions]);

  const pushNodeToPath = useCallback((node: GraphNodePlacement) => {
    writePathFocusToStorage(
      {
        nodeId: node.id,
        nodeLabel: node.label,
        domain: node.domain,
        mastery: node.mastery,
        risk: node.risk,
        relatedNodes: resolveRelatedNodeLabelsForFocus(node.id, 5),
        at: new Date().toISOString(),
        focusSource: "graph"
      },
      (key, value) => window.localStorage.setItem(key, value)
    );
    const params = new URLSearchParams({
      from: "graph",
      focusNode: node.id,
      focusLabel: node.label
    });
    router.push(`/path?${params.toString()}`);
    setPathPushHint(`已将焦点节点「${node.label}」推送到路径页。`);
  }, [resolveRelatedNodeLabelsForFocus, router]);

  const pushNodeToWorkspace = useCallback((node: GraphNodePlacement) => {
    writeWorkspaceFocusToStorage(
      {
        nodeId: node.id,
        nodeLabel: node.label,
        domain: node.domain,
        mastery: node.mastery,
        risk: node.risk,
        relatedNodes: resolveRelatedNodeLabelsForFocus(node.id, 5),
        at: new Date().toISOString(),
        focusSource: "graph"
      },
      (key, value) => window.localStorage.setItem(key, value)
    );
    router.push("/workspace");
    setPathPushHint(`已将焦点节点「${node.label}」推送到工作区。`);
  }, [resolveRelatedNodeLabelsForFocus, router]);

  const openWorkspaceSessionById = useCallback(
    (sessionId: string, options?: OpenWorkspaceSessionOptions) => {
      const normalized = sessionId.trim();
      if (!normalized) {
        return;
      }
      const params = new URLSearchParams({ sessionId: normalized });
      params.set("from", options?.from ?? "graph");
      if (options?.noteId?.trim()) {
        params.set("noteId", options.noteId.trim());
      }
      if (options?.nodeLabel?.trim()) {
        params.set("nodeLabel", options.nodeLabel.trim());
      }
      router.push(`/workspace?${params.toString()}`);
    },
    [router]
  );

  const openKbByNoteId = useCallback(
    (noteId: string, nodeLabel?: string) => {
      const normalized = noteId.trim();
      if (!normalized) {
        return;
      }
      const params = new URLSearchParams({
        from: "graph_save",
        noteId: normalized,
        q: normalized,
        auto: "1"
      });
      if (nodeLabel?.trim()) {
        params.set("nodeLabel", nodeLabel.trim());
      }
      router.push(`/kb?${params.toString()}`);
    },
    [router]
  );

  const handlePushActiveNodeToPath = useCallback(() => {
    if (!activeNode) {
      return;
    }
    pushNodeToPath(activeNode);
  }, [activeNode, pushNodeToPath]);

  const handlePushActiveNodeToWorkspace = useCallback(() => {
    if (!activeNode) {
      return;
    }
    pushNodeToWorkspace(activeNode);
  }, [activeNode, pushNodeToWorkspace]);

  const handleSaveNodeInterventionToWorkspace = useCallback(
    async (node: GraphNodePlacement) => {
      setSavingHoverSuggestion(true);
      setError("");
      try {
        const relatedLabels = resolveRelatedNodeLabelsForFocus(node.id, 6);
        const tips = buildNodeInterventionTips(node);
        let sessionId = "";
        if (hoverSaveMode === "append_existing") {
          sessionId = hoverTargetSessionId.trim();
          if (!sessionId) {
            setError("请选择一个已有工作区会话用于追加沉淀。");
            return;
          }
        } else {
          const sessionPayload = await requestJson<CreateWorkspaceSessionResponse>(
            "/api/workspace/session",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: `图谱干预-${node.label}`,
                initialGoal: `降低「${node.label}」的迁移风险`
              })
            }
          );
          sessionId = sessionPayload.session.id;
        }
        const markdown = buildNodeInterventionMarkdown({
          node,
          relatedLabels,
          tips
        });
        const saved = await requestJson<SaveNoteResponse>("/api/workspace/note/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            title: `图谱干预建议-${node.label}`,
            content: markdown,
            tags: ["graph_hover", "intervention", node.domain || "general"],
            links: relatedLabels.slice(0, 6)
          })
        });
        setPathPushHint(
          `${hoverSaveMode === "append_existing" ? "已追加会话沉淀" : "已沉淀节点干预建议"}：${
            saved.noteId
          }（session: ${sessionId}，节点：${node.label}）`
        );
        setHoverSaveResult({
          sessionId,
          noteId: saved.noteId,
          nodeId: node.id,
          nodeLabel: node.label
        });
      } catch (err) {
        setError(formatErrorMessage(err, "写入节点干预建议失败。"));
      } finally {
        setSavingHoverSuggestion(false);
      }
    },
    [hoverSaveMode, hoverTargetSessionId, resolveRelatedNodeLabelsForFocus]
  );

  const handleFocusBridge = useCallback((bridge: RiskBridgeSuggestion) => {
    setSelectedBridgeId(bridge.id);
    setGraphLensMode("bridge_focus");
    setDomainFilter(bridge.primary.domain ?? "all");
    setNodeKeyword("");
    setActiveNodeId(bridge.primary.id);
  }, []);

  const handleSelectReplayBridge = useCallback(
    (bridgeId: string) => {
      setSelectedBridgeId(bridgeId);
      setGraphLensMode("bridge_focus");
      const matched = bridgeSuggestionMap.get(bridgeId);
      if (!matched) {
        return;
      }
      setDomainFilter(matched.primary.domain ?? "all");
      setNodeKeyword("");
      setActiveNodeId(matched.primary.id);
    },
    [bridgeSuggestionMap]
  );

  const handleSelectReplayFrame = useCallback(
    (snapshotId: string, bridgeId: string) => {
      const frameKey = buildBridgeReplayFrameKey({
        snapshotId,
        bridgeId
      });
      const index = orderedBridgeReplayFrames.findIndex(
        (frame) =>
          buildBridgeReplayFrameKey({
            snapshotId: frame.snapshotId,
            bridgeId: frame.bridge.id
          }) === frameKey
      );
      if (index >= 0) {
        setBridgeReplayCursor(index);
      }
      setIsBridgeReplayPlaying(false);
      handleSelectReplayBridge(bridgeId);
    },
    [handleSelectReplayBridge, orderedBridgeReplayFrames]
  );

  const handleBridgeReplayStep = useCallback(
    (offset: number) => {
      if (orderedBridgeReplayFrames.length === 0) {
        return;
      }
      setIsBridgeReplayPlaying(false);
      setBridgeReplayCursor((prev) =>
        Math.max(0, Math.min(prev + offset, orderedBridgeReplayFrames.length - 1))
      );
    },
    [orderedBridgeReplayFrames.length]
  );

  const toggleBridgeReplayPlay = useCallback(() => {
    if (orderedBridgeReplayFrames.length <= 1) {
      return;
    }
    setIsBridgeReplayPlaying((prev) => {
      if (prev) {
        return false;
      }
      if (bridgeReplayCursor >= orderedBridgeReplayFrames.length - 1) {
        setBridgeReplayCursor(0);
      }
      return true;
    });
  }, [bridgeReplayCursor, orderedBridgeReplayFrames.length]);

  const restartBridgeReplay = useCallback(() => {
    if (orderedBridgeReplayFrames.length === 0) {
      return;
    }
    setIsBridgeReplayPlaying(false);
    setBridgeReplayCursor(0);
  }, [orderedBridgeReplayFrames.length]);

  const handleFocusReplayNode = useCallback((label: string) => {
    setBridgeReplayNodeFilter(label);
    const matched = placements.find((item) => item.label === label);
    if (!matched) {
      return;
    }
    setDomainFilter(matched.domain ?? "all");
    setNodeKeyword("");
    setActiveNodeId(matched.id);
  }, [placements]);

  useEffect(() => {
    if (!activeBridgeReplayFrame) {
      return;
    }
    handleSelectReplayBridge(activeBridgeReplayFrame.bridge.id);
  }, [activeBridgeReplayFrame, handleSelectReplayBridge]);

  const buildBridgeFocusPayload = useCallback(
    (bridge: RiskBridgeSuggestion, replayMeta?: ReplayPushMeta): PathFocusPayload => ({
      nodeId: bridge.primary.id,
      nodeLabel: bridge.primary.label,
      domain: bridge.primary.domain,
      mastery: bridge.primary.mastery,
      risk: bridge.primary.risk,
      relatedNodes: [
        bridge.secondary.label,
        ...resolveRelatedNodeLabelsForFocus(bridge.primary.id, 5)
      ].slice(0, 5),
      at: new Date().toISOString(),
      focusSource: "graph_bridge",
      bridgePartnerLabel: bridge.secondary.label,
      bridgeTaskTemplate: buildBridgeTaskTemplate(
        bridge.primary.label,
        bridge.secondary.label
      ),
      replayBatchId: replayMeta?.replayBatchId,
      replayBatchIndex: replayMeta?.replayBatchIndex,
      replayBatchTotal: replayMeta?.replayBatchTotal,
      replayFrameAt: replayMeta?.replayFrameAt,
      replayMode: replayMeta?.replayMode
    }),
    [resolveRelatedNodeLabelsForFocus]
  );
  const bridgeSuggestionBatchQueue = useMemo<PathFocusPayload[]>(() => {
    if (riskBridgeSuggestions.length === 0) {
      return [];
    }
    const limit = Math.min(
      riskBridgeSuggestions.length,
      Math.max(1, bridgeSuggestionBatchLimit)
    );
    return riskBridgeSuggestions.slice(0, limit).map((bridge) => buildBridgeFocusPayload(bridge));
  }, [bridgeSuggestionBatchLimit, buildBridgeFocusPayload, riskBridgeSuggestions]);

  const handlePushBridgeSuggestionBatchToPath = useCallback(() => {
    if (bridgeSuggestionBatchQueue.length === 0) {
      setError("当前没有可批量推送的关系链建议。");
      return;
    }
    const batchId = `bridge_suggest_batch_${Date.now().toString(36)}`;
    const queue = bridgeSuggestionBatchQueue.map((item, index) => ({
      ...item,
      replayBatchId: batchId,
      replayBatchIndex: index + 1,
      replayBatchTotal: bridgeSuggestionBatchQueue.length,
      replayFrameAt: item.at
    }));
    const primary = queue[0]!;
    writePathFocusBatchToStorage(queue, (key, value) =>
      window.localStorage.setItem(key, value)
    );
    writePathFocusToStorage(primary, (key, value) =>
      window.localStorage.setItem(key, value)
    );
    const params = new URLSearchParams({
      from: "graph_bridge",
      focusNode: primary.nodeId,
      focusLabel: primary.nodeLabel,
      batchCount: String(queue.length),
      replayBatchId: batchId
    });
    if (primary.bridgePartnerLabel?.trim()) {
      params.set("bridgePartner", primary.bridgePartnerLabel.trim());
    }
    router.push(`/path?${params.toString()}`);
    setPathPushHint(
      `已批量推送关系链建议到路径：${queue.length} 条（批次 ${batchId}，首条 ${primary.nodeLabel} ↔ ${
        primary.bridgePartnerLabel ?? "关联节点"
      }）。`
    );
    appendReplayPushHistory({
      id: `replay_push_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 5)}`,
      batchId,
      target: "path",
      source: "batch_queue",
      at: new Date().toISOString(),
      count: queue.length,
      primaryNodeLabel: primary.nodeLabel,
      bridgePartnerLabel: primary.bridgePartnerLabel,
      queue
    });
  }, [appendReplayPushHistory, bridgeSuggestionBatchQueue, router]);

  const handlePushBridgeSuggestionBatchToWorkspace = useCallback(() => {
    if (bridgeSuggestionBatchQueue.length === 0) {
      setError("当前没有可批量推送的关系链建议。");
      return;
    }
    const batchId = `bridge_suggest_batch_${Date.now().toString(36)}`;
    const queue = bridgeSuggestionBatchQueue.map((item, index) => ({
      ...item,
      replayBatchId: batchId,
      replayBatchIndex: index + 1,
      replayBatchTotal: bridgeSuggestionBatchQueue.length,
      replayFrameAt: item.at
    }));
    const primary = queue[0]!;
    writeWorkspaceFocusBatchToStorage(queue, (key, value) =>
      window.localStorage.setItem(key, value)
    );
    writeWorkspaceFocusToStorage(primary, (key, value) =>
      window.localStorage.setItem(key, value)
    );
    const params = new URLSearchParams({
      from: "graph",
      batchCount: String(queue.length),
      replayBatchId: batchId
    });
    router.push(`/workspace?${params.toString()}`);
    setPathPushHint(
      `已批量推送关系链建议到工作区：${queue.length} 条（批次 ${batchId}，首条 ${primary.nodeLabel} ↔ ${
        primary.bridgePartnerLabel ?? "关联节点"
      }）。`
    );
    appendReplayPushHistory({
      id: `replay_push_${Date.now().toString(36)}_${Math.random()
        .toString(36)
        .slice(2, 5)}`,
      batchId,
      target: "workspace",
      source: "batch_queue",
      at: new Date().toISOString(),
      count: queue.length,
      primaryNodeLabel: primary.nodeLabel,
      bridgePartnerLabel: primary.bridgePartnerLabel,
      queue
    });
  }, [appendReplayPushHistory, bridgeSuggestionBatchQueue, router]);

  const handlePushBridgeToPath = useCallback(
    (bridge: RiskBridgeSuggestion, replayMeta?: ReplayPushMeta) => {
      setSelectedBridgeId(bridge.id);
      const focusPayload = buildBridgeFocusPayload(bridge, replayMeta);
      writePathFocusToStorage(focusPayload, (key, value) =>
        window.localStorage.setItem(key, value)
      );
      const params = new URLSearchParams({
        from: "graph_bridge",
        focusNode: bridge.primary.id,
        focusLabel: bridge.primary.label,
        bridgePartner: bridge.secondary.label
      });
      if (focusPayload.replayBatchId) {
        params.set("replayBatchId", focusPayload.replayBatchId);
      }
      if (focusPayload.replayMode) {
        params.set("replayMode", focusPayload.replayMode);
      }
      router.push(`/path?${params.toString()}`);
      setPathPushHint(
        `已推送关系链建议：${bridge.primary.label} ↔ ${bridge.secondary.label}（风险 ${toPercent(
          bridge.risk
        )}）。`
      );
    },
    [buildBridgeFocusPayload, router]
  );

  const handlePushBridgeToWorkspace = useCallback(
    (bridge: RiskBridgeSuggestion, replayMeta?: ReplayPushMeta) => {
      setSelectedBridgeId(bridge.id);
      const focusPayload = buildBridgeFocusPayload(bridge, replayMeta);
      writeWorkspaceFocusToStorage(focusPayload, (key, value) =>
        window.localStorage.setItem(key, value)
      );
      const params = new URLSearchParams({ from: "graph" });
      if (focusPayload.replayBatchId) {
        params.set("replayBatchId", focusPayload.replayBatchId);
      }
      if (focusPayload.replayMode) {
        params.set("replayMode", focusPayload.replayMode);
      }
      router.push(`/workspace?${params.toString()}`);
      setPathPushHint(
        `已推送关系链建议到工作区：${bridge.primary.label} ↔ ${bridge.secondary.label}。`
      );
    },
    [buildBridgeFocusPayload, router]
  );

  const pushReplayFocusQueueToPath = useCallback(
    (input: {
      queue: PathFocusPayload[];
      batchId: string;
      mode?: BridgeReplayMode;
      source: ReplayPushSource;
    }) => {
      if (input.queue.length === 0) {
        setError("当前回放筛选下暂无可推送的关系链队列。");
        return;
      }
      const primary = input.queue[0]!;
      writePathFocusBatchToStorage(input.queue, (key, value) =>
        window.localStorage.setItem(key, value)
      );
      writePathFocusToStorage(primary, (key, value) =>
        window.localStorage.setItem(key, value)
      );
      const params = new URLSearchParams({
        from: "graph_bridge",
        focusNode: primary.nodeId,
        focusLabel: primary.nodeLabel,
        batchCount: String(input.queue.length),
        replayBatchId: input.batchId
      });
      if (primary.bridgePartnerLabel?.trim()) {
        params.set("bridgePartner", primary.bridgePartnerLabel.trim());
      }
      if (primary.replayMode) {
        params.set("replayMode", primary.replayMode);
      }
      router.push(`/path?${params.toString()}`);
      setPathPushHint(
        `${input.source === "single_frame" ? "已推送回放当前帧到路径" : "已批量推送回放关系链到路径"}：${
          input.queue.length
        } 条（批次 ${input.batchId}，首条 ${primary.nodeLabel} ↔ ${
          primary.bridgePartnerLabel ?? "关联节点"
        }）。`
      );
      appendReplayPushHistory({
        id: `replay_push_${Date.now().toString(36)}_${Math.random()
          .toString(36)
          .slice(2, 5)}`,
        batchId: input.batchId,
        target: "path",
        source: input.source,
        at: new Date().toISOString(),
        count: input.queue.length,
        mode: input.mode,
        primaryNodeLabel: primary.nodeLabel,
        bridgePartnerLabel: primary.bridgePartnerLabel,
        queue: input.queue
      });
    },
    [appendReplayPushHistory, router]
  );

  const pushReplayFocusQueueToWorkspace = useCallback(
    (input: {
      queue: PathFocusPayload[];
      batchId: string;
      mode?: BridgeReplayMode;
      source: ReplayPushSource;
    }) => {
      if (input.queue.length === 0) {
        setError("当前回放筛选下暂无可推送的关系链队列。");
        return;
      }
      const primary = input.queue[0]!;
      writeWorkspaceFocusBatchToStorage(input.queue, (key, value) =>
        window.localStorage.setItem(key, value)
      );
      writeWorkspaceFocusToStorage(primary, (key, value) =>
        window.localStorage.setItem(key, value)
      );
      const params = new URLSearchParams({
        from: "graph",
        batchCount: String(input.queue.length),
        replayBatchId: input.batchId
      });
      if (primary.replayMode) {
        params.set("replayMode", primary.replayMode);
      }
      router.push(`/workspace?${params.toString()}`);
      setPathPushHint(
        `${input.source === "single_frame" ? "已推送回放当前帧到工作区" : "已批量推送回放关系链到工作区"}：${
          input.queue.length
        } 条（批次 ${input.batchId}，首条 ${primary.nodeLabel} ↔ ${
          primary.bridgePartnerLabel ?? "关联节点"
        }）。`
      );
      appendReplayPushHistory({
        id: `replay_push_${Date.now().toString(36)}_${Math.random()
          .toString(36)
          .slice(2, 5)}`,
        batchId: input.batchId,
        target: "workspace",
        source: input.source,
        at: new Date().toISOString(),
        count: input.queue.length,
        mode: input.mode,
        primaryNodeLabel: primary.nodeLabel,
        bridgePartnerLabel: primary.bridgePartnerLabel,
        queue: input.queue
      });
    },
    [appendReplayPushHistory, router]
  );

  const handlePushActiveReplayBridgeToPath = useCallback(() => {
    if (!activeReplayBridgeSuggestion) {
      setError("当前回放帧无法映射到可执行关系链，请切换到可见帧后再试。");
      return;
    }
    const replayBatchId = `bridge_replay_single_${Date.now().toString(36)}`;
    const queue = [
      buildBridgeFocusPayload(activeReplayBridgeSuggestion, {
        replayBatchId,
        replayBatchIndex: Math.max(1, bridgeReplayCursor + 1),
        replayBatchTotal: Math.max(1, orderedBridgeReplayFrames.length),
        replayFrameAt: activeBridgeReplayFrame?.at,
        replayMode: bridgeReplayMode
      })
    ];
    pushReplayFocusQueueToPath({
      queue,
      batchId: replayBatchId,
      mode: bridgeReplayMode,
      source: "single_frame"
    });
  }, [
    activeBridgeReplayFrame?.at,
    activeReplayBridgeSuggestion,
    bridgeReplayCursor,
    bridgeReplayMode,
    buildBridgeFocusPayload,
    orderedBridgeReplayFrames.length,
    pushReplayFocusQueueToPath
  ]);

  const handlePushActiveReplayBridgeToWorkspace = useCallback(() => {
    if (!activeReplayBridgeSuggestion) {
      setError("当前回放帧无法映射到可执行关系链，请切换到可见帧后再试。");
      return;
    }
    const replayBatchId = `bridge_replay_single_${Date.now().toString(36)}`;
    const queue = [
      buildBridgeFocusPayload(activeReplayBridgeSuggestion, {
        replayBatchId,
        replayBatchIndex: Math.max(1, bridgeReplayCursor + 1),
        replayBatchTotal: Math.max(1, orderedBridgeReplayFrames.length),
        replayFrameAt: activeBridgeReplayFrame?.at,
        replayMode: bridgeReplayMode
      })
    ];
    pushReplayFocusQueueToWorkspace({
      queue,
      batchId: replayBatchId,
      mode: bridgeReplayMode,
      source: "single_frame"
    });
  }, [
    activeBridgeReplayFrame?.at,
    activeReplayBridgeSuggestion,
    bridgeReplayCursor,
    bridgeReplayMode,
    buildBridgeFocusPayload,
    orderedBridgeReplayFrames.length,
    pushReplayFocusQueueToWorkspace
  ]);

  const handlePushReplayBatchToPath = useCallback(() => {
    if (replayBatchFocuses.length === 0) {
      setError("当前回放筛选下暂无可推送的关系链队列。");
      return;
    }
    const replayBatchId = `bridge_replay_batch_${Date.now().toString(36)}`;
    const queue = replayBatchFocuses.map((item, index) => ({
      ...item,
      replayBatchId,
      replayBatchIndex: index + 1,
      replayBatchTotal: replayBatchFocuses.length,
      replayFrameAt: item.replayFrameAt ?? item.at,
      replayMode: bridgeReplayMode
    }));
    pushReplayFocusQueueToPath({
      queue,
      batchId: replayBatchId,
      mode: bridgeReplayMode,
      source: "batch_queue"
    });
  }, [bridgeReplayMode, pushReplayFocusQueueToPath, replayBatchFocuses]);

  const handlePushReplayBatchToWorkspace = useCallback(() => {
    if (replayBatchFocuses.length === 0) {
      setError("当前回放筛选下暂无可推送的关系链队列。");
      return;
    }
    const replayBatchId = `bridge_replay_batch_${Date.now().toString(36)}`;
    const queue = replayBatchFocuses.map((item, index) => ({
      ...item,
      replayBatchId,
      replayBatchIndex: index + 1,
      replayBatchTotal: replayBatchFocuses.length,
      replayFrameAt: item.replayFrameAt ?? item.at,
      replayMode: bridgeReplayMode
    }));
    pushReplayFocusQueueToWorkspace({
      queue,
      batchId: replayBatchId,
      mode: bridgeReplayMode,
      source: "batch_queue"
    });
  }, [bridgeReplayMode, pushReplayFocusQueueToWorkspace, replayBatchFocuses]);

  const handleRepushHistoryEntry = useCallback(
    (entry: ReplayPushHistoryEntry, target: ReplayPushTarget) => {
      const replayBatchId = `${entry.batchId}_repush_${Date.now().toString(36)}`;
      const queue = entry.queue.map((item, index) => ({
        ...item,
        replayBatchId,
        replayBatchIndex: index + 1,
        replayBatchTotal: entry.queue.length,
        replayMode: item.replayMode ?? entry.mode
      }));
      if (target === "path") {
        pushReplayFocusQueueToPath({
          queue,
          batchId: replayBatchId,
          mode: entry.mode,
          source: "history_repush"
        });
      } else {
        pushReplayFocusQueueToWorkspace({
          queue,
          batchId: replayBatchId,
          mode: entry.mode,
          source: "history_repush"
        });
      }
    },
    [pushReplayFocusQueueToPath, pushReplayFocusQueueToWorkspace]
  );

  const clearReplayPushHistory = useCallback(() => {
    setReplayPushHistory([]);
    setReplayHistoryPreset("all");
    setReplayHistoryTargetFilter("all");
    setReplayHistorySourceFilter("all");
    setReplayHistoryModeFilter("all");
    setReplayHistorySort("latest");
    setReplayHistoryTopN("all");
    setReplayCompareLeftId("");
    setReplayCompareRightId("");
    try {
      window.localStorage.removeItem(GRAPH_REPLAY_PUSH_HISTORY_STORAGE_KEY);
    } catch {
      // ignore localStorage failures
    }
  }, []);

  const exportVisibleReplayHistoryAsJson = useCallback(() => {
    if (visibleReplayPushHistory.length === 0) {
      setError("当前筛选下暂无可导出的回放批次。");
      return;
    }
    const payload = {
      exportedAt: new Date().toISOString(),
      source: "graph_replay_history",
      filters: {
        target: replayHistoryTargetFilter,
        source: replayHistorySourceFilter,
        mode: replayHistoryModeFilter,
        sort: replayHistorySort,
        topN: replayHistoryTopN
      },
      total: visibleReplayPushHistory.length,
      items: visibleReplayPushHistory
    };
    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "_")
      .slice(0, 13);
    downloadTextFile(
      `${JSON.stringify(payload, null, 2)}\n`,
      `graph-replay-history-${stamp}.json`,
      "application/json;charset=utf-8"
    );
    setPathPushHint(`已导出回放批次历史 JSON（${visibleReplayPushHistory.length} 条）。`);
  }, [
    replayHistoryModeFilter,
    replayHistorySort,
    replayHistorySourceFilter,
    replayHistoryTargetFilter,
    replayHistoryTopN,
    visibleReplayPushHistory
  ]);

  const exportVisibleReplayHistoryAsMarkdown = useCallback(() => {
    if (visibleReplayPushHistory.length === 0) {
      setError("当前筛选下暂无可导出的回放批次。");
      return;
    }
    const content = [
      "# 图谱回放批次历史导出",
      "",
      `- 导出时间：${new Date().toISOString()}`,
      `- 数量：${visibleReplayPushHistory.length}`,
      `- 筛选：目标 ${replayHistoryTargetFilter} / 来源 ${replayHistorySourceFilter} / 模式 ${replayHistoryModeFilter}`,
      `- 排序：${replayHistorySort} / TopN：${replayHistoryTopN}`,
      "",
      "## 批次列表",
      ...visibleReplayPushHistory.map((entry, index) => {
        const first = entry.queue[0];
        const relation = first?.bridgePartnerLabel
          ? `${first.nodeLabel} ↔ ${first.bridgePartnerLabel}`
          : first?.nodeLabel ?? entry.primaryNodeLabel;
        return [
          `### ${index + 1}. ${entry.batchId}`,
          `- 时间：${entry.at}`,
          `- 目标：${resolveReplayPushTargetLabel(entry.target)}`,
          `- 来源：${resolveReplayPushSourceLabel(entry.source)}`,
          `- 模式：${entry.mode ?? "未标注"}`,
          `- 数量：${entry.count}`,
          `- 首条关系：${relation}`
        ].join("\n");
      })
    ].join("\n\n");
    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "_")
      .slice(0, 13);
    downloadTextFile(
      `${content}\n`,
      `graph-replay-history-${stamp}.md`,
      "text/markdown;charset=utf-8"
    );
    setPathPushHint(`已导出回放批次历史 Markdown（${visibleReplayPushHistory.length} 条）。`);
  }, [
    replayHistoryModeFilter,
    replayHistorySort,
    replayHistorySourceFilter,
    replayHistoryTargetFilter,
    replayHistoryTopN,
    visibleReplayPushHistory
  ]);

  const handleFocusGraphActivity = useCallback(
    (event: GraphActivityEvent) => {
      const matchedNode = payload?.nodes.find((item) => item.id === event.nodeId);
      if (matchedNode) {
        setDomainFilter(matchedNode.domain ?? "all");
      }
      setFocusedActivityId(event.id);
      setActiveNodeId(event.nodeId);
    },
    [payload]
  );

  const graphNodeCount = payload?.nodes.length ?? 0;
  const graphEdgeCount = payload?.edges.length ?? 0;
  const graphActiveNodeCount = filteredNodes.length;
  const graphActiveEdgeCount = filteredEdges.length;
  const graphViewLabel =
    graphWorkbenchView === "overview"
      ? "图谱总览"
      : graphWorkbenchView === "bridge"
        ? "关系回放"
        : "历史审计";
  const graphAnchorItems = useMemo(() => {
    const insightItem =
      graphWorkbenchView === "overview"
        ? { id: "graph_overview_panel", label: "总览洞察" }
        : graphWorkbenchView === "bridge"
          ? { id: "graph_bridge_panel", label: "关系链洞察" }
          : { id: "graph_history_panel", label: "历史审计" };
    return [
      { id: "graph_controls", label: "筛选控制" },
      { id: "graph_view_switcher", label: "视图切换" },
      { id: "graph_canvas_panel", label: "图谱画布" },
      insightItem
    ];
  }, [graphWorkbenchView]);
  const activeInsightAnchorId = useMemo(
    () =>
      graphWorkbenchView === "overview"
        ? "graph_overview_panel"
        : graphWorkbenchView === "bridge"
          ? "graph_bridge_panel"
          : "graph_history_panel",
    [graphWorkbenchView]
  );

  return (
    <div
      className="graph-workbench"
      data-view={graphWorkbenchView}
      data-layout-sync={syncLayoutMode ? "true" : "false"}
    >
      <div id="graph_controls" className="graph-control-bar anchor-target">
        <button type="button" className="demo-btn-primary" onClick={loadGraph} disabled={loading}>
          {loading ? "正在同步图谱..." : "刷新图谱"}
        </button>
        <div className="graph-domain-switch">
          <button
            type="button"
            className={domainFilter === "all" ? "active" : ""}
            onClick={() => setDomainFilter("all")}
          >
            全部域 ({payload?.nodes.length ?? 0})
          </button>
          {domainBuckets.map((bucket) => (
            <button
              key={bucket.domain}
              type="button"
              className={domainFilter === bucket.domain ? "active" : ""}
              onClick={() => setDomainFilter(bucket.domain)}
            >
              {bucket.domain} ({bucket.count})
            </button>
          ))}
        </div>
        <input
          type="search"
          value={nodeKeyword}
          onChange={(event) => setNodeKeyword(event.target.value)}
          placeholder="筛选节点/域名，例如 math"
          aria-label="筛选图谱节点"
        />
        <div className="graph-control-tools">
          <label className="graph-control-toggle">
            <input
              type="checkbox"
              checked={enableEdgeHeatmap}
              onChange={(event) => setEnableEdgeHeatmap(event.target.checked)}
            />
            关系热力图层
          </label>
          <label className="graph-control-toggle">
            <input
              type="checkbox"
              checked={bridgeLensCrossDomainOnly}
              onChange={(event) => setBridgeLensCrossDomainOnly(event.target.checked)}
            />
            聚焦镜头仅跨域关系链
          </label>
          <label className="graph-control-slider">
            风险阈值 {riskThresholdPercent}%
            <input
              type="range"
              min={0}
              max={80}
              step={5}
              value={riskThresholdPercent}
              onChange={(event) => setRiskThresholdPercent(Number(event.target.value))}
            />
          </label>
          <div className="graph-control-zoom">
            <button
              type="button"
              onClick={() => setCanvasZoomPercent((prev) => clampZoomPercent(prev - 5))}
              disabled={canvasZoomPercent <= 75}
            >
              缩小
            </button>
            <span>画布缩放 {canvasZoomPercent}%</span>
            <button
              type="button"
              onClick={() => setCanvasZoomPercent((prev) => clampZoomPercent(prev + 5))}
              disabled={canvasZoomPercent >= 145}
            >
              放大
            </button>
            <button
              type="button"
              onClick={() => setCanvasZoomPercent(100)}
              disabled={canvasZoomPercent === 100}
            >
              复位
            </button>
          </div>
          <div className="graph-control-lens">
            <button
              type="button"
              className={graphLensMode === "full" ? "active" : ""}
              onClick={() => setGraphLensMode("full")}
            >
              全局图
            </button>
            <button
              type="button"
              className={graphLensMode === "bridge_focus" ? "active" : ""}
              onClick={() => setGraphLensMode("bridge_focus")}
              disabled={bridgeLensSuggestionPool.length === 0}
            >
              关系链聚焦 ({bridgeLensSuggestionPool.length})
            </button>
          </div>
          <button
            type="button"
            className="graph-control-reset demo-btn-neutral"
            onClick={() => {
              setRiskThresholdPercent(0);
              setEnableEdgeHeatmap(true);
              setCanvasZoomPercent(100);
              setNodeKeyword("");
              setDomainFilter("all");
              setCollapsedDomains([]);
              setSelectedBridgeId("");
              setGraphLensMode("full");
              setBridgeLensCrossDomainOnly(false);
            }}
          >
            重置图谱筛选
          </button>
        </div>
      </div>
      <div className="demo-context-links graph-context-links">
        <button type="button" className="demo-link-chip" onClick={() => router.push("/path?from=graph")}>
          进入学习路径
        </button>
        <button
          type="button"
          className="demo-link-chip"
          onClick={() => router.push("/workspace?from=graph")}
        >
          进入学习工作区
        </button>
        <button type="button" className="demo-link-chip" onClick={() => router.push("/kb?from=graph")}>
          打开知识库检索
        </button>
      </div>
      <SectionAnchorNav
        title="图谱分区导航"
        storageKey="graph_demo"
        items={graphAnchorItems}
      />
      <div className="demo-metric-strip graph-metric-strip">
        <div className="demo-metric-chip">
          <span>总节点/边</span>
          <strong>
            {graphNodeCount}/{graphEdgeCount}
          </strong>
        </div>
        <div className="demo-metric-chip">
          <span>当前筛选</span>
          <strong>
            {graphActiveNodeCount}/{graphActiveEdgeCount}
          </strong>
        </div>
        <div className="demo-metric-chip">
          <span>工作台视图</span>
          <strong>{graphViewLabel}</strong>
        </div>
        <div className="demo-metric-chip">
          <span>镜头模式</span>
          <strong>{graphLensMode === "full" ? "全局图" : "关系链聚焦"}</strong>
        </div>
        <div className="demo-metric-chip">
          <span>视窗布局</span>
          <strong>
            {syncLayoutMode ? "同步视窗" : "自由滚动"} · {insightCompactMode ? "侧栏紧凑" : "侧栏完整"}
          </strong>
        </div>
      </div>
      <div className="graph-domain-collapse">
        <span>域组折叠</span>
        <button
          type="button"
          className={collapsedDomains.length === 0 ? "active" : ""}
          onClick={() => setCollapsedDomains([])}
          disabled={collapsedDomains.length === 0}
        >
          全部展开
        </button>
        {domainBuckets.map((bucket) => {
          const collapsed = collapsedDomainSet.has(bucket.domain);
          return (
            <button
              type="button"
              key={`collapse_${bucket.domain}`}
              className={collapsed ? "collapsed" : ""}
              onClick={() =>
                setCollapsedDomains((prev) =>
                  prev.includes(bucket.domain)
                    ? prev.filter((item) => item !== bucket.domain)
                    : [...prev, bucket.domain]
                )
              }
            >
              {collapsed ? "展开" : "折叠"} {bucket.domain}（{bucket.count}）
            </button>
          );
        })}
      </div>
      <div id="graph_view_switcher" className="graph-view-switcher anchor-target">
        <button
          type="button"
          className={graphWorkbenchView === "overview" ? "active" : ""}
          onClick={() => setGraphWorkbenchView("overview")}
        >
          图谱总览
          <em>聚类与高风险节点</em>
        </button>
        <button
          type="button"
          className={graphWorkbenchView === "bridge" ? "active" : ""}
          onClick={() => setGraphWorkbenchView("bridge")}
        >
          关系回放
          <em>关系链建议与回放时间轴</em>
        </button>
        <button
          type="button"
          className={graphWorkbenchView === "history" ? "active" : ""}
          onClick={() => setGraphWorkbenchView("history")}
        >
          历史审计
          <em>批次历史与图谱演化</em>
        </button>
      </div>
      {pathPushHint ? <div className="result-box success">{pathPushHint}</div> : null}
      {hoverSaveResult ? (
        <div className="graph-hover-save-result">
          <strong>
            最近沉淀：{hoverSaveResult.nodeLabel} → {hoverSaveResult.noteId}
          </strong>
          <span>会话：{hoverSaveResult.sessionId}</span>
          <button
            type="button"
            onClick={() =>
              openWorkspaceSessionById(hoverSaveResult.sessionId, {
                from: "graph_save",
                noteId: hoverSaveResult.noteId,
                nodeLabel: hoverSaveResult.nodeLabel
              })
            }
          >
            打开对应工作区会话
          </button>
          <button
            type="button"
            onClick={() =>
              openKbByNoteId(hoverSaveResult.noteId, hoverSaveResult.nodeLabel)
            }
          >
            在知识库查看该笔记
          </button>
        </div>
      ) : null}

      {payload ? (
        <div className="graph-workbench-grid">
          <article id="graph_canvas_panel" className="graph-canvas-panel anchor-target">
            <header className="graph-canvas-head">
              <strong>知识网络画布</strong>
              <span>
                视图节点 {canvasPlacements.length}/{filteredNodes.length} · 视图关系{" "}
                {canvasEdges.length}/{filteredEdges.length} · 平均掌握度{" "}
                {toPercent(averageMastery)}
              </span>
            </header>

            {canvasPlacements.length === 0 ? (
              <p className="graph-empty-hint">当前筛选条件下没有节点，尝试清空关键词或切换域。</p>
            ) : (
              <>
                <div className="graph-canvas-stage">
                  <svg
                    className="graph-canvas"
                    style={{ width: `${canvasZoomPercent}%` }}
                    viewBox={`0 0 ${GRAPH_CANVAS_WIDTH} ${GRAPH_CANVAS_HEIGHT}`}
                    role="img"
                    aria-label="知识图谱可视化"
                  >
                    <defs>
                      <radialGradient id="graphGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(144, 224, 255, 0.28)" />
                        <stop offset="100%" stopColor="rgba(144, 224, 255, 0)" />
                      </radialGradient>
                    </defs>
                    <rect
                      x="0"
                      y="0"
                      width={GRAPH_CANVAS_WIDTH}
                      height={GRAPH_CANVAS_HEIGHT}
                      fill="url(#graphGlow)"
                    />
                    {canvasEdges.map((edge, index) => {
                      const source = placementMap.get(edge.source);
                      const target = placementMap.get(edge.target);
                      if (!source || !target) {
                        return null;
                      }
                      const edgeKey = buildEdgeKey(edge.source, edge.target);
                      const midRisk = (source.risk + target.risk) / 2;
                      const tone = resolveRiskTone(midRisk);
                      const highlighted =
                        activeNode &&
                        (activeNode.id === source.id || activeNode.id === target.id);
                      const bridgeHighlighted = selectedBridgeId === edgeKey;
                      const bridgeCoreEdge =
                        graphLensMode === "bridge_focus" && selectedBridgeSuggestion
                          ? edgeKey === selectedBridgeSuggestion.id ||
                            edge.source === selectedBridgeSuggestion.source.id ||
                            edge.source === selectedBridgeSuggestion.target.id ||
                            edge.target === selectedBridgeSuggestion.source.id ||
                            edge.target === selectedBridgeSuggestion.target.id
                          : false;
                      const bridgeContextEdge =
                        graphLensMode === "bridge_focus" && !bridgeCoreEdge;
                      const heatOpacity = enableEdgeHeatmap
                        ? Number((0.15 + midRisk * 0.85).toFixed(2))
                        : undefined;
                      const resolvedOpacity = bridgeContextEdge
                        ? Number((((heatOpacity ?? 0.46) * 0.58)).toFixed(2))
                        : heatOpacity;
                      return (
                        <line
                          key={`${edge.source}_${edge.target}_${index}`}
                          x1={source.x}
                          y1={source.y}
                          x2={target.x}
                          y2={target.y}
                          className={`graph-edge graph-edge-${tone}${highlighted ? " highlighted" : ""}${bridgeHighlighted ? " bridge-highlighted" : ""}${bridgeCoreEdge ? " bridge-path-core" : ""}${bridgeContextEdge ? " bridge-path-context" : ""}${enableEdgeHeatmap ? " heatmap" : ""}`}
                          strokeWidth={
                            bridgeHighlighted
                              ? 3.1
                              : bridgeCoreEdge
                                ? enableEdgeHeatmap
                                  ? 2 + midRisk * 2.2
                                  : 2.8
                                : bridgeContextEdge
                                  ? enableEdgeHeatmap
                                    ? 0.9 + midRisk * 1.2
                                    : 1.05
                              : enableEdgeHeatmap
                                ? 1.2 + midRisk * 2.6
                              : highlighted
                                ? 2.4
                                : 1.2 + Math.min(1.8, edge.weight ?? 1)
                          }
                          style={
                            enableEdgeHeatmap || bridgeContextEdge
                              ? { opacity: resolvedOpacity ?? 0.42 }
                              : undefined
                          }
                        />
                      );
                    })}
                    {canvasPlacements.map((node) => {
                      const tone = resolveRiskTone(node.risk);
                      const selected = activeNode?.id === node.id;
                      const related = connectedNodeIds.has(node.id);
                      const bridgeCoreNode =
                        graphLensMode === "bridge_focus" &&
                        selectedBridgeSuggestion &&
                        (node.id === selectedBridgeSuggestion.source.id ||
                          node.id === selectedBridgeSuggestion.target.id);
                      return (
                        <g
                          key={node.id}
                          className={`graph-node graph-node-${tone}${selected ? " selected" : ""}${related ? " related" : ""}${bridgeCoreNode ? " bridge-core" : ""}${pulseNodeId === node.id ? " pulse" : ""}`}
                          onClick={() => setActiveNodeId(node.id)}
                          onMouseEnter={() => setHoveredNodeId(node.id)}
                          onMouseLeave={() =>
                            setHoveredNodeId((prev) => (prev === node.id ? "" : prev))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setActiveNodeId(node.id);
                            }
                          }}
                          onFocus={() => setHoveredNodeId(node.id)}
                          onBlur={() =>
                            setHoveredNodeId((prev) => (prev === node.id ? "" : prev))
                          }
                          role="button"
                          tabIndex={0}
                        >
                          <title>
                            {node.label} | 掌握度 {toPercent(node.mastery)} | 风险{" "}
                            {toPercent(node.risk)} | 关联度 {node.degree}
                          </title>
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={node.radius + 5}
                            className="graph-node-halo"
                          />
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={node.radius}
                            className="graph-node-core"
                          />
                          <text x={node.x} y={node.y + 4} textAnchor="middle">
                            {node.label.slice(0, 4)}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="graph-legend-row">
                  <span className="graph-legend-item low">低风险</span>
                  <span className="graph-legend-item medium">中风险</span>
                  <span className="graph-legend-item high">高风险</span>
                  {enableEdgeHeatmap ? (
                    <span className="graph-legend-item heatmap">热力边已开启</span>
                  ) : null}
                  <span className="graph-legend-item neutral">
                    孤立节点 {canvasIsolatedCount} / {canvasPlacements.length}
                  </span>
                  {graphLensMode === "bridge_focus" ? (
                    <span className="graph-legend-item neutral">
                      关系链聚焦镜头{bridgeLensCrossDomainOnly ? " · 跨域优先" : ""}
                    </span>
                  ) : null}
                  {graphLensMode === "bridge_focus" ? (
                    <span className="graph-legend-item medium">核心路径高亮</span>
                  ) : null}
                </div>
                {hoveredNode ? (
                  <div className="graph-hover-card">
                    <header>
                      <strong>{hoveredNode.label}</strong>
                      <span>
                        风险 {toPercent(hoveredNode.risk)} · 掌握度{" "}
                        {toPercent(hoveredNode.mastery)}
                      </span>
                    </header>
                    <p>
                      域：{hoveredNode.domain} · 邻接节点 {hoveredNodeNeighborCount} · 关联度{" "}
                      {hoveredNode.degree}
                    </p>
                    <div className="graph-hover-tips">
                      {hoveredNodeTips.map((tip, index) => (
                        <span key={`hover_tip_${hoveredNode.id}_${index}`}>{tip}</span>
                      ))}
                    </div>
                    <div className="graph-hover-save-mode">
                      <label>
                        沉淀方式
                        <select
                          value={hoverSaveMode}
                          onChange={(event) =>
                            setHoverSaveMode(event.target.value as HoverSaveMode)
                          }
                        >
                          <option value="create_new">新建会话并沉淀</option>
                          <option value="append_existing">追加到已有会话</option>
                        </select>
                      </label>
                      {hoverSaveMode === "append_existing" ? (
                        <label>
                          目标会话
                          <select
                            value={hoverTargetSessionId}
                            onChange={(event) => setHoverTargetSessionId(event.target.value)}
                            disabled={loadingHoverSessions || hoverWorkspaceSessions.length === 0}
                          >
                            {hoverWorkspaceSessions.length === 0 ? (
                              <option value="">暂无可用会话</option>
                            ) : null}
                            {hoverWorkspaceSessions.map((session) => (
                              <option key={`graph_hover_session_${session.id}`} value={session.id}>
                                {session.title}（{session.id}）
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                      {hoverSaveMode === "append_existing" ? (
                        <button
                          type="button"
                          className="graph-hover-refresh"
                          onClick={() => void loadWorkspaceSessionsForHover()}
                          disabled={loadingHoverSessions}
                        >
                          {loadingHoverSessions ? "刷新中..." : "刷新会话列表"}
                        </button>
                      ) : null}
                    </div>
                    <div className="graph-hover-actions">
                      <button type="button" onClick={() => setActiveNodeId(hoveredNode.id)}>
                        设为当前焦点
                      </button>
                      <button type="button" onClick={() => pushNodeToPath(hoveredNode)}>
                        推送到路径
                      </button>
                      <button type="button" onClick={() => pushNodeToWorkspace(hoveredNode)}>
                        推送到工作区
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveNodeInterventionToWorkspace(hoveredNode)}
                        disabled={savingHoverSuggestion}
                      >
                        {savingHoverSuggestion ? "正在沉淀..." : "沉淀干预建议"}
                      </button>
                      {hoverSaveResult && hoverSaveResult.nodeId === hoveredNode.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              openWorkspaceSessionById(hoverSaveResult.sessionId, {
                                from: "graph_save",
                                noteId: hoverSaveResult.noteId,
                                nodeLabel: hoverSaveResult.nodeLabel
                              })
                            }
                          >
                            打开对应会话
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openKbByNoteId(hoverSaveResult.noteId, hoverSaveResult.nodeLabel)
                            }
                          >
                            查看沉淀笔记
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </article>

          <aside
            className={`graph-insight-panel${insightCompactMode ? " compact" : ""}`}
            ref={insightPanelRef}
          >
            <div className="graph-insight-toggle-bar">
              <span>
                侧栏分组：已折叠 {visibleCollapsedInsightCount}/{visibleInsightSections.length}
              </span>
              {graphWorkbenchView === "bridge" ? (
                <button
                  type="button"
                  className={`demo-btn-secondary${bridgeReplayCompactMode ? " active" : ""}`}
                  onClick={() => setBridgeReplayCompactMode((prev) => !prev)}
                >
                  {bridgeReplayCompactMode ? "回放精简开" : "回放精简关"}
                </button>
              ) : null}
              <button
                type="button"
                className={`demo-btn-secondary${syncLayoutMode ? " active" : ""}`}
                onClick={() => setSyncLayoutMode((prev) => !prev)}
              >
                {syncLayoutMode ? "同步视窗开" : "同步视窗关"}
              </button>
              <button
                type="button"
                className={`demo-btn-secondary${insightCompactMode ? " active" : ""}`}
                onClick={() => setInsightCompactMode((prev) => !prev)}
              >
                {insightCompactMode ? "侧栏紧凑开" : "侧栏紧凑关"}
              </button>
              {graphWorkbenchView === "history" ? (
                <button
                  type="button"
                  className={`demo-btn-secondary${historyCompactMode ? " active" : ""}`}
                  onClick={() => setHistoryCompactMode((prev) => !prev)}
                >
                  {historyCompactMode ? "历史精简开" : "历史精简关"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  const canvas = document.getElementById("graph_canvas_panel");
                  canvas?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                回到画布
              </button>
              <button
                type="button"
                onClick={() => {
                  const currentPanel = document.getElementById(activeInsightAnchorId);
                  currentPanel?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                当前分组
              </button>
              <button
                type="button"
                onClick={() =>
                  insightPanelRef.current?.scrollTo({ top: 0, behavior: "smooth" })
                }
              >
                侧栏回顶
              </button>
              <button
                type="button"
                className="demo-btn-secondary"
                onClick={() => applyCurrentViewInsightPreset("lean")}
                disabled={
                  visibleInsightSections.length === 0 ||
                  visibleCollapsedInsightCount >=
                    Math.max(0, visibleInsightSections.length - 1)
                }
              >
                首屏精简
              </button>
              <button
                type="button"
                className="demo-btn-secondary"
                onClick={() => applyCurrentViewInsightPreset("expand")}
                disabled={visibleCollapsedInsightCount === 0}
              >
                全部展开
              </button>
              <button
                type="button"
                onClick={() =>
                  updateCurrentViewCollapsedInsights((prev) => {
                    const next = new Set(prev);
                    visibleInsightSections.forEach((item) => {
                      next.delete(item.key);
                    });
                    return Array.from(next);
                  })
                }
                disabled={visibleCollapsedInsightCount === 0}
              >
                展开当前视图
              </button>
              <button
                type="button"
                onClick={() =>
                  updateCurrentViewCollapsedInsights((prev) => {
                    const next = new Set(prev);
                    visibleInsightSections.forEach((item) => next.add(item.key));
                    return Array.from(next);
                  })
                }
                disabled={
                  visibleInsightSections.length > 0 &&
                  visibleCollapsedInsightCount === visibleInsightSections.length
                }
              >
                折叠当前视图
              </button>
              <div className="graph-insight-jump-row">
                {visibleInsightSectionAnchors.map((section) => {
                  const collapsed = collapsedInsightSectionSet.has(section.key);
                  return (
                    <button
                      key={`insight_jump_${section.key}`}
                      type="button"
                      data-anchor-id={section.anchorId}
                      className={collapsed ? "collapsed" : ""}
                      onClick={() => jumpToInsightSection(section.key)}
                    >
                      {section.label}
                      <em>{collapsed ? "已折叠" : "展开中"}</em>
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              id="graph_overview_panel"
              className={`graph-insight-card graph-section-overview${
                collapsedInsightSectionSet.has("domain_cluster") ? " collapsed" : ""
              } anchor-target`}
            >
              <header className="graph-insight-card-head">
                <strong>领域聚类概览</strong>
                <button
                  type="button"
                  onClick={() =>
                    updateCurrentViewCollapsedInsights((prev) =>
                      prev.includes("domain_cluster")
                        ? prev.filter((item) => item !== "domain_cluster")
                        : [...prev, "domain_cluster"]
                    )
                  }
                >
                  {collapsedInsightSectionSet.has("domain_cluster") ? "展开" : "收起"}
                </button>
              </header>
              {collapsedInsightSectionSet.has("domain_cluster") ? (
                <p className="muted">该分组已折叠，展开后可查看领域聚类明细。</p>
              ) : (
                <>
                  <p className="muted">按知识域聚合风险，点击可直接切换到该域深挖。</p>
                  {domainClusterOverview.length > 0 ? (
                    <div className="graph-domain-cluster-list">
                      {domainClusterOverview.map((cluster) => (
                        <button
                          type="button"
                          key={`cluster_${cluster.domain}`}
                          data-domain-cluster={cluster.domain}
                          className={`graph-domain-cluster-item${
                            domainFilter === cluster.domain ? " active" : ""
                          }${
                            activeNode?.domain === cluster.domain && pulseNodeId === activeNode.id
                              ? " sync"
                              : ""
                          }`}
                          onClick={() => {
                            setSelectedBridgeId("");
                            setDomainFilter(cluster.domain);
                          }}
                        >
                          <strong>{cluster.domain}</strong>
                          <span>
                            节点 {cluster.nodeCount} · 关系 {cluster.relationCount} · 高风险{" "}
                            {cluster.highRiskCount}
                          </span>
                          <em>
                            平均风险 {toPercent(cluster.averageRisk)} · 掌握度{" "}
                            {toPercent(cluster.averageMastery)}
                          </em>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">当前筛选下暂无聚类数据。</p>
                  )}
                </>
              )}
            </div>

            <div
              id="graph_risk_top_panel"
              className={`graph-insight-card graph-section-overview${
                collapsedInsightSectionSet.has("risk_top") ? " collapsed" : ""
              }`}
            >
              <header className="graph-insight-card-head">
                <strong>高风险节点 Top 6</strong>
                <button
                  type="button"
                  onClick={() =>
                    updateCurrentViewCollapsedInsights((prev) =>
                      prev.includes("risk_top")
                        ? prev.filter((item) => item !== "risk_top")
                        : [...prev, "risk_top"]
                    )
                  }
                >
                  {collapsedInsightSectionSet.has("risk_top") ? "展开" : "收起"}
                </button>
              </header>
              {collapsedInsightSectionSet.has("risk_top") ? (
                <p className="muted">该分组已折叠，展开后可查看高风险节点。</p>
              ) : (
                <>
                  <p className="muted">优先复习这些节点，先补关系再做题。</p>
                  <div className="graph-risk-list">
                    {highRiskNodes.map((node) => (
                      <button
                        key={`risk_${node.id}`}
                        type="button"
                        data-risk-node-id={node.id}
                        className={`graph-risk-row${activeNode?.id === node.id ? " active" : ""}${
                          pulseNodeId === node.id ? " sync" : ""
                        }`}
                        onClick={() => setActiveNodeId(node.id)}
                      >
                        <span>{node.label}</span>
                        <em>{toPercent(node.risk)}</em>
                      </button>
                    ))}
                    {highRiskNodes.length === 0 ? (
                      <p className="muted">当前筛选下暂无节点。</p>
                    ) : null}
                  </div>
                </>
              )}
            </div>

            <div
              id="graph_active_focus_panel"
              className={`graph-insight-card graph-section-overview${
                collapsedInsightSectionSet.has("active_focus") ? " collapsed" : ""
              }`}
            >
              <header className="graph-insight-card-head">
                <strong>当前焦点</strong>
                <button
                  type="button"
                  onClick={() =>
                    updateCurrentViewCollapsedInsights((prev) =>
                      prev.includes("active_focus")
                        ? prev.filter((item) => item !== "active_focus")
                        : [...prev, "active_focus"]
                    )
                  }
                >
                  {collapsedInsightSectionSet.has("active_focus") ? "展开" : "收起"}
                </button>
              </header>
              {collapsedInsightSectionSet.has("active_focus") ? (
                <p className="muted">该分组已折叠，展开后可查看当前焦点及邻接关系。</p>
              ) : activeNode ? (
                <div className="graph-focus-box">
                  <h4>{activeNode.label}</h4>
                  <p>
                    域：{activeNode.domain} · 掌握度 {toPercent(activeNode.mastery)} · 风险{" "}
                    {toPercent(activeNode.risk)}
                  </p>
                  <p>关联节点：{connectedNodeIds.size} 个</p>
                  <button
                    type="button"
                    className="graph-path-cta"
                    onClick={handlePushActiveNodeToPath}
                  >
                    以该节点生成学习路径
                  </button>
                  <button
                    type="button"
                    className="graph-path-cta graph-workspace-cta"
                    onClick={handlePushActiveNodeToWorkspace}
                  >
                    以该节点进入工作区
                  </button>
                  <div className="graph-neighbor-list">
                    {relatedNodes.map((node) => (
                      <button
                        key={`neighbor_${node.id}`}
                        type="button"
                        className="graph-neighbor-chip"
                        onClick={() => setActiveNodeId(node.id)}
                      >
                        {node.label}
                        <em>{node.degree}</em>
                      </button>
                    ))}
                    {relatedNodes.length === 0 ? (
                      <span className="graph-neighbor-empty">该节点暂无可视关系边</span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="muted">暂无焦点节点。</p>
              )}
            </div>

            <div
              id="graph_bridge_panel"
              className={`graph-insight-card graph-section-bridge${
                collapsedInsightSectionSet.has("bridge_suggestions") ? " collapsed" : ""
              } anchor-target`}
            >
              <header className="graph-insight-card-head">
                <strong>高风险关系链建议</strong>
                <button
                  type="button"
                  onClick={() =>
                    updateCurrentViewCollapsedInsights((prev) =>
                      prev.includes("bridge_suggestions")
                        ? prev.filter((item) => item !== "bridge_suggestions")
                        : [...prev, "bridge_suggestions"]
                    )
                  }
                >
                  {collapsedInsightSectionSet.has("bridge_suggestions") ? "展开" : "收起"}
                </button>
              </header>
              {collapsedInsightSectionSet.has("bridge_suggestions") ? (
                <p className="muted">该分组已折叠，展开后可查看关系链干预建议。</p>
              ) : (
                <>
                  <p className="muted">
                    优先修复这些关系链，可显著降低“会做单点、不会迁移”的风险。
                  </p>
                  {riskBridgeSuggestions.length > 0 ? (
                    <>
                      <div className="graph-bridge-summary-row">
                        <span>建议总数 {bridgeSuggestionSummary.total}</span>
                        <span>跨域链 {bridgeSuggestionSummary.crossDomainCount}</span>
                        <span>高风险链 {bridgeSuggestionSummary.highRiskCount}</span>
                        <span>平均风险 {toPercent(bridgeSuggestionSummary.averageRisk)}</span>
                      </div>
                      <div className="graph-bridge-batch-toolbar">
                        <label>
                          批量上限
                          <select
                            value={bridgeSuggestionBatchLimit}
                            onChange={(event) =>
                              setBridgeSuggestionBatchLimit(Number(event.target.value))
                            }
                          >
                            {[2, 3, 5, 8].map((count) => (
                              <option key={`bridge_batch_limit_${count}`} value={count}>
                                Top {count}
                              </option>
                            ))}
                          </select>
                        </label>
                        <span>当前可推送 {bridgeSuggestionBatchQueue.length} 条</span>
                        <button
                          type="button"
                          onClick={handlePushBridgeSuggestionBatchToPath}
                          disabled={bridgeSuggestionBatchQueue.length === 0}
                        >
                          批量推送到路径
                        </button>
                        <button
                          type="button"
                          onClick={handlePushBridgeSuggestionBatchToWorkspace}
                          disabled={bridgeSuggestionBatchQueue.length === 0}
                        >
                          批量推送到工作区
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const top = riskBridgeSuggestions[0];
                            if (top) {
                              handleFocusBridge(top);
                            }
                          }}
                          disabled={riskBridgeSuggestions.length === 0}
                        >
                          聚焦最高风险链
                        </button>
                      </div>
                      {insightCompactMode &&
                      riskBridgeSuggestions.length > renderRiskBridgeSuggestions.length ? (
                        <p className="graph-bridge-compact-hint">
                          侧栏紧凑模式仅展示前 {renderRiskBridgeSuggestions.length}/
                          {riskBridgeSuggestions.length} 条建议。
                        </p>
                      ) : null}
                      <div className="graph-bridge-list">
                        {renderRiskBridgeSuggestions.map((bridge) => (
                          <article
                            key={`bridge_${bridge.id}`}
                            className={`graph-bridge-item risk-${resolveRiskTone(bridge.risk)}${
                              selectedBridgeId === bridge.id ? " active" : ""
                            }`}
                          >
                            <header>
                              <strong>
                                {bridge.source.label} ↔ {bridge.target.label}
                              </strong>
                              <span>风险 {toPercent(bridge.risk)}</span>
                            </header>
                            <p>{bridge.summary}</p>
                            <div className="graph-bridge-tools">
                              <button
                                type="button"
                                onClick={() => handleFocusBridge(bridge)}
                              >
                                聚焦主节点
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePushBridgeToPath(bridge)}
                              >
                                推送路径建议
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePushBridgeToWorkspace(bridge)}
                              >
                                推送工作区
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="muted">当前筛选下暂无高风险关系链。</p>
                  )}
                </>
              )}
            </div>

            <div
              id="graph_bridge_timeline_panel"
              className={`graph-insight-card graph-section-bridge${
                collapsedInsightSectionSet.has("bridge_timeline") ? " collapsed" : ""
              }`}
            >
              <header className="graph-insight-card-head">
                <strong>关系链回放时间轴</strong>
                <button
                  type="button"
                  onClick={() =>
                    updateCurrentViewCollapsedInsights((prev) =>
                      prev.includes("bridge_timeline")
                        ? prev.filter((item) => item !== "bridge_timeline")
                        : [...prev, "bridge_timeline"]
                    )
                  }
                >
                  {collapsedInsightSectionSet.has("bridge_timeline") ? "展开" : "收起"}
                </button>
              </header>
              {collapsedInsightSectionSet.has("bridge_timeline") ? (
                <p className="muted">该分组已折叠，展开后可查看关系链回放控制与时间轴。</p>
              ) : (
                <>
                  <p className="muted">
                    记录每次图谱刷新后的关系链风险波动，用于回看干预是否生效。
                  </p>
                  <div className="graph-bridge-replay-summary">
                    <span>可见帧 {displayedBridgeReplayFrames.length}</span>
                    <span>高风险帧 {bridgeReplaySummary.highRiskCount}</span>
                    <span>平均风险 {toPercent(bridgeReplaySummary.averageRisk)}</span>
                    <span>
                      最近时间{" "}
                      {bridgeReplaySummary.latestAt
                        ? formatDateTime(bridgeReplaySummary.latestAt)
                        : "无"}
                    </span>
                  </div>
                  {bridgeReplayCompactMode ? (
                    <p className="graph-bridge-replay-compact-note">
                      回放精简模式已开启，仅保留核心回放与当前帧推送。关闭后可使用高级筛选、速度与统计。
                    </p>
                  ) : null}
                  <div className="graph-bridge-timeline-mode">
                    <button
                      type="button"
                      className={bridgeReplayMode === "focus" ? "active" : ""}
                      onClick={() => {
                        setBridgeReplayMode("focus");
                        setBridgeReplayCursor(0);
                        setIsBridgeReplayPlaying(false);
                      }}
                    >
                      仅看当前关系链
                    </button>
                    <button
                      type="button"
                      className={bridgeReplayMode === "all" ? "active" : ""}
                      onClick={() => {
                        setBridgeReplayMode("all");
                        setBridgeReplayCursor(0);
                        setIsBridgeReplayPlaying(false);
                      }}
                    >
                      查看全部关系链
                    </button>
                    <span>
                      当前 {displayedBridgeReplayFrames.length} 条 · 模式
                      {bridgeReplayMode === "focus" ? " 焦点回放" : " 全量回放"} · 进度{" "}
                      {bridgeReplayProgressPercent}%
                    </span>
                  </div>
                  <div className="graph-bridge-replay-filter-row">
                    <label className="graph-bridge-replay-search">
                      关键词
                      <input
                        type="search"
                        value={bridgeReplayKeyword}
                        placeholder="节点/时间关键词"
                        onChange={(event) => setBridgeReplayKeyword(event.target.value)}
                      />
                    </label>
                    <label className="graph-bridge-replay-risk-toggle">
                      <input
                        type="checkbox"
                        checked={bridgeReplayRiskOnly}
                        onChange={(event) => setBridgeReplayRiskOnly(event.target.checked)}
                      />
                      仅高风险帧
                    </label>
                    <span>
                      匹配 {displayedBridgeReplayFrames.length}/{bridgeReplayFrames.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setBridgeReplayNodeFilter("all");
                        setBridgeReplayKeyword("");
                        setBridgeReplayRiskOnly(false);
                      }}
                      disabled={
                        bridgeReplayNodeFilter === "all" &&
                        bridgeReplayKeyword.trim().length === 0 &&
                        !bridgeReplayRiskOnly
                      }
                    >
                      清空筛选
                    </button>
                  </div>
                  {!bridgeReplayCompactMode ? (
                    <div className="graph-bridge-timeline-filter">
                      <label>
                        节点筛选
                        <select
                          value={bridgeReplayNodeFilter}
                          onChange={(event) => setBridgeReplayNodeFilter(event.target.value)}
                        >
                          <option value="all">全部节点</option>
                          {bridgeReplayNodeOptions.map((nodeLabel) => (
                            <option key={`bridge_replay_node_${nodeLabel}`} value={nodeLabel}>
                              {nodeLabel}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  ) : null}
                  {orderedBridgeReplayFrames.length > 0 ? (
                    <div className="graph-bridge-replay-controller">
                      <div className="graph-bridge-replay-actions">
                        <button
                          type="button"
                          onClick={() => handleBridgeReplayStep(-1)}
                          disabled={bridgeReplayCursor <= 0}
                        >
                          上一帧
                        </button>
                        <button
                          type="button"
                          onClick={toggleBridgeReplayPlay}
                          disabled={orderedBridgeReplayFrames.length <= 1}
                        >
                          {isBridgeReplayPlaying ? "暂停回放" : "播放回放"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBridgeReplayStep(1)}
                          disabled={
                            bridgeReplayCursor >= orderedBridgeReplayFrames.length - 1
                          }
                        >
                          下一帧
                        </button>
                        <button
                          type="button"
                          onClick={restartBridgeReplay}
                          disabled={bridgeReplayCursor === 0}
                        >
                          回到首帧
                        </button>
                      </div>
                      {!bridgeReplayCompactMode ? (
                        <>
                          <div className="graph-bridge-replay-speed">
                            <span>回放速度</span>
                            {(["1x", "1.5x", "2x"] as BridgeReplaySpeed[]).map((speed) => (
                              <button
                                type="button"
                                key={`bridge_replay_speed_${speed}`}
                                className={bridgeReplaySpeed === speed ? "active" : ""}
                                onClick={() => setBridgeReplaySpeed(speed)}
                              >
                                {speed}
                              </button>
                            ))}
                          </div>
                          <label className="graph-bridge-replay-slider">
                            帧位{" "}
                            {Math.min(
                              bridgeReplayCursor + 1,
                              orderedBridgeReplayFrames.length
                            )}
                            /{orderedBridgeReplayFrames.length}
                            <input
                              type="range"
                              min={0}
                              max={Math.max(0, orderedBridgeReplayFrames.length - 1)}
                              step={1}
                              value={Math.min(
                                bridgeReplayCursor,
                                orderedBridgeReplayFrames.length - 1
                              )}
                              onChange={(event) => {
                                setIsBridgeReplayPlaying(false);
                                setBridgeReplayCursor(Number(event.target.value));
                              }}
                            />
                          </label>
                        </>
                      ) : null}
                      {activeBridgeReplayFrame ? (
                        <p className="graph-bridge-replay-current">
                          当前帧：{activeBridgeReplayFrame.bridge.sourceLabel} ↔{" "}
                          {activeBridgeReplayFrame.bridge.targetLabel} · 风险{" "}
                          {toPercent(activeBridgeReplayFrame.bridge.risk)} ·{" "}
                          {formatDateTime(activeBridgeReplayFrame.at)}
                        </p>
                      ) : null}
                      {activeBridgeReplayFrame ? (
                        <div className="graph-bridge-replay-jump">
                          <button
                            type="button"
                            onClick={handlePushActiveReplayBridgeToPath}
                            disabled={!activeReplayBridgeSuggestion}
                          >
                            推送当前帧到路径
                          </button>
                          <button
                            type="button"
                            onClick={handlePushActiveReplayBridgeToWorkspace}
                            disabled={!activeReplayBridgeSuggestion}
                          >
                            推送当前帧到工作区
                          </button>
                        </div>
                      ) : null}
                      {!bridgeReplayCompactMode && orderedBridgeReplayFrames.length > 0 ? (
                        <div className="graph-bridge-replay-batch">
                          <label>
                            批量条数
                            <select
                              value={bridgeReplayBatchLimit}
                              onChange={(event) =>
                                setBridgeReplayBatchLimit(Number(event.target.value))
                              }
                            >
                              {[3, 4, 6, 8].map((item) => (
                                <option key={`bridge_replay_batch_${item}`} value={item}>
                                  Top {item}
                                </option>
                              ))}
                            </select>
                          </label>
                          <span>当前可推送 {replayBatchFocuses.length} 条</span>
                          <button
                            type="button"
                            onClick={handlePushReplayBatchToPath}
                            disabled={replayBatchFocuses.length < 2}
                          >
                            批量推送到路径
                          </button>
                          <button
                            type="button"
                            onClick={handlePushReplayBatchToWorkspace}
                            disabled={replayBatchFocuses.length < 2}
                          >
                            批量推送到工作区
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {!bridgeReplayCompactMode && bridgeReplayNodeStats.length > 0 ? (
                    <div className="graph-bridge-node-stats">
                      {bridgeReplayNodeStats.map((item) => (
                        <button
                          type="button"
                          key={`bridge_replay_stat_${item.label}`}
                          className="graph-bridge-node-stat"
                          onClick={() => handleFocusReplayNode(item.label)}
                        >
                          <strong>{item.label}</strong>
                          <span>
                            出现 {item.count} 次 · 平均风险 {toPercent(item.averageRisk)}
                          </span>
                          <em>
                            峰值 {toPercent(item.maxRisk)} · 最近 {formatDateTime(item.latestAt)}
                          </em>
                          <div className="graph-bridge-node-trend">
                            {item.trendPoints.slice(-10).map((point, index) => (
                              <i
                                key={`trend_${item.label}_${index}`}
                                style={{ height: `${Math.max(6, Math.round(point * 28))}px` }}
                              />
                            ))}
                            <b
                              className={
                                item.trendDelta > 0 ? "up" : item.trendDelta < 0 ? "down" : ""
                              }
                            >
                              {formatDelta(item.trendDelta, { precision: 2 })}
                            </b>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {renderBridgeReplayFrames.length > 0 ? (
                    <div
                      className={`graph-bridge-timeline-list${
                        bridgeReplayCompactMode ? " compact" : ""
                      }`}
                    >
                      {renderBridgeReplayFrames.map((frame) => {
                        const frameKey = buildBridgeReplayFrameKey({
                          snapshotId: frame.snapshotId,
                          bridgeId: frame.bridge.id
                        });
                        return (
                          <button
                            type="button"
                            key={frameKey}
                            className={`graph-bridge-timeline-item${
                              activeBridgeReplayFrameKey === frameKey ? " active" : ""
                            }`}
                            onClick={() =>
                              handleSelectReplayFrame(frame.snapshotId, frame.bridge.id)
                            }
                          >
                            <strong>
                              {frame.bridge.sourceLabel} ↔ {frame.bridge.targetLabel}
                            </strong>
                            <span>
                              {formatDateTime(frame.at)} · 风险 {toPercent(frame.bridge.risk)}
                            </span>
                            <em>关系权重 {frame.bridge.weight.toFixed(2)}</em>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="muted">暂无关系链回放记录，请先刷新图谱或调整筛选。</p>
                  )}
                  {bridgeReplayCompactMode &&
                  displayedBridgeReplayFrames.length > renderBridgeReplayFrames.length ? (
                    <p className="graph-bridge-replay-compact-hint">
                      精简模式仅展示前 {renderBridgeReplayFrames.length}/
                      {displayedBridgeReplayFrames.length} 条时间轴记录。
                    </p>
                  ) : null}
                </>
              )}
            </div>

            <div
              id="graph_history_panel"
              className={`graph-insight-card graph-section-history${
                collapsedInsightSectionSet.has("replay_history") ? " collapsed" : ""
              } anchor-target`}
            >
              <header className="graph-insight-card-head">
                <strong>回放批次历史</strong>
                <button
                  type="button"
                  onClick={() =>
                    updateCurrentViewCollapsedInsights((prev) =>
                      prev.includes("replay_history")
                        ? prev.filter((item) => item !== "replay_history")
                        : [...prev, "replay_history"]
                    )
                  }
                >
                  {collapsedInsightSectionSet.has("replay_history") ? "展开" : "收起"}
                </button>
              </header>
              {collapsedInsightSectionSet.has("replay_history") ? (
                <p className="muted">该分组已折叠，展开后可查看回放批次筛选与复推。</p>
              ) : (
                <>
                  <p className="muted">记录最近从回放推送的批次，支持一键复推到路径或工作区。</p>
                  {replayPushHistory.length > 0 ? (
                    <>
                  <div className="graph-replay-history-head">
                    <span>最近 {replayPushHistory.length} 条</span>
                    <div className="graph-replay-history-head-actions">
                      <button
                        type="button"
                        onClick={exportVisibleReplayHistoryAsJson}
                        disabled={visibleReplayPushHistory.length === 0}
                      >
                        导出 JSON
                      </button>
                      <button
                        type="button"
                        onClick={exportVisibleReplayHistoryAsMarkdown}
                        disabled={visibleReplayPushHistory.length === 0}
                      >
                        导出 Markdown
                      </button>
                      <button type="button" onClick={clearReplayPushHistory}>
                        清空历史
                      </button>
                    </div>
                  </div>
                  <div className="graph-replay-history-metrics">
                    <span>累计批次 {replayPushHistoryStats.totalBatches}</span>
                    <span>累计关系链 {replayPushHistoryStats.totalFocusCount}</span>
                    <span>路径 {replayPushHistoryStats.pathBatches}</span>
                    <span>工作区 {replayPushHistoryStats.workspaceBatches}</span>
                  </div>
                  {!historyCompactMode ? (
                    <div className="graph-replay-history-filters">
                      <div className="graph-replay-history-filter-group">
                        <span>预设</span>
                        <div className="graph-replay-history-filter-buttons">
                          <button
                            type="button"
                            className={replayHistoryPreset === "all" ? "active" : ""}
                            onClick={() => applyReplayHistoryPreset("all")}
                          >
                            全量视角
                          </button>
                          <button
                            type="button"
                            className={replayHistoryPreset === "path_roundtrip" ? "active" : ""}
                            onClick={() => applyReplayHistoryPreset("path_roundtrip")}
                          >
                            路径回流
                          </button>
                          <button
                            type="button"
                            className={replayHistoryPreset === "workspace_roundtrip" ? "active" : ""}
                            onClick={() => applyReplayHistoryPreset("workspace_roundtrip")}
                          >
                            工作区回流
                          </button>
                          <button
                            type="button"
                            className={replayHistoryPreset === "batch_queue" ? "active" : ""}
                            onClick={() => applyReplayHistoryPreset("batch_queue")}
                          >
                            批量优先
                          </button>
                          <button
                            type="button"
                            className={replayHistoryPreset === "single_frame" ? "active" : ""}
                            onClick={() => applyReplayHistoryPreset("single_frame")}
                          >
                            单帧优先
                          </button>
                          <button
                            type="button"
                            className={replayHistoryPreset === "repush_focus" ? "active" : ""}
                            onClick={() => applyReplayHistoryPreset("repush_focus")}
                          >
                            复推轨迹
                          </button>
                          <button
                            type="button"
                            className={replayHistoryPreset === "manual" ? "active" : ""}
                            disabled
                          >
                            {replayHistoryPreset === "manual" ? "当前为自定义" : "自定义"}
                          </button>
                        </div>
                      </div>
                      <div className="graph-replay-history-filter-group">
                        <span>目标</span>
                        <div className="graph-replay-history-filter-buttons">
                          <button
                            type="button"
                            className={replayHistoryTargetFilter === "all" ? "active" : ""}
                            onClick={() => setReplayHistoryTargetFilter("all")}
                          >
                            全部
                          </button>
                          <button
                            type="button"
                            className={replayHistoryTargetFilter === "path" ? "active" : ""}
                            onClick={() => setReplayHistoryTargetFilter("path")}
                          >
                            路径
                          </button>
                          <button
                            type="button"
                            className={replayHistoryTargetFilter === "workspace" ? "active" : ""}
                            onClick={() => setReplayHistoryTargetFilter("workspace")}
                          >
                            工作区
                          </button>
                        </div>
                      </div>
                      <div className="graph-replay-history-filter-group">
                        <span>来源</span>
                        <div className="graph-replay-history-filter-buttons">
                          <button
                            type="button"
                            className={replayHistorySourceFilter === "all" ? "active" : ""}
                            onClick={() => setReplayHistorySourceFilter("all")}
                          >
                            全部
                          </button>
                          <button
                            type="button"
                            className={
                              replayHistorySourceFilter === "single_frame" ? "active" : ""
                            }
                            onClick={() => setReplayHistorySourceFilter("single_frame")}
                          >
                            当前帧
                          </button>
                          <button
                            type="button"
                            className={replayHistorySourceFilter === "batch_queue" ? "active" : ""}
                            onClick={() => setReplayHistorySourceFilter("batch_queue")}
                          >
                            批量队列
                          </button>
                          <button
                            type="button"
                            className={
                              replayHistorySourceFilter === "history_repush" ? "active" : ""
                            }
                            onClick={() => setReplayHistorySourceFilter("history_repush")}
                          >
                            历史复推
                          </button>
                        </div>
                      </div>
                      <div className="graph-replay-history-filter-group">
                        <span>模式</span>
                        <div className="graph-replay-history-filter-buttons">
                          <button
                            type="button"
                            className={replayHistoryModeFilter === "all" ? "active" : ""}
                            onClick={() => setReplayHistoryModeFilter("all")}
                          >
                            全部
                          </button>
                          {replayPushHistoryModeOptions.map((mode) => (
                            <button
                              type="button"
                              key={`history_mode_${mode}`}
                              className={replayHistoryModeFilter === mode ? "active" : ""}
                              onClick={() => setReplayHistoryModeFilter(mode)}
                            >
                              {mode}
                            </button>
                          ))}
                          {replayPushHistoryModeHasUnknown ? (
                            <button
                              type="button"
                              className={replayHistoryModeFilter === "unknown" ? "active" : ""}
                              onClick={() => setReplayHistoryModeFilter("unknown")}
                            >
                              未标注
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="graph-replay-history-filter-group">
                        <span>排序</span>
                        <div className="graph-replay-history-filter-buttons">
                          <button
                            type="button"
                            className={replayHistorySort === "latest" ? "active" : ""}
                            onClick={() => setReplayHistorySort("latest")}
                          >
                            最新时间
                          </button>
                          <button
                            type="button"
                            className={replayHistorySort === "count_desc" ? "active" : ""}
                            onClick={() => setReplayHistorySort("count_desc")}
                          >
                            数量降序
                          </button>
                          <button
                            type="button"
                            className={replayHistorySort === "count_asc" ? "active" : ""}
                            onClick={() => setReplayHistorySort("count_asc")}
                          >
                            数量升序
                          </button>
                        </div>
                      </div>
                      <div className="graph-replay-history-filter-group">
                        <span>快速 TopN</span>
                        <div className="graph-replay-history-filter-buttons">
                          <button
                            type="button"
                            className={replayHistoryTopN === 3 ? "active" : ""}
                            onClick={() => setReplayHistoryTopN(3)}
                          >
                            Top 3
                          </button>
                          <button
                            type="button"
                            className={replayHistoryTopN === 5 ? "active" : ""}
                            onClick={() => setReplayHistoryTopN(5)}
                          >
                            Top 5
                          </button>
                          <button
                            type="button"
                            className={replayHistoryTopN === 10 ? "active" : ""}
                            onClick={() => setReplayHistoryTopN(10)}
                          >
                            Top 10
                          </button>
                          <button
                            type="button"
                            className={replayHistoryTopN === "all" ? "active" : ""}
                            onClick={() => setReplayHistoryTopN("all")}
                          >
                            全部
                          </button>
                        </div>
                      </div>
                      <span className="graph-replay-history-viewport">
                        当前展示 {renderReplayPushHistory.length}/{filteredReplayPushHistory.length}{" "}
                        条
                      </span>
                    </div>
                  ) : (
                    <div className="graph-history-compact-note">
                      <p className="muted">
                        历史精简模式已开启，仅展示关键指标和最近 5 条批次（当前{" "}
                        {renderReplayPushHistory.length}/{filteredReplayPushHistory.length} 条）。
                      </p>
                      <div className="graph-history-compact-actions">
                        <button
                          type="button"
                          className="demo-btn-secondary"
                          onClick={() => setHistoryCompactMode(false)}
                        >
                          查看完整筛选
                        </button>
                        <button
                          type="button"
                          className="demo-btn-secondary"
                          onClick={() => {
                            const target = document.getElementById("graph_timeline_panel");
                            if (target) {
                              target.scrollIntoView({ behavior: "smooth", block: "start" });
                            }
                          }}
                        >
                          跳到图谱演化
                        </button>
                      </div>
                    </div>
                  )}
                  {!historyCompactMode && replayCompareCandidates.length > 1 ? (
                    <div className="graph-replay-compare">
                      <strong>批次对比视图</strong>
                      <div className="graph-replay-compare-selects">
                        <label>
                          批次 A
                          <select
                            value={replayCompareLeftId}
                            onChange={(event) => setReplayCompareLeftId(event.target.value)}
                          >
                            {replayCompareCandidates.map((item) => (
                              <option key={`compare_left_${item.id}`} value={item.id}>
                                {item.batchId} · {item.count} 条
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          批次 B
                          <select
                            value={replayCompareRightId}
                            onChange={(event) => setReplayCompareRightId(event.target.value)}
                          >
                            {replayCompareCandidates.map((item) => (
                              <option key={`compare_right_${item.id}`} value={item.id}>
                                {item.batchId} · {item.count} 条
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      {replayCompareSummary ? (
                        <div className="graph-replay-compare-metrics">
                          <span>
                            数量差{" "}
                            {replayCompareSummary.countDelta > 0
                              ? `+${replayCompareSummary.countDelta}`
                              : replayCompareSummary.countDelta}
                          </span>
                          <span>
                            平均风险差{" "}
                            {replayCompareSummary.riskDelta > 0
                              ? `+${replayCompareSummary.riskDelta}`
                              : replayCompareSummary.riskDelta}
                          </span>
                          <span>节点重合 {replayCompareSummary.overlapNodeIds.length}</span>
                          <span>
                            重合率 {Math.round(replayCompareSummary.overlapRatio * 100)}%
                          </span>
                          <span>
                            目标变化 {replayCompareSummary.targetChanged ? "是" : "否"}
                          </span>
                          <span>
                            来源变化 {replayCompareSummary.sourceChanged ? "是" : "否"}
                          </span>
                          <span>模式变化 {replayCompareSummary.modeChanged ? "是" : "否"}</span>
                          <span>
                            时间间隔{" "}
                            {replayCompareSummary.timeGapHours !== null
                              ? `${replayCompareSummary.timeGapHours}h`
                              : "未知"}
                          </span>
                        </div>
                      ) : (
                        <p className="muted">请选择两条不同批次进行对比。</p>
                      )}
                    </div>
                  ) : null}
                  {renderReplayPushHistory.length > 0 ? (
                    <div className="graph-replay-history-list">
                      {renderReplayPushHistory.map((entry) => (
                        <article
                          className={`graph-replay-history-item${
                            queryReplayBatchId && matchReplayBatchId(entry.batchId, queryReplayBatchId)
                              ? " located"
                              : ""
                          }`}
                          key={entry.id}
                        >
                          <header>
                            <strong>{entry.batchId}</strong>
                            <span>
                              {resolveReplayPushSourceLabel(entry.source)} ·
                              {resolveReplayPushTargetLabel(entry.target)} · {entry.count} 条
                            </span>
                          </header>
                          <p>
                            首条：{entry.primaryNodeLabel}
                            {entry.bridgePartnerLabel
                              ? ` ↔ ${entry.bridgePartnerLabel}`
                              : ""}{" "}
                            · {entry.mode ? `模式 ${entry.mode}` : "模式未标注"}
                          </p>
                          <em>{formatDateTime(entry.at)}</em>
                          <div className="graph-replay-history-actions">
                            <button
                              type="button"
                              disabled={entry.queue.length === 0}
                              onClick={() => handleRepushHistoryEntry(entry, entry.target)}
                            >
                              复推到原目标
                            </button>
                            <button
                              type="button"
                              disabled={entry.queue.length === 0}
                              onClick={() => handleRepushHistoryEntry(entry, "path")}
                            >
                              复推到路径
                            </button>
                            <button
                              type="button"
                              disabled={entry.queue.length === 0}
                              onClick={() => handleRepushHistoryEntry(entry, "workspace")}
                            >
                              复推到工作区
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">当前筛选下暂无历史批次，尝试切换筛选条件。</p>
                  )}
                    </>
                  ) : (
                    <p className="muted">暂无回放推送历史，先执行一次“推送当前帧”或“批量推送”。</p>
                  )}
                </>
              )}
            </div>

            <div
              id="graph_timeline_panel"
              className={`graph-insight-card graph-section-history${
                collapsedInsightSectionSet.has("graph_timeline") ? " collapsed" : ""
              }`}
            >
              <header className="graph-insight-card-head">
                <strong>图谱演化时间轴</strong>
                <button
                  type="button"
                  onClick={() =>
                    updateCurrentViewCollapsedInsights((prev) =>
                      prev.includes("graph_timeline")
                        ? prev.filter((item) => item !== "graph_timeline")
                        : [...prev, "graph_timeline"]
                    )
                  }
                >
                  {collapsedInsightSectionSet.has("graph_timeline") ? "展开" : "收起"}
                </button>
              </header>
              {collapsedInsightSectionSet.has("graph_timeline") ? (
                <p className="muted">该分组已折叠，展开后可查看图谱演化与闭环事件。</p>
              ) : (
                <>
                  <p className="muted">持续记录结构变化，便于回看知识网络是否在收敛。</p>
                  {activeTimeline ? (
                    <div className="graph-timeline-current">
                      <p>
                        最新快照：{formatDateTime(activeTimeline.at)} · 节点{" "}
                        {activeTimeline.nodeCount} · 关系 {activeTimeline.edgeCount}
                      </p>
                      <p>
                        高风险 {activeTimeline.highRiskCount} · 孤立节点{" "}
                        {activeTimeline.isolatedNodeCount} · 平均掌握度{" "}
                        {toPercent(activeTimeline.averageMastery)}
                      </p>
                      <p>当前最高风险节点：{activeTimeline.topRiskNodeLabel}</p>
                      {timelineDelta ? (
                        <div className="graph-timeline-delta-row">
                          <span>节点 {formatDelta(timelineDelta.nodeDelta)}</span>
                          <span>关系 {formatDelta(timelineDelta.edgeDelta)}</span>
                          <span>
                            掌握度 {formatDelta(timelineDelta.masteryDelta, { precision: 2 })}
                          </span>
                          <span>高风险 {formatDelta(timelineDelta.riskDelta)}</span>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="muted">暂无历史快照。</p>
                  )}

                  {graphHistory.length > 0 ? (
                    <div className="graph-timeline-list">
                      {graphHistory.map((item) => (
                        <div className="graph-timeline-item" key={item.id}>
                          <strong>{formatDateTime(item.at)}</strong>
                          <span>
                            N{item.nodeCount} · E{item.edgeCount} · 风险{item.highRiskCount}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {graphActivities.length > 0 ? (
                    <div className="graph-activity-list">
                      <strong>闭环事件</strong>
                      {graphActivities.slice(0, 6).map((event) => (
                        <div
                          className={`graph-activity-item${
                            focusedActivityId === event.id ? " active" : ""
                          } risk-${resolveActivityRiskTone(
                            resolveGraphActivityRiskScore(event)
                          )}`}
                          key={event.id}
                        >
                          <p>
                            {event.source === "path_feedback" ? "路径反馈" : "工作区推进"} ·{" "}
                            {event.nodeLabel}
                          </p>
                          <span className="graph-activity-risk">
                            风险 {Math.round(resolveGraphActivityRiskScore(event) * 100)}%
                          </span>
                          <span>{formatDateTime(event.at)}</span>
                          <em>{event.detail}</em>
                          <button
                            type="button"
                            onClick={() => handleFocusGraphActivity(event)}
                          >
                            定位到节点
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {error ? <div className="result-box danger">{error}</div> : null}
    </div>
  );
}

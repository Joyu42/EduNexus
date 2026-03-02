"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { requestJson } from "@/lib/client/api";
import { GalaxyHero } from "@/components/galaxy-ui";
import { RatioRing, TrendSparkCard } from "@/components/dashboard-mini-charts";
import {
  GRAPH_ACTIVITY_STORAGE_KEY,
  normalizeGraphActivityPayload,
  pushGraphActivityEventToStorage,
  resolveGraphActivityRiskScore,
  writeGraphActivityFocusIdToStorage,
  type GraphActivityEvent
} from "@/lib/client/graph-activity";
import { writeGraphFocusNodeToStorage } from "@/lib/client/graph-focus-bridge";
import {
  type PathFocusPayload,
  writePathFocusToStorage,
  writeWorkspaceFocusToStorage
} from "@/lib/client/path-focus-bridge";
import {
  resolveNodeRisk,
  type GraphViewEdge,
  type GraphViewNode
} from "@/lib/client/graph-view-model";
import {
  isCrossDomainBridge,
  sortBridgeRiskRows,
  type BridgeRelationMode,
  type BridgeSortMode
} from "@/lib/client/bridge-insight";

type PeriodKey = "7d" | "14d" | "30d";
type CompareMode = "previous" | "periodStart" | "customDate" | "crossPeriod";
type InsightRiskLevel = "low" | "medium" | "high";
type AlertPolicyMode = "strict" | "balanced" | "relaxed";
type AlertConfigPreset = "intervene" | "balanced" | "quiet" | "custom";
type ActivitySourceFilter = "all" | "path_feedback" | "workspace";
type ActivitySortMode = "latest" | "risk_desc" | "risk_asc";
type ActivityRiskTone = "low" | "medium" | "high";

type GraphViewPayload = {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
};

type DashboardBridgeRiskRow = {
  id: string;
  sourceId: string;
  sourceLabel: string;
  targetId: string;
  targetLabel: string;
  sourceDomain: string;
  targetDomain: string;
  risk: number;
  weight: number;
  primaryNodeId: string;
  primaryNodeLabel: string;
};

type AlertItem = {
  id: string;
  alertKey: string;
  title: string;
  level: InsightRiskLevel;
  summary: string;
  action: string;
};

type AlertHandledRecord = {
  alertKey: string;
  title: string;
  level: InsightRiskLevel;
  summary: string;
  action: string;
  period: PeriodKey;
  handledAt: string;
};

type AlertDimensionRow = {
  key: string;
  label: string;
  high: number;
  medium: number;
  total: number;
};

type DashboardRiskConfig = {
  dependencyHighThreshold: number;
  independentHighThreshold: number;
  gainHighThreshold: number;
  maxVisibleAlerts: number;
  historyLimit: number;
  dimensionLimit: number;
};

type MetricSeries = {
  id: string;
  title: string;
  value: string;
  delta: string;
  points: number[];
};

type PeriodMetrics = {
  trends: MetricSeries[];
  rings: Array<{ label: string; value: number; hint: string }>;
};

const PERIOD_OPTIONS: Array<{ key: PeriodKey; label: string }> = [
  { key: "7d", label: "7 天" },
  { key: "14d", label: "14 天" },
  { key: "30d", label: "30 天" }
];

const PERIOD_METRICS: Record<PeriodKey, PeriodMetrics> = {
  "7d": {
    trends: [
      {
        id: "gain",
        title: "学习增益趋势",
        value: "+18.7%",
        delta: "+2.4% vs 上周",
        points: [52, 55, 57, 60, 61, 66, 69]
      },
      {
        id: "independent",
        title: "独立完成率",
        value: "61%",
        delta: "+4.1% vs 上周",
        points: [48, 50, 52, 55, 58, 60, 61]
      },
      {
        id: "dependency",
        title: "高层提示依赖率",
        value: "34%",
        delta: "-5.6% vs 上周",
        points: [49, 47, 45, 42, 39, 36, 34]
      }
    ],
    rings: [
      { label: "独立完成率", value: 61, hint: "持续上升，说明学习自驱增强" },
      { label: "Citation 覆盖", value: 82, hint: "知识回答可溯源性较好" },
      { label: "最终答案依赖", value: 39, hint: "仍可继续压降至 30% 以下" }
    ]
  },
  "14d": {
    trends: [
      {
        id: "gain",
        title: "学习增益趋势",
        value: "+14.2%",
        delta: "+1.6% vs 前周期",
        points: [46, 47, 49, 50, 52, 54, 55, 56, 58, 60, 61, 63, 64, 65]
      },
      {
        id: "independent",
        title: "独立完成率",
        value: "58%",
        delta: "+2.8% vs 前周期",
        points: [42, 43, 44, 46, 47, 48, 49, 51, 52, 54, 55, 56, 57, 58]
      },
      {
        id: "dependency",
        title: "高层提示依赖率",
        value: "37%",
        delta: "-3.1% vs 前周期",
        points: [51, 50, 50, 49, 48, 46, 45, 44, 43, 42, 41, 40, 39, 37]
      }
    ],
    rings: [
      { label: "独立完成率", value: 58, hint: "近两周稳定改善，但仍可继续提升" },
      { label: "Citation 覆盖", value: 79, hint: "建议强化低频知识点引用补全" },
      { label: "最终答案依赖", value: 42, hint: "下降中，门控策略继续有效" }
    ]
  },
  "30d": {
    trends: [
      {
        id: "gain",
        title: "学习增益趋势",
        value: "+11.9%",
        delta: "+0.9% vs 上月",
        points: [40, 41, 42, 44, 45, 46, 47, 47, 48, 49, 51, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 62, 63, 64, 65, 66, 66, 67, 68, 69]
      },
      {
        id: "independent",
        title: "独立完成率",
        value: "55%",
        delta: "+1.3% vs 上月",
        points: [35, 36, 37, 38, 39, 40, 41, 41, 42, 43, 44, 44, 45, 46, 47, 47, 48, 49, 50, 50, 51, 52, 52, 53, 53, 54, 54, 55, 55, 55]
      },
      {
        id: "dependency",
        title: "高层提示依赖率",
        value: "40%",
        delta: "-1.8% vs 上月",
        points: [56, 55, 54, 54, 53, 53, 52, 52, 51, 51, 50, 50, 49, 48, 48, 47, 47, 46, 45, 45, 44, 44, 43, 43, 42, 42, 41, 41, 40, 40]
      }
    ],
    rings: [
      { label: "独立完成率", value: 55, hint: "月度趋势平稳，需提升难题独立率" },
      { label: "Citation 覆盖", value: 76, hint: "建议增加跨章节引用与对比来源" },
      { label: "最终答案依赖", value: 44, hint: "月度口径仍偏高，需继续压降" }
    ]
  }
};

const DEFAULT_DASHBOARD_RISK_CONFIG: DashboardRiskConfig = {
  dependencyHighThreshold: 45,
  independentHighThreshold: 50,
  gainHighThreshold: 55,
  maxVisibleAlerts: 4,
  historyLimit: 6,
  dimensionLimit: 4
};

const DASHBOARD_RISK_PRESETS: Record<
  Exclude<AlertConfigPreset, "custom">,
  DashboardRiskConfig
> = {
  intervene: {
    dependencyHighThreshold: 42,
    independentHighThreshold: 53,
    gainHighThreshold: 58,
    maxVisibleAlerts: 6,
    historyLimit: 10,
    dimensionLimit: 4
  },
  balanced: DEFAULT_DASHBOARD_RISK_CONFIG,
  quiet: {
    dependencyHighThreshold: 48,
    independentHighThreshold: 47,
    gainHighThreshold: 52,
    maxVisibleAlerts: 3,
    historyLimit: 4,
    dimensionLimit: 3
  }
};

function buildDateLabels(total: number) {
  if (total <= 0) {
    return [];
  }
  return Array.from({ length: total }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (total - index - 1));
    return date.toLocaleDateString("zh-CN", {
      month: "2-digit",
      day: "2-digit"
    });
  });
}

function getPeriodLabel(period: PeriodKey) {
  return PERIOD_OPTIONS.find((item) => item.key === period)?.label ?? period;
}

function resolveCrossPeriodKey(period: PeriodKey): PeriodKey {
  if (period === "30d") {
    return "14d";
  }
  return "30d";
}

function alignIndexToLength(index: number, fromLength: number, toLength: number) {
  if (toLength <= 0) {
    return 0;
  }
  if (fromLength <= 1) {
    return 0;
  }
  const ratio = index / (fromLength - 1);
  return Math.max(0, Math.min(toLength - 1, Math.round(ratio * (toLength - 1))));
}

function formatDeltaValue(value: number | null) {
  if (value === null) {
    return "--";
  }
  return `${value > 0 ? "+" : value < 0 ? "" : ""}${value}`;
}

function resolveInsightRisk(
  metricId: string,
  current: number,
  deltaFromPrevious: number | null,
  deltaFromCross: number | null,
  riskConfig: DashboardRiskConfig
) {
  if (metricId === "dependency") {
    if (
      current >= riskConfig.dependencyHighThreshold ||
      (deltaFromPrevious !== null && deltaFromPrevious > 2)
    ) {
      return {
        level: "high" as InsightRiskLevel,
        message: "提示依赖偏高，建议收紧高层提示门槛。"
      };
    }
    if (current >= 38 || (deltaFromPrevious !== null && deltaFromPrevious > 0)) {
      return {
        level: "medium" as InsightRiskLevel,
        message: "依赖率有上行信号，需观察下一周期。"
      };
    }
    return {
      level: "low" as InsightRiskLevel,
      message: "依赖率处于可控区间。"
    };
  }

  if (metricId === "independent") {
    if (
      current < riskConfig.independentHighThreshold ||
      (deltaFromPrevious !== null && deltaFromPrevious < -2)
    ) {
      return {
        level: "high" as InsightRiskLevel,
        message: "独立完成率偏低，建议强化中间步骤训练。"
      };
    }
    if (current < 56 || (deltaFromPrevious !== null && deltaFromPrevious < 0)) {
      return {
        level: "medium" as InsightRiskLevel,
        message: "独立完成率有回落，建议加大分层练习。"
      };
    }
    return {
      level: "low" as InsightRiskLevel,
      message: "独立完成率表现稳定。"
    };
  }

  if (
    current < riskConfig.gainHighThreshold ||
    (deltaFromPrevious !== null && deltaFromPrevious < -2)
  ) {
    return {
      level: "high" as InsightRiskLevel,
      message: "学习增益下降明显，建议检查任务难度配比。"
    };
  }
  if (
    (deltaFromPrevious !== null && deltaFromPrevious < 0) ||
    (deltaFromCross !== null && deltaFromCross < 0)
  ) {
    return {
      level: "medium" as InsightRiskLevel,
      message: "学习增益有走弱迹象，可提前干预。"
    };
  }
  return {
    level: "low" as InsightRiskLevel,
    message: "学习增益趋势健康。"
  };
}

function riskLevelRank(level: InsightRiskLevel) {
  if (level === "high") return 3;
  if (level === "medium") return 2;
  return 1;
}

function formatRiskLevelLabel(level: InsightRiskLevel) {
  if (level === "high") return "高风险";
  if (level === "medium") return "中风险";
  return "低风险";
}

function normalizeAlertPolicyMode(value: string): AlertPolicyMode {
  if (value === "strict" || value === "relaxed") {
    return value;
  }
  return "balanced";
}

function formatAlertPolicyLabel(mode: AlertPolicyMode) {
  if (mode === "strict") return "严格策略";
  if (mode === "relaxed") return "宽松策略";
  return "均衡策略";
}

function formatAlertConfigPresetLabel(preset: AlertConfigPreset) {
  if (preset === "intervene") return "主动干预";
  if (preset === "quiet") return "降噪观察";
  if (preset === "custom") return "自定义";
  return "默认均衡";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeDashboardRiskConfig(
  value?: Partial<DashboardRiskConfig>
): DashboardRiskConfig {
  const merged = {
    ...DEFAULT_DASHBOARD_RISK_CONFIG,
    ...(value ?? {})
  };
  return {
    dependencyHighThreshold: clamp(
      Number(merged.dependencyHighThreshold) || DEFAULT_DASHBOARD_RISK_CONFIG.dependencyHighThreshold,
      35,
      55
    ),
    independentHighThreshold: clamp(
      Number(merged.independentHighThreshold) || DEFAULT_DASHBOARD_RISK_CONFIG.independentHighThreshold,
      42,
      60
    ),
    gainHighThreshold: clamp(
      Number(merged.gainHighThreshold) || DEFAULT_DASHBOARD_RISK_CONFIG.gainHighThreshold,
      45,
      62
    ),
    maxVisibleAlerts: clamp(
      Number(merged.maxVisibleAlerts) || DEFAULT_DASHBOARD_RISK_CONFIG.maxVisibleAlerts,
      2,
      8
    ),
    historyLimit: clamp(
      Number(merged.historyLimit) || DEFAULT_DASHBOARD_RISK_CONFIG.historyLimit,
      3,
      12
    ),
    dimensionLimit: clamp(
      Number(merged.dimensionLimit) || DEFAULT_DASHBOARD_RISK_CONFIG.dimensionLimit,
      2,
      6
    )
  };
}

function normalizeAlertConfigPreset(value: string): AlertConfigPreset {
  if (value === "intervene" || value === "quiet" || value === "custom") {
    return value;
  }
  return "balanced";
}

function applyAlertPolicyLevel(level: InsightRiskLevel, mode: AlertPolicyMode): InsightRiskLevel {
  if (mode === "strict") {
    if (level === "high") return "high";
    if (level === "medium") return "high";
    return "medium";
  }
  if (mode === "relaxed") {
    if (level === "high") return "medium";
    if (level === "medium") return "low";
    return "low";
  }
  return level;
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return value;
  }
}

function buildFocusPayloadFromActivity(event: GraphActivityEvent): PathFocusPayload {
  const risk = resolveGraphActivityRiskScore(event);
  return {
    nodeId: event.nodeId,
    nodeLabel: event.nodeLabel,
    domain: "general",
    mastery: Number((1 - risk).toFixed(2)),
    risk,
    relatedNodes: [],
    at: event.at,
    focusSource: "dashboard"
  };
}

function buildBridgeTaskTemplate(primaryLabel: string, partnerLabel: string) {
  return `桥接任务模板：围绕「${primaryLabel}」与「${partnerLabel}」先做条件映射，再完成“同构题 + 反例题 + 迁移题”三段训练。`;
}

function resolveActivityRiskTone(risk: number): ActivityRiskTone {
  if (risk >= 0.65) {
    return "high";
  }
  if (risk >= 0.45) {
    return "medium";
  }
  return "low";
}

function buildDashboardBridgeRiskRows(
  payload: GraphViewPayload,
  limit: number
): DashboardBridgeRiskRow[] {
  const nodeMap = new Map(payload.nodes.map((item) => [item.id, item]));
  return payload.edges
    .map((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) {
        return null;
      }
      const sourceRisk = resolveNodeRisk(source);
      const targetRisk = resolveNodeRisk(target);
      const risk = Number((((sourceRisk + targetRisk) / 2)).toFixed(2));
      const weight = Number(edge.weight ?? 1);
      const primaryNode = sourceRisk >= targetRisk ? source : target;
      return {
        id: `${edge.source}_${edge.target}`,
        sourceId: source.id,
        sourceLabel: source.label,
        targetId: target.id,
        targetLabel: target.label,
        sourceDomain: source.domain ?? "general",
        targetDomain: target.domain ?? "general",
        risk,
        weight,
        primaryNodeId: primaryNode.id,
        primaryNodeLabel: primaryNode.label
      };
    })
    .filter((item): item is DashboardBridgeRiskRow => item !== null)
    .sort((a, b) => b.risk - a.risk || b.weight - a.weight)
    .slice(0, Math.max(1, limit));
}

function buildBridgeFocusFromRow(row: DashboardBridgeRiskRow): {
  partnerLabel: string;
  focusPayload: PathFocusPayload;
} {
  const partnerLabel =
    row.primaryNodeId === row.sourceId ? row.targetLabel : row.sourceLabel;
  return {
    partnerLabel,
    focusPayload: {
      nodeId: row.primaryNodeId,
      nodeLabel: row.primaryNodeLabel,
      domain: row.primaryNodeId === row.sourceId ? row.sourceDomain : row.targetDomain,
      mastery: Number((1 - row.risk).toFixed(2)),
      risk: row.risk,
      relatedNodes: [partnerLabel],
      at: new Date().toISOString(),
      focusSource: "graph_bridge",
      bridgePartnerLabel: partnerLabel,
      bridgeTaskTemplate: buildBridgeTaskTemplate(row.primaryNodeLabel, partnerLabel)
    }
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodKey>("7d");
  const [linkedHoverIndex, setLinkedHoverIndex] = useState<number | null>(null);
  const [lockedHoverIndex, setLockedHoverIndex] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState<CompareMode>("periodStart");
  const [customBaselineIndex, setCustomBaselineIndex] = useState(0);
  const [compareDateAIndex, setCompareDateAIndex] = useState(0);
  const [compareDateBIndex, setCompareDateBIndex] = useState(0);
  const [dismissedAlertKeys, setDismissedAlertKeys] = useState<string[]>([]);
  const [isDismissedAlertReady, setIsDismissedAlertReady] = useState(false);
  const [handledAlertHistory, setHandledAlertHistory] = useState<AlertHandledRecord[]>([]);
  const [isHandledAlertHistoryReady, setIsHandledAlertHistoryReady] = useState(false);
  const [alertPolicyMode, setAlertPolicyMode] = useState<AlertPolicyMode>("balanced");
  const [isAlertPolicyReady, setIsAlertPolicyReady] = useState(false);
  const [riskConfig, setRiskConfig] = useState<DashboardRiskConfig>(
    DEFAULT_DASHBOARD_RISK_CONFIG
  );
  const [riskConfigPreset, setRiskConfigPreset] = useState<AlertConfigPreset>("balanced");
  const [isRiskConfigReady, setIsRiskConfigReady] = useState(false);
  const [graphActivityEvents, setGraphActivityEvents] = useState<GraphActivityEvent[]>([]);
  const [activitySourceFilter, setActivitySourceFilter] =
    useState<ActivitySourceFilter>("all");
  const [activityNodeFilter, setActivityNodeFilter] = useState("all");
  const [activitySortMode, setActivitySortMode] = useState<ActivitySortMode>("latest");
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const [graphBridgeRiskRows, setGraphBridgeRiskRows] = useState<
    DashboardBridgeRiskRow[]
  >([]);
  const [bridgeDomainFilter, setBridgeDomainFilter] = useState("all");
  const [bridgeSortMode, setBridgeSortMode] = useState<BridgeSortMode>("risk_desc");
  const [bridgeRelationMode, setBridgeRelationMode] =
    useState<BridgeRelationMode>("all");
  const [selectedBridgeIds, setSelectedBridgeIds] = useState<string[]>([]);
  const [bridgeBatchHint, setBridgeBatchHint] = useState("");

  const refreshBridgeRiskRows = useCallback(async () => {
    try {
      const graphPayload = await requestJson<GraphViewPayload>("/api/graph/view");
      setGraphBridgeRiskRows(buildDashboardBridgeRiskRows(graphPayload, 5));
    } catch {
      setGraphBridgeRiskRows([]);
    }
  }, []);

  const currentMetrics = PERIOD_METRICS[period];
  const crossPeriodKey = useMemo(() => resolveCrossPeriodKey(period), [period]);
  const crossMetrics = PERIOD_METRICS[crossPeriodKey];
  const dateLabels = useMemo(
    () => buildDateLabels(currentMetrics.trends[0]?.points.length ?? 0),
    [currentMetrics]
  );
  const crossDateLabels = useMemo(
    () => buildDateLabels(crossMetrics.trends[0]?.points.length ?? 0),
    [crossMetrics]
  );
  const safeCustomBaselineIndex = useMemo(() => {
    if (dateLabels.length === 0) {
      return 0;
    }
    return Math.max(0, Math.min(customBaselineIndex, dateLabels.length - 1));
  }, [customBaselineIndex, dateLabels]);

  const trendLabelMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const metric of currentMetrics.trends) {
      map.set(metric.id, dateLabels);
    }
    return map;
  }, [currentMetrics, dateLabels]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("edunexus_dashboard_dismissed_alerts");
      if (!raw) {
        setDismissedAlertKeys([]);
        return;
      }
      const parsed = JSON.parse(raw) as string[];
      if (!Array.isArray(parsed)) {
        setDismissedAlertKeys([]);
        return;
      }
      setDismissedAlertKeys(
        parsed.filter((item): item is string => typeof item === "string").slice(0, 24)
      );
    } catch {
      setDismissedAlertKeys([]);
    }
    setIsDismissedAlertReady(true);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("edunexus_dashboard_alert_history");
      if (!raw) {
        setHandledAlertHistory([]);
        return;
      }
      const parsed = JSON.parse(raw) as AlertHandledRecord[];
      if (!Array.isArray(parsed)) {
        setHandledAlertHistory([]);
        return;
      }
      setHandledAlertHistory(
        parsed
          .filter(
            (item) =>
              item &&
              typeof item.alertKey === "string" &&
              typeof item.title === "string" &&
              typeof item.level === "string" &&
              typeof item.summary === "string" &&
              typeof item.action === "string" &&
              typeof item.period === "string" &&
              typeof item.handledAt === "string"
          )
          .slice(0, 30)
      );
    } catch {
      setHandledAlertHistory([]);
    }
    setIsHandledAlertHistoryReady(true);
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("edunexus_dashboard_alert_policy");
      if (!raw) {
        setAlertPolicyMode("balanced");
      } else {
        setAlertPolicyMode(normalizeAlertPolicyMode(raw));
      }
    } catch {
      setAlertPolicyMode("balanced");
    }
    setIsAlertPolicyReady(true);
  }, []);

  useEffect(() => {
    try {
      const rawConfig = window.localStorage.getItem("edunexus_dashboard_risk_config");
      if (!rawConfig) {
        setRiskConfig(DEFAULT_DASHBOARD_RISK_CONFIG);
      } else {
        const parsed = JSON.parse(rawConfig) as Partial<DashboardRiskConfig>;
        setRiskConfig(normalizeDashboardRiskConfig(parsed));
      }
      const rawPreset = window.localStorage.getItem("edunexus_dashboard_risk_preset");
      if (!rawPreset) {
        setRiskConfigPreset("balanced");
      } else {
        setRiskConfigPreset(normalizeAlertConfigPreset(rawPreset));
      }
    } catch {
      setRiskConfig(DEFAULT_DASHBOARD_RISK_CONFIG);
      setRiskConfigPreset("balanced");
    }
    setIsRiskConfigReady(true);
  }, []);

  useEffect(() => {
    const loadGraphActivityEvents = () => {
      try {
        const raw = window.localStorage.getItem(GRAPH_ACTIVITY_STORAGE_KEY);
        if (!raw) {
          setGraphActivityEvents([]);
          return;
        }
        const parsed = JSON.parse(raw) as unknown;
        setGraphActivityEvents(normalizeGraphActivityPayload(parsed, 16));
      } catch {
        setGraphActivityEvents([]);
      }
    };
    loadGraphActivityEvents();
    window.addEventListener("focus", loadGraphActivityEvents);
    return () => window.removeEventListener("focus", loadGraphActivityEvents);
  }, []);

  useEffect(() => {
    void refreshBridgeRiskRows();
    window.addEventListener("focus", refreshBridgeRiskRows);
    return () => window.removeEventListener("focus", refreshBridgeRiskRows);
  }, [refreshBridgeRiskRows]);

  useEffect(() => {
    const handleConfigUpdated = () => {
      try {
        const rawPolicy = window.localStorage.getItem("edunexus_dashboard_alert_policy");
        setAlertPolicyMode(normalizeAlertPolicyMode(rawPolicy ?? "balanced"));
      } catch {
        setAlertPolicyMode("balanced");
      }
      try {
        const rawConfig = window.localStorage.getItem("edunexus_dashboard_risk_config");
        const rawPreset = window.localStorage.getItem("edunexus_dashboard_risk_preset");
        const nextConfig = rawConfig
          ? normalizeDashboardRiskConfig(JSON.parse(rawConfig) as Partial<DashboardRiskConfig>)
          : DEFAULT_DASHBOARD_RISK_CONFIG;
        setRiskConfig(nextConfig);
        setRiskConfigPreset(normalizeAlertConfigPreset(rawPreset ?? "balanced"));
      } catch {
        setRiskConfig(DEFAULT_DASHBOARD_RISK_CONFIG);
        setRiskConfigPreset("balanced");
      }
    };
    window.addEventListener("edunexus-config-updated", handleConfigUpdated);
    return () => {
      window.removeEventListener("edunexus-config-updated", handleConfigUpdated);
    };
  }, []);

  useEffect(() => {
    if (!isDismissedAlertReady) {
      return;
    }
    window.localStorage.setItem(
      "edunexus_dashboard_dismissed_alerts",
      JSON.stringify(dismissedAlertKeys.slice(0, 24))
    );
  }, [dismissedAlertKeys, isDismissedAlertReady]);

  useEffect(() => {
    if (!isHandledAlertHistoryReady) {
      return;
    }
    window.localStorage.setItem(
      "edunexus_dashboard_alert_history",
      JSON.stringify(handledAlertHistory.slice(0, 30))
    );
  }, [handledAlertHistory, isHandledAlertHistoryReady]);

  useEffect(() => {
    if (!isAlertPolicyReady) {
      return;
    }
    window.localStorage.setItem("edunexus_dashboard_alert_policy", alertPolicyMode);
  }, [alertPolicyMode, isAlertPolicyReady]);

  useEffect(() => {
    if (!isRiskConfigReady) {
      return;
    }
    window.localStorage.setItem(
      "edunexus_dashboard_risk_config",
      JSON.stringify(riskConfig)
    );
    window.localStorage.setItem("edunexus_dashboard_risk_preset", riskConfigPreset);
  }, [isRiskConfigReady, riskConfig, riskConfigPreset]);

  useEffect(() => {
    setLinkedHoverIndex(null);
    setLockedHoverIndex(null);
    setCustomBaselineIndex(0);
    const lastIndex = Math.max(0, dateLabels.length - 1);
    setCompareDateAIndex(lastIndex);
    setCompareDateBIndex(Math.max(0, lastIndex - 3));
  }, [period, dateLabels.length]);

  const safeCompareDateAIndex = useMemo(() => {
    if (dateLabels.length === 0) {
      return 0;
    }
    return Math.max(0, Math.min(compareDateAIndex, dateLabels.length - 1));
  }, [compareDateAIndex, dateLabels]);

  const safeCompareDateBIndex = useMemo(() => {
    if (dateLabels.length === 0) {
      return 0;
    }
    return Math.max(0, Math.min(compareDateBIndex, dateLabels.length - 1));
  }, [compareDateBIndex, dateLabels]);

  const graphActivityNodeOptions = useMemo(() => {
    const scopedEvents = graphActivityEvents.filter((item) => {
      if (activitySourceFilter === "all") {
        return true;
      }
      return item.source === activitySourceFilter;
    });
    return Array.from(new Set(scopedEvents.map((item) => item.nodeLabel)))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [activitySourceFilter, graphActivityEvents]);

  const filteredGraphActivityEvents = useMemo(() => {
    const filtered = graphActivityEvents.filter((event) => {
      if (activitySourceFilter !== "all" && event.source !== activitySourceFilter) {
        return false;
      }
      if (activityNodeFilter !== "all" && event.nodeLabel !== activityNodeFilter) {
        return false;
      }
      return true;
    });
    if (activitySortMode === "latest") {
      return filtered;
    }
    return [...filtered].sort((a, b) => {
      const scoreA = resolveGraphActivityRiskScore(a);
      const scoreB = resolveGraphActivityRiskScore(b);
      return activitySortMode === "risk_desc" ? scoreB - scoreA : scoreA - scoreB;
    });
  }, [
    activityNodeFilter,
    activitySortMode,
    activitySourceFilter,
    graphActivityEvents
  ]);

  const graphActivitySummary = useMemo(() => {
    const pathFeedbackCount = graphActivityEvents.filter(
      (item) => item.source === "path_feedback"
    ).length;
    const workspaceCount = graphActivityEvents.filter(
      (item) => item.source === "workspace"
    ).length;
    const latest = graphActivityEvents[0] ?? null;
    return {
      total: graphActivityEvents.length,
      pathFeedbackCount,
      workspaceCount,
      latest,
      displayedCount: filteredGraphActivityEvents.length
    };
  }, [filteredGraphActivityEvents.length, graphActivityEvents]);

  const bridgeDomainOptions = useMemo(
    () =>
      Array.from(
        new Set(
          graphBridgeRiskRows.flatMap((item) => [item.sourceDomain, item.targetDomain])
        )
      )
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [graphBridgeRiskRows]
  );

  const filteredBridgeRiskRows = useMemo(() => {
    const filtered = graphBridgeRiskRows.filter((row) => {
      if (bridgeDomainFilter === "all") {
        return true;
      }
      return row.sourceDomain === bridgeDomainFilter || row.targetDomain === bridgeDomainFilter;
    });
    return sortBridgeRiskRows(filtered, bridgeSortMode, bridgeRelationMode);
  }, [bridgeDomainFilter, bridgeRelationMode, bridgeSortMode, graphBridgeRiskRows]);

  const selectedBridgeRows = useMemo(() => {
    if (selectedBridgeIds.length === 0) {
      return [];
    }
    const selectedSet = new Set(selectedBridgeIds);
    return filteredBridgeRiskRows.filter((row) => selectedSet.has(row.id));
  }, [filteredBridgeRiskRows, selectedBridgeIds]);

  useEffect(() => {
    if (activityNodeFilter === "all") {
      return;
    }
    if (!graphActivityNodeOptions.includes(activityNodeFilter)) {
      setActivityNodeFilter("all");
    }
  }, [activityNodeFilter, graphActivityNodeOptions]);

  useEffect(() => {
    if (bridgeDomainFilter === "all") {
      return;
    }
    if (!bridgeDomainOptions.includes(bridgeDomainFilter)) {
      setBridgeDomainFilter("all");
    }
  }, [bridgeDomainFilter, bridgeDomainOptions]);

  useEffect(() => {
    if (selectedBridgeIds.length === 0) {
      return;
    }
    const validIds = new Set(filteredBridgeRiskRows.map((row) => row.id));
    setSelectedBridgeIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [filteredBridgeRiskRows, selectedBridgeIds.length]);

  useEffect(() => {
    if (!selectedActivityId) {
      return;
    }
    const exists = filteredGraphActivityEvents.some(
      (item) => item.id === selectedActivityId
    );
    if (!exists) {
      setSelectedActivityId("");
    }
  }, [filteredGraphActivityEvents, selectedActivityId]);

  function jumpToGraphFromActivity(event: GraphActivityEvent) {
    writeGraphFocusNodeToStorage(event.nodeId, (key, value) =>
      window.localStorage.setItem(key, value)
    );
    writeGraphActivityFocusIdToStorage(event.id, (key, value) =>
      window.localStorage.setItem(key, value)
    );
    setSelectedActivityId(event.id);
    router.push("/graph");
  }

  function jumpToPathFromActivity(event: GraphActivityEvent) {
    const focusPayload = buildFocusPayloadFromActivity(event);
    writePathFocusToStorage(focusPayload, (key, value) =>
      window.localStorage.setItem(key, value)
    );
    const params = new URLSearchParams({
      from: "dashboard",
      focusNode: event.nodeId,
      focusLabel: event.nodeLabel
    });
    setSelectedActivityId(event.id);
    router.push(`/path?${params.toString()}`);
  }

  function jumpToWorkspaceFromActivity(event: GraphActivityEvent) {
    const focusPayload = buildFocusPayloadFromActivity(event);
    writeWorkspaceFocusToStorage(focusPayload, (key, value) =>
      window.localStorage.setItem(key, value)
    );
    setSelectedActivityId(event.id);
    router.push("/workspace");
  }

  function jumpToGraphFromBridge(row: DashboardBridgeRiskRow) {
    writeGraphFocusNodeToStorage(row.primaryNodeId, (key, value) =>
      window.localStorage.setItem(key, value)
    );
    router.push("/graph");
  }

  function jumpToPathFromBridge(row: DashboardBridgeRiskRow) {
    const bridgeFocus = buildBridgeFocusFromRow(row);
    writePathFocusToStorage(bridgeFocus.focusPayload, (key, value) =>
      window.localStorage.setItem(key, value)
    );
    const params = new URLSearchParams({
      from: "graph_bridge",
      focusNode: row.primaryNodeId,
      focusLabel: row.primaryNodeLabel,
      bridgePartner: bridgeFocus.partnerLabel
    });
    router.push(`/path?${params.toString()}`);
  }

  function jumpToWorkspaceFromBridge(row: DashboardBridgeRiskRow) {
    const bridgeFocus = buildBridgeFocusFromRow(row);
    writeWorkspaceFocusToStorage(bridgeFocus.focusPayload, (key, value) =>
      window.localStorage.setItem(key, value)
    );
    router.push("/workspace");
  }

  function toggleBridgeSelection(rowId: string) {
    setSelectedBridgeIds((prev) =>
      prev.includes(rowId) ? prev.filter((item) => item !== rowId) : [...prev, rowId]
    );
  }

  function selectAllVisibleBridges() {
    setSelectedBridgeIds(filteredBridgeRiskRows.map((row) => row.id));
    setBridgeBatchHint(`已选择当前筛选下 ${filteredBridgeRiskRows.length} 条关系链。`);
  }

  function clearBridgeSelection() {
    setSelectedBridgeIds([]);
    setBridgeBatchHint("已清空关系链批量选择。");
  }

  function appendBatchBridgeActivities(
    rows: DashboardBridgeRiskRow[],
    action: "推送路径" | "推送工作区"
  ) {
    for (const row of rows) {
      const bridgeFocus = buildBridgeFocusFromRow(row);
      pushGraphActivityEventToStorage(
        {
          source: "workspace",
          nodeId: row.primaryNodeId,
          nodeLabel: row.primaryNodeLabel,
          title: `关系链批量${action}`,
          detail: `${row.primaryNodeLabel} ↔ ${bridgeFocus.partnerLabel} 已批量${action}`,
          riskScore: row.risk
        },
        {
          readItem: (key) => window.localStorage.getItem(key),
          writeItem: (key, value) => window.localStorage.setItem(key, value)
        },
        20
      );
    }
  }

  function pushSelectedBridgesToPath() {
    if (selectedBridgeRows.length === 0) {
      return;
    }
    const first = selectedBridgeRows[0]!;
    const bridgeFocus = buildBridgeFocusFromRow(first);
    writePathFocusToStorage(bridgeFocus.focusPayload, (key, value) =>
      window.localStorage.setItem(key, value)
    );
    appendBatchBridgeActivities(selectedBridgeRows, "推送路径");
    const params = new URLSearchParams({
      from: "graph_bridge",
      focusNode: first.primaryNodeId,
      focusLabel: first.primaryNodeLabel,
      bridgePartner: bridgeFocus.partnerLabel,
      batchCount: String(selectedBridgeRows.length)
    });
    router.push(`/path?${params.toString()}`);
  }

  function pushSelectedBridgesToWorkspace() {
    if (selectedBridgeRows.length === 0) {
      return;
    }
    const first = selectedBridgeRows[0]!;
    const bridgeFocus = buildBridgeFocusFromRow(first);
    writeWorkspaceFocusToStorage(bridgeFocus.focusPayload, (key, value) =>
      window.localStorage.setItem(key, value)
    );
    appendBatchBridgeActivities(selectedBridgeRows, "推送工作区");
    const params = new URLSearchParams({
      batchCount: String(selectedBridgeRows.length)
    });
    router.push(`/workspace?${params.toString()}`);
  }

  const activeHoverIndex =
    lockedHoverIndex !== null ? lockedHoverIndex : linkedHoverIndex;

  function handleLinkedHoverChange(next: number | null) {
    if (lockedHoverIndex !== null) {
      return;
    }
    setLinkedHoverIndex(next);
  }

  const hoverSummary = useMemo(() => {
    if (activeHoverIndex === null) {
      return null;
    }
    const previousIndex = activeHoverIndex > 0 ? activeHoverIndex - 1 : null;
    const periodStartIndex = 0;

    const compareMeta =
      compareMode === "previous"
        ? {
            label:
              previousIndex !== null
                ? (dateLabels[previousIndex] ?? "上一日期")
                : "上一日期",
            mode: compareMode as CompareMode
          }
        : compareMode === "periodStart"
          ? {
              label: dateLabels[periodStartIndex] ?? "周期起点",
              mode: compareMode as CompareMode
            }
          : compareMode === "customDate"
            ? {
                label: dateLabels[safeCustomBaselineIndex] ?? "自定义日期",
                mode: compareMode as CompareMode
              }
            : {
                label: `${getPeriodLabel(crossPeriodKey)}同位`,
                mode: compareMode as CompareMode
              };

    const crossMetricMap = new Map(crossMetrics.trends.map((item) => [item.id, item]));

    return {
      label: dateLabels[activeHoverIndex] ?? "未知日期",
      previousLabel:
        previousIndex !== null ? (dateLabels[previousIndex] ?? "上一日期") : "上一日期",
      compareLabel: compareMeta.label,
      compareMode: compareMeta.mode,
      values: currentMetrics.trends.map((metric) => ({
        id: metric.id,
        title: metric.title,
        activeValue: metric.points[activeHoverIndex] ?? 0,
        deltaFromPrevious:
          previousIndex !== null && metric.points[previousIndex] !== undefined
            ? (metric.points[activeHoverIndex] ?? 0) - (metric.points[previousIndex] ?? 0)
            : null,
        deltaFromCompare:
          compareMode === "previous"
            ? previousIndex !== null && metric.points[previousIndex] !== undefined
              ? (metric.points[activeHoverIndex] ?? 0) - (metric.points[previousIndex] ?? 0)
              : null
            : compareMode === "periodStart"
              ? metric.points[periodStartIndex] !== undefined
                ? (metric.points[activeHoverIndex] ?? 0) -
                  (metric.points[periodStartIndex] ?? 0)
                : null
              : compareMode === "customDate"
                ? metric.points[safeCustomBaselineIndex] !== undefined
                  ? (metric.points[activeHoverIndex] ?? 0) -
                    (metric.points[safeCustomBaselineIndex] ?? 0)
                  : null
                : (() => {
                    const crossMetric = crossMetricMap.get(metric.id);
                    if (!crossMetric || crossMetric.points.length === 0) {
                      return null;
                    }
                    const crossIndex = alignIndexToLength(
                      activeHoverIndex,
                      metric.points.length,
                      crossMetric.points.length
                    );
                    return (
                      (metric.points[activeHoverIndex] ?? 0) -
                      (crossMetric.points[crossIndex] ?? 0)
                    );
                  })(),
        compareLabel:
          compareMode === "crossPeriod"
            ? (() => {
                const crossMetric = crossMetricMap.get(metric.id);
                if (!crossMetric || crossMetric.points.length === 0) {
                  return compareMeta.label;
                }
                const crossIndex = alignIndexToLength(
                  activeHoverIndex,
                  metric.points.length,
                  crossMetric.points.length
                );
                return `${compareMeta.label}（${
                  crossDateLabels[crossIndex] ?? `点 ${crossIndex + 1}`
                }）`;
              })()
            : compareMeta.label,
        compareValue:
          compareMode === "previous"
            ? previousIndex !== null && metric.points[previousIndex] !== undefined
              ? metric.points[previousIndex]
              : null
            : compareMode === "periodStart"
              ? metric.points[periodStartIndex] ?? null
              : compareMode === "customDate"
                ? metric.points[safeCustomBaselineIndex] ?? null
                : (() => {
                    const crossMetric = crossMetricMap.get(metric.id);
                    if (!crossMetric || crossMetric.points.length === 0) {
                      return null;
                    }
                    const crossIndex = alignIndexToLength(
                      activeHoverIndex,
                      metric.points.length,
                      crossMetric.points.length
                    );
                    return crossMetric.points[crossIndex] ?? null;
                  })(),
        currentLabel: getPeriodLabel(period)
      }))
    };
  }, [
    activeHoverIndex,
    compareMode,
    crossDateLabels,
    crossMetrics,
    crossPeriodKey,
    currentMetrics,
    dateLabels,
    period,
    safeCustomBaselineIndex
  ]);

  const compareModeLabel =
    compareMode === "previous"
      ? "上一日期"
      : compareMode === "periodStart"
        ? "周期起点"
        : compareMode === "customDate"
          ? "自定义日期"
          : `${getPeriodLabel(crossPeriodKey)}同位`;

  const pairCompareSummary = useMemo(() => {
    if (dateLabels.length === 0) {
      return null;
    }
    const labelA = dateLabels[safeCompareDateAIndex] ?? "日期 A";
    const labelB = dateLabels[safeCompareDateBIndex] ?? "日期 B";
    return {
      labelA,
      labelB,
      values: currentMetrics.trends.map((metric) => {
        const valueA = metric.points[safeCompareDateAIndex] ?? 0;
        const valueB = metric.points[safeCompareDateBIndex] ?? 0;
        return {
          id: metric.id,
          title: metric.title,
          valueA,
          valueB,
          delta: valueA - valueB
        };
      })
    };
  }, [currentMetrics, dateLabels, safeCompareDateAIndex, safeCompareDateBIndex]);

  const trendInsightCards = useMemo(() => {
    const focusIndex =
      activeHoverIndex !== null
        ? activeHoverIndex
        : Math.max(0, (currentMetrics.trends[0]?.points.length ?? 1) - 1);
    const focusLabel = dateLabels[focusIndex] ?? "当前点位";
    const crossMetricMap = new Map(crossMetrics.trends.map((item) => [item.id, item]));

    return currentMetrics.trends.map((metric) => {
      const currentValue = metric.points[focusIndex] ?? 0;
      const previousValue = focusIndex > 0 ? (metric.points[focusIndex - 1] ?? 0) : null;
      const deltaFromPrevious =
        previousValue !== null ? currentValue - previousValue : null;
      const crossMetric = crossMetricMap.get(metric.id);
      const crossValue =
        crossMetric && crossMetric.points.length > 0
          ? crossMetric.points[
              alignIndexToLength(focusIndex, metric.points.length, crossMetric.points.length)
            ] ?? null
          : null;
      const deltaFromCross =
        crossValue !== null ? currentValue - crossValue : null;
      const risk = resolveInsightRisk(
        metric.id,
        currentValue,
        deltaFromPrevious,
        deltaFromCross,
        riskConfig
      );

      return {
        id: metric.id,
        title: metric.title,
        focusLabel,
        currentValue,
        previousLabel: focusIndex > 0 ? (dateLabels[focusIndex - 1] ?? "上一日期") : "上一日期",
        deltaFromPrevious,
        crossLabel: `${getPeriodLabel(crossPeriodKey)}同位`,
        deltaFromCross,
        riskLevel: risk.level,
        riskMessage: risk.message
      };
    });
  }, [activeHoverIndex, crossMetrics, crossPeriodKey, currentMetrics, dateLabels, riskConfig]);

  const alertSummary = useMemo(() => {
    const baseActions: Record<string, string> = {
      gain: "建议：下一个教学日优先推送“中档难度+自检步骤”任务包。",
      independent: "建议：追加“先写条件再推导”的结构化模板训练。",
      dependency: "建议：对 Level 3/4 提示启用延迟门控并要求先提交思路草稿。"
    };

    const items: AlertItem[] = trendInsightCards
      .filter((item) => item.riskLevel !== "low")
      .map((item) => ({
        id: item.id,
        alertKey: `${period}_${item.id}_${applyAlertPolicyLevel(item.riskLevel, alertPolicyMode)}`,
        title: item.title,
        level: applyAlertPolicyLevel(item.riskLevel, alertPolicyMode),
        summary: item.riskMessage,
        action: baseActions[item.id] ?? "建议：人工复核该指标并调整任务编排。"
      }))
      .sort((a, b) => riskLevelRank(b.level) - riskLevelRank(a.level));

    const visibleItems = items.filter((item) => !dismissedAlertKeys.includes(item.alertKey));
    const highCount = visibleItems.filter((item) => item.level === "high").length;
    const mediumCount = visibleItems.filter((item) => item.level === "medium").length;
    const triggerLevel: InsightRiskLevel =
      highCount > 0 ? "high" : mediumCount > 0 ? "medium" : "low";

    return {
      items: visibleItems.slice(0, riskConfig.maxVisibleAlerts),
      highCount,
      mediumCount,
      triggerLevel,
      dismissedCount: items.length - visibleItems.length
    };
  }, [alertPolicyMode, dismissedAlertKeys, period, riskConfig.maxVisibleAlerts, trendInsightCards]);

  const alertDimensionOverview = useMemo(() => {
    const classMap: Record<string, string[]> = {
      gain: ["高一 2 班", "高二 1 班"],
      independent: ["高一 2 班", "高一 5 班"],
      dependency: ["高一 2 班", "高三 3 班"]
    };
    const chapterMap: Record<string, string[]> = {
      gain: ["函数综合", "数列迁移"],
      independent: ["函数单调性", "立体几何"],
      dependency: ["函数单调性", "概率统计"]
    };

    function buildRows(mapConfig: Record<string, string[]>) {
      const bucket = new Map<string, AlertDimensionRow>();
      for (const item of alertSummary.items) {
        const targets = mapConfig[item.id] ?? ["待分配"];
        for (const label of targets) {
          const row =
            bucket.get(label) ??
            { key: label, label, high: 0, medium: 0, total: 0 };
          if (item.level === "high") {
            row.high += 1;
          } else if (item.level === "medium") {
            row.medium += 1;
          }
          row.total += 1;
          bucket.set(label, row);
        }
      }
      return Array.from(bucket.values())
        .sort((a, b) => b.high - a.high || b.total - a.total || a.label.localeCompare(b.label))
        .slice(0, riskConfig.dimensionLimit);
    }

    return {
      classes: buildRows(classMap),
      chapters: buildRows(chapterMap)
    };
  }, [alertSummary.items, riskConfig.dimensionLimit]);

  function handleDismissAlert(item: AlertItem) {
    setDismissedAlertKeys((prev) =>
      Array.from(new Set([item.alertKey, ...prev])).slice(0, 24)
    );
    setHandledAlertHistory((prev) => {
      const record: AlertHandledRecord = {
        alertKey: item.alertKey,
        title: item.title,
        level: item.level,
        summary: item.summary,
        action: item.action,
        period,
        handledAt: new Date().toISOString()
      };
      return [record, ...prev.filter((entry) => entry.alertKey !== item.alertKey)].slice(0, 30);
    });
  }

  function applyRiskConfigPreset(preset: Exclude<AlertConfigPreset, "custom">) {
    setRiskConfigPreset(preset);
    setRiskConfig(DASHBOARD_RISK_PRESETS[preset]);
  }

  return (
    <section>
      <header className="page-head">
        <h2>生态看板（一期轻量版）</h2>
        <p>
          本页面用于展示一期核心指标：学习增益、独立完成率、提示依赖率、citation 覆盖率。当前先采用 mock +
          规则统计，后续接入真实埋点流。
        </p>
      </header>

      <div className="panel-grid">
        <GalaxyHero
          badge="Ecosystem Metrics · Live Snapshot"
          title="用指标追踪“学会了多少”，而不只是“做了多少题”"
          description="看板围绕学习增益、独立完成率、提示依赖率和 citation 覆盖率构建，帮助运营与教学团队快速识别收益和风险点。"
          quote="“指标不是汇报材料，而是下一轮教学决策的导航盘。”"
          chips={["学习增益", "独立完成率", "提示依赖率", "Citation 覆盖"]}
          metrics={[
            {
              label: "数据口径",
              value: period === "7d" ? "7 日滚动" : period === "14d" ? "14 日滚动" : "30 日滚动",
              hint: "一期 mock + 规则统计"
            },
            { label: "风险追踪", value: "班级 / 节点", hint: "可定位可干预" },
            { label: "后续计划", value: "事件埋点化", hint: "接入真实行为流" }
          ]}
        />

        <article className="panel kpi">
          <h3>学习增益</h3>
          <strong>{currentMetrics.trends[0]?.value ?? "-"}</strong>
          <p>近 {period === "7d" ? 7 : period === "14d" ? 14 : 30} 日单位学习时长掌握度提升。</p>
        </article>
        <article className="panel kpi">
          <h3>独立完成率</h3>
          <strong>{currentMetrics.rings[0]?.value ?? "-"}%</strong>
          <p>无需最终答案解锁即可完成任务的比例。</p>
        </article>
        <article className="panel kpi">
          <h3>提示依赖率</h3>
          <strong>{currentMetrics.trends[2]?.value ?? "-"}</strong>
          <p>用户对高层提示（Level 3/4）的依赖度。</p>
        </article>
        <article className="panel kpi">
          <h3>Citation 覆盖</h3>
          <strong>{currentMetrics.rings[1]?.value ?? "-"}%</strong>
          <p>知识类回答附来源引用的覆盖比例。</p>
        </article>

        <article className="panel wide">
          <h3>趋势分析（可切换周期）</h3>
          <div className="period-switch">
            {PERIOD_OPTIONS.map((item) => (
              <button
                type="button"
                key={item.key}
                className={`period-chip ${period === item.key ? "active" : ""}`}
                onClick={() => setPeriod(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="trend-grid trend-grid-top">
            {currentMetrics.trends.map((metric) => (
              <TrendSparkCard
                key={metric.id}
                id={`${period}_${metric.id}`}
                title={metric.title}
                value={metric.value}
                delta={metric.delta}
                points={metric.points}
                labels={trendLabelMap.get(metric.id) ?? []}
                activeIndex={activeHoverIndex}
                onActiveIndexChange={handleLinkedHoverChange}
                locked={lockedHoverIndex !== null}
              />
            ))}
          </div>

          <div className="trend-readout">
            {hoverSummary ? (
              <>
                <div className="trend-readout-head">
                  <strong>联动时间点：{hoverSummary.label}</strong>
                  <div className="trend-lock-tools">
                    <button
                      type="button"
                      className={`trend-lock-btn ${lockedHoverIndex !== null ? "active" : ""}`}
                      onClick={() =>
                        setLockedHoverIndex((prev) =>
                          prev === null ? activeHoverIndex : null
                        )
                      }
                    >
                      {lockedHoverIndex === null ? "锁定该日期" : "解除锁定"}
                    </button>
                    <button
                      type="button"
                      className="trend-lock-btn"
                      onClick={() => {
                        setLockedHoverIndex(null);
                        setLinkedHoverIndex(null);
                      }}
                    >
                      清空联动
                    </button>
                  </div>
                </div>

                <div className="trend-compare-tools">
                  <label>对比基准</label>
                  <select
                    className="trend-compare-select"
                    value={compareMode}
                    onChange={(event) => setCompareMode(event.target.value as CompareMode)}
                  >
                    <option value="previous">上一日期</option>
                    <option value="periodStart">周期起点</option>
                    <option value="customDate">自定义日期</option>
                    <option value="crossPeriod">{getPeriodLabel(crossPeriodKey)}同位</option>
                  </select>
                  {compareMode === "customDate" ? (
                    <select
                      className="trend-compare-select"
                      value={safeCustomBaselineIndex}
                      onChange={(event) => setCustomBaselineIndex(Number(event.target.value))}
                    >
                      {dateLabels.map((label, index) => (
                        <option key={`${label}_${index}`} value={index}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <span className="trend-compare-note">
                    当前基准：{compareModeLabel}
                  </span>
                </div>

                <div className="trend-readout-row">
                  {hoverSummary.values.map((item) => (
                    <span key={`${period}_${item.id}`}>
                      {item.title}：{item.activeValue}
                      <em className="trend-readout-delta">
                        {item.currentLabel} vs {item.compareLabel}：{item.compareValue ?? "--"}（Δ
                        {formatDeltaValue(item.deltaFromCompare)}）
                        {hoverSummary.compareMode !== "previous"
                          ? ` · Δ${hoverSummary.previousLabel} ${formatDeltaValue(item.deltaFromPrevious)}`
                          : ""}
                      </em>
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted">把鼠标移动到任一趋势图上，可联动查看同一日期的所有指标。</p>
            )}
          </div>

          {pairCompareSummary ? (
            <div className="trend-pair-compare">
              <div className="trend-pair-head">
                <strong>双日期对比（A/B）</strong>
                <div className="trend-pair-tools">
                  <label>
                    日期 A
                    <select
                      className="trend-compare-select"
                      value={safeCompareDateAIndex}
                      onChange={(event) => setCompareDateAIndex(Number(event.target.value))}
                    >
                      {dateLabels.map((label, index) => (
                        <option key={`pair_a_${label}_${index}`} value={index}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    日期 B
                    <select
                      className="trend-compare-select"
                      value={safeCompareDateBIndex}
                      onChange={(event) => setCompareDateBIndex(Number(event.target.value))}
                    >
                      {dateLabels.map((label, index) => (
                        <option key={`pair_b_${label}_${index}`} value={index}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="trend-lock-btn"
                    onClick={() => {
                      setCompareDateAIndex(safeCompareDateBIndex);
                      setCompareDateBIndex(safeCompareDateAIndex);
                    }}
                  >
                    A/B 互换
                  </button>
                </div>
              </div>
              <div className="trend-readout-row">
                {pairCompareSummary.values.map((item) => (
                  <span key={`${period}_pair_${item.id}`}>
                    {item.title}：A {pairCompareSummary.labelA} = {item.valueA} · B{" "}
                    {pairCompareSummary.labelB} = {item.valueB}
                    <em className="trend-readout-delta">Δ(A-B) {formatDeltaValue(item.delta)}</em>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="trend-insight-grid">
            {trendInsightCards.map((item) => (
              <article
                key={`${period}_insight_${item.id}`}
                className={`trend-insight-card trend-insight-${item.riskLevel}`}
              >
                <header>
                  <span>{item.title}</span>
                  <strong>{item.currentValue}</strong>
                </header>
                <p>{item.focusLabel}</p>
                <div className="trend-insight-deltas">
                  <span>
                    环比（{item.previousLabel}）：{formatDeltaValue(item.deltaFromPrevious)}
                  </span>
                  <span>
                    同位（{item.crossLabel}）：{formatDeltaValue(item.deltaFromCross)}
                  </span>
                </div>
                <em>{item.riskMessage}</em>
              </article>
            ))}
          </div>

          <div className={`trend-alert-panel trend-alert-${alertSummary.triggerLevel}`}>
            <div className="trend-alert-head">
              <div>
                <span className="trend-alert-kicker">自动预警面板</span>
                <strong>当前触发等级：{formatRiskLevelLabel(alertSummary.triggerLevel)}</strong>
                <p>
                  高风险 {alertSummary.highCount} 项 · 中风险 {alertSummary.mediumCount} 项 · 已处理{" "}
                  {alertSummary.dismissedCount} 项
                </p>
                <div className="trend-alert-policy-row">
                  {(
                    [
                      { key: "strict", label: "严格策略" },
                      { key: "balanced", label: "均衡策略" },
                      { key: "relaxed", label: "宽松策略" }
                    ] as Array<{ key: AlertPolicyMode; label: string }>
                  ).map((item) => (
                    <button
                      type="button"
                      key={`policy_${item.key}`}
                      className={`trend-alert-policy-chip ${
                        alertPolicyMode === item.key ? "active" : ""
                      }`}
                      onClick={() => setAlertPolicyMode(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <span
                className={`trend-alert-badge trend-alert-badge-${alertSummary.triggerLevel}`}
              >
                {alertSummary.triggerLevel === "high"
                  ? "立即干预"
                  : alertSummary.triggerLevel === "medium"
                    ? "关注观察"
                  : "运行稳定"}
              </span>
            </div>

            <div className="trend-alert-config-panel">
              <div className="trend-alert-config-head">
                <strong>预警参数面板</strong>
                <span>模板：{formatAlertConfigPresetLabel(riskConfigPreset)}</span>
              </div>
              <div className="trend-alert-config-presets">
                {(
                  [
                    { key: "intervene", label: "主动干预" },
                    { key: "balanced", label: "默认均衡" },
                    { key: "quiet", label: "降噪观察" }
                  ] as Array<{
                    key: Exclude<AlertConfigPreset, "custom">;
                    label: string;
                  }>
                ).map((item) => (
                  <button
                    type="button"
                    key={`risk_preset_${item.key}`}
                    className={`trend-alert-policy-chip ${
                      riskConfigPreset === item.key ? "active" : ""
                    }`}
                    onClick={() => applyRiskConfigPreset(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="trend-alert-config-grid">
                <label>
                  依赖高风险阈值：{riskConfig.dependencyHighThreshold}
                  <input
                    type="range"
                    min={35}
                    max={55}
                    step={1}
                    value={riskConfig.dependencyHighThreshold}
                    onChange={(event) => {
                      setRiskConfigPreset("custom");
                      setRiskConfig((prev) =>
                        normalizeDashboardRiskConfig({
                          ...prev,
                          dependencyHighThreshold: Number(event.target.value)
                        })
                      );
                    }}
                  />
                </label>
                <label>
                  独立率高风险阈值：{riskConfig.independentHighThreshold}
                  <input
                    type="range"
                    min={42}
                    max={60}
                    step={1}
                    value={riskConfig.independentHighThreshold}
                    onChange={(event) => {
                      setRiskConfigPreset("custom");
                      setRiskConfig((prev) =>
                        normalizeDashboardRiskConfig({
                          ...prev,
                          independentHighThreshold: Number(event.target.value)
                        })
                      );
                    }}
                  />
                </label>
                <label>
                  增益高风险阈值：{riskConfig.gainHighThreshold}
                  <input
                    type="range"
                    min={45}
                    max={62}
                    step={1}
                    value={riskConfig.gainHighThreshold}
                    onChange={(event) => {
                      setRiskConfigPreset("custom");
                      setRiskConfig((prev) =>
                        normalizeDashboardRiskConfig({
                          ...prev,
                          gainHighThreshold: Number(event.target.value)
                        })
                      );
                    }}
                  />
                </label>
                <label>
                  告警展示上限：{riskConfig.maxVisibleAlerts}
                  <input
                    type="range"
                    min={2}
                    max={8}
                    step={1}
                    value={riskConfig.maxVisibleAlerts}
                    onChange={(event) => {
                      setRiskConfigPreset("custom");
                      setRiskConfig((prev) =>
                        normalizeDashboardRiskConfig({
                          ...prev,
                          maxVisibleAlerts: Number(event.target.value)
                        })
                      );
                    }}
                  />
                </label>
                <label>
                  时间线条数：{riskConfig.historyLimit}
                  <input
                    type="range"
                    min={3}
                    max={12}
                    step={1}
                    value={riskConfig.historyLimit}
                    onChange={(event) => {
                      setRiskConfigPreset("custom");
                      setRiskConfig((prev) =>
                        normalizeDashboardRiskConfig({
                          ...prev,
                          historyLimit: Number(event.target.value)
                        })
                      );
                    }}
                  />
                </label>
              </div>
            </div>

            {alertSummary.dismissedCount > 0 ? (
              <div className="trend-alert-restore">
                <button
                  type="button"
                  className="trend-lock-btn"
                  onClick={() => setDismissedAlertKeys([])}
                >
                  恢复全部告警
                </button>
                {handledAlertHistory.length > 0 ? (
                  <button
                    type="button"
                    className="trend-lock-btn"
                    onClick={() => setHandledAlertHistory([])}
                  >
                    清空处置时间线
                  </button>
                ) : null}
              </div>
            ) : null}

            {alertSummary.items.length === 0 ? (
              <p className="trend-alert-empty">当前无中高风险告警，建议保持现有教学策略。</p>
            ) : (
              <div className="trend-alert-list">
                {alertSummary.items.map((item) => (
                  <article key={`alert_${item.id}`} className={`trend-alert-item ${item.level}`}>
                    <header>
                      <span>{item.title}</span>
                      <em>{formatRiskLevelLabel(item.level)}</em>
                    </header>
                    <p>{item.summary}</p>
                    <div className="trend-alert-action-row">
                      <strong>{item.action}</strong>
                      <button
                        type="button"
                        className="trend-lock-btn"
                        onClick={() => handleDismissAlert(item)}
                      >
                        标记已处理
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {alertSummary.items.length > 0 ? (
              <div className="trend-alert-dimension">
                <div className="trend-alert-dimension-grid">
                  <article className="trend-alert-dimension-card">
                    <header>
                      <strong>班级聚合</strong>
                      <span>按当前预警归因</span>
                    </header>
                    {alertDimensionOverview.classes.map((row) => (
                      <div key={`class_${row.key}`} className="trend-alert-dimension-row">
                        <span>{row.label}</span>
                        <em>
                          高 {row.high} · 中 {row.medium}
                        </em>
                      </div>
                    ))}
                  </article>
                  <article className="trend-alert-dimension-card">
                    <header>
                      <strong>章节聚合</strong>
                      <span>按知识域归因</span>
                    </header>
                    {alertDimensionOverview.chapters.map((row) => (
                      <div key={`chapter_${row.key}`} className="trend-alert-dimension-row">
                        <span>{row.label}</span>
                        <em>
                          高 {row.high} · 中 {row.medium}
                        </em>
                      </div>
                    ))}
                  </article>
                </div>
                <p className="trend-alert-dimension-footnote">
                  当前策略：{formatAlertPolicyLabel(alertPolicyMode)}（仅影响预警分级展示，不改变原始趋势值）
                </p>
              </div>
            ) : null}

            {handledAlertHistory.length > 0 ? (
              <div className="trend-alert-history">
                <div className="trend-alert-history-head">
                  <strong>
                    处置时间线（最近{" "}
                    {Math.min(riskConfig.historyLimit, handledAlertHistory.length)} 条）
                  </strong>
                </div>
                <div className="trend-alert-history-list">
                  {handledAlertHistory.slice(0, riskConfig.historyLimit).map((item) => (
                    <article
                      key={`handled_${item.alertKey}_${item.handledAt}`}
                      className={`trend-alert-history-item ${item.level}`}
                    >
                      <header>
                        <span>{item.title}</span>
                        <em>
                          {formatRiskLevelLabel(item.level)} · {getPeriodLabel(item.period)}
                        </em>
                      </header>
                      <p>{item.summary}</p>
                      <strong>{item.action}</strong>
                      <time>{formatDateTime(item.handledAt)}</time>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </article>

        <article className="panel half">
          <h3>风险提示</h3>
          <div className="card-list">
            <div className="card-item">
              <strong className="danger">高风险班级：高一 2 班</strong>
              <p>连续 3 天提示依赖率超过 50%，建议切换更细粒度任务。</p>
            </div>
            <div className="card-item">
              <strong>知识孤岛：函数单调性</strong>
              <p>图谱中该节点反链过低，建议增加跨章节关联训练。</p>
            </div>
          </div>
        </article>

        <article className="panel half">
          <h3>关系链风险榜</h3>
          <div className="dashboard-bridge-list">
            <div className="dashboard-bridge-filter">
              <label>
                域筛选
                <select
                  value={bridgeDomainFilter}
                  onChange={(event) => setBridgeDomainFilter(event.target.value)}
                >
                  <option value="all">全部域</option>
                  {bridgeDomainOptions.map((domain) => (
                    <option key={`bridge_domain_${domain}`} value={domain}>
                      {domain}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                排序
                <select
                  value={bridgeSortMode}
                  onChange={(event) => setBridgeSortMode(event.target.value as BridgeSortMode)}
                >
                  <option value="risk_desc">风险降序</option>
                  <option value="risk_asc">风险升序</option>
                  <option value="weight_desc">权重降序</option>
                </select>
              </label>
              <label>
                关系偏好
                <select
                  value={bridgeRelationMode}
                  onChange={(event) =>
                    setBridgeRelationMode(event.target.value as BridgeRelationMode)
                  }
                >
                  <option value="all">全部关系</option>
                  <option value="cross_priority">跨域优先</option>
                  <option value="same_priority">同域优先</option>
                </select>
              </label>
            </div>
            <button
              type="button"
              className="dashboard-bridge-refresh"
              onClick={() => void refreshBridgeRiskRows()}
            >
              刷新关系榜
            </button>
            <div className="dashboard-bridge-batch">
              <span>已选择 {selectedBridgeRows.length} 条</span>
              <button
                type="button"
                onClick={selectAllVisibleBridges}
                disabled={filteredBridgeRiskRows.length === 0}
              >
                全选当前
              </button>
              <button
                type="button"
                onClick={clearBridgeSelection}
                disabled={selectedBridgeRows.length === 0}
              >
                清空
              </button>
              <button
                type="button"
                onClick={pushSelectedBridgesToPath}
                disabled={selectedBridgeRows.length === 0}
              >
                批量推送路径
              </button>
              <button
                type="button"
                onClick={pushSelectedBridgesToWorkspace}
                disabled={selectedBridgeRows.length === 0}
              >
                批量推送工作区
              </button>
            </div>
            {bridgeBatchHint ? <p className="dashboard-bridge-batch-hint">{bridgeBatchHint}</p> : null}
            {filteredBridgeRiskRows.length > 0 ? (
              filteredBridgeRiskRows.map((row) => (
                <div
                  key={row.id}
                  className={`dashboard-bridge-item risk-${resolveActivityRiskTone(row.risk)}`}
                >
                  <label className="dashboard-bridge-select">
                    <input
                      type="checkbox"
                      checked={selectedBridgeIds.includes(row.id)}
                      onChange={() => toggleBridgeSelection(row.id)}
                    />
                    加入批量
                  </label>
                  <strong>
                    {row.sourceLabel} ↔ {row.targetLabel}
                  </strong>
                  <p>
                    域：{row.sourceDomain}
                    {row.sourceDomain === row.targetDomain
                      ? ""
                      : ` -> ${row.targetDomain}`}
                  </p>
                  <span>
                    风险 {Math.round(row.risk * 100)}% · 关系权重 {row.weight.toFixed(2)}
                  </span>
                  <span className="dashboard-bridge-relation-tag">
                    {isCrossDomainBridge(row) ? "跨域关系链" : "同域关系链"}
                  </span>
                  <div className="dashboard-bridge-tools">
                    <button type="button" onClick={() => jumpToGraphFromBridge(row)}>
                      联动图谱
                    </button>
                    <button type="button" onClick={() => jumpToPathFromBridge(row)}>
                      推送路径
                    </button>
                    <button type="button" onClick={() => jumpToWorkspaceFromBridge(row)}>
                      推送工作区
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="card-item">
                <strong>当前筛选下暂无关系链风险数据</strong>
                <p>可切换域筛选/排序，或点击“刷新关系榜”重新计算。</p>
              </div>
            )}
          </div>
        </article>

        <article className="panel half">
          <h3>系统状态</h3>
          <ul>
            <li>ModelScope API：正常</li>
            <li>本地 Vault 索引：可用</li>
            <li>路径引擎：规则版</li>
            <li>图谱更新：实时写入 + 闭环事件回流</li>
          </ul>
        </article>

        <article className="panel half">
          <h3>生态闭环事件</h3>
          <div className="card-list">
            <div className="card-item">
              <strong>最近事件总数：{graphActivitySummary.total}</strong>
              <p>
                路径反馈 {graphActivitySummary.pathFeedbackCount} · 工作区推进{" "}
                {graphActivitySummary.workspaceCount}
              </p>
              <p>当前筛选后：{graphActivitySummary.displayedCount} 条</p>
            </div>
            <div className="dashboard-activity-filter">
              <label>
                来源
                <select
                  value={activitySourceFilter}
                  onChange={(event) =>
                    setActivitySourceFilter(event.target.value as ActivitySourceFilter)
                  }
                >
                  <option value="all">全部</option>
                  <option value="path_feedback">路径反馈</option>
                  <option value="workspace">工作区推进</option>
                </select>
              </label>
              <label>
                节点
                <select
                  value={activityNodeFilter}
                  onChange={(event) => setActivityNodeFilter(event.target.value)}
                >
                  <option value="all">全部节点</option>
                  {graphActivityNodeOptions.map((nodeLabel) => (
                    <option key={`node_filter_${nodeLabel}`} value={nodeLabel}>
                      {nodeLabel}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                排序
                <select
                  value={activitySortMode}
                  onChange={(event) =>
                    setActivitySortMode(event.target.value as ActivitySortMode)
                  }
                >
                  <option value="latest">按时间</option>
                  <option value="risk_desc">按风险降序</option>
                  <option value="risk_asc">按风险升序</option>
                </select>
              </label>
            </div>
            {filteredGraphActivityEvents.length > 0 ? (
              <div
                className={`card-item dashboard-activity-item dashboard-activity-feature risk-${resolveActivityRiskTone(
                  resolveGraphActivityRiskScore(filteredGraphActivityEvents[0]!)
                )}${selectedActivityId === filteredGraphActivityEvents[0]?.id ? " active" : ""}`}
              >
                <strong>
                  最新事件：
                  {filteredGraphActivityEvents[0]?.source === "path_feedback"
                    ? "路径回写"
                    : "工作区推进"}
                </strong>
                <span className="dashboard-activity-risk">
                  风险{" "}
                  {Math.round(
                    resolveGraphActivityRiskScore(filteredGraphActivityEvents[0]!) * 100
                  )}
                  %
                </span>
                <p>
                  节点：{filteredGraphActivityEvents[0]?.nodeLabel} ·{" "}
                  {formatDateTime(filteredGraphActivityEvents[0]?.at ?? "")}
                </p>
                <p>{filteredGraphActivityEvents[0]?.detail}</p>
                <div className="dashboard-activity-tools">
                  <button
                    type="button"
                    onClick={() => jumpToGraphFromActivity(filteredGraphActivityEvents[0]!)}
                  >
                    联动图谱时间轴
                  </button>
                  <button
                    type="button"
                    onClick={() => jumpToPathFromActivity(filteredGraphActivityEvents[0]!)}
                  >
                    跳转路径页
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      jumpToWorkspaceFromActivity(filteredGraphActivityEvents[0]!)
                    }
                  >
                    跳转工作区
                  </button>
                </div>
              </div>
            ) : (
              <div className="card-item">
                <strong>当前筛选下暂无事件</strong>
                <p>可切换来源/节点筛选，或先在路径页与工作区触发闭环行为。</p>
              </div>
            )}
            {filteredGraphActivityEvents.length > 1 ? (
              <div className="dashboard-activity-list">
                {filteredGraphActivityEvents.slice(1, 6).map((item) => (
                  <div
                    className={`dashboard-activity-item risk-${resolveActivityRiskTone(
                      resolveGraphActivityRiskScore(item)
                    )}${
                      selectedActivityId === item.id ? " active" : ""
                    }`}
                    key={item.id}
                  >
                    <strong>
                      {item.source === "path_feedback" ? "路径回写" : "工作区推进"} · {item.nodeLabel}
                    </strong>
                    <span className="dashboard-activity-risk">
                      风险 {Math.round(resolveGraphActivityRiskScore(item) * 100)}%
                    </span>
                    <p>{item.detail}</p>
                    <span>
                      {formatDateTime(item.at)} · 风险 {Math.round(resolveGraphActivityRiskScore(item) * 100)}%
                    </span>
                    <div className="dashboard-activity-tools">
                      <button type="button" onClick={() => jumpToGraphFromActivity(item)}>
                        联动图谱
                      </button>
                      <button type="button" onClick={() => jumpToPathFromActivity(item)}>
                        路径
                      </button>
                      <button type="button" onClick={() => jumpToWorkspaceFromActivity(item)}>
                        工作区
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </article>

        <article className="panel half">
          <h3>关键比例环图</h3>
          <div className="ring-grid">
            {currentMetrics.rings.map((item) => (
              <RatioRing
                key={`${period}_${item.label}`}
                label={item.label}
                value={item.value}
                hint={item.hint}
              />
            ))}
          </div>
        </article>

        <article className="panel wide">
          <h3>运营动作建议</h3>
          <div className="spotlight-list">
            <div className="galaxy-spotlight">
              <div>
                <strong>针对高依赖人群启用“低层提示优先”策略</strong>
                <p>先收紧 Level 3/4 触发门槛，要求提交中间思路与自检结果后再开放更高层提示。</p>
              </div>
              <span className="galaxy-status">策略建议</span>
            </div>
            <div className="galaxy-spotlight">
              <div>
                <strong>对知识孤岛节点建立跨章节任务桥接</strong>
                <p>把“函数单调性”与“数列递推”做路径联动，提升关系密度并增强迁移能力。</p>
              </div>
              <span className="galaxy-status">图谱建议</span>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

type AlertPolicyMode = "strict" | "balanced" | "relaxed";
type AlertConfigPreset = "intervene" | "balanced" | "quiet" | "custom";

type DashboardRiskConfig = {
  dependencyHighThreshold: number;
  independentHighThreshold: number;
  gainHighThreshold: number;
  maxVisibleAlerts: number;
  historyLimit: number;
  dimensionLimit: number;
};

type ReplaySpeedKey = "1x" | "1.5x" | "2x";
type ReplayPanelPreset = "quick" | "balanced" | "deep" | "custom";

type ReplayPanelConfig = {
  maxBookmarks: number;
  defaultSpeed: ReplaySpeedKey;
  autoExportSummary: boolean;
};

type ChapterSubgraphMode = "highlight" | "focus";
type ChapterTrendSpan = 7 | 14;
type ChapterPanelPreset = "insight" | "balanced" | "light" | "custom";

type ChapterPanelConfig = {
  topNodesLimit: number;
  trendRowsLimit: number;
  defaultSubgraphMode: ChapterSubgraphMode;
  defaultTrendSpan: ChapterTrendSpan;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export const DEFAULT_DASHBOARD_RISK_CONFIG: DashboardRiskConfig = {
  dependencyHighThreshold: 45,
  independentHighThreshold: 50,
  gainHighThreshold: 55,
  maxVisibleAlerts: 4,
  historyLimit: 6,
  dimensionLimit: 4
};

export const DASHBOARD_RISK_PRESETS: Record<
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

export const DEFAULT_REPLAY_PANEL_CONFIG: ReplayPanelConfig = {
  maxBookmarks: 16,
  defaultSpeed: "1x",
  autoExportSummary: true
};

export const REPLAY_PANEL_PRESETS: Record<
  Exclude<ReplayPanelPreset, "custom">,
  ReplayPanelConfig
> = {
  quick: {
    maxBookmarks: 10,
    defaultSpeed: "2x",
    autoExportSummary: false
  },
  balanced: DEFAULT_REPLAY_PANEL_CONFIG,
  deep: {
    maxBookmarks: 24,
    defaultSpeed: "1x",
    autoExportSummary: true
  }
};

export const DEFAULT_CHAPTER_PANEL_CONFIG: ChapterPanelConfig = {
  topNodesLimit: 4,
  trendRowsLimit: 5,
  defaultSubgraphMode: "highlight",
  defaultTrendSpan: 7
};

export const CHAPTER_PANEL_PRESETS: Record<
  Exclude<ChapterPanelPreset, "custom">,
  ChapterPanelConfig
> = {
  insight: {
    topNodesLimit: 6,
    trendRowsLimit: 6,
    defaultSubgraphMode: "focus",
    defaultTrendSpan: 14
  },
  balanced: DEFAULT_CHAPTER_PANEL_CONFIG,
  light: {
    topNodesLimit: 3,
    trendRowsLimit: 4,
    defaultSubgraphMode: "highlight",
    defaultTrendSpan: 7
  }
};

export function normalizeAlertPolicyMode(value: string): AlertPolicyMode {
  if (value === "strict" || value === "relaxed") {
    return value;
  }
  return "balanced";
}

export function normalizeAlertConfigPreset(value: string): AlertConfigPreset {
  if (value === "intervene" || value === "quiet" || value === "custom") {
    return value;
  }
  return "balanced";
}

export function normalizeDashboardRiskConfig(
  value?: Partial<DashboardRiskConfig>
): DashboardRiskConfig {
  const merged = { ...DEFAULT_DASHBOARD_RISK_CONFIG, ...(value ?? {}) };
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

export function normalizeReplayPanelPreset(value: string): ReplayPanelPreset {
  if (value === "quick" || value === "deep" || value === "custom") {
    return value;
  }
  return "balanced";
}

export function normalizeReplayPanelConfig(
  value?: Partial<ReplayPanelConfig>
): ReplayPanelConfig {
  const merged = { ...DEFAULT_REPLAY_PANEL_CONFIG, ...(value ?? {}) };
  const defaultSpeed =
    merged.defaultSpeed === "1x" || merged.defaultSpeed === "1.5x" || merged.defaultSpeed === "2x"
      ? merged.defaultSpeed
      : DEFAULT_REPLAY_PANEL_CONFIG.defaultSpeed;
  return {
    maxBookmarks: clamp(Number(merged.maxBookmarks) || DEFAULT_REPLAY_PANEL_CONFIG.maxBookmarks, 8, 24),
    defaultSpeed,
    autoExportSummary: Boolean(merged.autoExportSummary)
  };
}

export function normalizeChapterPanelPreset(value: string): ChapterPanelPreset {
  if (value === "insight" || value === "light" || value === "custom") {
    return value;
  }
  return "balanced";
}

export function normalizeChapterPanelConfig(
  value?: Partial<ChapterPanelConfig>
): ChapterPanelConfig {
  const merged = { ...DEFAULT_CHAPTER_PANEL_CONFIG, ...(value ?? {}) };
  return {
    topNodesLimit: clamp(Number(merged.topNodesLimit) || DEFAULT_CHAPTER_PANEL_CONFIG.topNodesLimit, 2, 8),
    trendRowsLimit: clamp(Number(merged.trendRowsLimit) || DEFAULT_CHAPTER_PANEL_CONFIG.trendRowsLimit, 3, 8),
    defaultSubgraphMode: merged.defaultSubgraphMode === "focus" ? "focus" : "highlight",
    defaultTrendSpan: merged.defaultTrendSpan === 14 ? 14 : 7
  };
}

import type { AestheticMode } from "@/lib/client/config-schema";
import type { ProfileImportMode } from "@/lib/client/profile-import";
import type {
  ImportRollbackImpact,
  ImportRollbackProfileChange
} from "@/lib/client/settings-import-rollback";

export type AlertPolicyMode = "strict" | "balanced" | "relaxed";
export type AlertConfigPreset = "intervene" | "balanced" | "quiet" | "custom";

export type DashboardRiskConfig = {
  dependencyHighThreshold: number;
  independentHighThreshold: number;
  gainHighThreshold: number;
  maxVisibleAlerts: number;
  historyLimit: number;
  dimensionLimit: number;
};

export type ReplaySpeedKey = "1x" | "1.5x" | "2x";
export type ReplayPanelPreset = "quick" | "balanced" | "deep" | "custom";

export type ReplayPanelConfig = {
  maxBookmarks: number;
  defaultSpeed: ReplaySpeedKey;
  autoExportSummary: boolean;
};

export type ChapterSubgraphMode = "highlight" | "focus";
export type ChapterTrendSpan = 7 | 14;
export type ChapterPanelPreset = "insight" | "balanced" | "light" | "custom";

export type ChapterPanelConfig = {
  topNodesLimit: number;
  trendRowsLimit: number;
  defaultSubgraphMode: ChapterSubgraphMode;
  defaultTrendSpan: ChapterTrendSpan;
};

export type ConfigBundleMeta = {
  profileId: string;
  profileLabel: string;
  storageEngine: "localStorage";
  aestheticMode: AestheticMode;
};

export type ConfigBundle = {
  version: number;
  updatedAt: string;
  meta: ConfigBundleMeta;
  dashboard: {
    alertPolicy: AlertPolicyMode;
    riskPreset: AlertConfigPreset;
    riskConfig: DashboardRiskConfig;
  };
  workspace: {
    replayPreset: ReplayPanelPreset;
    replayConfig: ReplayPanelConfig;
  };
  kb: {
    chapterPreset: ChapterPanelPreset;
    chapterConfig: ChapterPanelConfig;
  };
};

export type ConfigHistoryItem = {
  id: string;
  at: string;
  reason: string;
  summary: string;
  bundle: ConfigBundle;
};

export type ConfigTemplatePack = {
  key: string;
  label: string;
  description: string;
  bundle: ConfigBundle;
};

export type ConfigLoadResult = {
  bundle: ConfigBundle;
  migratedFrom: number | null;
  migrationPath: string[];
};

export type ConfigHistoryLoadResult = {
  history: ConfigHistoryItem[];
  migratedCount: number;
};

export type ConfigProfileItem = {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  bundle: ConfigBundle;
};

export type ConfigProfileStore = {
  version: number;
  activeProfileId: string;
  profiles: ConfigProfileItem[];
};

export type ImportConflictActionFilter = "all" | "append" | "overwrite";

export type ImportAuditItem = {
  id: string;
  at: string;
  sourceLabel: "单画像" | "画像仓库";
  importMode: ProfileImportMode;
  summary: string;
  appendedCount: number;
  overwriteCount: number;
  effectiveImportCount: number;
  truncatedCount: number;
  duplicateEntryCount: number;
  overwriteShadowCount: number;
  snapshot: {
    profileStore: ConfigProfileStore;
    activeBundle: ConfigBundle;
  };
};

export type ImportAuditRollbackPreview = {
  impact: ImportRollbackImpact;
  changes: ImportRollbackProfileChange[];
  snapshotStore: ConfigProfileStore;
  snapshotBundle: ConfigBundle;
};

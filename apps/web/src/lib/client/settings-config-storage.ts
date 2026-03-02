type ConfigLoadResult<TBundle> = {
  bundle: TBundle;
  migratedFrom: number | null;
  migrationPath: string[];
};

type ConfigHistoryLoadResult<THistoryItem> = {
  history: THistoryItem[];
  migratedCount: number;
};

type LegacyStorageReadInput<TBundle> = {
  normalizeAlertPolicyMode: (value: string) => string;
  normalizeAlertConfigPreset: (value: string) => string;
  normalizeDashboardRiskConfig: (value?: unknown) => unknown;
  normalizeReplayPanelPreset: (value: string) => string;
  normalizeReplayPanelConfig: (value?: unknown) => unknown;
  normalizeChapterPanelPreset: (value: string) => string;
  normalizeChapterPanelConfig: (value?: unknown) => unknown;
  normalizeBundleWithMigration: (input: unknown) => ConfigLoadResult<TBundle>;
  buildDefaultBundle: () => TBundle;
};

export const LEGACY_CONFIG_STORAGE_KEYS = [
  "edunexus_dashboard_alert_policy",
  "edunexus_dashboard_risk_preset",
  "edunexus_dashboard_risk_config",
  "edunexus_workspace_replay_panel_preset",
  "edunexus_workspace_replay_panel_config",
  "edunexus_kb_chapter_panel_preset",
  "edunexus_kb_chapter_panel_config"
] as const;

export function hasLegacyConfigInStorage(readItem: (key: string) => string | null) {
  return LEGACY_CONFIG_STORAGE_KEYS.some((key) => readItem(key) !== null);
}

export function buildBundleFromLegacyStorage<TBundle>(
  readItem: (key: string) => string | null,
  input: LegacyStorageReadInput<TBundle>
): ConfigLoadResult<TBundle> {
  try {
    const dashboardPolicy = input.normalizeAlertPolicyMode(
      readItem("edunexus_dashboard_alert_policy") ?? "balanced"
    );
    const dashboardPreset = input.normalizeAlertConfigPreset(
      readItem("edunexus_dashboard_risk_preset") ?? "balanced"
    );
    const dashboardRiskConfig = input.normalizeDashboardRiskConfig(
      JSON.parse(readItem("edunexus_dashboard_risk_config") ?? "{}")
    );
    const workspacePreset = input.normalizeReplayPanelPreset(
      readItem("edunexus_workspace_replay_panel_preset") ?? "balanced"
    );
    const workspaceReplayConfig = input.normalizeReplayPanelConfig(
      JSON.parse(readItem("edunexus_workspace_replay_panel_config") ?? "{}")
    );
    const kbPreset = input.normalizeChapterPanelPreset(
      readItem("edunexus_kb_chapter_panel_preset") ?? "balanced"
    );
    const kbChapterConfig = input.normalizeChapterPanelConfig(
      JSON.parse(readItem("edunexus_kb_chapter_panel_config") ?? "{}")
    );

    return input.normalizeBundleWithMigration({
      version: 1,
      dashboard: {
        alertPolicy: dashboardPolicy,
        riskPreset: dashboardPreset,
        riskConfig: dashboardRiskConfig
      },
      workspace: {
        replayPreset: workspacePreset,
        replayConfig: workspaceReplayConfig
      },
      kb: {
        chapterPreset: kbPreset,
        chapterConfig: kbChapterConfig
      }
    });
  } catch {
    return {
      bundle: input.buildDefaultBundle(),
      migratedFrom: null,
      migrationPath: []
    };
  }
}

type BuildBundleFromStorageInput<TBundle> = {
  bundleStorageKey: string;
  normalizeBundleWithMigration: (input: unknown) => ConfigLoadResult<TBundle>;
  buildDefaultBundle: () => TBundle;
  hasLegacyConfigInStorage: () => boolean;
  buildBundleFromLegacyStorage: () => ConfigLoadResult<TBundle>;
};

export function buildBundleFromStorage<TBundle>(
  readItem: (key: string) => string | null,
  input: BuildBundleFromStorageInput<TBundle>
): ConfigLoadResult<TBundle> {
  try {
    const raw = readItem(input.bundleStorageKey);
    if (raw) {
      return input.normalizeBundleWithMigration(JSON.parse(raw) as unknown);
    }
  } catch {
    // ignore parse error and fallback to legacy keys
  }
  if (!input.hasLegacyConfigInStorage()) {
    return {
      bundle: input.buildDefaultBundle(),
      migratedFrom: null,
      migrationPath: []
    };
  }
  return input.buildBundleFromLegacyStorage();
}

type BuildHistoryFromStorageInput<TBundle, THistoryItem extends { bundle: TBundle }> = {
  historyStorageKey: string;
  historyLimit: number;
  normalizeBundleWithMigration: (input: unknown) => ConfigLoadResult<TBundle>;
  isHistoryItem: (input: unknown) => input is THistoryItem;
  mapHistoryItem: (source: THistoryItem, bundle: TBundle) => THistoryItem;
};

export function buildHistoryFromStorage<
  TBundle,
  THistoryItem extends { bundle: TBundle }
>(
  readItem: (key: string) => string | null,
  input: BuildHistoryFromStorageInput<TBundle, THistoryItem>
): ConfigHistoryLoadResult<THistoryItem> {
  try {
    const raw = readItem(input.historyStorageKey);
    if (!raw) {
      return { history: [], migratedCount: 0 };
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return { history: [], migratedCount: 0 };
    }

    return parsed
      .filter((item): item is THistoryItem => input.isHistoryItem(item))
      .slice(0, input.historyLimit)
      .reduce<ConfigHistoryLoadResult<THistoryItem>>(
        (acc, item) => {
          const normalized = input.normalizeBundleWithMigration(item.bundle);
          if (normalized.migratedFrom !== null) {
            acc.migratedCount += 1;
          }
          acc.history.push(input.mapHistoryItem(item, normalized.bundle));
          return acc;
        },
        { history: [], migratedCount: 0 }
      );
  } catch {
    return { history: [], migratedCount: 0 };
  }
}

type BundleStorageShape = {
  dashboard: {
    alertPolicy: string;
    riskPreset: string;
    riskConfig: unknown;
  };
  workspace: {
    replayPreset: string;
    replayConfig: unknown;
  };
  kb: {
    chapterPreset: string;
    chapterConfig: unknown;
  };
};

export function writeBundleToStorage<TBundle extends BundleStorageShape>(
  writeItem: (key: string, value: string) => void,
  bundleStorageKey: string,
  bundle: TBundle
) {
  writeItem("edunexus_dashboard_alert_policy", bundle.dashboard.alertPolicy);
  writeItem("edunexus_dashboard_risk_preset", bundle.dashboard.riskPreset);
  writeItem("edunexus_dashboard_risk_config", JSON.stringify(bundle.dashboard.riskConfig));
  writeItem("edunexus_workspace_replay_panel_preset", bundle.workspace.replayPreset);
  writeItem(
    "edunexus_workspace_replay_panel_config",
    JSON.stringify(bundle.workspace.replayConfig)
  );
  writeItem("edunexus_kb_chapter_panel_preset", bundle.kb.chapterPreset);
  writeItem("edunexus_kb_chapter_panel_config", JSON.stringify(bundle.kb.chapterConfig));
  writeItem(bundleStorageKey, JSON.stringify(bundle));
}

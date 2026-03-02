import type {
  ConfigBundle,
  ConfigHistoryItem,
  ConfigHistoryLoadResult,
  ConfigLoadResult,
  DashboardRiskConfig,
  ReplayPanelConfig,
  ChapterPanelConfig
} from "@/lib/client/settings-config-types";
import {
  buildBundleFromLegacyStorage as buildBundleFromLegacyStorageUtil,
  buildBundleFromStorage as buildBundleFromStorageUtil,
  buildHistoryFromStorage as buildHistoryFromStorageUtil,
  hasLegacyConfigInStorage as hasLegacyConfigInStorageUtil,
  writeBundleToStorage as writeBundleToStorageUtil
} from "@/lib/client/settings-config-storage";

type CreateSettingsPageStorageHelpersInput = {
  historyLimit: number;
  historyStorageKey: string;
  bundleStorageKey: string;
  normalizeAlertPolicyMode: (value: string) => string;
  normalizeAlertConfigPreset: (value: string) => string;
  normalizeDashboardRiskConfig: (value: unknown) => DashboardRiskConfig;
  normalizeReplayPanelPreset: (value: string) => string;
  normalizeReplayPanelConfig: (value: unknown) => ReplayPanelConfig;
  normalizeChapterPanelPreset: (value: string) => string;
  normalizeChapterPanelConfig: (value: unknown) => ChapterPanelConfig;
  normalizeBundleWithMigration: (input: unknown) => ConfigLoadResult;
  buildDefaultBundle: () => ConfigBundle;
};

function isConfigHistoryItem(input: unknown): input is ConfigHistoryItem {
  if (!input || typeof input !== "object") {
    return false;
  }
  const item = input as {
    id?: unknown;
    at?: unknown;
    reason?: unknown;
    summary?: unknown;
    bundle?: unknown;
  };
  return (
    typeof item.id === "string" &&
    typeof item.at === "string" &&
    typeof item.reason === "string" &&
    typeof item.summary === "string" &&
    !!item.bundle &&
    typeof item.bundle === "object"
  );
}

export function createSettingsPageStorageHelpers(
  input: CreateSettingsPageStorageHelpersInput
) {
  const hasLegacyConfigInStorage = (readItem: (key: string) => string | null) =>
    hasLegacyConfigInStorageUtil(readItem);

  const buildBundleFromLegacyStorage = (
    readItem: (key: string) => string | null
  ): ConfigLoadResult =>
    buildBundleFromLegacyStorageUtil(readItem, {
      normalizeAlertPolicyMode: input.normalizeAlertPolicyMode,
      normalizeAlertConfigPreset: input.normalizeAlertConfigPreset,
      normalizeDashboardRiskConfig: input.normalizeDashboardRiskConfig,
      normalizeReplayPanelPreset: input.normalizeReplayPanelPreset,
      normalizeReplayPanelConfig: input.normalizeReplayPanelConfig,
      normalizeChapterPanelPreset: input.normalizeChapterPanelPreset,
      normalizeChapterPanelConfig: input.normalizeChapterPanelConfig,
      normalizeBundleWithMigration: input.normalizeBundleWithMigration,
      buildDefaultBundle: input.buildDefaultBundle
    });

  const buildBundleFromStorage = (
    readItem: (key: string) => string | null
  ): ConfigLoadResult =>
    buildBundleFromStorageUtil(readItem, {
      bundleStorageKey: input.bundleStorageKey,
      normalizeBundleWithMigration: input.normalizeBundleWithMigration,
      buildDefaultBundle: input.buildDefaultBundle,
      hasLegacyConfigInStorage: () => hasLegacyConfigInStorage(readItem),
      buildBundleFromLegacyStorage: () => buildBundleFromLegacyStorage(readItem)
    });

  const buildHistoryFromStorage = (
    readItem: (key: string) => string | null
  ): ConfigHistoryLoadResult =>
    buildHistoryFromStorageUtil(readItem, {
      historyStorageKey: input.historyStorageKey,
      historyLimit: input.historyLimit,
      normalizeBundleWithMigration: input.normalizeBundleWithMigration,
      isHistoryItem: isConfigHistoryItem,
      mapHistoryItem: (source, bundle) => ({
        id: source.id,
        at: source.at,
        reason: source.reason,
        summary: source.summary,
        bundle
      })
    });

  const writeBundleToStorage = (
    writeItem: (key: string, value: string) => void,
    bundle: ConfigBundle
  ) => writeBundleToStorageUtil(writeItem, input.bundleStorageKey, bundle);

  return {
    buildBundleFromStorage,
    buildHistoryFromStorage,
    writeBundleToStorage
  };
}

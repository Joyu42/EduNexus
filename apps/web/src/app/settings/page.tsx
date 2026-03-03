"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { GalaxyHero } from "@/components/galaxy-ui";
import { PageHeader } from "@/components/page-header";
import { ImportAuditLogPanel } from "@/components/settings/import-audit-log-panel";
import { ImportExecutionConfirmModal } from "@/components/settings/import-execution-confirm-modal";
import { JsonImportPanel } from "@/components/settings/json-import-panel";
import { ImportRollbackConfirmModal } from "@/components/settings/import-rollback-confirm-modal";
import { StatusMessageBox } from "@/components/settings/status-message-box";
import {
  useImportAuditFilters
} from "@/components/settings/use-import-audit-filters";
import { useImportAuditActions } from "@/components/settings/use-import-audit-actions";
import { useImportAuditJsonImport } from "@/components/settings/use-import-audit-json-import";
import { useJsonProfileImport } from "@/components/settings/use-json-profile-import";
import { useProfileCatalogActions } from "@/components/settings/use-profile-catalog-actions";
import { useApplyImportedProfiles } from "@/components/settings/use-apply-imported-profiles";
import { useConfigBundleActions } from "@/components/settings/use-config-bundle-actions";
import { useConfigHistoryActions } from "@/components/settings/use-config-history-actions";
import { useImportAuditRollback } from "@/components/settings/use-import-audit-rollback";
import { useProfileDeleteRestoreActions } from "@/components/settings/use-profile-delete-restore-actions";
import { useStatusMessage } from "@/components/settings/use-status-message";
import {
  CONFIG_SCHEMA_VERSION,
  DEFAULT_CONFIG_META,
  normalizeAestheticMode,
  runBundleMigrations,
  type AestheticMode
} from "@/lib/client/config-schema";
import {
  createUniqueProfileId,
  type ProfileImportMode
} from "@/lib/client/profile-import";
import {
  buildJsonImportActionState,
  buildJsonImportPreview,
  type JsonImportPreview
} from "@/lib/client/settings-import-state";
import {
  buildImportAuditExportPayload,
  normalizeImportAuditPayload
} from "@/lib/client/settings-import-audit";
import {
  CHAPTER_PANEL_PRESETS,
  DASHBOARD_RISK_PRESETS,
  DEFAULT_CHAPTER_PANEL_CONFIG,
  DEFAULT_DASHBOARD_RISK_CONFIG,
  DEFAULT_REPLAY_PANEL_CONFIG,
  REPLAY_PANEL_PRESETS,
  normalizeAlertConfigPreset,
  normalizeAlertPolicyMode,
  normalizeChapterPanelConfig,
  normalizeChapterPanelPreset,
  normalizeDashboardRiskConfig,
  normalizeReplayPanelConfig,
  normalizeReplayPanelPreset
} from "@/lib/client/settings-config-normalizers";
import type {
  AlertConfigPreset,
  AlertPolicyMode,
  ChapterPanelConfig,
  ChapterPanelPreset,
  ChapterSubgraphMode,
  ConfigBundle,
  ConfigBundleMeta,
  ConfigHistoryItem,
  ConfigProfileItem,
  ConfigProfileStore,
  ConfigTemplatePack,
  DashboardRiskConfig,
  ImportAuditItem,
  ImportAuditRollbackPreview,
  ImportConflictActionFilter,
  ReplayPanelConfig,
  ReplayPanelPreset,
  ReplaySpeedKey
} from "@/lib/client/settings-config-types";
import { createConfigBundleHelpers } from "@/lib/client/settings-config-bundle-helpers";
import {
  normalizeImportAuditEntries as normalizeImportAuditStorageEntries,
  readImportAuditFromStorage as readImportAuditStorage
} from "@/lib/client/settings-import-audit-storage";
import { createProfileStoreHelpers } from "@/lib/client/settings-profile-store";
import {
  buildBundleDiffRows,
  cloneJsonValue,
  downloadCsv,
  downloadJson,
  formatAestheticModeLabel,
  formatDuplicateStrategyLabel,
  formatImportActionLabel,
  formatModuleLabel,
  formatTime,
  syncThemeWithAesthetic,
  type ConfigModuleKey
} from "@/lib/client/settings-page-utils";
import { buildConfigTemplatePacks } from "@/lib/client/settings-config-template-packs";
import { createSettingsPageStorageHelpers } from "@/lib/client/settings-page-storage-helpers";
import { createImportAuditRollbackPreviewBuilder } from "@/lib/client/settings-import-audit-rollback-preview";
import {
  buildImportRollbackChangesCsv,
  filterImportRollbackChanges,
  type ImportRollbackChangeFilter,
  type ImportRollbackImpact,
  type ImportRollbackProfileChange
} from "@/lib/client/settings-import-rollback";

const CONFIG_HISTORY_LIMIT = 20;
const CONFIG_HISTORY_STORAGE_KEY = "edunexus_config_history";
const CONFIG_BUNDLE_STORAGE_KEY = "edunexus_config_bundle";
const CONFIG_PROFILE_STORE_STORAGE_KEY = "edunexus_config_profiles";
const CONFIG_PROFILE_STORE_VERSION = 1;
const CONFIG_PROFILE_LIMIT = 12;
const IMPORT_AUDIT_STORAGE_KEY = "edunexus_config_import_audit";
const IMPORT_AUDIT_LIMIT = 12;
const {
  normalizeConfigBundleMeta,
  buildDefaultBundle,
  normalizeBundleWithMigration,
  normalizeBundle,
  buildBundleSummary,
  createTemplateBundle
} = createConfigBundleHelpers<
  AestheticMode,
  ConfigBundleMeta,
  AlertPolicyMode,
  AlertConfigPreset,
  Exclude<AlertConfigPreset, "custom">,
  DashboardRiskConfig,
  ReplayPanelPreset,
  Exclude<ReplayPanelPreset, "custom">,
  ReplayPanelConfig,
  ChapterPanelPreset,
  Exclude<ChapterPanelPreset, "custom">,
  ChapterPanelConfig
>({
  configSchemaVersion: CONFIG_SCHEMA_VERSION,
  defaultMeta: DEFAULT_CONFIG_META,
  defaultAlertPolicy: "balanced",
  defaultDashboardPreset: "balanced",
  defaultDashboardRiskConfig: DEFAULT_DASHBOARD_RISK_CONFIG,
  defaultWorkspacePreset: "balanced",
  defaultWorkspaceConfig: DEFAULT_REPLAY_PANEL_CONFIG,
  defaultKbPreset: "balanced",
  defaultKbConfig: DEFAULT_CHAPTER_PANEL_CONFIG,
  dashboardRiskPresets: DASHBOARD_RISK_PRESETS,
  workspacePresets: REPLAY_PANEL_PRESETS,
  kbPresets: CHAPTER_PANEL_PRESETS,
  normalizeAestheticMode,
  runBundleMigrations,
  normalizeAlertPolicyMode,
  normalizeAlertConfigPreset,
  normalizeDashboardRiskConfig: (value) =>
    normalizeDashboardRiskConfig(value as Partial<DashboardRiskConfig>),
  normalizeReplayPanelPreset,
  normalizeReplayPanelConfig: (value) =>
    normalizeReplayPanelConfig(value as Partial<ReplayPanelConfig>),
  normalizeChapterPanelPreset,
  normalizeChapterPanelConfig: (value) =>
    normalizeChapterPanelConfig(value as Partial<ChapterPanelConfig>)
});

const CONFIG_TEMPLATE_PACKS: ConfigTemplatePack[] =
  buildConfigTemplatePacks(createTemplateBundle);

const readStorageItem = (key: string) => window.localStorage.getItem(key);
const writeStorageItem = (key: string, value: string) =>
  window.localStorage.setItem(key, value);

const {
  buildBundleFromStorage: buildBundleFromStorageForPage,
  buildHistoryFromStorage: buildHistoryFromStorageForPage,
  writeBundleToStorage: writeBundleToStorageForPage
} = createSettingsPageStorageHelpers({
  historyLimit: CONFIG_HISTORY_LIMIT,
  historyStorageKey: CONFIG_HISTORY_STORAGE_KEY,
  bundleStorageKey: CONFIG_BUNDLE_STORAGE_KEY,
  normalizeAlertPolicyMode,
  normalizeAlertConfigPreset,
  normalizeDashboardRiskConfig: (value) =>
    normalizeDashboardRiskConfig(value as Partial<DashboardRiskConfig>),
  normalizeReplayPanelPreset,
  normalizeReplayPanelConfig: (value) =>
    normalizeReplayPanelConfig(value as Partial<ReplayPanelConfig>),
  normalizeChapterPanelPreset,
  normalizeChapterPanelConfig: (value) =>
    normalizeChapterPanelConfig(value as Partial<ChapterPanelConfig>),
  normalizeBundleWithMigration,
  buildDefaultBundle
});

const {
  buildProfileBundle,
  buildDefaultProfileStore,
  normalizeProfileStorePayload,
  buildProfileStoreFromStorage,
  writeProfileStoreToStorage
} = createProfileStoreHelpers<
  ConfigBundle,
  ConfigProfileItem,
  ConfigProfileStore,
  AestheticMode
>({
  configSchemaVersion: CONFIG_SCHEMA_VERSION,
  profileStoreVersion: CONFIG_PROFILE_STORE_VERSION,
  profileLimit: CONFIG_PROFILE_LIMIT,
  profileStoreStorageKey: CONFIG_PROFILE_STORE_STORAGE_KEY,
  createUniqueProfileId,
  normalizeAestheticMode,
  normalizeBundle,
  normalizeConfigBundleMeta,
  buildDefaultBundle
});

const buildImportAuditRollbackPreview = createImportAuditRollbackPreviewBuilder({
  normalizeProfileStorePayload: (payload, fallbackBundle) =>
    normalizeProfileStorePayload(
      payload as { activeProfileId?: unknown; profiles?: unknown },
      fallbackBundle
    ),
  normalizeBundle
});

type SettingsViewMode = "basic" | "advanced" | "import";

export default function SettingsPage() {
  const [settingsViewMode, setSettingsViewMode] =
    useState<SettingsViewMode>("basic");
  const [bundle, setBundle] = useState<ConfigBundle>(buildDefaultBundle());
  const [configHistory, setConfigHistory] = useState<ConfigHistoryItem[]>([]);
  const [importAuditLog, setImportAuditLog] = useState<ImportAuditItem[]>([]);
  const importAuditFilters = useImportAuditFilters(importAuditLog);
  const [profileStore, setProfileStore] = useState<ConfigProfileStore>(
    buildDefaultProfileStore(buildDefaultBundle())
  );
  const [profileLabelDraft, setProfileLabelDraft] = useState("");
  const [selectedTemplateKey, setSelectedTemplateKey] = useState(
    CONFIG_TEMPLATE_PACKS[0]?.key ?? ""
  );
  const [jsonDraft, setJsonDraft] = useState("");
  const [profileImportMode, setProfileImportMode] =
    useState<ProfileImportMode>("append");
  const [activateImportedProfile, setActivateImportedProfile] = useState(true);
  const [confirmOverwriteImport, setConfirmOverwriteImport] = useState(false);
  const [showImportConflictDetails, setShowImportConflictDetails] = useState(false);
  const [importConflictSearch, setImportConflictSearch] = useState("");
  const [importConflictActionFilter, setImportConflictActionFilter] =
    useState<ImportConflictActionFilter>("all");
  const {
    statusMessage,
    setStatusMessage,
    statusTone,
    statusCopyState,
    clearStatusMessage,
    copyStatusMessage
  } = useStatusMessage();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    const initialResult = buildBundleFromStorageForPage(readStorageItem);
    const historyResult = buildHistoryFromStorageForPage(readStorageItem);
    const profileStoreResult = buildProfileStoreFromStorage(initialResult.bundle);
    const activeProfile =
      profileStoreResult.store.profiles.find(
        (item) => item.id === profileStoreResult.store.activeProfileId
      ) ?? profileStoreResult.store.profiles[0];
    const activeBundle = activeProfile?.bundle ?? initialResult.bundle;

    setBundle(activeBundle);
    setConfigHistory(historyResult.history);
    setProfileStore(profileStoreResult.store);
    setImportAuditLog(
      readImportAuditStorage({
        storageKey: IMPORT_AUDIT_STORAGE_KEY,
        fallbackStore: profileStoreResult.store,
        fallbackBundle: activeBundle,
        limit: IMPORT_AUDIT_LIMIT,
        normalizeImportAuditPayload,
        normalizeProfileStorePayload: (payload, fallbackBundle) =>
          normalizeProfileStorePayload(
            payload as { activeProfileId?: unknown; profiles?: unknown },
            fallbackBundle
          ),
        normalizeBundle
      })
    );
    setProfileLabelDraft(activeBundle.meta.profileLabel);
    setJsonDraft(JSON.stringify(activeBundle, null, 2));

    let initialStatus = "";
    if (initialResult.migratedFrom !== null || historyResult.migratedCount > 0) {
      writeBundleToStorageForPage(writeStorageItem, initialResult.bundle);
      if (historyResult.history.length > 0) {
        window.localStorage.setItem(
          CONFIG_HISTORY_STORAGE_KEY,
          JSON.stringify(historyResult.history)
        );
      }
      const migrationNotes: string[] = [];
      if (initialResult.migratedFrom !== null) {
        const pathText =
          initialResult.migrationPath.length > 0
            ? initialResult.migrationPath.join(" -> ")
            : `v${initialResult.migratedFrom} -> v${CONFIG_SCHEMA_VERSION}`;
        migrationNotes.push(
          `主配置 ${pathText}`
        );
      }
      if (historyResult.migratedCount > 0) {
        migrationNotes.push(`历史快照迁移 ${historyResult.migratedCount} 条`);
      }
      initialStatus = `已自动完成 schema 迁移：${migrationNotes.join("；")}。`;
    }
    if (profileStoreResult.fromFallback) {
      writeProfileStoreToStorage(profileStoreResult.store);
      if (!initialStatus) {
        initialStatus = "已初始化策略画像仓库（默认画像）。";
      }
    }
    if (initialStatus) {
      setStatusMessage(initialStatus);
    }
    setHasMounted(true);
  }, [setStatusMessage]);

  const formattedBundleUpdatedAt = useMemo(
    () => formatTime(bundle.updatedAt),
    [bundle.updatedAt]
  );

  const selectedTemplate = useMemo(
    () => CONFIG_TEMPLATE_PACKS.find((item) => item.key === selectedTemplateKey) ?? null,
    [selectedTemplateKey]
  );

  const activeProfile = useMemo(
    () =>
      profileStore.profiles.find((item) => item.id === profileStore.activeProfileId) ??
      null,
    [profileStore]
  );

  const jsonImportPreview = useMemo<JsonImportPreview | null>(() => {
    return buildJsonImportPreview({
      jsonDraft,
      profileImportMode,
      existingProfiles: profileStore.profiles.map((item) => ({
        id: item.id,
        label: item.label
      })),
      profileLimit: CONFIG_PROFILE_LIMIT
    });
  }, [jsonDraft, profileImportMode, profileStore.profiles]);

  const filteredImportConflictRows = useMemo(() => {
    const rows = jsonImportPreview?.conflictRows ?? [];
    const query = importConflictSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (
        importConflictActionFilter !== "all" &&
        row.action !== importConflictActionFilter
      ) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        row.baseId.toLowerCase().includes(query) ||
        row.targetId.toLowerCase().includes(query) ||
        String(row.sourceIndex).includes(query)
      );
    });
  }, [importConflictActionFilter, importConflictSearch, jsonImportPreview]);

  const filteredImportAuditLog = importAuditFilters.filteredItems;
  const activateProfileBundle = useCallback(
    (nextBundle: ConfigBundle, nextLabel: string) => {
      writeBundleToStorageForPage(writeStorageItem, nextBundle);
      syncThemeWithAesthetic(nextBundle.meta.aestheticMode);
      setBundle(nextBundle);
      setProfileLabelDraft(nextLabel);
      setJsonDraft(JSON.stringify(nextBundle, null, 2));
      window.dispatchEvent(new Event("edunexus-config-updated"));
    },
    []
  );
  const {
    updateBundle,
    persistBundle,
    handleReloadFromStorage,
    handleApplyDefaults,
    handleSaveCurrentBundle,
    handleExportBundle,
    handleApplyJsonDraft,
    handleApplyTemplatePack
  } = useConfigBundleActions<
    ConfigBundle,
    ConfigProfileItem,
    ConfigProfileStore,
    ConfigHistoryItem
  >({
    bundle,
    activeProfile,
    profileStore,
    jsonDraft,
    selectedTemplate,
    defaultProfileLabel: DEFAULT_CONFIG_META.profileLabel,
    configSchemaVersion: CONFIG_SCHEMA_VERSION,
    configHistoryLimit: CONFIG_HISTORY_LIMIT,
    profileLimit: CONFIG_PROFILE_LIMIT,
    profileStoreVersion: CONFIG_PROFILE_STORE_VERSION,
    setBundle,
    setJsonDraft,
    setProfileLabelDraft,
    setStatusMessage,
    setConfigHistory: (updater) => setConfigHistory((prev) => updater(prev)),
    setProfileStore: (updater) => setProfileStore((prev) => updater(prev)),
    normalizeConfigBundleMeta,
    normalizeBundle,
    normalizeBundleWithMigration,
    buildDefaultBundle,
    buildProfileBundle,
    buildBundleSummary,
    buildBundleFromStorage: () => buildBundleFromStorageForPage(readStorageItem),
    buildProfileStoreFromStorage,
    writeBundleToStorage: (nextBundle) =>
      writeBundleToStorageForPage(writeStorageItem, nextBundle),
    writeProfileStoreToStorage,
    syncThemeWithBundle: (nextBundle) =>
      syncThemeWithAesthetic(nextBundle.meta.aestheticMode),
    notifyConfigUpdated: () => window.dispatchEvent(new Event("edunexus-config-updated")),
    formatTime,
    downloadJson
  });
  const applyImportedProfiles = useApplyImportedProfiles<
    ConfigBundle,
    ConfigProfileItem,
    ConfigProfileStore,
    ImportAuditItem
  >({
    profileImportMode,
    profileStore,
    bundle,
    profileLimit: CONFIG_PROFILE_LIMIT,
    profileStoreVersion: CONFIG_PROFILE_STORE_VERSION,
    importAuditLimit: IMPORT_AUDIT_LIMIT,
    activateImportedProfile,
    confirmOverwriteImport,
    setConfirmOverwriteImport,
    setStatusMessage,
    setProfileStore,
    setBundle,
    setProfileLabelDraft,
    setJsonDraft,
    setImportAuditLog: (updater) => setImportAuditLog((prev) => updater(prev)),
    buildProfileBundle,
    normalizeBundleWithMigration,
    cloneBundle: cloneJsonValue,
    cloneProfileStore: cloneJsonValue,
    syncActiveBundle: activateProfileBundle,
    buildAuditItem: ({
      sourceLabel,
      effectiveImportMode,
      appendedCount,
      overwriteCount,
      importedCount,
      truncatedCount,
      duplicateEntryCount,
      overwriteShadowCount,
      snapshot
    }) => ({
      id: `import_audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
      sourceLabel,
      importMode: effectiveImportMode,
      summary: `${sourceLabel} · 新增 ${appendedCount} / 覆盖 ${overwriteCount}`,
      appendedCount,
      overwriteCount,
      effectiveImportCount: importedCount,
      truncatedCount,
      duplicateEntryCount,
      overwriteShadowCount,
      snapshot
    })
  });
  const {
    pendingImportConfirm,
    handleCancelPendingImport,
    handleConfirmPendingImport,
    handleConvertPendingImportToAppend,
    handleImportProfileFromJson,
    handleImportProfileStoreFromJson,
    handleExportFilteredConflictCsv
  } = useJsonProfileImport({
    jsonDraft,
    profileImportMode,
    confirmOverwriteImport,
    setProfileImportMode,
    setConfirmOverwriteImport,
    existingProfiles: profileStore.profiles.map((item) => ({
      id: item.id,
      label: item.label
    })),
    profileLimit: CONFIG_PROFILE_LIMIT,
    filteredImportConflictRows,
    setStatusMessage,
    onDownloadCsv: downloadCsv,
    onApplyImportedProfiles: applyImportedProfiles
  });
  const {
    handleSwitchProfile,
    handleRenameActiveProfile,
    handleCreateProfileFromCurrent,
    handleDuplicateActiveProfile,
    handlePinProfileTop,
    handleExportSingleProfile,
    handleExportProfileStore
  } = useProfileCatalogActions({
    bundle,
    activeProfile,
    profileStore,
    profileLabelDraft,
    profileStoreVersion: CONFIG_PROFILE_STORE_VERSION,
    setProfileLabelDraft,
    setProfileStore: (updater) => setProfileStore((prev) => updater(prev)),
    setStatusMessage,
    persistBundle,
    createUniqueProfileId,
    downloadJson
  });
  const {
    lastDeletedProfile,
    handleDeleteProfile,
    handleRestoreLastDeletedProfile
  } = useProfileDeleteRestoreActions({
    profileStore,
    setProfileStore,
    profileLimit: CONFIG_PROFILE_LIMIT,
    setStatusMessage,
    createUniqueProfileId,
    buildProfileBundle,
    onActivateProfileBundle: activateProfileBundle
  });
  const {
    activeDiffHistoryId,
    activeDiffHistoryItem,
    handleRollbackHistoryItem,
    handleRollbackHistoryModule,
    handleToggleHistoryDiff,
    handleClearHistory
  } = useConfigHistoryActions<
    ConfigBundle,
    ConfigHistoryItem,
    ConfigModuleKey
  >({
    bundle,
    configHistory,
    setConfigHistory: (updater) => setConfigHistory((prev) => updater(prev)),
    normalizeBundle,
    persistBundle,
    formatTime,
    formatModuleLabel,
    historyStorageKey: CONFIG_HISTORY_STORAGE_KEY,
    setStatusMessage
  });
  const activeDiffRows = useMemo(
    () =>
      activeDiffHistoryItem
        ? buildBundleDiffRows(bundle, activeDiffHistoryItem.bundle)
        : [],
    [activeDiffHistoryItem, bundle]
  );

  const importAuditRollbackPreviewMap = useMemo(() => {
    const map = new Map<string, ImportAuditRollbackPreview>();
    for (const item of filteredImportAuditLog) {
      map.set(item.id, buildImportAuditRollbackPreview(profileStore, bundle, item));
    }
    return map;
  }, [bundle, filteredImportAuditLog, profileStore]);

  const importAuditRollbackSummaryMap = useMemo(() => {
    const map = new Map<
      string,
      { impact: ImportRollbackImpact; changesCount: number }
    >();
    for (const [id, preview] of importAuditRollbackPreviewMap.entries()) {
      map.set(id, {
        impact: preview.impact,
        changesCount: preview.changes.length
      });
    }
    return map;
  }, [importAuditRollbackPreviewMap]);
  const buildPendingImportAuditRollbackPreview = useCallback(
    (item: ImportAuditItem) => buildImportAuditRollbackPreview(profileStore, bundle, item),
    [bundle, profileStore]
  );
  const {
    pendingItem: pendingImportAuditRollback,
    pendingPreview: pendingImportAuditRollbackPreview,
    filteredChanges: filteredPendingImportRollbackChanges,
    changeFilter: importRollbackChangeFilter,
    keyword: importRollbackChangeKeyword,
    setChangeFilter: setImportRollbackChangeFilter,
    setKeyword: setImportRollbackChangeKeyword,
    handleRequestRollback: handleRequestRollbackImportAudit,
    handleCancelPendingRollback: handleCancelPendingImportAuditRollback,
    handleConfirmPendingRollback: handleConfirmPendingImportAuditRollback,
    handleExportFilteredChangesCsv: handleExportPendingImportRollbackChangesCsv
  } = useImportAuditRollback<
    ImportAuditItem,
    ImportAuditRollbackPreview,
    ImportRollbackProfileChange,
    ImportRollbackChangeFilter
  >({
    importAuditLog,
    initialFilter: "all",
    buildPendingPreview: buildPendingImportAuditRollbackPreview,
    filterChanges: filterImportRollbackChanges,
    buildChangesCsv: buildImportRollbackChangesCsv,
    onConfirmRollback: (_item, preview) => {
      const { snapshotStore, snapshotBundle } = preview;
      writeProfileStoreToStorage(snapshotStore);
      writeBundleToStorageForPage(writeStorageItem, snapshotBundle);
      syncThemeWithAesthetic(snapshotBundle.meta.aestheticMode);
      window.dispatchEvent(new Event("edunexus-config-updated"));
      setProfileStore(snapshotStore);
      setBundle(snapshotBundle);
      setProfileLabelDraft(snapshotBundle.meta.profileLabel);
      setJsonDraft(JSON.stringify(snapshotBundle, null, 2));
    },
    setStatusMessage,
    formatTime,
    downloadCsv,
    exportFilenamePrefix: "edunexus-import-rollback"
  });
  const importAuditActions = useImportAuditActions<ImportAuditItem>({
    filteredLog: filteredImportAuditLog,
    setImportAuditLog: (updater) => setImportAuditLog((prev) => updater(prev)),
    storageKey: IMPORT_AUDIT_STORAGE_KEY,
    setStatusMessage,
    clearFilters: importAuditFilters.resetFilters,
    clearPendingRollback: handleCancelPendingImportAuditRollback,
    buildExportPayload: buildImportAuditExportPayload,
    downloadJson
  });
  const {
    handleClearImportAuditLog,
    handleExportImportAuditJson,
    handleExportSingleImportAuditJson
  } = importAuditActions;
  const { handleImportAuditFromJsonDraft } = useImportAuditJsonImport<
    ImportAuditItem,
    ConfigProfileStore,
    ConfigBundle,
    Record<string, unknown>[]
  >({
    jsonDraft,
    profileStore,
    bundle,
    importAuditLog,
    importAuditLimit: IMPORT_AUDIT_LIMIT,
    setImportAuditLog: (updater) => setImportAuditLog((prev) => updater(prev)),
    setStatusMessage,
    normalizeImportAuditPayload,
    normalizeImportAuditEntries: (items, fallbackStore, fallbackBundle) =>
      normalizeImportAuditStorageEntries({
        items,
        fallbackStore,
        fallbackBundle,
        limit: IMPORT_AUDIT_LIMIT,
        normalizeProfileStorePayload: (payload, bundleInput) =>
          normalizeProfileStorePayload(
            payload as { activeProfileId?: unknown; profiles?: unknown },
            bundleInput
          ),
        normalizeBundle
      })
  });

  useEffect(() => {
    if (!hasMounted) {
      return;
    }
    window.localStorage.setItem(
      CONFIG_HISTORY_STORAGE_KEY,
      JSON.stringify(configHistory.slice(0, CONFIG_HISTORY_LIMIT))
    );
  }, [configHistory, hasMounted]);

  useEffect(() => {
    if (!hasMounted) {
      return;
    }
    writeProfileStoreToStorage(profileStore);
  }, [profileStore, hasMounted]);

  useEffect(() => {
    if (!hasMounted) {
      return;
    }
    window.localStorage.setItem(
      IMPORT_AUDIT_STORAGE_KEY,
      JSON.stringify(importAuditLog.slice(0, IMPORT_AUDIT_LIMIT))
    );
  }, [hasMounted, importAuditLog]);

  useEffect(() => {
    if (profileImportMode === "append" && confirmOverwriteImport) {
      setConfirmOverwriteImport(false);
    }
  }, [confirmOverwriteImport, profileImportMode]);

  useEffect(() => {
    if (!pendingImportConfirm && !pendingImportAuditRollback) {
      return;
    }
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      if (pendingImportAuditRollback) {
        handleCancelPendingImportAuditRollback();
        return;
      }
      if (pendingImportConfirm) {
        handleCancelPendingImport();
      }
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [
    handleCancelPendingImport,
    handleCancelPendingImportAuditRollback,
    pendingImportAuditRollback,
    pendingImportConfirm
  ]);

  useEffect(() => {
    setShowImportConflictDetails(false);
    setImportConflictSearch("");
    setImportConflictActionFilter("all");
    handleCancelPendingImport();
  }, [handleCancelPendingImport, jsonDraft, profileImportMode]);

  const jsonImportActionState = useMemo(
    () =>
      buildJsonImportActionState({
        preview: jsonImportPreview,
        profileImportMode,
        confirmOverwriteImport
      }),
    [confirmOverwriteImport, jsonImportPreview, profileImportMode]
  );
  const {
    canApplyBundleFromJson,
    canImportProfileFromJson,
    canImportProfileStoreFromJson,
    hint: jsonActionHint
  } = jsonImportActionState;

  if (!hasMounted) {
    return (
      <section>
        <PageHeader
          title="统一配置中心"
          description="正在加载配置数据..."
          tags={["Dashboard", "Workspace", "KB", "策略画像"]}
        />
      </section>
    );
  }

  return (
    <section>
      <PageHeader
        title="统一配置中心"
        description="在一个页面管理 Dashboard、Workspace、KB 的策略参数与画像版本。"
        tags={["模板切换", "JSON 导入导出", "历史回滚", "参数广播"]}
      />

      <div className="panel-grid settings-layout" data-view={settingsViewMode}>
        <GalaxyHero
          badge="Config Center · Local Persistence"
          title="一处配置，三处联动"
          description="配置写入本地并实时广播到各子系统，支持 schema 迁移、画像管理和配置快照。"
          quote="“把策略参数从代码里拿出来，放进可视化配置中心。”"
          chips={["Dashboard 预警策略", "Workspace 回放策略", "KB 章节策略", "JSON 配置快照"]}
          metrics={[
            {
              label: "配置版本",
              value: `v${bundle.version}`,
              hint: `schema 当前版本 v${CONFIG_SCHEMA_VERSION}`
            },
            { label: "最后更新时间", value: formattedBundleUpdatedAt, hint: "本地时间" },
            {
              label: "策略画像",
              value: bundle.meta.profileLabel,
              hint: `${bundle.meta.profileId} · ${formatAestheticModeLabel(bundle.meta.aestheticMode)}`
            }
          ]}
        />

        <article className="panel wide settings-view-switcher">
          <header>
            <strong>配置视图</strong>
            <span>按使用频率切换，减少操作噪声</span>
          </header>
          <div className="settings-view-switcher-row">
            <button
              type="button"
              className={settingsViewMode === "basic" ? "active" : ""}
              onClick={() => setSettingsViewMode("basic")}
            >
              常用策略
              <em>{profileStore.profiles.length} 个画像</em>
            </button>
            <button
              type="button"
              className={settingsViewMode === "advanced" ? "active" : ""}
              onClick={() => setSettingsViewMode("advanced")}
            >
              高级回滚
              <em>{configHistory.length} 条历史</em>
            </button>
            <button
              type="button"
              className={settingsViewMode === "import" ? "active" : ""}
              onClick={() => setSettingsViewMode("import")}
            >
              导入与审计
              <em>{filteredImportAuditLog.length} 条审计记录</em>
            </button>
          </div>
        </article>

        <article className="panel wide settings-section settings-section-common">
          <h3>全局操作</h3>
          <div className="config-toolbar">
            <button type="button" onClick={handleReloadFromStorage}>
              从本地重新读取
            </button>
            <button type="button" onClick={handleSaveCurrentBundle}>
              保存全部配置
            </button>
            <button type="button" onClick={handleExportBundle}>
              导出配置 JSON
            </button>
            <button type="button" onClick={handleApplyDefaults}>
              恢复默认模板
            </button>
          </div>
          <p className="muted">
            注：修改下方字段后请点击“保存全部配置”。当前更新时间：{formattedBundleUpdatedAt}
          </p>
        </article>

        <article className="panel half settings-section settings-section-basic">
          <h3>策略画像管理</h3>
          <div className="demo-form">
            <label>切换画像</label>
            <select
              value={bundle.meta.profileId}
              onChange={(event) => handleSwitchProfile(event.target.value)}
            >
              {profileStore.profiles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}（{item.id}）
                </option>
              ))}
            </select>

            <label>画像名称</label>
            <input
              value={profileLabelDraft}
              onChange={(event) => setProfileLabelDraft(event.target.value)}
              placeholder="输入策略画像名称"
            />

            <label>画像美学</label>
            <select
              value={bundle.meta.aestheticMode}
              onChange={(event) =>
                updateBundle({
                  ...bundle,
                  meta: {
                    ...bundle.meta,
                    aestheticMode: normalizeAestheticMode(event.target.value)
                  }
                })
              }
            >
              <option value="obsidian_notebooklm">Obsidian + NotebookLM</option>
              <option value="nebula">星夜银河</option>
              <option value="aurora">晨曦玻璃</option>
            </select>

            <div className="config-toolbar">
              <button type="button" onClick={handleRenameActiveProfile}>
                重命名当前
              </button>
              <button
                type="button"
                onClick={handleCreateProfileFromCurrent}
                disabled={profileStore.profiles.length >= CONFIG_PROFILE_LIMIT}
              >
                新增画像（基于当前）
              </button>
              <button
                type="button"
                onClick={handleDuplicateActiveProfile}
                disabled={profileStore.profiles.length >= CONFIG_PROFILE_LIMIT}
              >
                复制当前画像
              </button>
              <button type="button" onClick={handleExportProfileStore}>
                导出画像仓库
              </button>
              <button
                type="button"
                onClick={handleRestoreLastDeletedProfile}
                disabled={!lastDeletedProfile}
              >
                恢复最近删除
              </button>
            </div>

            <p className="muted">
              当前画像数：{profileStore.profiles.length}/{CONFIG_PROFILE_LIMIT} · 当前活动：
              {activeProfile?.label ?? "未命名"}
              {lastDeletedProfile
                ? ` · 最近删除：${lastDeletedProfile.profile.label}（${formatTime(
                    lastDeletedProfile.deletedAt
                  )}）`
                : ""}
            </p>
          </div>
          <div className="config-profile-list">
            {profileStore.profiles.map((item) => (
              <article
                key={item.id}
                className={`config-profile-item ${
                  item.id === profileStore.activeProfileId ? "active" : ""
                }`}
              >
                <header>
                  <strong>{item.label}</strong>
                  <span>{item.id}</span>
                </header>
                <p>
                  更新于：{formatTime(item.updatedAt)} · 模板：
                  {buildBundleSummary(item.bundle)} · 美学：
                  {formatAestheticModeLabel(item.bundle.meta.aestheticMode)}
                </p>
                <div className="config-profile-tools">
                  <button
                    type="button"
                    className="config-profile-switch"
                    onClick={() => handleSwitchProfile(item.id)}
                    disabled={item.id === profileStore.activeProfileId}
                  >
                    {item.id === profileStore.activeProfileId ? "当前画像" : "切换"}
                  </button>
                  <button
                    type="button"
                    className="config-profile-pin"
                    onClick={() => handlePinProfileTop(item.id)}
                    disabled={profileStore.profiles[0]?.id === item.id}
                  >
                    置顶
                  </button>
                  <button
                    type="button"
                    className="config-profile-export"
                    onClick={() => handleExportSingleProfile(item)}
                  >
                    导出
                  </button>
                  <button
                    type="button"
                    className="config-profile-delete"
                    onClick={() => handleDeleteProfile(item.id)}
                    disabled={profileStore.profiles.length <= 1}
                  >
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="panel half settings-section settings-section-basic">
          <h3>一键模板包</h3>
          <div className="config-pack-grid">
            {CONFIG_TEMPLATE_PACKS.map((item) => (
              <button
                type="button"
                key={item.key}
                className={`config-pack-card ${selectedTemplateKey === item.key ? "active" : ""}`}
                onClick={() => setSelectedTemplateKey(item.key)}
              >
                <strong>{item.label}</strong>
                <p>{item.description}</p>
                <em>{buildBundleSummary(item.bundle)}</em>
              </button>
            ))}
          </div>
          <div className="config-toolbar">
            <button type="button" onClick={handleApplyTemplatePack}>
              应用选中模板
            </button>
          </div>
        </article>

        <article className="panel half settings-section settings-section-advanced">
          <h3>变更历史与回滚</h3>
          <div className="config-history-head">
            <span>最近 {configHistory.length} 条</span>
            <button
              type="button"
              className="config-history-clear"
              onClick={handleClearHistory}
              disabled={configHistory.length === 0}
            >
              清空历史
            </button>
          </div>
          {configHistory.length === 0 ? (
            <p className="muted">当前暂无配置变更记录。</p>
          ) : (
            <>
              <div className="config-history-list">
                {configHistory.map((item) => (
                  <article key={item.id} className="config-history-item">
                    <header>
                      <strong>{item.reason}</strong>
                      <span>{formatTime(item.at)}</span>
                    </header>
                    <p>{item.summary}</p>
                    <div className="config-history-item-tools">
                      <button
                        type="button"
                        className={`config-diff-toggle ${
                          activeDiffHistoryId === item.id ? "active" : ""
                        }`}
                        onClick={() => handleToggleHistoryDiff(item.id)}
                      >
                        {activeDiffHistoryId === item.id ? "收起差异" : "查看差异"}
                      </button>
                      <button
                        type="button"
                        className="config-history-rollback"
                        onClick={() => handleRollbackHistoryItem(item)}
                      >
                        整包回滚
                      </button>
                    </div>
                    <div className="config-history-module-rollbacks">
                      {(["dashboard", "workspace", "kb"] as ConfigModuleKey[]).map((module) => (
                        <button
                          type="button"
                          key={`${item.id}_${module}`}
                          className={`config-history-module-btn ${module}`}
                          onClick={() => handleRollbackHistoryModule(item, module)}
                        >
                          仅回滚 {formatModuleLabel(module)}
                        </button>
                      ))}
                    </div>
                  </article>
                ))}
              </div>

              {activeDiffHistoryItem ? (
                <article className="config-diff-panel">
                  <header className="config-diff-head">
                    <strong>
                      差异对比：当前配置 vs {formatTime(activeDiffHistoryItem.at)}（
                      {activeDiffHistoryItem.reason}）
                    </strong>
                    <span>
                      共 {activeDiffRows.length} 项差异
                    </span>
                  </header>
                  {activeDiffRows.length === 0 ? (
                    <p className="muted">当前配置与该历史快照一致，无需回滚。</p>
                  ) : (
                    <div className="config-diff-list">
                      {activeDiffRows.map((row) => (
                        <article key={row.key} className="config-diff-row">
                          <header>
                            <span className={`config-diff-module ${row.module}`}>
                              {formatModuleLabel(row.module)}
                            </span>
                            <strong>{row.field}</strong>
                          </header>
                          <div className="config-diff-values">
                            <p>
                              <em>当前</em>：{row.currentValue}
                            </p>
                            <p>
                              <em>历史</em>：{row.historyValue}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </article>
              ) : null}
            </>
          )}
        </article>

        <article className="panel half settings-section settings-section-basic">
          <h3>Dashboard 预警参数</h3>
          <div className="demo-form">
            <label>策略档位</label>
            <select
              value={bundle.dashboard.alertPolicy}
              onChange={(event) =>
                updateBundle({
                  ...bundle,
                  dashboard: {
                    ...bundle.dashboard,
                    alertPolicy: normalizeAlertPolicyMode(event.target.value)
                  }
                })
              }
            >
              <option value="strict">严格</option>
              <option value="balanced">均衡</option>
              <option value="relaxed">宽松</option>
            </select>

            <div className="config-preset-row">
              {(
                [
                  { key: "intervene", label: "主动干预" },
                  { key: "balanced", label: "默认均衡" },
                  { key: "quiet", label: "降噪观察" }
                ] as Array<{ key: Exclude<AlertConfigPreset, "custom">; label: string }>
              ).map((item) => (
                <button
                  type="button"
                  key={`dash_preset_${item.key}`}
                  className={`config-preset-chip ${
                    bundle.dashboard.riskPreset === item.key ? "active" : ""
                  }`}
                  onClick={() =>
                    updateBundle({
                      ...bundle,
                      dashboard: {
                        ...bundle.dashboard,
                        riskPreset: item.key,
                        riskConfig: DASHBOARD_RISK_PRESETS[item.key]
                      }
                    })
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label>
              依赖高风险阈值：{bundle.dashboard.riskConfig.dependencyHighThreshold}
            </label>
            <input
              type="range"
              min={35}
              max={55}
              step={1}
              value={bundle.dashboard.riskConfig.dependencyHighThreshold}
              onChange={(event) =>
                updateBundle({
                  ...bundle,
                  dashboard: {
                    ...bundle.dashboard,
                    riskPreset: "custom",
                    riskConfig: normalizeDashboardRiskConfig({
                      ...bundle.dashboard.riskConfig,
                      dependencyHighThreshold: Number(event.target.value)
                    })
                  }
                })
              }
            />

            <label>
              独立率高风险阈值：{bundle.dashboard.riskConfig.independentHighThreshold}
            </label>
            <input
              type="range"
              min={42}
              max={60}
              step={1}
              value={bundle.dashboard.riskConfig.independentHighThreshold}
              onChange={(event) =>
                updateBundle({
                  ...bundle,
                  dashboard: {
                    ...bundle.dashboard,
                    riskPreset: "custom",
                    riskConfig: normalizeDashboardRiskConfig({
                      ...bundle.dashboard.riskConfig,
                      independentHighThreshold: Number(event.target.value)
                    })
                  }
                })
              }
            />

            <label>时间线条数：{bundle.dashboard.riskConfig.historyLimit}</label>
            <input
              type="range"
              min={3}
              max={12}
              step={1}
              value={bundle.dashboard.riskConfig.historyLimit}
              onChange={(event) =>
                updateBundle({
                  ...bundle,
                  dashboard: {
                    ...bundle.dashboard,
                    riskPreset: "custom",
                    riskConfig: normalizeDashboardRiskConfig({
                      ...bundle.dashboard.riskConfig,
                      historyLimit: Number(event.target.value)
                    })
                  }
                })
              }
            />
          </div>
        </article>

        <article className="panel half settings-section settings-section-basic">
          <h3>Workspace 回放参数</h3>
          <div className="demo-form">
            <div className="config-preset-row">
              {(
                [
                  { key: "quick", label: "极速回放" },
                  { key: "balanced", label: "平衡默认" },
                  { key: "deep", label: "深度复盘" }
                ] as Array<{ key: Exclude<ReplayPanelPreset, "custom">; label: string }>
              ).map((item) => (
                <button
                  type="button"
                  key={`ws_preset_${item.key}`}
                  className={`config-preset-chip ${
                    bundle.workspace.replayPreset === item.key ? "active" : ""
                  }`}
                  onClick={() =>
                    updateBundle({
                      ...bundle,
                      workspace: {
                        ...bundle.workspace,
                        replayPreset: item.key,
                        replayConfig: REPLAY_PANEL_PRESETS[item.key]
                      }
                    })
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label>书签上限：{bundle.workspace.replayConfig.maxBookmarks}</label>
            <input
              type="range"
              min={8}
              max={24}
              step={1}
              value={bundle.workspace.replayConfig.maxBookmarks}
              onChange={(event) =>
                updateBundle({
                  ...bundle,
                  workspace: {
                    ...bundle.workspace,
                    replayPreset: "custom",
                    replayConfig: normalizeReplayPanelConfig({
                      ...bundle.workspace.replayConfig,
                      maxBookmarks: Number(event.target.value)
                    })
                  }
                })
              }
            />

            <label>默认倍速</label>
            <select
              value={bundle.workspace.replayConfig.defaultSpeed}
              onChange={(event) =>
                updateBundle({
                  ...bundle,
                  workspace: {
                    ...bundle.workspace,
                    replayPreset: "custom",
                    replayConfig: normalizeReplayPanelConfig({
                      ...bundle.workspace.replayConfig,
                      defaultSpeed: event.target.value as ReplaySpeedKey
                    })
                  }
                })
              }
            >
              <option value="1x">1x</option>
              <option value="1.5x">1.5x</option>
              <option value="2x">2x</option>
            </select>

            <label className="config-check-label">
              <input
                type="checkbox"
                checked={bundle.workspace.replayConfig.autoExportSummary}
                onChange={(event) =>
                  updateBundle({
                    ...bundle,
                    workspace: {
                      ...bundle.workspace,
                      replayPreset: "custom",
                      replayConfig: normalizeReplayPanelConfig({
                        ...bundle.workspace.replayConfig,
                        autoExportSummary: event.target.checked
                      })
                    }
                  })
                }
              />
              默认启用自动导出摘要
            </label>
          </div>
        </article>

        <article className="panel half settings-section settings-section-basic">
          <h3>KB 章节参数</h3>
          <div className="demo-form">
            <div className="config-preset-row">
              {(
                [
                  { key: "insight", label: "深度洞察" },
                  { key: "balanced", label: "平衡默认" },
                  { key: "light", label: "轻量概览" }
                ] as Array<{ key: Exclude<ChapterPanelPreset, "custom">; label: string }>
              ).map((item) => (
                <button
                  type="button"
                  key={`kb_preset_${item.key}`}
                  className={`config-preset-chip ${
                    bundle.kb.chapterPreset === item.key ? "active" : ""
                  }`}
                  onClick={() =>
                    updateBundle({
                      ...bundle,
                      kb: {
                        ...bundle.kb,
                        chapterPreset: item.key,
                        chapterConfig: CHAPTER_PANEL_PRESETS[item.key]
                      }
                    })
                  }
                >
                  {item.label}
                </button>
              ))}
            </div>

            <label>关键节点上限：{bundle.kb.chapterConfig.topNodesLimit}</label>
            <input
              type="range"
              min={2}
              max={8}
              step={1}
              value={bundle.kb.chapterConfig.topNodesLimit}
              onChange={(event) =>
                updateBundle({
                  ...bundle,
                  kb: {
                    ...bundle.kb,
                    chapterPreset: "custom",
                    chapterConfig: normalizeChapterPanelConfig({
                      ...bundle.kb.chapterConfig,
                      topNodesLimit: Number(event.target.value)
                    })
                  }
                })
              }
            />

            <label>趋势行上限：{bundle.kb.chapterConfig.trendRowsLimit}</label>
            <input
              type="range"
              min={3}
              max={8}
              step={1}
              value={bundle.kb.chapterConfig.trendRowsLimit}
              onChange={(event) =>
                updateBundle({
                  ...bundle,
                  kb: {
                    ...bundle.kb,
                    chapterPreset: "custom",
                    chapterConfig: normalizeChapterPanelConfig({
                      ...bundle.kb.chapterConfig,
                      trendRowsLimit: Number(event.target.value)
                    })
                  }
                })
              }
            />

            <label>默认子图模式</label>
            <select
              value={bundle.kb.chapterConfig.defaultSubgraphMode}
              onChange={(event) =>
                updateBundle({
                  ...bundle,
                  kb: {
                    ...bundle.kb,
                    chapterPreset: "custom",
                    chapterConfig: normalizeChapterPanelConfig({
                      ...bundle.kb.chapterConfig,
                      defaultSubgraphMode: event.target.value as ChapterSubgraphMode
                    })
                  }
                })
              }
            >
              <option value="highlight">高亮模式</option>
              <option value="focus">仅本章子图</option>
            </select>
          </div>
        </article>

        <div className="settings-section settings-section-import">
          <JsonImportPanel
            jsonDraft={jsonDraft}
            onJsonDraftChange={setJsonDraft}
            profileImportMode={profileImportMode}
            onProfileImportModeChange={setProfileImportMode}
            activateImportedProfile={activateImportedProfile}
            onActivateImportedProfileChange={setActivateImportedProfile}
            confirmOverwriteImport={confirmOverwriteImport}
            onConfirmOverwriteImportChange={setConfirmOverwriteImport}
            importHint={jsonActionHint}
            importPreview={jsonImportPreview}
            profileLimit={CONFIG_PROFILE_LIMIT}
            showImportConflictDetails={showImportConflictDetails}
            onToggleImportConflictDetails={() =>
              setShowImportConflictDetails((prev) => !prev)
            }
            filteredImportConflictRows={filteredImportConflictRows}
            importConflictSearch={importConflictSearch}
            onImportConflictSearchChange={setImportConflictSearch}
            importConflictActionFilter={importConflictActionFilter}
            onImportConflictActionFilterChange={setImportConflictActionFilter}
            onExportFilteredConflictCsv={handleExportFilteredConflictCsv}
            formatImportActionLabel={formatImportActionLabel}
            formatDuplicateStrategyLabel={formatDuplicateStrategyLabel}
            canApplyBundleFromJson={canApplyBundleFromJson}
            canImportProfileFromJson={canImportProfileFromJson}
            canImportProfileStoreFromJson={canImportProfileStoreFromJson}
            onApplyJson={handleApplyJsonDraft}
            onImportProfile={handleImportProfileFromJson}
            onImportProfileStore={handleImportProfileStoreFromJson}
            onFillCurrentBundleJson={() => setJsonDraft(JSON.stringify(bundle, null, 2))}
          />
        </div>

        <div className="settings-section settings-section-import">
          <ImportAuditLogPanel
            log={importAuditLog}
            filteredLog={filteredImportAuditLog}
            limit={IMPORT_AUDIT_LIMIT}
            sourceFilter={importAuditFilters.sourceFilter}
            modeFilter={importAuditFilters.modeFilter}
            keyword={importAuditFilters.keyword}
            dateFrom={importAuditFilters.dateFrom}
            dateTo={importAuditFilters.dateTo}
            quickRange={importAuditFilters.quickRange}
            rollbackSummaryMap={importAuditRollbackSummaryMap}
            formatTime={formatTime}
            onSourceFilterChange={importAuditFilters.setSourceFilter}
            onModeFilterChange={importAuditFilters.setModeFilter}
            onKeywordChange={importAuditFilters.setKeyword}
            onDateFromChange={importAuditFilters.setDateFromWithManualOverride}
            onDateToChange={importAuditFilters.setDateToWithManualOverride}
            onApplyQuickRange={importAuditFilters.applyQuickRange}
            onResetFilters={importAuditFilters.resetFilters}
            onImportFromDraft={handleImportAuditFromJsonDraft}
            onExportFilteredJson={handleExportImportAuditJson}
            onClearLog={handleClearImportAuditLog}
            onExportSingle={handleExportSingleImportAuditJson}
            onRequestRollback={handleRequestRollbackImportAudit}
          />
        </div>

        <StatusMessageBox
          message={statusMessage}
          tone={statusTone}
          copyState={statusCopyState}
          onCopy={copyStatusMessage}
          onClose={clearStatusMessage}
        />

        <ImportRollbackConfirmModal
          open={Boolean(
            pendingImportAuditRollback && pendingImportAuditRollbackPreview
          )}
          sourceLabel={pendingImportAuditRollback?.sourceLabel ?? "单画像"}
          timeLabel={
            pendingImportAuditRollback
              ? formatTime(pendingImportAuditRollback.at)
              : "-"
          }
          impact={pendingImportAuditRollbackPreview?.impact ?? {
            addProfileCount: 0,
            removeProfileCount: 0,
            updateProfileCount: 0,
            bundleDiffCount: 0,
            activeProfileFrom: "-",
            activeProfileTo: "-",
            activeProfileChanged: false
          }}
          allChangesCount={pendingImportAuditRollbackPreview?.changes.length ?? 0}
          filteredChanges={filteredPendingImportRollbackChanges}
          changeFilter={importRollbackChangeFilter}
          keyword={importRollbackChangeKeyword}
          onChangeFilter={setImportRollbackChangeFilter}
          onChangeKeyword={setImportRollbackChangeKeyword}
          onExportCsv={handleExportPendingImportRollbackChangesCsv}
          onCancel={handleCancelPendingImportAuditRollback}
          onConfirm={handleConfirmPendingImportAuditRollback}
        />

        <ImportExecutionConfirmModal
          open={Boolean(pendingImportConfirm)}
          sourceLabel={pendingImportConfirm?.sourceLabel ?? "单画像"}
          importMode={pendingImportConfirm?.importMode ?? "append"}
          plan={
            pendingImportConfirm?.plan ?? {
              profileCount: 0,
              appendCount: 0,
              overwriteCount: 0,
              overwriteTargets: [],
              uniqueTargetCount: 0,
              effectiveImportCount: 0,
              truncatedCount: 0,
              duplicateEntryCount: 0,
              overwriteShadowCount: 0,
              duplicateGroups: [],
              operations: []
            }
          }
          onConvertToAppend={handleConvertPendingImportToAppend}
          onCancel={handleCancelPendingImport}
          onConfirm={handleConfirmPendingImport}
        />
      </div>
    </section>
  );
}

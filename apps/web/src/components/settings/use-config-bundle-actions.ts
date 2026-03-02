import { useCallback } from "react";

type BundleMeta = {
  profileId: string;
  profileLabel: string;
};

type BundleLike = {
  version: number;
  updatedAt: string;
  meta: BundleMeta;
};

type ProfileLike<TBundle extends BundleLike> = {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  bundle: TBundle;
};

type ProfileStoreLike<TProfile> = {
  version: number;
  activeProfileId: string;
  profiles: TProfile[];
};

type HistoryItemLike<TBundle extends BundleLike> = {
  id: string;
  at: string;
  reason: string;
  summary: string;
  bundle: TBundle;
};

type TemplateLike<TBundle extends BundleLike> = {
  label: string;
  bundle: TBundle;
};

type BundleLoadResult<TBundle extends BundleLike> = {
  bundle: TBundle;
  migratedFrom: number | null;
  migrationPath: string[];
};

type ProfileStoreLoadResult<TStore> = {
  store: TStore;
  fromFallback: boolean;
};

export type PersistBundleOptions = {
  profileId?: string;
  profileLabel?: string;
  recordHistory?: boolean;
  statusMessage?: string;
};

type UseConfigBundleActionsInput<
  TBundle extends BundleLike,
  TProfile extends ProfileLike<TBundle>,
  TStore extends ProfileStoreLike<TProfile>,
  THistoryItem extends HistoryItemLike<TBundle>
> = {
  bundle: TBundle;
  activeProfile: TProfile | null;
  profileStore: TStore;
  jsonDraft: string;
  selectedTemplate: TemplateLike<TBundle> | null;
  defaultProfileLabel: string;
  configSchemaVersion: number;
  configHistoryLimit: number;
  profileLimit: number;
  profileStoreVersion: number;
  setBundle: (next: TBundle) => void;
  setJsonDraft: (value: string) => void;
  setProfileLabelDraft: (value: string) => void;
  setStatusMessage: (message: string) => void;
  setConfigHistory: (updater: (prev: THistoryItem[]) => THistoryItem[]) => void;
  setProfileStore: (updater: (prev: TStore) => TStore) => void;
  normalizeConfigBundleMeta: (input: TBundle["meta"]) => BundleMeta;
  normalizeBundle: (input: unknown) => TBundle;
  normalizeBundleWithMigration: (input: unknown) => BundleLoadResult<TBundle>;
  buildDefaultBundle: () => TBundle;
  buildProfileBundle: (
    bundle: TBundle,
    profileId: string,
    profileLabel: string
  ) => TBundle;
  buildBundleSummary: (bundle: TBundle) => string;
  buildBundleFromStorage: () => BundleLoadResult<TBundle>;
  buildProfileStoreFromStorage: (bundle: TBundle) => ProfileStoreLoadResult<TStore>;
  writeBundleToStorage: (bundle: TBundle) => void;
  writeProfileStoreToStorage: (store: TStore) => void;
  syncThemeWithBundle: (bundle: TBundle) => void;
  notifyConfigUpdated: () => void;
  formatTime: (value: string) => string;
  downloadJson: (content: string, filename: string) => void;
};

export function useConfigBundleActions<
  TBundle extends BundleLike,
  TProfile extends ProfileLike<TBundle>,
  TStore extends ProfileStoreLike<TProfile>,
  THistoryItem extends HistoryItemLike<TBundle>
>(input: UseConfigBundleActionsInput<TBundle, TProfile, TStore, THistoryItem>) {
  const updateBundle = useCallback(
    (next: TBundle) => {
      const withMeta = {
        ...next,
        updatedAt: new Date().toISOString(),
        version: input.configSchemaVersion,
        meta: input.normalizeConfigBundleMeta(next.meta)
      } as TBundle;
      input.setBundle(withMeta);
      input.setJsonDraft(JSON.stringify(withMeta, null, 2));
    },
    [input]
  );

  const persistBundle = useCallback(
    (
      next: TBundle,
      reason = "保存全部配置",
      options: PersistBundleOptions = {}
    ) => {
      const fallbackProfileId =
        input.activeProfile?.id ||
        input.profileStore.activeProfileId ||
        input.bundle.meta.profileId;
      const fallbackProfileLabel =
        input.activeProfile?.label ||
        input.bundle.meta.profileLabel ||
        input.defaultProfileLabel;
      const targetProfileId =
        options.profileId || next.meta.profileId || fallbackProfileId;
      const targetProfileLabel =
        options.profileLabel || next.meta.profileLabel || fallbackProfileLabel;
      const withMeta = input.buildProfileBundle(next, targetProfileId, targetProfileLabel);

      input.writeBundleToStorage(withMeta);
      if (options.recordHistory ?? true) {
        input.setConfigHistory((prev) => {
          const entry = {
            id: `cfg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            at: withMeta.updatedAt,
            reason,
            summary: input.buildBundleSummary(withMeta),
            bundle: withMeta
          } as THistoryItem;
          return [entry, ...prev].slice(0, input.configHistoryLimit);
        });
      }
      input.setProfileStore((prev) => {
        const currentList = [...prev.profiles];
        const index = currentList.findIndex((item) => item.id === targetProfileId);
        const updatedAt = withMeta.updatedAt;
        if (index >= 0) {
          currentList[index] = {
            ...currentList[index],
            label: targetProfileLabel,
            updatedAt,
            bundle: withMeta
          };
        } else {
          currentList.unshift({
            id: targetProfileId,
            label: targetProfileLabel,
            createdAt: updatedAt,
            updatedAt,
            bundle: withMeta
          } as TProfile);
        }
        const seen = new Set<string>();
        const uniqueProfiles: TProfile[] = [];
        for (const item of currentList) {
          if (seen.has(item.id)) {
            continue;
          }
          seen.add(item.id);
          uniqueProfiles.push(item);
          if (uniqueProfiles.length >= input.profileLimit) {
            break;
          }
        }
        return {
          version: input.profileStoreVersion,
          activeProfileId: targetProfileId,
          profiles: uniqueProfiles
        } as TStore;
      });
      input.syncThemeWithBundle(withMeta);
      input.notifyConfigUpdated();
      input.setBundle(withMeta);
      input.setProfileLabelDraft(targetProfileLabel);
      input.setJsonDraft(JSON.stringify(withMeta, null, 2));
      input.setStatusMessage(
        options.statusMessage ?? "配置已写入本地，并已通知各页面即时刷新参数。"
      );
    },
    [input]
  );

  const handleReloadFromStorage = useCallback(() => {
    const loadedResult = input.buildBundleFromStorage();
    const profileStoreResult = input.buildProfileStoreFromStorage(loadedResult.bundle);
    const activeProfileFromStore =
      profileStoreResult.store.profiles.find(
        (item) => item.id === profileStoreResult.store.activeProfileId
      ) ?? profileStoreResult.store.profiles[0];
    const activeBundle = activeProfileFromStore?.bundle ?? loadedResult.bundle;

    input.setProfileStore(() => profileStoreResult.store);
    input.setBundle(activeBundle);
    input.setProfileLabelDraft(activeBundle.meta.profileLabel);
    input.setJsonDraft(JSON.stringify(activeBundle, null, 2));
    input.writeBundleToStorage(activeBundle);
    input.syncThemeWithBundle(activeBundle);
    if (profileStoreResult.fromFallback) {
      input.writeProfileStoreToStorage(profileStoreResult.store);
    }
    const notes: string[] = [];
    if (loadedResult.migratedFrom !== null) {
      const pathText =
        loadedResult.migrationPath.length > 0
          ? loadedResult.migrationPath.join(" -> ")
          : `v${loadedResult.migratedFrom} -> v${input.configSchemaVersion}`;
      notes.push(`主配置 ${pathText}`);
    }
    if (profileStoreResult.fromFallback) {
      notes.push("画像仓库已按默认结构初始化");
    }
    if (notes.length > 0) {
      input.setStatusMessage(`已从本地重新读取并同步：${notes.join("；")}。`);
      return;
    }
    input.setStatusMessage("已从本地重新读取配置。");
  }, [input]);

  const handleApplyDefaults = useCallback(() => {
    const defaults = input.normalizeBundle({
      ...input.buildDefaultBundle(),
      meta: input.bundle.meta
    });
    input.setBundle(defaults);
    input.setProfileLabelDraft(defaults.meta.profileLabel);
    input.setJsonDraft(JSON.stringify(defaults, null, 2));
    input.setStatusMessage(
      "已恢复默认模板（尚未写入本地，请点击“保存全部配置”）。"
    );
  }, [input]);

  const handleSaveCurrentBundle = useCallback(() => {
    persistBundle(input.bundle, "手动保存");
  }, [input.bundle, persistBundle]);

  const handleExportBundle = useCallback(() => {
    const content = JSON.stringify(input.bundle, null, 2);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    input.downloadJson(content, `edunexus-config-bundle-${stamp}.json`);
    input.setStatusMessage("已导出配置 JSON。");
  }, [input]);

  const handleApplyJsonDraft = useCallback(() => {
    try {
      const parsed = JSON.parse(input.jsonDraft) as unknown;
      const normalized = input.normalizeBundleWithMigration(parsed);
      persistBundle(normalized.bundle, "从 JSON 应用");
      if (normalized.migratedFrom !== null) {
        const pathText =
          normalized.migrationPath.length > 0
            ? normalized.migrationPath.join(" -> ")
            : `v${normalized.migratedFrom} -> v${input.configSchemaVersion}`;
        input.setStatusMessage(`JSON 已按 ${pathText} 自动迁移并写入本地。`);
        return;
      }
      input.setStatusMessage("JSON 配置已校验并写入本地。");
    } catch {
      input.setStatusMessage("JSON 解析失败，请检查格式后重试。");
    }
  }, [input, persistBundle]);

  const handleApplyTemplatePack = useCallback(() => {
    if (!input.selectedTemplate) {
      input.setStatusMessage("请先选择一个模板包。");
      return;
    }
    const next = input.normalizeBundle({
      ...input.selectedTemplate.bundle,
      meta: input.bundle.meta
    });
    persistBundle(next, `应用模板包：${input.selectedTemplate.label}`);
    input.setStatusMessage(`已应用模板包：${input.selectedTemplate.label}`);
  }, [input, persistBundle]);

  return {
    updateBundle,
    persistBundle,
    handleReloadFromStorage,
    handleApplyDefaults,
    handleSaveCurrentBundle,
    handleExportBundle,
    handleApplyJsonDraft,
    handleApplyTemplatePack
  };
}

export type ImportAuditStorageMode = "append" | "overwrite";
export type ImportAuditStorageSourceLabel = "单画像" | "画像仓库";

type SnapshotProfileLike<TBundle> = {
  id: string;
  bundle: TBundle;
};

type SnapshotStoreLike<TBundle> = {
  activeProfileId: string;
  profiles: Array<SnapshotProfileLike<TBundle>>;
};

export type ImportAuditStorageItem<TStore, TBundle> = {
  id: string;
  at: string;
  sourceLabel: ImportAuditStorageSourceLabel;
  importMode: ImportAuditStorageMode;
  summary: string;
  appendedCount: number;
  overwriteCount: number;
  effectiveImportCount: number;
  truncatedCount: number;
  duplicateEntryCount: number;
  overwriteShadowCount: number;
  snapshot: {
    profileStore: TStore;
    activeBundle: TBundle;
  };
};

type NormalizeImportAuditEntriesInput<TStore, TBundle> = {
  items: Record<string, unknown>[];
  fallbackStore: TStore;
  fallbackBundle: TBundle;
  limit: number;
  normalizeProfileStorePayload: (
    payload: unknown,
    fallbackBundle: TBundle
  ) => { store: TStore };
  normalizeBundle: (input: unknown) => TBundle;
};

export function normalizeImportAuditEntries<
  TBundle,
  TStore extends SnapshotStoreLike<TBundle>
>(
  input: NormalizeImportAuditEntriesInput<TStore, TBundle>
): Array<ImportAuditStorageItem<TStore, TBundle>> {
  const results: Array<ImportAuditStorageItem<TStore, TBundle>> = [];
  const normalizeCount = (value: unknown) => Math.max(0, Number(value) || 0);

  for (const source of input.items.slice(0, input.limit)) {
    const snapshotSource =
      source.snapshot && typeof source.snapshot === "object"
        ? (source.snapshot as Record<string, unknown>)
        : null;
    const snapshotStorePayload =
      snapshotSource?.profileStore && typeof snapshotSource.profileStore === "object"
        ? (snapshotSource.profileStore as {
            activeProfileId?: unknown;
            profiles?: unknown;
          })
        : input.fallbackStore;
    const normalizedStoreResult = input.normalizeProfileStorePayload(
      snapshotStorePayload,
      input.fallbackBundle
    );
    const activeProfileFromSnapshot =
      normalizedStoreResult.store.profiles.find(
        (profile) => profile.id === normalizedStoreResult.store.activeProfileId
      ) ?? normalizedStoreResult.store.profiles[0];
    const snapshotActiveBundle = input.normalizeBundle(snapshotSource?.activeBundle);

    results.push({
      id:
        typeof source.id === "string" && source.id
          ? source.id
          : `import_audit_${Date.now().toString(36)}_${Math.random()
              .toString(36)
              .slice(2, 6)}`,
      at:
        typeof source.at === "string" && source.at
          ? source.at
          : new Date().toISOString(),
      sourceLabel: source.sourceLabel === "画像仓库" ? "画像仓库" : "单画像",
      importMode: source.importMode === "overwrite" ? "overwrite" : "append",
      summary:
        typeof source.summary === "string" && source.summary
          ? source.summary
          : "导入完成（历史记录）",
      appendedCount: normalizeCount(source.appendedCount),
      overwriteCount: normalizeCount(source.overwriteCount),
      effectiveImportCount: normalizeCount(source.effectiveImportCount),
      truncatedCount: normalizeCount(source.truncatedCount),
      duplicateEntryCount: normalizeCount(source.duplicateEntryCount),
      overwriteShadowCount: normalizeCount(source.overwriteShadowCount),
      snapshot: {
        profileStore: normalizedStoreResult.store,
        activeBundle: activeProfileFromSnapshot?.bundle ?? snapshotActiveBundle
      }
    });
  }

  return results;
}

type ReadImportAuditFromStorageInput<TStore, TBundle> = {
  storageKey: string;
  fallbackStore: TStore;
  fallbackBundle: TBundle;
  limit: number;
  normalizeImportAuditPayload: (input: unknown) => Record<string, unknown>[];
  normalizeProfileStorePayload: (
    payload: unknown,
    fallbackBundle: TBundle
  ) => { store: TStore };
  normalizeBundle: (input: unknown) => TBundle;
};

export function readImportAuditFromStorage<
  TBundle,
  TStore extends SnapshotStoreLike<TBundle>
>(
  input: ReadImportAuditFromStorageInput<TStore, TBundle>
): Array<ImportAuditStorageItem<TStore, TBundle>> {
  try {
    const raw = window.localStorage.getItem(input.storageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return normalizeImportAuditEntries({
      items: input.normalizeImportAuditPayload(parsed),
      fallbackStore: input.fallbackStore,
      fallbackBundle: input.fallbackBundle,
      limit: input.limit,
      normalizeProfileStorePayload: input.normalizeProfileStorePayload,
      normalizeBundle: input.normalizeBundle
    });
  } catch {
    return [];
  }
}

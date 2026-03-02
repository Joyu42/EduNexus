export type ImportRollbackProfile<Bundle = unknown> = {
  id: string;
  label: string;
  bundle: Bundle;
};

export type ImportRollbackStore<Bundle = unknown> = {
  activeProfileId: string;
  profiles: ImportRollbackProfile<Bundle>[];
};

export type ImportRollbackProfileChange = {
  id: string;
  change: "add" | "remove" | "update";
  currentLabel: string;
  targetLabel: string;
  labelChanged: boolean;
  bundleChanged: boolean;
};

export type ImportRollbackImpact = {
  addProfileCount: number;
  removeProfileCount: number;
  updateProfileCount: number;
  bundleDiffCount: number;
  activeProfileFrom: string;
  activeProfileTo: string;
  activeProfileChanged: boolean;
};

export type ImportRollbackPreview = {
  impact: ImportRollbackImpact;
  changes: ImportRollbackProfileChange[];
};

export type ImportRollbackChangeFilter = "all" | "add" | "remove" | "update";

type BuildImportRollbackPreviewInput<Bundle> = {
  currentStore: ImportRollbackStore<Bundle>;
  targetStore: ImportRollbackStore<Bundle>;
  bundleDiffCount: number;
  areBundlesEqual?: (currentBundle: Bundle, targetBundle: Bundle) => boolean;
};

function defaultAreBundlesEqual<Bundle>(currentBundle: Bundle, targetBundle: Bundle) {
  try {
    return JSON.stringify(currentBundle) === JSON.stringify(targetBundle);
  } catch {
    return Object.is(currentBundle, targetBundle);
  }
}

function resolveActiveProfileLabel<Bundle>(store: ImportRollbackStore<Bundle>) {
  const activeProfile =
    store.profiles.find((profile) => profile.id === store.activeProfileId) ??
    store.profiles[0];
  return activeProfile?.label ?? store.activeProfileId;
}

export function buildImportRollbackProfileChanges<Bundle>(
  currentStore: ImportRollbackStore<Bundle>,
  targetStore: ImportRollbackStore<Bundle>,
  areBundlesEqual?: (currentBundle: Bundle, targetBundle: Bundle) => boolean
) {
  const equalsBundle = areBundlesEqual ?? defaultAreBundlesEqual;
  const currentProfileMap = new Map(
    currentStore.profiles.map((profile) => [profile.id, profile])
  );
  const targetProfileMap = new Map(
    targetStore.profiles.map((profile) => [profile.id, profile])
  );

  const changes: ImportRollbackProfileChange[] = [];

  for (const targetProfile of targetStore.profiles) {
    const currentProfile = currentProfileMap.get(targetProfile.id);
    if (!currentProfile) {
      changes.push({
        id: targetProfile.id,
        change: "add",
        currentLabel: "(不存在)",
        targetLabel: targetProfile.label,
        labelChanged: true,
        bundleChanged: true
      });
      continue;
    }

    const labelChanged = currentProfile.label !== targetProfile.label;
    const bundleChanged = !equalsBundle(currentProfile.bundle, targetProfile.bundle);
    if (!labelChanged && !bundleChanged) {
      continue;
    }

    changes.push({
      id: targetProfile.id,
      change: "update",
      currentLabel: currentProfile.label,
      targetLabel: targetProfile.label,
      labelChanged,
      bundleChanged
    });
  }

  for (const currentProfile of currentStore.profiles) {
    if (targetProfileMap.has(currentProfile.id)) {
      continue;
    }
    changes.push({
      id: currentProfile.id,
      change: "remove",
      currentLabel: currentProfile.label,
      targetLabel: "(将移除)",
      labelChanged: true,
      bundleChanged: true
    });
  }

  return changes;
}

export function buildImportRollbackPreview<Bundle>(
  input: BuildImportRollbackPreviewInput<Bundle>
): ImportRollbackPreview {
  const changes = buildImportRollbackProfileChanges(
    input.currentStore,
    input.targetStore,
    input.areBundlesEqual
  );

  const addProfileCount = changes.filter((change) => change.change === "add").length;
  const removeProfileCount = changes.filter(
    (change) => change.change === "remove"
  ).length;
  const updateProfileCount = changes.filter(
    (change) => change.change === "update"
  ).length;

  return {
    impact: {
      addProfileCount,
      removeProfileCount,
      updateProfileCount,
      bundleDiffCount: input.bundleDiffCount,
      activeProfileFrom: resolveActiveProfileLabel(input.currentStore),
      activeProfileTo: resolveActiveProfileLabel(input.targetStore),
      activeProfileChanged:
        input.currentStore.activeProfileId !== input.targetStore.activeProfileId
    },
    changes
  };
}

function escapeCsvCell(value: string) {
  const escaped = value.replace(/"/g, "\"\"");
  return `"${escaped}"`;
}

export function filterImportRollbackChanges(
  changes: ImportRollbackProfileChange[],
  filter: {
    changeType: ImportRollbackChangeFilter;
    keyword: string;
  }
) {
  const query = filter.keyword.trim().toLowerCase();
  return changes.filter((change) => {
    if (filter.changeType !== "all" && change.change !== filter.changeType) {
      return false;
    }
    if (!query) {
      return true;
    }
    return (
      change.id.toLowerCase().includes(query) ||
      change.currentLabel.toLowerCase().includes(query) ||
      change.targetLabel.toLowerCase().includes(query)
    );
  });
}

export function buildImportRollbackChangesCsv(
  changes: ImportRollbackProfileChange[]
) {
  const header = [
    "序号",
    "画像ID",
    "变更类型",
    "当前标签",
    "目标标签",
    "标签变化",
    "参数变化"
  ];
  const rows = changes.map((change, index) => [
    String(index + 1),
    change.id,
    change.change === "add" ? "新增回补" : change.change === "remove" ? "移除恢复" : "画像更新",
    change.currentLabel,
    change.targetLabel,
    change.labelChanged ? "是" : "否",
    change.bundleChanged ? "是" : "否"
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(","))
    .join("\n");
}

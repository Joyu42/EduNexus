export type ProfileImportMode = "append" | "overwrite";

export type ImportedProfileDraft = {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  bundle: unknown;
};

export type ProfileImportDuplicateStrategy = "append_renamed" | "overwrite_last_wins";

export type ProfileImportDuplicateGroup = {
  id: string;
  occurrences: number;
  strategy: ProfileImportDuplicateStrategy;
  sampleLabels: string[];
};

export type ProfileImportOperation = {
  sourceIndex: number;
  targetId: string;
  baseId: string;
  action: "append" | "overwrite";
};

export type ProfileImportPlan = {
  profileCount: number;
  appendCount: number;
  overwriteCount: number;
  overwriteTargets: Array<{ id: string; label: string }>;
  uniqueTargetCount: number;
  effectiveImportCount: number;
  truncatedCount: number;
  duplicateEntryCount: number;
  overwriteShadowCount: number;
  duplicateGroups: ProfileImportDuplicateGroup[];
  operations: ProfileImportOperation[];
};

type BuildProfileImportPlanInput = {
  drafts: ImportedProfileDraft[];
  existingProfiles: Array<{ id: string; label: string }>;
  importMode: ProfileImportMode;
  profileLimit: number;
  fallbackLabelPrefix?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as Record<string, unknown>;
}

export function normalizeProfileId(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^\w-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36);
  if (normalized) {
    return normalized;
  }
  return `profile_${Date.now().toString(36)}`;
}

export function createUniqueProfileId(
  existingIds: Set<string>,
  seed = `profile_${Date.now().toString(36)}`
) {
  const base = normalizeProfileId(seed);
  if (!existingIds.has(base)) {
    return base;
  }
  let index = 2;
  while (index <= 999) {
    const candidate = `${base}_${index}`.slice(0, 36);
    if (!existingIds.has(candidate)) {
      return candidate;
    }
    index += 1;
  }
  return `${base}_${Date.now().toString(36)}`.slice(0, 36);
}

export function normalizeProfileImportPayload(
  input: unknown
): ImportedProfileDraft | null {
  const source = asRecord(input);
  if (!source) {
    return null;
  }
  const profileSource =
    source.profile && typeof source.profile === "object"
      ? (source.profile as Record<string, unknown>)
      : source;
  if (!profileSource.bundle || typeof profileSource.bundle !== "object") {
    return null;
  }
  return {
    id: typeof profileSource.id === "string" ? profileSource.id : "",
    label: typeof profileSource.label === "string" ? profileSource.label : "",
    createdAt:
      typeof profileSource.createdAt === "string" ? profileSource.createdAt : "",
    updatedAt:
      typeof profileSource.updatedAt === "string" ? profileSource.updatedAt : "",
    bundle: profileSource.bundle
  };
}

export function buildProfileImportPlan(
  input: BuildProfileImportPlanInput
): ProfileImportPlan {
  const fallbackLabelPrefix =
    input.fallbackLabelPrefix && input.fallbackLabelPrefix.trim()
      ? input.fallbackLabelPrefix.trim()
      : "import_profile";
  const profileLimit = Math.max(1, input.profileLimit);

  const existingProfiles = input.existingProfiles.map((item) => ({
    id: normalizeProfileId(item.id),
    label: item.label
  }));
  const existingProfileMap = new Map(existingProfiles.map((item) => [item.id, item]));
  const existingProfileIdSet = new Set(existingProfiles.map((item) => item.id));
  const reservedIds = new Set(existingProfileIdSet);
  const overwriteTargets: Array<{ id: string; label: string }> = [];
  const overwriteTargetIdSet = new Set<string>();
  const baseIdUsageMap = new Map<
    string,
    {
      occurrences: number;
      sampleLabels: string[];
      hitsExisting: boolean;
    }
  >();
  const targetIdUsageMap = new Map<string, number>();
  const operations: ProfileImportOperation[] = [];
  let appendCount = 0;
  let overwriteCount = 0;

  input.drafts.forEach((draft, index) => {
    const fallbackLabel =
      draft.label.trim() || `${fallbackLabelPrefix}_${index + 1}`;
    const rawId = draft.id || fallbackLabel;
    const baseId = normalizeProfileId(rawId);
    const shouldOverwrite =
      input.importMode === "overwrite" && existingProfileIdSet.has(baseId);
    const targetId = shouldOverwrite
      ? baseId
      : createUniqueProfileId(reservedIds, baseId);
    reservedIds.add(targetId);

    operations.push({
      sourceIndex: index,
      targetId,
      baseId,
      action: shouldOverwrite ? "overwrite" : "append"
    });
    targetIdUsageMap.set(targetId, (targetIdUsageMap.get(targetId) ?? 0) + 1);

    if (shouldOverwrite) {
      overwriteCount += 1;
      if (!overwriteTargetIdSet.has(baseId)) {
        overwriteTargetIdSet.add(baseId);
        overwriteTargets.push({
          id: baseId,
          label: existingProfileMap.get(baseId)?.label ?? baseId
        });
      }
    } else {
      appendCount += 1;
    }

    const existingUsage = baseIdUsageMap.get(baseId);
    if (existingUsage) {
      existingUsage.occurrences += 1;
      if (
        fallbackLabel &&
        existingUsage.sampleLabels.length < 3 &&
        !existingUsage.sampleLabels.includes(fallbackLabel)
      ) {
        existingUsage.sampleLabels.push(fallbackLabel);
      }
      return;
    }

    baseIdUsageMap.set(baseId, {
      occurrences: 1,
      sampleLabels: fallbackLabel ? [fallbackLabel] : [],
      hitsExisting: existingProfileIdSet.has(baseId)
    });
  });

  const duplicateGroups = Array.from(baseIdUsageMap.entries())
    .filter(([, usage]) => usage.occurrences > 1)
    .map(([id, usage]) => ({
      id,
      occurrences: usage.occurrences,
      strategy:
        input.importMode === "overwrite" && usage.hitsExisting
          ? ("overwrite_last_wins" as const)
          : ("append_renamed" as const),
      sampleLabels: usage.sampleLabels
    }))
    .sort((a, b) => b.occurrences - a.occurrences);

  const duplicateEntryCount = duplicateGroups.reduce(
    (sum, group) => sum + (group.occurrences - 1),
    0
  );
  const overwriteShadowCount =
    input.importMode === "overwrite"
      ? Array.from(targetIdUsageMap.values()).reduce(
          (sum, count) => sum + (count > 1 ? count - 1 : 0),
          0
        )
      : 0;
  const uniqueTargetCount = targetIdUsageMap.size;

  return {
    profileCount: input.drafts.length,
    appendCount,
    overwriteCount,
    overwriteTargets,
    uniqueTargetCount,
    effectiveImportCount: Math.min(uniqueTargetCount, profileLimit),
    truncatedCount: Math.max(0, uniqueTargetCount - profileLimit),
    duplicateEntryCount,
    overwriteShadowCount,
    duplicateGroups,
    operations
  };
}

export function normalizeProfileStoreImportPayload(
  input: unknown
): ImportedProfileDraft[] {
  const source = asRecord(input);
  if (!source) {
    return [];
  }
  const storeSource =
    source.store && typeof source.store === "object"
      ? (source.store as Record<string, unknown>)
      : source;
  const profiles = Array.isArray(storeSource.profiles)
    ? (storeSource.profiles as unknown[])
    : [];
  return profiles
    .map((item) => normalizeProfileImportPayload(item))
    .filter((item): item is ImportedProfileDraft => item !== null);
}

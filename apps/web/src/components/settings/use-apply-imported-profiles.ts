import { useCallback } from "react";
import {
  buildProfileImportPlan,
  type ImportedProfileDraft,
  type ProfileImportMode
} from "@/lib/client/profile-import";

type BundleMeta = {
  profileId: string;
  profileLabel: string;
};

type BundleLike = {
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

type ImportAuditSnapshot<TStore, TBundle> = {
  profileStore: TStore;
  activeBundle: TBundle;
};

type BuildImportAuditItemInput<TStore, TBundle> = {
  sourceLabel: "单画像" | "画像仓库";
  effectiveImportMode: ProfileImportMode;
  appendedCount: number;
  overwriteCount: number;
  importedCount: number;
  truncatedCount: number;
  duplicateEntryCount: number;
  overwriteShadowCount: number;
  snapshot: ImportAuditSnapshot<TStore, TBundle>;
};

type UseApplyImportedProfilesInput<
  TBundle extends BundleLike,
  TProfile extends ProfileLike<TBundle>,
  TStore extends ProfileStoreLike<TProfile>,
  TAuditItem
> = {
  profileImportMode: ProfileImportMode;
  profileStore: TStore;
  bundle: TBundle;
  profileLimit: number;
  profileStoreVersion: number;
  importAuditLimit: number;
  activateImportedProfile: boolean;
  confirmOverwriteImport: boolean;
  setConfirmOverwriteImport: (value: boolean) => void;
  setStatusMessage: (message: string) => void;
  setProfileStore: (next: TStore) => void;
  setBundle: (next: TBundle) => void;
  setProfileLabelDraft: (value: string) => void;
  setJsonDraft: (value: string) => void;
  setImportAuditLog: (updater: (prev: TAuditItem[]) => TAuditItem[]) => void;
  buildProfileBundle: (
    bundle: TBundle,
    profileId: string,
    profileLabel: string
  ) => TBundle;
  normalizeBundleWithMigration: (input: unknown) => {
    bundle: TBundle;
    migratedFrom: number | null;
    migrationPath: string[];
  };
  cloneBundle: (bundle: TBundle) => TBundle;
  cloneProfileStore: (store: TStore) => TStore;
  syncActiveBundle: (bundle: TBundle, label: string) => void;
  buildAuditItem: (
    input: BuildImportAuditItemInput<TStore, TBundle>
  ) => TAuditItem;
};

export function useApplyImportedProfiles<
  TBundle extends BundleLike,
  TProfile extends ProfileLike<TBundle>,
  TStore extends ProfileStoreLike<TProfile>,
  TAuditItem
>(input: UseApplyImportedProfilesInput<TBundle, TProfile, TStore, TAuditItem>) {
  return useCallback(
    (
      drafts: ImportedProfileDraft[],
      sourceLabel: "单画像" | "画像仓库",
      importModeOverride?: ProfileImportMode
    ) => {
      if (drafts.length === 0) {
        input.setStatusMessage(`${sourceLabel}导入失败：未识别到有效画像数据。`);
        return;
      }

      const effectiveImportMode = importModeOverride ?? input.profileImportMode;
      const existingProfiles = input.profileStore.profiles.map((item) => ({
        id: item.id,
        label: item.label
      }));
      const existingProfileIdSet = new Set(existingProfiles.map((item) => item.id));
      const importPlan = buildProfileImportPlan({
        drafts,
        existingProfiles,
        importMode: effectiveImportMode,
        profileLimit: input.profileLimit,
        fallbackLabelPrefix: "import_profile"
      });

      if (
        effectiveImportMode === "overwrite" &&
        importPlan.overwriteCount > 0 &&
        !input.confirmOverwriteImport
      ) {
        const overwriteLabels = importPlan.overwriteTargets
          .slice(0, 5)
          .map((item) => `${item.label}(${item.id})`);
        const duplicateHint =
          importPlan.overwriteShadowCount > 0
            ? ` 同批重复目标 ${importPlan.overwriteShadowCount} 条将按顺序保留最后一条。`
            : "";
        input.setStatusMessage(
          `检测到将覆盖 ${importPlan.overwriteCount} 条画像：${overwriteLabels.join("、")}。请先勾选“确认覆盖已存在画像”。${duplicateHint}`
        );
        return;
      }

      const importedProfileMap = new Map<string, TProfile>();
      const migrationPathSet = new Set<string>();
      for (const operation of importPlan.operations) {
        const draft = drafts[operation.sourceIndex];
        if (!draft) {
          continue;
        }
        const normalized = input.normalizeBundleWithMigration(draft.bundle);
        for (const path of normalized.migrationPath) {
          migrationPathSet.add(path);
        }
        const normalizedLabel =
          (draft.label || normalized.bundle.meta.profileLabel || "")
            .trim()
            .slice(0, 24) ||
          `导入画像 ${input.profileStore.profiles.length + operation.sourceIndex + 1}`;
        const profileId = operation.targetId;
        const importedBundle = input.buildProfileBundle(
          {
            ...normalized.bundle,
            meta: {
              ...normalized.bundle.meta,
              profileId,
              profileLabel: normalizedLabel
            }
          },
          profileId,
          normalizedLabel
        );
        const now = new Date().toISOString();
        importedProfileMap.set(profileId, {
          id: profileId,
          label: normalizedLabel,
          createdAt: draft.createdAt || now,
          updatedAt: draft.updatedAt || now,
          bundle: importedBundle
        } as TProfile);
      }

      const importedProfiles = Array.from(importedProfileMap.values());
      if (importedProfiles.length === 0) {
        input.setStatusMessage(`${sourceLabel}导入失败：导入数量为 0。`);
        return;
      }

      const snapshotBeforeImport = {
        profileStore: input.cloneProfileStore(input.profileStore),
        activeBundle: input.cloneBundle(input.bundle)
      };
      const overwriteCount = importedProfiles.filter((item) =>
        existingProfileIdSet.has(item.id)
      ).length;
      const appendedCount = importedProfiles.length - overwriteCount;
      const mergedAllProfiles = [
        ...importedProfiles,
        ...input.profileStore.profiles.filter(
          (item) => !importedProfiles.some((imported) => imported.id === item.id)
        )
      ];
      const truncatedCount = Math.max(0, mergedAllProfiles.length - input.profileLimit);
      const mergedProfiles = mergedAllProfiles.slice(0, input.profileLimit);

      let nextActiveId = input.profileStore.activeProfileId;
      if (input.activateImportedProfile) {
        nextActiveId = importedProfiles[0].id;
      } else if (!mergedProfiles.some((item) => item.id === nextActiveId)) {
        nextActiveId = mergedProfiles[0]?.id ?? "";
      }
      const nextActiveProfile =
        mergedProfiles.find((item) => item.id === nextActiveId) ?? null;
      const activeProfileOverwritten = importedProfiles.some(
        (item) => item.id === input.profileStore.activeProfileId
      );
      const shouldSyncActiveBundle =
        input.activateImportedProfile ||
        nextActiveId !== input.profileStore.activeProfileId ||
        activeProfileOverwritten;

      input.setProfileStore({
        version: input.profileStoreVersion,
        activeProfileId: nextActiveId,
        profiles: mergedProfiles
      } as TStore);
      if (shouldSyncActiveBundle && nextActiveProfile) {
        input.syncActiveBundle(nextActiveProfile.bundle, nextActiveProfile.label);
      }
      input.setConfirmOverwriteImport(false);

      const pathText =
        migrationPathSet.size > 0
          ? `；迁移链路：${Array.from(migrationPathSet).join(" | ")}`
          : "";
      const truncateText =
        truncatedCount > 0 ? `；超出上限已截断 ${truncatedCount} 条` : "";
      const duplicateText =
        importPlan.duplicateEntryCount > 0
          ? importPlan.overwriteShadowCount > 0
            ? `；同批重复 ${importPlan.duplicateEntryCount} 条，按顺序保留最后一条（影响 ${importPlan.overwriteShadowCount} 条）`
            : `；同批重复 ${importPlan.duplicateEntryCount} 条，已自动改名`
          : "";
      const duplicateGroupText =
        importPlan.duplicateGroups.length > 0
          ? `；重复 ID 组：${importPlan.duplicateGroups
              .slice(0, 3)
              .map((group) => `${group.id}×${group.occurrences}`)
              .join("、")}`
          : "";
      const importStatusText = `${sourceLabel}导入完成（${
        effectiveImportMode === "overwrite" ? "覆盖模式" : "新增模式"
      }）：新增 ${appendedCount}，覆盖 ${overwriteCount}，当前画像 ${mergedProfiles.length}/${input.profileLimit}${truncateText}${duplicateText}${duplicateGroupText}${pathText}`;
      input.setImportAuditLog((prev) => {
        const auditItem = input.buildAuditItem({
          sourceLabel,
          effectiveImportMode,
          appendedCount,
          overwriteCount,
          importedCount: importedProfiles.length,
          truncatedCount,
          duplicateEntryCount: importPlan.duplicateEntryCount,
          overwriteShadowCount: importPlan.overwriteShadowCount,
          snapshot: snapshotBeforeImport
        });
        return [auditItem, ...prev].slice(0, input.importAuditLimit);
      });
      input.setStatusMessage(importStatusText);
    },
    [input]
  );
}

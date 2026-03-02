import { useCallback } from "react";

type ProfileBundleMeta = {
  profileId: string;
  profileLabel: string;
};

type ProfileBundleLike = {
  meta: ProfileBundleMeta;
};

type ProfileItem<TBundle extends ProfileBundleLike> = {
  id: string;
  label: string;
  bundle: TBundle;
};

type ProfileStoreShape<TBundle extends ProfileBundleLike> = {
  activeProfileId: string;
  profiles: Array<ProfileItem<TBundle>>;
};

type PersistBundleOptions = {
  profileId?: string;
  profileLabel?: string;
  recordHistory?: boolean;
  statusMessage?: string;
};

type UseProfileCatalogActionsInput<
  TBundle extends ProfileBundleLike,
  TStore extends ProfileStoreShape<TBundle>
> = {
  bundle: TBundle;
  activeProfile: ProfileItem<TBundle> | null;
  profileStore: TStore;
  profileLabelDraft: string;
  profileStoreVersion: number;
  setProfileLabelDraft: (value: string) => void;
  setProfileStore: (updater: (prev: TStore) => TStore) => void;
  setStatusMessage: (message: string) => void;
  persistBundle: (
    next: TBundle,
    reason: string,
    options?: PersistBundleOptions
  ) => void;
  createUniqueProfileId: (existingIds: Set<string>, seed?: string) => string;
  downloadJson: (content: string, filename: string) => void;
};

export function useProfileCatalogActions<
  TBundle extends ProfileBundleLike,
  TStore extends ProfileStoreShape<TBundle>
>(input: UseProfileCatalogActionsInput<TBundle, TStore>
) {
  const {
    bundle,
    activeProfile,
    profileStore,
    profileLabelDraft,
    profileStoreVersion,
    setProfileLabelDraft,
    setProfileStore,
    setStatusMessage,
    persistBundle,
    createUniqueProfileId,
    downloadJson
  } = input;

  const handleSwitchProfile = useCallback(
    (nextProfileId: string) => {
      const target = profileStore.profiles.find((item) => item.id === nextProfileId);
      if (!target) {
        setStatusMessage("目标策略画像不存在，请刷新后重试。");
        return;
      }
      persistBundle(target.bundle, `切换策略画像：${target.label}`, {
        profileId: target.id,
        profileLabel: target.label,
        recordHistory: false,
        statusMessage: `已切换到策略画像：${target.label}`
      });
    },
    [persistBundle, profileStore.profiles, setStatusMessage]
  );

  const handleRenameActiveProfile = useCallback(() => {
    const label = profileLabelDraft.trim();
    if (!activeProfile) {
      setStatusMessage("当前没有可编辑的策略画像。");
      return;
    }
    if (!label) {
      setStatusMessage("请输入策略画像名称。");
      return;
    }
    persistBundle(
      {
        ...bundle,
        meta: {
          ...bundle.meta,
          profileId: activeProfile.id,
          profileLabel: label
        }
      },
      `重命名策略画像：${label}`,
      {
        profileId: activeProfile.id,
        profileLabel: label,
        recordHistory: false,
        statusMessage: `已更新策略画像名称：${label}`
      }
    );
  }, [activeProfile, bundle, persistBundle, profileLabelDraft, setStatusMessage]);

  const handleCreateProfileFromCurrent = useCallback(() => {
    const label =
      profileLabelDraft.trim() || `策略画像 ${profileStore.profiles.length + 1}`;
    const existingIds = new Set(profileStore.profiles.map((item) => item.id));
    const profileId = createUniqueProfileId(existingIds, label);
    persistBundle(
      {
        ...bundle,
        meta: {
          ...bundle.meta,
          profileId,
          profileLabel: label
        }
      },
      `新增策略画像：${label}`,
      {
        profileId,
        profileLabel: label,
        recordHistory: false,
        statusMessage: `已新增并切换到策略画像：${label}`
      }
    );
  }, [bundle, createUniqueProfileId, persistBundle, profileLabelDraft, profileStore.profiles]);

  const handleDuplicateActiveProfile = useCallback(() => {
    if (!activeProfile) {
      setStatusMessage("当前没有可复制的策略画像。");
      return;
    }
    const duplicateLabel = `${activeProfile.label} 副本`;
    const existingIds = new Set(profileStore.profiles.map((item) => item.id));
    const duplicateId = createUniqueProfileId(existingIds, `${activeProfile.id}_copy`);
    setProfileLabelDraft(duplicateLabel);
    persistBundle(
      {
        ...bundle,
        meta: {
          ...bundle.meta,
          profileId: duplicateId,
          profileLabel: duplicateLabel
        }
      },
      `复制策略画像：${activeProfile.label}`,
      {
        profileId: duplicateId,
        profileLabel: duplicateLabel,
        recordHistory: false,
        statusMessage: `已复制并切换到策略画像：${duplicateLabel}`
      }
    );
  }, [
    activeProfile,
    bundle,
    createUniqueProfileId,
    persistBundle,
    profileStore.profiles,
    setProfileLabelDraft,
    setStatusMessage
  ]);

  const handlePinProfileTop = useCallback(
    (profileId: string) => {
      setProfileStore((prev) => {
        const index = prev.profiles.findIndex((item) => item.id === profileId);
        if (index <= 0) {
          return prev;
        }
        const next = [...prev.profiles];
        const [target] = next.splice(index, 1);
        next.unshift(target);
        return {
          ...prev,
          profiles: next
        } as TStore;
      });
      const target = profileStore.profiles.find((item) => item.id === profileId);
      if (target) {
        setStatusMessage(`已置顶策略画像：${target.label}`);
      }
    },
    [profileStore.profiles, setProfileStore, setStatusMessage]
  );

  const handleExportSingleProfile = useCallback(
    (profile: ProfileItem<TBundle>) => {
      const payload = {
        version: profileStoreVersion,
        exportedAt: new Date().toISOString(),
        profile
      };
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadJson(
        JSON.stringify(payload, null, 2),
        `edunexus-profile-${profile.id}-${stamp}.json`
      );
      setStatusMessage(`已导出策略画像：${profile.label}`);
    },
    [downloadJson, profileStoreVersion, setStatusMessage]
  );

  const handleExportProfileStore = useCallback(() => {
    const payload = {
      version: profileStoreVersion,
      exportedAt: new Date().toISOString(),
      store: profileStore
    };
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadJson(
      JSON.stringify(payload, null, 2),
      `edunexus-profile-store-${stamp}.json`
    );
    setStatusMessage("已导出全部策略画像仓库。");
  }, [downloadJson, profileStore, profileStoreVersion, setStatusMessage]);

  return {
    handleSwitchProfile,
    handleRenameActiveProfile,
    handleCreateProfileFromCurrent,
    handleDuplicateActiveProfile,
    handlePinProfileTop,
    handleExportSingleProfile,
    handleExportProfileStore
  };
}

import { useCallback, useState } from "react";

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
  updatedAt: string;
  bundle: TBundle;
};

type ProfileStoreLike<TBundle extends BundleLike, TProfile extends ProfileLike<TBundle>> = {
  version: number;
  activeProfileId: string;
  profiles: TProfile[];
};

type DeletedProfileSnapshot<
  TBundle extends BundleLike,
  TProfile extends ProfileLike<TBundle>
> = {
  profile: TProfile;
  wasActive: boolean;
  deletedAt: string;
};

type UseProfileDeleteRestoreActionsInput<
  TBundle extends BundleLike,
  TProfile extends ProfileLike<TBundle>,
  TStore extends ProfileStoreLike<TBundle, TProfile>
> = {
  profileStore: TStore;
  setProfileStore: (next: TStore) => void;
  profileLimit: number;
  setStatusMessage: (message: string) => void;
  createUniqueProfileId: (existingIds: Set<string>, seed?: string) => string;
  buildProfileBundle: (
    bundle: TBundle,
    profileId: string,
    profileLabel: string
  ) => TBundle;
  onActivateProfileBundle: (bundle: TBundle, label: string) => void;
};

export function useProfileDeleteRestoreActions<
  TBundle extends BundleLike,
  TProfile extends ProfileLike<TBundle>,
  TStore extends ProfileStoreLike<TBundle, TProfile>
>(input: UseProfileDeleteRestoreActionsInput<TBundle, TProfile, TStore>) {
  const [lastDeletedProfile, setLastDeletedProfile] = useState<
    DeletedProfileSnapshot<TBundle, TProfile> | null
  >(null);

  const handleDeleteProfile = useCallback(
    (profileId: string) => {
      const target = input.profileStore.profiles.find((item) => item.id === profileId);
      if (!target) {
        input.setStatusMessage("待删除画像不存在。");
        return;
      }
      if (input.profileStore.profiles.length <= 1) {
        input.setStatusMessage("至少保留一个策略画像，无法删除。");
        return;
      }

      const remainingProfiles = input.profileStore.profiles.filter(
        (item) => item.id !== profileId
      );
      const nextActiveId =
        input.profileStore.activeProfileId === profileId
          ? remainingProfiles[0]?.id ?? input.profileStore.activeProfileId
          : input.profileStore.activeProfileId;
      const nextActiveProfile =
        remainingProfiles.find((item) => item.id === nextActiveId) ??
        remainingProfiles[0] ??
        null;

      const nextStore = {
        ...input.profileStore,
        activeProfileId: nextActiveId,
        profiles: remainingProfiles
      } as TStore;
      input.setProfileStore(nextStore);

      setLastDeletedProfile({
        profile: target,
        wasActive: input.profileStore.activeProfileId === profileId,
        deletedAt: new Date().toISOString()
      });

      if (!nextActiveProfile) {
        input.setStatusMessage(`已删除策略画像：${target.label}`);
        return;
      }

      if (input.profileStore.activeProfileId === profileId) {
        input.onActivateProfileBundle(nextActiveProfile.bundle, nextActiveProfile.label);
        input.setStatusMessage(
          `已删除策略画像：${target.label}，并切换到 ${nextActiveProfile.label}`
        );
        return;
      }

      input.setStatusMessage(`已删除策略画像：${target.label}`);
    },
    [input]
  );

  const handleRestoreLastDeletedProfile = useCallback(() => {
    if (!lastDeletedProfile) {
      input.setStatusMessage("当前没有可恢复的删除记录。");
      return;
    }
    if (input.profileStore.profiles.length >= input.profileLimit) {
      input.setStatusMessage("画像数量已达上限，请先删除其他画像后再恢复。");
      return;
    }

    const existingIds = new Set(input.profileStore.profiles.map((item) => item.id));
    const restoredId = existingIds.has(lastDeletedProfile.profile.id)
      ? input.createUniqueProfileId(
          existingIds,
          `${lastDeletedProfile.profile.id}_restored`
        )
      : lastDeletedProfile.profile.id;
    const restoredLabel =
      restoredId === lastDeletedProfile.profile.id
        ? lastDeletedProfile.profile.label
        : `${lastDeletedProfile.profile.label}（恢复）`;
    const restoredBundle = input.buildProfileBundle(
      {
        ...lastDeletedProfile.profile.bundle,
        meta: {
          ...lastDeletedProfile.profile.bundle.meta,
          profileId: restoredId,
          profileLabel: restoredLabel
        }
      },
      restoredId,
      restoredLabel
    );
    const restoredProfile: TProfile = {
      ...lastDeletedProfile.profile,
      id: restoredId,
      label: restoredLabel,
      updatedAt: new Date().toISOString(),
      bundle: restoredBundle
    };

    const shouldActivate = lastDeletedProfile.wasActive;
    const nextProfiles = [restoredProfile, ...input.profileStore.profiles].slice(
      0,
      input.profileLimit
    );
    const nextActiveId = shouldActivate
      ? restoredProfile.id
      : input.profileStore.activeProfileId;

    input.setProfileStore({
      ...input.profileStore,
      activeProfileId: nextActiveId,
      profiles: nextProfiles
    } as TStore);

    if (shouldActivate) {
      input.onActivateProfileBundle(restoredBundle, restoredProfile.label);
    }

    setLastDeletedProfile(null);
    input.setStatusMessage(
      shouldActivate
        ? `已恢复并激活画像：${restoredProfile.label}`
        : `已恢复画像：${restoredProfile.label}`
    );
  }, [input, lastDeletedProfile]);

  return {
    lastDeletedProfile,
    handleDeleteProfile,
    handleRestoreLastDeletedProfile
  };
}

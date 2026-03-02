type BundleMetaLike<TAesthetic> = {
  profileId: string;
  profileLabel: string;
  storageEngine?: string;
  aestheticMode: TAesthetic;
};

type BundleLike<TAesthetic> = {
  version: number;
  updatedAt: string;
  meta: BundleMetaLike<TAesthetic>;
};

type ProfileLike<TBundle> = {
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

type ProfileStoreLoadResult<TStore> = {
  store: TStore;
  fromFallback: boolean;
};

type CreateProfileStoreHelpersInput<
  TBundle extends BundleLike<TAesthetic>,
  TAesthetic
> = {
  configSchemaVersion: number;
  profileStoreVersion: number;
  profileLimit: number;
  profileStoreStorageKey: string;
  createUniqueProfileId: (existingIds: Set<string>, seed?: string) => string;
  normalizeAestheticMode: (value: unknown) => TAesthetic;
  normalizeBundle: (input: unknown) => TBundle;
  normalizeConfigBundleMeta: (
    value?: Partial<TBundle["meta"]>
  ) => TBundle["meta"];
  buildDefaultBundle: () => TBundle;
};

export function createProfileStoreHelpers<
  TBundle extends BundleLike<TAesthetic>,
  TProfile extends ProfileLike<TBundle>,
  TStore extends ProfileStoreLike<TProfile>,
  TAesthetic
>(input: CreateProfileStoreHelpersInput<TBundle, TAesthetic>) {
  function buildProfileBundle(
    bundle: TBundle,
    profileId: string,
    profileLabel: string
  ): TBundle {
    const aestheticMode = input.normalizeAestheticMode(bundle.meta?.aestheticMode);
    const normalized = input.normalizeBundle({
      ...bundle,
      meta: {
        profileId,
        profileLabel,
        storageEngine: "localStorage",
        aestheticMode
      }
    });
    return {
      ...normalized,
      version: input.configSchemaVersion,
      updatedAt: new Date().toISOString(),
      meta: input.normalizeConfigBundleMeta({
        profileId,
        profileLabel,
        aestheticMode
      } as Partial<TBundle["meta"]>)
    };
  }

  function buildDefaultProfileStore(bundle: TBundle): TStore {
    const meta = input.normalizeConfigBundleMeta(bundle.meta);
    const now = new Date().toISOString();
    return {
      version: input.profileStoreVersion,
      activeProfileId: meta.profileId,
      profiles: [
        {
          id: meta.profileId,
          label: meta.profileLabel,
          createdAt: now,
          updatedAt: now,
          bundle: buildProfileBundle(bundle, meta.profileId, meta.profileLabel)
        } as TProfile
      ]
    } as TStore;
  }

  function normalizeProfileStorePayload(
    payload: {
      activeProfileId?: unknown;
      profiles?: unknown;
    },
    fallbackBundle: TBundle
  ): ProfileStoreLoadResult<TStore> {
    const sourceProfiles = Array.isArray(payload.profiles) ? payload.profiles : [];
    const existingIds = new Set<string>();
    const normalizedProfiles: TProfile[] = [];

    for (const rawItem of sourceProfiles) {
      const sourceItem =
        rawItem && typeof rawItem === "object"
          ? (rawItem as {
              id?: unknown;
              label?: unknown;
              createdAt?: unknown;
              updatedAt?: unknown;
              bundle?: unknown;
            })
          : {};
      const sourceBundle = input.normalizeBundle(sourceItem.bundle);
      const seedId =
        typeof sourceItem.id === "string" ? sourceItem.id : sourceBundle.meta.profileId;
      const profileId = input.createUniqueProfileId(
        existingIds,
        seedId || `profile_${normalizedProfiles.length + 1}`
      );
      existingIds.add(profileId);
      const profileLabel =
        typeof sourceItem.label === "string" && sourceItem.label.trim()
          ? sourceItem.label.trim().slice(0, 24)
          : sourceBundle.meta.profileLabel || `策略画像 ${normalizedProfiles.length + 1}`;
      const profileBundle = buildProfileBundle(sourceBundle, profileId, profileLabel);
      const updatedAt =
        typeof sourceItem.updatedAt === "string" && sourceItem.updatedAt
          ? sourceItem.updatedAt
          : profileBundle.updatedAt;
      const createdAt =
        typeof sourceItem.createdAt === "string" && sourceItem.createdAt
          ? sourceItem.createdAt
          : updatedAt;
      normalizedProfiles.push({
        id: profileId,
        label: profileLabel,
        createdAt,
        updatedAt,
        bundle: {
          ...profileBundle,
          updatedAt
        }
      } as TProfile);
      if (normalizedProfiles.length >= input.profileLimit) {
        break;
      }
    }

    if (normalizedProfiles.length === 0) {
      return {
        store: buildDefaultProfileStore(fallbackBundle),
        fromFallback: true
      };
    }

    const requestedActiveId =
      typeof payload.activeProfileId === "string" ? payload.activeProfileId : "";
    const activeProfileId = normalizedProfiles.some(
      (item) => item.id === requestedActiveId
    )
      ? requestedActiveId
      : normalizedProfiles[0].id;

    return {
      store: {
        version: input.profileStoreVersion,
        activeProfileId,
        profiles: normalizedProfiles
      } as TStore,
      fromFallback: false
    };
  }

  function buildProfileStoreFromStorage(
    fallbackBundle: TBundle
  ): ProfileStoreLoadResult<TStore> {
    try {
      const raw = window.localStorage.getItem(input.profileStoreStorageKey);
      if (!raw) {
        return {
          store: buildDefaultProfileStore(fallbackBundle),
          fromFallback: true
        };
      }
      const parsed = JSON.parse(raw) as {
        activeProfileId?: unknown;
        profiles?: unknown;
      };
      return normalizeProfileStorePayload(parsed, fallbackBundle);
    } catch {
      return {
        store: buildDefaultProfileStore(fallbackBundle),
        fromFallback: true
      };
    }
  }

  function writeProfileStoreToStorage(store: TStore) {
    window.localStorage.setItem(
      input.profileStoreStorageKey,
      JSON.stringify(store)
    );
  }

  return {
    buildProfileBundle,
    buildDefaultProfileStore,
    normalizeProfileStorePayload,
    buildProfileStoreFromStorage,
    writeProfileStoreToStorage
  };
}

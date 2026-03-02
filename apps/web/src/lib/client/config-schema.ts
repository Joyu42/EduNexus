export type AestheticMode = "obsidian_notebooklm" | "nebula" | "aurora";

export const CONFIG_SCHEMA_VERSION = 3;

export const DEFAULT_CONFIG_META = {
  profileId: "default",
  profileLabel: "默认学习策略包",
  storageEngine: "localStorage" as const,
  aestheticMode: "obsidian_notebooklm" as AestheticMode
};

type ConfigMigrationFn = (source: Record<string, unknown>) => Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function normalizeAestheticMode(value: unknown): AestheticMode {
  if (value === "nebula" || value === "aurora" || value === "obsidian_notebooklm") {
    return value;
  }
  return DEFAULT_CONFIG_META.aestheticMode;
}

export function resolveConfigVersion(value: unknown) {
  const normalized = Number(value);
  if (Number.isFinite(normalized) && normalized > 0) {
    return Math.floor(normalized);
  }
  return 1;
}

const CONFIG_MIGRATION_REGISTRY: Record<number, ConfigMigrationFn> = {
  1: (source) => {
    const sourceMeta = asRecord(source.meta);
    const profileId =
      typeof sourceMeta.profileId === "string" && sourceMeta.profileId.trim()
        ? sourceMeta.profileId.trim().slice(0, 36)
        : DEFAULT_CONFIG_META.profileId;
    const profileLabel =
      typeof sourceMeta.profileLabel === "string" && sourceMeta.profileLabel.trim()
        ? sourceMeta.profileLabel.trim().slice(0, 24)
        : DEFAULT_CONFIG_META.profileLabel;
    return {
      ...source,
      version: 2,
      meta: {
        ...sourceMeta,
        profileId,
        profileLabel,
        storageEngine: "localStorage"
      }
    };
  },
  2: (source) => {
    const sourceMeta = asRecord(source.meta);
    return {
      ...source,
      version: 3,
      meta: {
        ...sourceMeta,
        aestheticMode: normalizeAestheticMode(sourceMeta.aestheticMode)
      }
    };
  }
};

export function runBundleMigrations(input: unknown, targetVersion = CONFIG_SCHEMA_VERSION) {
  let payload = asRecord(input);
  let currentVersion = resolveConfigVersion(payload.version);
  const fromVersion = currentVersion;
  const migrationPath: string[] = [];

  if (currentVersion > targetVersion) {
    migrationPath.push(`v${currentVersion}->v${targetVersion}(normalize)`);
    return { payload, fromVersion, migrationPath };
  }

  while (currentVersion < targetVersion) {
    const migrate = CONFIG_MIGRATION_REGISTRY[currentVersion];
    if (!migrate) {
      migrationPath.push(`v${currentVersion}->v${targetVersion}(fallback)`);
      break;
    }
    const migratedPayload = asRecord(migrate(payload));
    const nextVersion = resolveConfigVersion(migratedPayload.version);
    migrationPath.push(`v${currentVersion}->v${nextVersion}`);
    payload = migratedPayload;
    if (nextVersion <= currentVersion) {
      break;
    }
    currentVersion = nextVersion;
  }

  return { payload, fromVersion, migrationPath };
}

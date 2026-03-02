type BundleMetaLike<TAesthetic> = {
  profileId: string;
  profileLabel: string;
  aestheticMode: TAesthetic;
  storageEngine?: string;
};

type DashboardLike<TAlertPolicy, TDashboardPreset, TDashboardRiskConfig> = {
  alertPolicy: TAlertPolicy;
  riskPreset: TDashboardPreset;
  riskConfig: TDashboardRiskConfig;
};

type WorkspaceLike<TWorkspacePreset, TWorkspaceConfig> = {
  replayPreset: TWorkspacePreset;
  replayConfig: TWorkspaceConfig;
};

type KbLike<TKbPreset, TKbConfig> = {
  chapterPreset: TKbPreset;
  chapterConfig: TKbConfig;
};

type BundleLike<
  TMeta,
  TAlertPolicy,
  TDashboardPreset,
  TDashboardRiskConfig,
  TWorkspacePreset,
  TWorkspaceConfig,
  TKbPreset,
  TKbConfig
> = {
  version: number;
  updatedAt: string;
  meta: TMeta;
  dashboard: DashboardLike<TAlertPolicy, TDashboardPreset, TDashboardRiskConfig>;
  workspace: WorkspaceLike<TWorkspacePreset, TWorkspaceConfig>;
  kb: KbLike<TKbPreset, TKbConfig>;
};

type ConfigLoadResult<TBundle> = {
  bundle: TBundle;
  migratedFrom: number | null;
  migrationPath: string[];
};

type CreateConfigBundleHelpersInput<
  TAesthetic,
  TMeta extends BundleMetaLike<TAesthetic>,
  TAlertPolicy extends string,
  TDashboardPreset extends string,
  TDashboardPresetOption extends TDashboardPreset,
  TDashboardRiskConfig,
  TWorkspacePreset extends string,
  TWorkspacePresetOption extends TWorkspacePreset,
  TWorkspaceConfig,
  TKbPreset extends string,
  TKbPresetOption extends TKbPreset,
  TKbConfig
> = {
  configSchemaVersion: number;
  defaultMeta: TMeta;
  defaultAlertPolicy: TAlertPolicy;
  defaultDashboardPreset: TDashboardPreset;
  defaultDashboardRiskConfig: TDashboardRiskConfig;
  defaultWorkspacePreset: TWorkspacePreset;
  defaultWorkspaceConfig: TWorkspaceConfig;
  defaultKbPreset: TKbPreset;
  defaultKbConfig: TKbConfig;
  dashboardRiskPresets: Record<TDashboardPresetOption, TDashboardRiskConfig>;
  workspacePresets: Record<TWorkspacePresetOption, TWorkspaceConfig>;
  kbPresets: Record<TKbPresetOption, TKbConfig>;
  normalizeAestheticMode: (value: unknown) => TAesthetic;
  runBundleMigrations: (input: unknown) => {
    payload: unknown;
    fromVersion: number;
    migrationPath: string[];
  };
  normalizeAlertPolicyMode: (value: string) => TAlertPolicy;
  normalizeAlertConfigPreset: (value: string) => TDashboardPreset;
  normalizeDashboardRiskConfig: (value?: unknown) => TDashboardRiskConfig;
  normalizeReplayPanelPreset: (value: string) => TWorkspacePreset;
  normalizeReplayPanelConfig: (value?: unknown) => TWorkspaceConfig;
  normalizeChapterPanelPreset: (value: string) => TKbPreset;
  normalizeChapterPanelConfig: (value?: unknown) => TKbConfig;
};

export function createConfigBundleHelpers<
  TAesthetic,
  TMeta extends BundleMetaLike<TAesthetic>,
  TAlertPolicy extends string,
  TDashboardPreset extends string,
  TDashboardPresetOption extends TDashboardPreset,
  TDashboardRiskConfig,
  TWorkspacePreset extends string,
  TWorkspacePresetOption extends TWorkspacePreset,
  TWorkspaceConfig,
  TKbPreset extends string,
  TKbPresetOption extends TKbPreset,
  TKbConfig
>(
  input: CreateConfigBundleHelpersInput<
    TAesthetic,
    TMeta,
    TAlertPolicy,
    TDashboardPreset,
    TDashboardPresetOption,
    TDashboardRiskConfig,
    TWorkspacePreset,
    TWorkspacePresetOption,
    TWorkspaceConfig,
    TKbPreset,
    TKbPresetOption,
    TKbConfig
  >
) {
  type TBundle = BundleLike<
    TMeta,
    TAlertPolicy,
    TDashboardPreset,
    TDashboardRiskConfig,
    TWorkspacePreset,
    TWorkspaceConfig,
    TKbPreset,
    TKbConfig
  >;

  function normalizeConfigBundleMeta(value?: Partial<TMeta>): TMeta {
    const profileId =
      typeof value?.profileId === "string" && value.profileId.trim()
        ? value.profileId.trim().slice(0, 36)
        : input.defaultMeta.profileId;
    const profileLabel =
      typeof value?.profileLabel === "string" && value.profileLabel.trim()
        ? value.profileLabel.trim().slice(0, 24)
        : input.defaultMeta.profileLabel;
    return {
      ...input.defaultMeta,
      profileId,
      profileLabel,
      storageEngine: "localStorage",
      aestheticMode: input.normalizeAestheticMode(value?.aestheticMode)
    } as TMeta;
  }

  function buildDefaultBundle(): TBundle {
    return {
      version: input.configSchemaVersion,
      updatedAt: new Date().toISOString(),
      meta: input.defaultMeta,
      dashboard: {
        alertPolicy: input.defaultAlertPolicy,
        riskPreset: input.defaultDashboardPreset,
        riskConfig: input.defaultDashboardRiskConfig
      },
      workspace: {
        replayPreset: input.defaultWorkspacePreset,
        replayConfig: input.defaultWorkspaceConfig
      },
      kb: {
        chapterPreset: input.defaultKbPreset,
        chapterConfig: input.defaultKbConfig
      }
    } as TBundle;
  }

  function normalizeBundleWithMigration(raw: unknown): ConfigLoadResult<TBundle> {
    const migrationResult = input.runBundleMigrations(raw);
    const source = migrationResult.payload as Partial<TBundle>;
    return {
      migratedFrom:
        migrationResult.migrationPath.length > 0 ? migrationResult.fromVersion : null,
      migrationPath: migrationResult.migrationPath,
      bundle: {
        version: input.configSchemaVersion,
        updatedAt: new Date().toISOString(),
        meta: normalizeConfigBundleMeta(source.meta),
        dashboard: {
          alertPolicy: input.normalizeAlertPolicyMode(
            (source.dashboard?.alertPolicy as string) ?? String(input.defaultAlertPolicy)
          ),
          riskPreset: input.normalizeAlertConfigPreset(
            (source.dashboard?.riskPreset as string) ??
              String(input.defaultDashboardPreset)
          ),
          riskConfig: input.normalizeDashboardRiskConfig(source.dashboard?.riskConfig)
        },
        workspace: {
          replayPreset: input.normalizeReplayPanelPreset(
            (source.workspace?.replayPreset as string) ??
              String(input.defaultWorkspacePreset)
          ),
          replayConfig: input.normalizeReplayPanelConfig(
            source.workspace?.replayConfig
          )
        },
        kb: {
          chapterPreset: input.normalizeChapterPanelPreset(
            (source.kb?.chapterPreset as string) ?? String(input.defaultKbPreset)
          ),
          chapterConfig: input.normalizeChapterPanelConfig(source.kb?.chapterConfig)
        }
      } as TBundle
    };
  }

  function normalizeBundle(raw: unknown): TBundle {
    return normalizeBundleWithMigration(raw).bundle;
  }

  function buildBundleSummary(bundle: TBundle) {
    return `Dashboard:${bundle.dashboard.riskPreset} · Workspace:${bundle.workspace.replayPreset} · KB:${bundle.kb.chapterPreset}`;
  }

  function createTemplateBundle(template: {
    profileId: string;
    profileLabel: string;
    alertPolicy: TAlertPolicy;
    dashboardPreset: TDashboardPresetOption;
    workspacePreset: TWorkspacePresetOption;
    kbPreset: TKbPresetOption;
  }): TBundle {
    return {
      version: input.configSchemaVersion,
      updatedAt: new Date().toISOString(),
      meta: normalizeConfigBundleMeta({
        profileId: template.profileId,
        profileLabel: template.profileLabel
      } as Partial<TMeta>),
      dashboard: {
        alertPolicy: template.alertPolicy,
        riskPreset: template.dashboardPreset,
        riskConfig: input.dashboardRiskPresets[template.dashboardPreset]
      },
      workspace: {
        replayPreset: template.workspacePreset,
        replayConfig: input.workspacePresets[template.workspacePreset]
      },
      kb: {
        chapterPreset: template.kbPreset,
        chapterConfig: input.kbPresets[template.kbPreset]
      }
    } as TBundle;
  }

  return {
    normalizeConfigBundleMeta,
    buildDefaultBundle,
    normalizeBundleWithMigration,
    normalizeBundle,
    buildBundleSummary,
    createTemplateBundle
  };
}

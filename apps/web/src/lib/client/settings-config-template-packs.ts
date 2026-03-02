import type {
  AlertConfigPreset,
  AlertPolicyMode,
  ChapterPanelPreset,
  ConfigBundle,
  ConfigTemplatePack,
  ReplayPanelPreset
} from "@/lib/client/settings-config-types";

type CreateTemplateBundleInput = {
  profileId: string;
  profileLabel: string;
  alertPolicy: AlertPolicyMode;
  dashboardPreset: Exclude<AlertConfigPreset, "custom">;
  workspacePreset: Exclude<ReplayPanelPreset, "custom">;
  kbPreset: Exclude<ChapterPanelPreset, "custom">;
};

type CreateTemplateBundle = (input: CreateTemplateBundleInput) => ConfigBundle;

export function buildConfigTemplatePacks(
  createTemplateBundle: CreateTemplateBundle
): ConfigTemplatePack[] {
  return [
    {
      key: "teaching_week",
      label: "教学周模板",
      description: "偏平衡，适合日常教学节奏，强调稳定跟踪与轻干预。",
      bundle: createTemplateBundle({
        profileId: "teaching_week",
        profileLabel: "教学周策略包",
        alertPolicy: "balanced",
        dashboardPreset: "balanced",
        workspacePreset: "balanced",
        kbPreset: "balanced"
      })
    },
    {
      key: "exam_month",
      label: "月考备战模板",
      description: "偏主动干预，扩大预警覆盖，强化深度回放与章节洞察。",
      bundle: createTemplateBundle({
        profileId: "exam_month",
        profileLabel: "月考备战策略包",
        alertPolicy: "strict",
        dashboardPreset: "intervene",
        workspacePreset: "deep",
        kbPreset: "insight"
      })
    },
    {
      key: "sprint_week",
      label: "冲刺周模板",
      description: "强调执行效率，回放节奏更快，章节视图更聚焦关键点。",
      bundle: createTemplateBundle({
        profileId: "sprint_week",
        profileLabel: "冲刺周策略包",
        alertPolicy: "strict",
        dashboardPreset: "quiet",
        workspacePreset: "quick",
        kbPreset: "light"
      })
    }
  ];
}

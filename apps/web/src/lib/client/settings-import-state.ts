import {
  buildProfileImportPlan,
  normalizeProfileImportPayload,
  normalizeProfileStoreImportPayload,
  type ProfileImportDuplicateStrategy,
  type ProfileImportMode
} from "@/lib/client/profile-import";

export type JsonImportPreviewKind =
  | "bundle"
  | "profile"
  | "profile_store"
  | "invalid"
  | "unknown";

export type JsonImportPreview = {
  kind: JsonImportPreviewKind;
  profileCount: number;
  appendCount: number;
  overwriteCount: number;
  overwriteTargets: Array<{ id: string; label: string }>;
  effectiveImportCount: number;
  truncatedCount: number;
  duplicateEntryCount: number;
  overwriteShadowCount: number;
  duplicateGroups: Array<{
    id: string;
    occurrences: number;
    strategy: ProfileImportDuplicateStrategy;
    sampleLabels: string[];
  }>;
  conflictRows: JsonImportConflictRow[];
  hiddenConflictRowCount: number;
  summary: string;
};

export type JsonImportConflictRow = {
  sourceIndex: number;
  baseId: string;
  targetId: string;
  action: "append" | "overwrite";
  strategy: ProfileImportDuplicateStrategy;
};

export type JsonImportHintTone = "info" | "success" | "warning" | "error";

export type JsonImportActionState = {
  shouldBlockOverwriteImport: boolean;
  canApplyBundleFromJson: boolean;
  canImportProfileFromJson: boolean;
  canImportProfileStoreFromJson: boolean;
  hint: {
    tone: JsonImportHintTone;
    text: string;
  };
};

function buildJsonImportPreviewBase(
  kind: JsonImportPreviewKind,
  summary: string
): JsonImportPreview {
  return {
    kind,
    profileCount: 0,
    appendCount: 0,
    overwriteCount: 0,
    overwriteTargets: [],
    effectiveImportCount: 0,
    truncatedCount: 0,
    duplicateEntryCount: 0,
    overwriteShadowCount: 0,
    duplicateGroups: [],
    conflictRows: [],
    hiddenConflictRowCount: 0,
    summary
  };
}

export function buildJsonImportPreview(input: {
  jsonDraft: string;
  profileImportMode: ProfileImportMode;
  existingProfiles: Array<{ id: string; label: string }>;
  profileLimit: number;
}): JsonImportPreview | null {
  const draft = input.jsonDraft.trim();
  if (!draft) {
    return null;
  }

  try {
    const parsed = JSON.parse(draft) as unknown;
    const storeDrafts = normalizeProfileStoreImportPayload(parsed);
    const singleDraft = normalizeProfileImportPayload(parsed);
    if (storeDrafts.length > 0 || singleDraft) {
      const drafts = (storeDrafts.length > 0 ? storeDrafts : [singleDraft]).filter(
        (item): item is NonNullable<typeof item> => item !== null
      );
      const plan = buildProfileImportPlan({
        drafts,
        existingProfiles: input.existingProfiles,
        importMode: input.profileImportMode,
        profileLimit: input.profileLimit,
        fallbackLabelPrefix: "import_profile"
      });
      const kind: JsonImportPreviewKind =
        storeDrafts.length > 0 ? "profile_store" : "profile";
      const duplicateStrategyMap = new Map(
        plan.duplicateGroups.map((item) => [item.id, item.strategy])
      );
      const conflictRows = plan.operations
        .filter((item) => duplicateStrategyMap.has(item.baseId))
        .map((item) => ({
          sourceIndex: item.sourceIndex + 1,
          baseId: item.baseId,
          targetId: item.targetId,
          action: item.action,
          strategy:
            duplicateStrategyMap.get(item.baseId) ?? ("append_renamed" as const)
        }));
      const conflictRowPreviewLimit = 18;
      return {
        ...buildJsonImportPreviewBase(
          kind,
          kind === "profile_store"
            ? `检测到画像仓库，共 ${drafts.length} 条画像。`
            : "检测到单画像配置。"
        ),
        profileCount: drafts.length,
        appendCount: plan.appendCount,
        overwriteCount: plan.overwriteCount,
        overwriteTargets: plan.overwriteTargets,
        effectiveImportCount: plan.effectiveImportCount,
        truncatedCount: plan.truncatedCount,
        duplicateEntryCount: plan.duplicateEntryCount,
        overwriteShadowCount: plan.overwriteShadowCount,
        duplicateGroups: plan.duplicateGroups,
        conflictRows: conflictRows.slice(0, conflictRowPreviewLimit),
        hiddenConflictRowCount: Math.max(
          0,
          conflictRows.length - conflictRowPreviewLimit
        )
      };
    }

    const maybeBundle =
      parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : null;
    if (
      maybeBundle &&
      "dashboard" in maybeBundle &&
      "workspace" in maybeBundle &&
      "kb" in maybeBundle
    ) {
      return buildJsonImportPreviewBase(
        "bundle",
        "检测到统一配置包，可直接“从 JSON 应用”。"
      );
    }
    return buildJsonImportPreviewBase(
      "unknown",
      "JSON 结构可解析，但未识别为配置包或画像包。"
    );
  } catch {
    return buildJsonImportPreviewBase("invalid", "JSON 格式错误，无法解析。");
  }
}

export function buildJsonImportActionState(input: {
  preview: JsonImportPreview | null;
  profileImportMode: ProfileImportMode;
  confirmOverwriteImport: boolean;
}): JsonImportActionState {
  const shouldBlockOverwriteImport =
    input.profileImportMode === "overwrite" &&
    (input.preview?.overwriteCount ?? 0) > 0 &&
    !input.confirmOverwriteImport;

  const canApplyBundleFromJson = input.preview?.kind === "bundle";
  const canImportProfileFromJson =
    input.preview?.kind === "profile" &&
    input.preview.effectiveImportCount > 0 &&
    !shouldBlockOverwriteImport;
  const canImportProfileStoreFromJson =
    input.preview?.kind === "profile_store" &&
    input.preview.effectiveImportCount > 0 &&
    !shouldBlockOverwriteImport;

  if (!input.preview) {
    return {
      shouldBlockOverwriteImport,
      canApplyBundleFromJson,
      canImportProfileFromJson,
      canImportProfileStoreFromJson,
      hint: { tone: "info", text: "粘贴 JSON 后会自动识别可执行操作。" }
    };
  }
  if (input.preview.kind === "invalid") {
    return {
      shouldBlockOverwriteImport,
      canApplyBundleFromJson,
      canImportProfileFromJson,
      canImportProfileStoreFromJson,
      hint: { tone: "error", text: "JSON 解析失败：请先修复格式错误再导入。" }
    };
  }
  if (input.preview.kind === "unknown") {
    return {
      shouldBlockOverwriteImport,
      canApplyBundleFromJson,
      canImportProfileFromJson,
      canImportProfileStoreFromJson,
      hint: {
        tone: "warning",
        text: "当前结构未识别：请使用配置包、单画像包或画像仓库导出文件。"
      }
    };
  }
  if (shouldBlockOverwriteImport) {
    return {
      shouldBlockOverwriteImport,
      canApplyBundleFromJson,
      canImportProfileFromJson,
      canImportProfileStoreFromJson,
      hint: {
        tone: "warning",
        text: "覆盖模式已检测到同 ID 画像，请先勾选“确认覆盖已存在画像”。"
      }
    };
  }
  if (
    (input.preview.kind === "profile" || input.preview.kind === "profile_store") &&
    input.preview.overwriteShadowCount > 0
  ) {
    return {
      shouldBlockOverwriteImport,
      canApplyBundleFromJson,
      canImportProfileFromJson,
      canImportProfileStoreFromJson,
      hint: {
        tone: "warning",
        text: `同批导入中存在 ${input.preview.overwriteShadowCount} 条重复目标，覆盖模式将按顺序保留最后一条。`
      }
    };
  }
  if (input.preview.kind === "bundle") {
    return {
      shouldBlockOverwriteImport,
      canApplyBundleFromJson,
      canImportProfileFromJson,
      canImportProfileStoreFromJson,
      hint: { tone: "success", text: "可直接点击“从 JSON 应用”。" }
    };
  }
  if (input.preview.effectiveImportCount === 0) {
    return {
      shouldBlockOverwriteImport,
      canApplyBundleFromJson,
      canImportProfileFromJson,
      canImportProfileStoreFromJson,
      hint: {
        tone: "warning",
        text: "可导入画像数量为 0，请检查导入内容或清理现有画像后重试。"
      }
    };
  }
  return {
    shouldBlockOverwriteImport,
    canApplyBundleFromJson,
    canImportProfileFromJson,
    canImportProfileStoreFromJson,
    hint: {
      tone: "success",
      text:
        input.preview.kind === "profile_store"
          ? "可执行画像仓库导入。"
          : "可执行单画像导入。"
    }
  };
}

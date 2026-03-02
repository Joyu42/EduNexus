import { useCallback, useState } from "react";
import {
  buildProfileImportPlan,
  normalizeProfileImportPayload,
  normalizeProfileStoreImportPayload,
  type ImportedProfileDraft,
  type ProfileImportMode,
  type ProfileImportPlan
} from "@/lib/client/profile-import";
import { buildImportConflictCsv } from "@/lib/client/settings-import-export";
import type { JsonImportConflictRow } from "@/lib/client/settings-import-state";

export type PendingImportConfirm = {
  sourceLabel: "单画像" | "画像仓库";
  importMode: ProfileImportMode;
  drafts: ImportedProfileDraft[];
  plan: ProfileImportPlan;
};

type UseJsonProfileImportInput = {
  jsonDraft: string;
  profileImportMode: ProfileImportMode;
  confirmOverwriteImport: boolean;
  setProfileImportMode: (mode: ProfileImportMode) => void;
  setConfirmOverwriteImport: (value: boolean) => void;
  existingProfiles: Array<{ id: string; label: string }>;
  profileLimit: number;
  filteredImportConflictRows: JsonImportConflictRow[];
  setStatusMessage: (message: string) => void;
  onDownloadCsv: (content: string, filename: string) => void;
  onApplyImportedProfiles: (
    drafts: ImportedProfileDraft[],
    sourceLabel: "单画像" | "画像仓库",
    importModeOverride?: ProfileImportMode
  ) => void;
};

export function useJsonProfileImport(input: UseJsonProfileImportInput) {
  const {
    jsonDraft,
    profileImportMode,
    confirmOverwriteImport,
    setProfileImportMode,
    setConfirmOverwriteImport,
    existingProfiles,
    profileLimit,
    filteredImportConflictRows,
    setStatusMessage,
    onDownloadCsv,
    onApplyImportedProfiles
  } = input;
  const [pendingImportConfirm, setPendingImportConfirm] =
    useState<PendingImportConfirm | null>(null);

  const buildImportPlanForDrafts = useCallback(
    (drafts: ImportedProfileDraft[], importMode: ProfileImportMode) =>
      buildProfileImportPlan({
        drafts,
        existingProfiles,
        importMode,
        profileLimit,
        fallbackLabelPrefix: "import_profile"
      }),
    [existingProfiles, profileLimit]
  );

  const requestImportConfirm = useCallback(
    (
      drafts: ImportedProfileDraft[],
      sourceLabel: "单画像" | "画像仓库"
    ) => {
      if (drafts.length === 0) {
        setStatusMessage(`${sourceLabel}导入失败：未识别到有效画像数据。`);
        return;
      }
      const plan = buildImportPlanForDrafts(drafts, profileImportMode);
      if (
        profileImportMode === "overwrite" &&
        plan.overwriteCount > 0 &&
        !confirmOverwriteImport
      ) {
        const overwriteLabels = plan.overwriteTargets
          .slice(0, 5)
          .map((item) => `${item.label}(${item.id})`)
          .join("、");
        setStatusMessage(
          `检测到将覆盖 ${plan.overwriteCount} 条画像：${overwriteLabels}。请先勾选“确认覆盖已存在画像”。`
        );
        return;
      }
      setPendingImportConfirm({
        sourceLabel,
        importMode: profileImportMode,
        drafts,
        plan
      });
    },
    [
      buildImportPlanForDrafts,
      confirmOverwriteImport,
      profileImportMode,
      setStatusMessage
    ]
  );

  const handleCancelPendingImport = useCallback(() => {
    setPendingImportConfirm(null);
  }, []);

  const handleConfirmPendingImport = useCallback(() => {
    if (!pendingImportConfirm) {
      return;
    }
    const { drafts, sourceLabel, importMode } = pendingImportConfirm;
    setPendingImportConfirm(null);
    onApplyImportedProfiles(drafts, sourceLabel, importMode);
  }, [onApplyImportedProfiles, pendingImportConfirm]);

  const handleConvertPendingImportToAppend = useCallback(() => {
    if (!pendingImportConfirm) {
      return;
    }
    const nextMode: ProfileImportMode = "append";
    const nextPlan = buildImportPlanForDrafts(pendingImportConfirm.drafts, nextMode);
    setProfileImportMode(nextMode);
    setConfirmOverwriteImport(false);
    setPendingImportConfirm({
      ...pendingImportConfirm,
      importMode: nextMode,
      plan: nextPlan
    });
    setStatusMessage("已切换为新增导入模式，请确认后继续。");
  }, [
    buildImportPlanForDrafts,
    setConfirmOverwriteImport,
    setProfileImportMode,
    setStatusMessage,
    pendingImportConfirm
  ]);

  const handleImportProfileFromJson = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonDraft) as unknown;
      const payload = normalizeProfileImportPayload(parsed);
      if (!payload) {
        setStatusMessage("当前 JSON 不是画像包格式，请使用 profile 导出文件。");
        return;
      }
      requestImportConfirm([payload], "单画像");
    } catch {
      setStatusMessage("JSON 解析失败，画像导入未执行。");
    }
  }, [jsonDraft, requestImportConfirm, setStatusMessage]);

  const handleImportProfileStoreFromJson = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonDraft) as unknown;
      const drafts = normalizeProfileStoreImportPayload(parsed);
      if (drafts.length === 0) {
        setStatusMessage(
          "当前 JSON 不是画像仓库格式，请使用画像仓库导出文件。"
        );
        return;
      }
      requestImportConfirm(drafts, "画像仓库");
    } catch {
      setStatusMessage("JSON 解析失败，画像仓库导入未执行。");
    }
  }, [jsonDraft, requestImportConfirm, setStatusMessage]);

  const handleExportFilteredConflictCsv = useCallback(() => {
    if (filteredImportConflictRows.length === 0) {
      setStatusMessage("当前筛选条件下没有可导出的冲突项。");
      return;
    }
    const content = buildImportConflictCsv(filteredImportConflictRows);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    onDownloadCsv(content, `edunexus-import-conflicts-${stamp}.csv`);
    setStatusMessage(
      `已导出冲突明细 CSV：${filteredImportConflictRows.length} 条。`
    );
  }, [
    filteredImportConflictRows,
    onDownloadCsv,
    setStatusMessage
  ]);

  return {
    pendingImportConfirm,
    handleCancelPendingImport,
    handleConfirmPendingImport,
    handleConvertPendingImportToAppend,
    handleImportProfileFromJson,
    handleImportProfileStoreFromJson,
    handleExportFilteredConflictCsv
  };
}

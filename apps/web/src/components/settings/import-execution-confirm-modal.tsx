import type {
  ProfileImportMode,
  ProfileImportPlan
} from "@/lib/client/profile-import";

type ImportExecutionConfirmModalProps = {
  open: boolean;
  sourceLabel: "单画像" | "画像仓库";
  importMode: ProfileImportMode;
  plan: ProfileImportPlan;
  onConvertToAppend: () => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ImportExecutionConfirmModal({
  open,
  sourceLabel,
  importMode,
  plan,
  onConvertToAppend,
  onCancel,
  onConfirm
}: ImportExecutionConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="config-import-modal-mask" onClick={onCancel}>
      <article
        className="config-import-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <strong>确认执行导入</strong>
          <span>
            来源：{sourceLabel} · 模式：{importMode === "overwrite" ? "覆盖" : "新增"}
          </span>
        </header>
        <p>
          本次将导入 {plan.profileCount} 条，预计新增 {plan.appendCount} 条，覆盖{" "}
          {plan.overwriteCount} 条，实际写入 {plan.effectiveImportCount} 条。
        </p>
        {plan.overwriteTargets.length > 0 ? (
          <p>
            覆盖目标：
            {plan.overwriteTargets
              .slice(0, 8)
              .map((item) => `${item.label}(${item.id})`)
              .join("、")}
          </p>
        ) : null}
        {plan.truncatedCount > 0 ? (
          <p className="warning">
            注意：超过上限后将截断 {plan.truncatedCount} 条。
          </p>
        ) : null}
        {plan.duplicateEntryCount > 0 ? (
          <p>
            同批重复 {plan.duplicateEntryCount} 条
            {plan.overwriteShadowCount > 0
              ? `（覆盖模式后者生效 ${plan.overwriteShadowCount} 条）`
              : "（新增模式自动改名）"}
            。
          </p>
        ) : null}
        <div className="config-import-modal-actions">
          {importMode === "overwrite" && plan.overwriteCount > 0 ? (
            <button type="button" onClick={onConvertToAppend}>
              仅导入新增项
            </button>
          ) : null}
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button type="button" onClick={onConfirm}>
            确认导入
          </button>
        </div>
      </article>
    </div>
  );
}

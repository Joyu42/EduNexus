import type {
  ImportRollbackChangeFilter,
  ImportRollbackImpact,
  ImportRollbackProfileChange
} from "@/lib/client/settings-import-rollback";

type ImportRollbackConfirmModalProps = {
  open: boolean;
  sourceLabel: "单画像" | "画像仓库";
  timeLabel: string;
  impact: ImportRollbackImpact;
  allChangesCount: number;
  filteredChanges: ImportRollbackProfileChange[];
  changeFilter: ImportRollbackChangeFilter;
  keyword: string;
  onChangeFilter: (value: ImportRollbackChangeFilter) => void;
  onChangeKeyword: (value: string) => void;
  onExportCsv: () => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ImportRollbackConfirmModal({
  open,
  sourceLabel,
  timeLabel,
  impact,
  allChangesCount,
  filteredChanges,
  changeFilter,
  keyword,
  onChangeFilter,
  onChangeKeyword,
  onExportCsv,
  onCancel,
  onConfirm
}: ImportRollbackConfirmModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="config-import-modal-mask" onClick={onCancel}>
      <article
        className="config-import-modal config-import-rollback-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <strong>确认回滚导入快照</strong>
          <span>
            {sourceLabel} · {timeLabel}
          </span>
        </header>
        <p>
          回滚后将恢复导入前状态：画像 +{impact.addProfileCount} / -
          {impact.removeProfileCount} / 变更 {impact.updateProfileCount}，参数差异{" "}
          {impact.bundleDiffCount} 项。
        </p>
        {impact.activeProfileChanged ? (
          <p className="warning">
            活跃画像将从 {impact.activeProfileFrom} 切换到 {impact.activeProfileTo}。
          </p>
        ) : null}
        {allChangesCount > 0 ? (
          <div className="config-import-rollback-section">
            <div className="config-import-rollback-tools">
              <select
                value={changeFilter}
                onChange={(event) =>
                  onChangeFilter(event.target.value as ImportRollbackChangeFilter)
                }
              >
                <option value="all">全部差异</option>
                <option value="add">仅新增回补</option>
                <option value="remove">仅移除恢复</option>
                <option value="update">仅画像更新</option>
              </select>
              <input
                value={keyword}
                onChange={(event) => onChangeKeyword(event.target.value)}
                placeholder="搜索画像 ID / 标签"
              />
              <button
                type="button"
                onClick={onExportCsv}
                disabled={filteredChanges.length === 0}
              >
                导出差异 CSV
              </button>
            </div>
            {filteredChanges.length === 0 ? (
              <p className="muted">当前筛选条件下无差异项，请调整筛选条件。</p>
            ) : (
              <div className="config-import-rollback-change-list">
                {filteredChanges.slice(0, 24).map((change) => (
                  <p
                    key={`rollback_change_${change.change}_${change.id}`}
                    className={`config-import-rollback-change-row ${change.change}`}
                  >
                    {change.change === "add"
                      ? "新增回补"
                      : change.change === "remove"
                        ? "移除恢复"
                        : "画像更新"}
                    ：{change.id} · {change.currentLabel} → {change.targetLabel}
                  </p>
                ))}
                {filteredChanges.length > 24 ? (
                  <p className="muted">
                    仅展示前 24 条差异，剩余 {filteredChanges.length - 24} 条请以回滚结果为准。
                  </p>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <p className="muted">当前未检测到画像增删改，主要为参数差异回滚。</p>
        )}
        <div className="config-import-modal-actions">
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button type="button" onClick={onConfirm}>
            确认回滚
          </button>
        </div>
      </article>
    </div>
  );
}

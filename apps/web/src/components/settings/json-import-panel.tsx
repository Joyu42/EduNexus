import type { ProfileImportMode } from "@/lib/client/profile-import";
import type {
  JsonImportConflictRow,
  JsonImportHintTone,
  JsonImportPreview
} from "@/lib/client/settings-import-state";

type ImportConflictActionFilter = "all" | "append" | "overwrite";

type JsonImportPanelProps = {
  jsonDraft: string;
  onJsonDraftChange: (value: string) => void;
  profileImportMode: ProfileImportMode;
  onProfileImportModeChange: (value: ProfileImportMode) => void;
  activateImportedProfile: boolean;
  onActivateImportedProfileChange: (value: boolean) => void;
  confirmOverwriteImport: boolean;
  onConfirmOverwriteImportChange: (value: boolean) => void;
  importHint: { tone: JsonImportHintTone; text: string };
  importPreview: JsonImportPreview | null;
  profileLimit: number;
  showImportConflictDetails: boolean;
  onToggleImportConflictDetails: () => void;
  filteredImportConflictRows: JsonImportConflictRow[];
  importConflictSearch: string;
  onImportConflictSearchChange: (value: string) => void;
  importConflictActionFilter: ImportConflictActionFilter;
  onImportConflictActionFilterChange: (value: ImportConflictActionFilter) => void;
  onExportFilteredConflictCsv: () => void;
  formatImportActionLabel: (action: "append" | "overwrite") => string;
  formatDuplicateStrategyLabel: (
    strategy: "append_renamed" | "overwrite_last_wins"
  ) => string;
  canApplyBundleFromJson: boolean;
  canImportProfileFromJson: boolean;
  canImportProfileStoreFromJson: boolean;
  onApplyJson: () => void;
  onImportProfile: () => void;
  onImportProfileStore: () => void;
  onFillCurrentBundleJson: () => void;
};

export function JsonImportPanel({
  jsonDraft,
  onJsonDraftChange,
  profileImportMode,
  onProfileImportModeChange,
  activateImportedProfile,
  onActivateImportedProfileChange,
  confirmOverwriteImport,
  onConfirmOverwriteImportChange,
  importHint,
  importPreview,
  profileLimit,
  showImportConflictDetails,
  onToggleImportConflictDetails,
  filteredImportConflictRows,
  importConflictSearch,
  onImportConflictSearchChange,
  importConflictActionFilter,
  onImportConflictActionFilterChange,
  onExportFilteredConflictCsv,
  formatImportActionLabel,
  formatDuplicateStrategyLabel,
  canApplyBundleFromJson,
  canImportProfileFromJson,
  canImportProfileStoreFromJson,
  onApplyJson,
  onImportProfile,
  onImportProfileStore,
  onFillCurrentBundleJson
}: JsonImportPanelProps) {
  return (
    <article className="panel wide">
      <h3>JSON 导入导出</h3>
      <div className="demo-form">
        <textarea
          className="config-json"
          rows={14}
          value={jsonDraft}
          onChange={(event) => onJsonDraftChange(event.target.value)}
          placeholder="粘贴配置 JSON 后点击“从 JSON 应用”"
        />
        <div className="config-json-import-options">
          <label>画像导入模式</label>
          <select
            value={profileImportMode}
            onChange={(event) =>
              onProfileImportModeChange(event.target.value as ProfileImportMode)
            }
          >
            <option value="append">新增（自动新 ID）</option>
            <option value="overwrite">覆盖同 ID 画像</option>
          </select>
          <label className="config-check-label">
            <input
              type="checkbox"
              checked={activateImportedProfile}
              onChange={(event) =>
                onActivateImportedProfileChange(event.target.checked)
              }
            />
            导入后自动切换到该画像
          </label>
          {profileImportMode === "overwrite" ? (
            <label className="config-check-label">
              <input
                type="checkbox"
                checked={confirmOverwriteImport}
                onChange={(event) =>
                  onConfirmOverwriteImportChange(event.target.checked)
                }
              />
              确认覆盖已存在画像
            </label>
          ) : null}
        </div>
        <p className={`config-import-hint ${importHint.tone}`}>{importHint.text}</p>
        {importPreview ? (
          <div className={`config-import-preview ${importPreview.kind}`}>
            <strong>{importPreview.summary}</strong>
            {importPreview.kind === "profile" ||
            importPreview.kind === "profile_store" ? (
              <>
                <p>
                  新增 {importPreview.appendCount} · 覆盖 {importPreview.overwriteCount} ·
                  总计 {importPreview.profileCount} · 实际导入{" "}
                  {importPreview.effectiveImportCount}
                </p>
                {importPreview.truncatedCount > 0 ? (
                  <p>
                    注意：由于画像上限 {profileLimit}，将截断{" "}
                    {importPreview.truncatedCount} 条导入结果。
                  </p>
                ) : null}
                {importPreview.overwriteTargets.length > 0 ? (
                  <p>
                    覆盖目标：
                    {importPreview.overwriteTargets
                      .map((item) => `${item.label}(${item.id})`)
                      .join("、")}
                  </p>
                ) : null}
                {importPreview.duplicateEntryCount > 0 ? (
                  <p>
                    同批重复 ID {importPreview.duplicateEntryCount} 条
                    {importPreview.overwriteShadowCount > 0
                      ? `，覆盖模式将保留最后一条（影响 ${importPreview.overwriteShadowCount} 条）`
                      : "，新增模式会自动改名。"}
                  </p>
                ) : null}
                {importPreview.duplicateGroups.length > 0 ? (
                  <div className="config-import-duplicate-list">
                    {importPreview.duplicateGroups.slice(0, 6).map((item) => (
                      <span key={`dup_${item.id}`}>
                        {item.id} × {item.occurrences}
                      </span>
                    ))}
                  </div>
                ) : null}
                {importPreview.conflictRows.length > 0 ? (
                  <div className="config-import-conflict-panel">
                    <div className="config-import-conflict-head">
                      <div className="config-import-conflict-head-main">
                        <button
                          type="button"
                          className={`config-import-conflict-toggle ${
                            showImportConflictDetails ? "active" : ""
                          }`}
                          onClick={onToggleImportConflictDetails}
                        >
                          {showImportConflictDetails ? "收起冲突明细" : "展开冲突明细"}
                        </button>
                        <span className="config-import-conflict-count">
                          冲突明细 {filteredImportConflictRows.length}/
                          {importPreview.conflictRows.length}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="config-import-conflict-export"
                        onClick={onExportFilteredConflictCsv}
                      >
                        导出冲突 CSV
                      </button>
                    </div>
                    {importPreview.hiddenConflictRowCount > 0 ? (
                      <span className="config-import-conflict-hint">
                        仅预览前 {importPreview.conflictRows.length} 条，剩余{" "}
                        {importPreview.hiddenConflictRowCount} 条请以导入结果为准。
                      </span>
                    ) : null}
                    {showImportConflictDetails ? (
                      <div className="config-import-conflict-details">
                        <div className="config-import-conflict-filters">
                          <input
                            value={importConflictSearch}
                            onChange={(event) =>
                              onImportConflictSearchChange(event.target.value)
                            }
                            placeholder="搜索序号 / 原始 ID / 目标 ID"
                          />
                          <select
                            value={importConflictActionFilter}
                            onChange={(event) =>
                              onImportConflictActionFilterChange(
                                event.target.value as ImportConflictActionFilter
                              )
                            }
                          >
                            <option value="all">全部处理</option>
                            <option value="append">仅新增</option>
                            <option value="overwrite">仅覆盖</option>
                          </select>
                        </div>
                        <div className="config-import-conflict-table-wrap">
                          <table className="config-import-conflict-table">
                            <thead>
                              <tr>
                                <th>序号</th>
                                <th>原始 ID</th>
                                <th>目标 ID</th>
                                <th>处理</th>
                                <th>策略</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredImportConflictRows.length === 0 ? (
                                <tr>
                                  <td colSpan={5}>
                                    当前筛选条件下没有冲突项，请调整关键词或处理类型。
                                  </td>
                                </tr>
                              ) : (
                                filteredImportConflictRows.map((row) => (
                                  <tr
                                    key={`${row.sourceIndex}_${row.baseId}_${row.targetId}`}
                                  >
                                    <td>#{row.sourceIndex}</td>
                                    <td>{row.baseId}</td>
                                    <td>{row.targetId}</td>
                                    <td>{formatImportActionLabel(row.action)}</td>
                                    <td>
                                      {formatDuplicateStrategyLabel(row.strategy)}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
        <div className="config-toolbar">
          <button
            type="button"
            onClick={onApplyJson}
            disabled={!canApplyBundleFromJson}
            title={
              canApplyBundleFromJson
                ? "应用当前 JSON 为统一配置包"
                : "仅当识别为统一配置包时可用"
            }
          >
            从 JSON 应用
          </button>
          <button
            type="button"
            onClick={onImportProfile}
            disabled={!canImportProfileFromJson}
            title={
              canImportProfileFromJson
                ? "导入单画像包"
                : "需识别为单画像并满足覆盖确认条件"
            }
          >
            导入为策略画像
          </button>
          <button
            type="button"
            onClick={onImportProfileStore}
            disabled={!canImportProfileStoreFromJson}
            title={
              canImportProfileStoreFromJson
                ? "导入画像仓库"
                : "需识别为画像仓库并满足覆盖确认条件"
            }
          >
            导入画像仓库
          </button>
          <button type="button" onClick={onFillCurrentBundleJson}>
            用当前配置覆盖 JSON
          </button>
        </div>
        <p className="muted">
          支持导入旧配置：系统会自动按 v1/v2/v3 迁移注册表校验并补齐字段。支持单画像与整仓库导入（新增或覆盖）。
        </p>
      </div>
    </article>
  );
}

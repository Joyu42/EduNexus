import type { ProfileImportMode } from "@/lib/client/profile-import";
import type {
  ImportAuditFilterMode,
  ImportAuditFilterSource
} from "@/lib/client/settings-import-audit";
import type { ImportRollbackImpact } from "@/lib/client/settings-import-rollback";
import type { ImportAuditQuickRange } from "@/components/settings/use-import-audit-filters";

type ImportAuditItemViewBase = {
  id: string;
  at: string;
  sourceLabel: "单画像" | "画像仓库";
  importMode: ProfileImportMode;
  summary: string;
  effectiveImportCount: number;
  truncatedCount: number;
  duplicateEntryCount: number;
  overwriteShadowCount: number;
};

type ImportAuditRollbackSummary = {
  impact: ImportRollbackImpact;
  changesCount: number;
};

type ImportAuditLogPanelProps<TItem extends ImportAuditItemViewBase> = {
  log: TItem[];
  filteredLog: TItem[];
  limit: number;
  sourceFilter: ImportAuditFilterSource;
  modeFilter: ImportAuditFilterMode;
  keyword: string;
  dateFrom: string;
  dateTo: string;
  quickRange: ImportAuditQuickRange;
  rollbackSummaryMap: Map<string, ImportAuditRollbackSummary>;
  formatTime: (value: string) => string;
  onSourceFilterChange: (value: ImportAuditFilterSource) => void;
  onModeFilterChange: (value: ImportAuditFilterMode) => void;
  onKeywordChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onApplyQuickRange: (value: Exclude<ImportAuditQuickRange, "all">) => void;
  onResetFilters: () => void;
  onImportFromDraft: () => void;
  onExportFilteredJson: () => void;
  onClearLog: () => void;
  onExportSingle: (item: TItem) => void;
  onRequestRollback: (item: TItem) => void;
};

export function ImportAuditLogPanel<TItem extends ImportAuditItemViewBase>({
  log,
  filteredLog,
  limit,
  sourceFilter,
  modeFilter,
  keyword,
  dateFrom,
  dateTo,
  quickRange,
  rollbackSummaryMap,
  formatTime,
  onSourceFilterChange,
  onModeFilterChange,
  onKeywordChange,
  onDateFromChange,
  onDateToChange,
  onApplyQuickRange,
  onResetFilters,
  onImportFromDraft,
  onExportFilteredJson,
  onClearLog,
  onExportSingle,
  onRequestRollback
}: ImportAuditLogPanelProps<TItem>) {
  return (
    <article className="panel wide">
      <h3>导入操作日志</h3>
      <div className="config-history-head">
        <span>
          最近 {filteredLog.length}/{log.length} 条（最多 {limit} 条）
        </span>
        <div className="config-import-log-head-actions">
          <button
            type="button"
            className="config-import-log-import"
            onClick={onImportFromDraft}
          >
            从 JSON 草稿导入
          </button>
          <button
            type="button"
            className="config-import-log-export"
            onClick={onExportFilteredJson}
            disabled={filteredLog.length === 0}
          >
            导出筛选 JSON
          </button>
          <button
            type="button"
            className="config-import-log-clear"
            onClick={onClearLog}
            disabled={log.length === 0}
          >
            清空日志
          </button>
        </div>
      </div>
      <div className="config-import-log-filters">
        <select
          value={sourceFilter}
          onChange={(event) =>
            onSourceFilterChange(event.target.value as ImportAuditFilterSource)
          }
        >
          <option value="all">全部来源</option>
          <option value="单画像">仅单画像</option>
          <option value="画像仓库">仅画像仓库</option>
        </select>
        <select
          value={modeFilter}
          onChange={(event) =>
            onModeFilterChange(event.target.value as ImportAuditFilterMode)
          }
        >
          <option value="all">全部模式</option>
          <option value="append">仅新增</option>
          <option value="overwrite">仅覆盖</option>
        </select>
        <input
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="搜索摘要 / ID / 时间"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => onDateFromChange(event.target.value)}
          title="起始日期"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(event) => onDateToChange(event.target.value)}
          title="结束日期"
        />
        <div className="config-import-log-quick-ranges">
          <button
            type="button"
            className={`config-import-log-quick-btn ${
              quickRange === "1d" ? "active" : ""
            }`}
            onClick={() => onApplyQuickRange("1d")}
            title="将起止日期设置为最近 1 天"
          >
            近 1 天
          </button>
          <button
            type="button"
            className={`config-import-log-quick-btn ${
              quickRange === "7d" ? "active" : ""
            }`}
            onClick={() => onApplyQuickRange("7d")}
            title="将起止日期设置为最近 7 天"
          >
            近 7 天
          </button>
        </div>
        <button type="button" onClick={onResetFilters}>
          重置筛选
        </button>
      </div>
      {log.length === 0 ? (
        <p className="muted">当前暂无导入操作日志。</p>
      ) : filteredLog.length === 0 ? (
        <p className="muted">当前筛选条件下无日志，请调整筛选条件。</p>
      ) : (
        <div className="config-import-log-list">
          {filteredLog.map((item) => {
            const rollbackSummary = rollbackSummaryMap.get(item.id);
            const rollbackImpact = rollbackSummary?.impact;
            return (
              <article key={item.id} className="config-import-log-item">
                <header>
                  <strong>
                    {item.sourceLabel} ·
                    {item.importMode === "overwrite" ? "覆盖导入" : "新增导入"}
                  </strong>
                  <span>{formatTime(item.at)}</span>
                </header>
                <p>{item.summary}</p>
                <p>
                  实际导入 {item.effectiveImportCount} · 截断 {item.truncatedCount} ·
                  同批重复 {item.duplicateEntryCount}
                  {item.overwriteShadowCount > 0
                    ? `（后者生效 ${item.overwriteShadowCount}）`
                    : ""}
                </p>
                {rollbackImpact ? (
                  <p className="config-import-log-impact">
                    回滚影响：画像 +{rollbackImpact.addProfileCount} / -
                    {rollbackImpact.removeProfileCount} / 变更{" "}
                    {rollbackImpact.updateProfileCount} · 参数差异{" "}
                    {rollbackImpact.bundleDiffCount}
                    {rollbackSummary ? ` · 差异画像 ${rollbackSummary.changesCount}` : ""}
                    {rollbackImpact.activeProfileChanged
                      ? ` · 活跃画像 ${rollbackImpact.activeProfileFrom} → ${rollbackImpact.activeProfileTo}`
                      : ""}
                  </p>
                ) : null}
                <div className="config-import-log-actions">
                  <button
                    type="button"
                    className="config-import-log-export-single"
                    onClick={() => onExportSingle(item)}
                    title="仅导出当前日志为 JSON"
                  >
                    导出此条 JSON
                  </button>
                  <button
                    type="button"
                    className="config-import-log-rollback"
                    onClick={() => onRequestRollback(item)}
                    title="先查看差异影响，再确认回滚"
                  >
                    查看并回滚
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </article>
  );
}

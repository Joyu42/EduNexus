import { useCallback } from "react";

type UseImportAuditActionsInput<TItem extends { id: string }> = {
  filteredLog: TItem[];
  setImportAuditLog: (updater: (prev: TItem[]) => TItem[]) => void;
  storageKey: string;
  setStatusMessage: (message: string) => void;
  clearFilters: () => void;
  clearPendingRollback: () => void;
  buildExportPayload: (items: TItem[]) => unknown;
  downloadJson: (content: string, filename: string) => void;
};

export function useImportAuditActions<TItem extends { id: string }>(
  input: UseImportAuditActionsInput<TItem>
) {
  const handleClearImportAuditLog = useCallback(() => {
    input.setImportAuditLog(() => []);
    input.clearFilters();
    input.clearPendingRollback();
    window.localStorage.removeItem(input.storageKey);
    input.setStatusMessage("已清空导入操作日志。");
  }, [input]);

  const handleExportImportAuditJson = useCallback(() => {
    if (input.filteredLog.length === 0) {
      input.setStatusMessage("当前筛选条件下没有可导出的导入日志。");
      return;
    }
    const payload = input.buildExportPayload(input.filteredLog);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    input.downloadJson(
      JSON.stringify(payload, null, 2),
      `edunexus-import-audit-${stamp}.json`
    );
    input.setStatusMessage(`已导出导入日志 JSON：${input.filteredLog.length} 条。`);
  }, [input]);

  const handleExportSingleImportAuditJson = useCallback(
    (item: TItem) => {
      const payload = input.buildExportPayload([item]);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      input.downloadJson(
        JSON.stringify(payload, null, 2),
        `edunexus-import-audit-item-${item.id}-${stamp}.json`
      );
      input.setStatusMessage(`已导出单条导入日志：${item.id}。`);
    },
    [input]
  );

  return {
    handleClearImportAuditLog,
    handleExportImportAuditJson,
    handleExportSingleImportAuditJson
  };
}

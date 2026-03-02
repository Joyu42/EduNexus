import { useCallback, useEffect, useMemo, useState } from "react";

type RollbackItemLike = {
  id: string;
  at: string;
};

type RollbackPreviewLike<TChange> = {
  changes: TChange[];
};

type UseImportAuditRollbackInput<
  TItem extends RollbackItemLike,
  TPreview extends RollbackPreviewLike<TChange>,
  TChange,
  TFilter extends string
> = {
  importAuditLog: TItem[];
  initialFilter: TFilter;
  buildPendingPreview: (item: TItem) => TPreview;
  filterChanges: (
    changes: TChange[],
    input: { changeType: TFilter; keyword: string }
  ) => TChange[];
  buildChangesCsv: (changes: TChange[]) => string;
  onConfirmRollback: (item: TItem, preview: TPreview) => void;
  setStatusMessage: (message: string) => void;
  formatTime: (value: string) => string;
  downloadCsv: (content: string, filename: string) => void;
  exportFilenamePrefix: string;
};

export function useImportAuditRollback<
  TItem extends RollbackItemLike,
  TPreview extends RollbackPreviewLike<TChange>,
  TChange,
  TFilter extends string
>(
  input: UseImportAuditRollbackInput<TItem, TPreview, TChange, TFilter>
) {
  const [pendingItem, setPendingItem] = useState<TItem | null>(null);
  const [changeFilter, setChangeFilter] = useState<TFilter>(input.initialFilter);
  const [keyword, setKeyword] = useState("");

  const resetFilters = useCallback(() => {
    setChangeFilter(input.initialFilter);
    setKeyword("");
  }, [input.initialFilter]);

  const pendingPreview = useMemo(() => {
    if (!pendingItem) {
      return null;
    }
    return input.buildPendingPreview(pendingItem);
  }, [input, pendingItem]);

  const filteredChanges = useMemo(() => {
    if (!pendingPreview) {
      return [];
    }
    return input.filterChanges(pendingPreview.changes, {
      changeType: changeFilter,
      keyword
    });
  }, [changeFilter, input, keyword, pendingPreview]);

  useEffect(() => {
    if (!pendingItem) {
      return;
    }
    const exists = input.importAuditLog.some((item) => item.id === pendingItem.id);
    if (!exists) {
      resetFilters();
      setPendingItem(null);
    }
  }, [input.importAuditLog, pendingItem, resetFilters]);

  const handleRequestRollback = useCallback(
    (item: TItem) => {
      resetFilters();
      setPendingItem(item);
    },
    [resetFilters]
  );

  const handleCancelPendingRollback = useCallback(() => {
    resetFilters();
    setPendingItem(null);
  }, [resetFilters]);

  const handleConfirmPendingRollback = useCallback(() => {
    if (!pendingItem || !pendingPreview) {
      return;
    }
    input.onConfirmRollback(pendingItem, pendingPreview);
    const rollbackAt = pendingItem.at;
    resetFilters();
    setPendingItem(null);
    input.setStatusMessage(
      `已回滚到导入前快照：${input.formatTime(rollbackAt)}。`
    );
  }, [input, pendingItem, pendingPreview, resetFilters]);

  const handleExportFilteredChangesCsv = useCallback(() => {
    if (!pendingItem) {
      return;
    }
    if (filteredChanges.length === 0) {
      input.setStatusMessage("当前筛选条件下没有可导出的回滚差异。");
      return;
    }
    const csv = input.buildChangesCsv(filteredChanges);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    input.downloadCsv(
      csv,
      `${input.exportFilenamePrefix}-${pendingItem.id}-${stamp}.csv`
    );
    input.setStatusMessage(`已导出回滚差异 CSV：${filteredChanges.length} 条。`);
  }, [filteredChanges, input, pendingItem]);

  return {
    pendingItem,
    pendingPreview,
    filteredChanges,
    changeFilter,
    keyword,
    setChangeFilter,
    setKeyword,
    handleRequestRollback,
    handleCancelPendingRollback,
    handleConfirmPendingRollback,
    handleExportFilteredChangesCsv
  };
}

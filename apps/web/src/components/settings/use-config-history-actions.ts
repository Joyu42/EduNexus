import { useCallback, useEffect, useMemo, useState } from "react";

type BundleMeta = {
  profileId: string;
  profileLabel: string;
};

type BundleLike = {
  meta: BundleMeta;
};

type HistoryItemLike<TBundle extends BundleLike> = {
  id: string;
  at: string;
  reason: string;
  bundle: TBundle;
};

type PersistBundleOptions = {
  profileId?: string;
  profileLabel?: string;
  recordHistory?: boolean;
  statusMessage?: string;
};

type UseConfigHistoryActionsInput<
  TBundle extends BundleLike,
  THistoryItem extends HistoryItemLike<TBundle>,
  TModuleKey extends keyof TBundle & string
> = {
  bundle: TBundle;
  configHistory: THistoryItem[];
  setConfigHistory: (updater: (prev: THistoryItem[]) => THistoryItem[]) => void;
  normalizeBundle: (input: unknown) => TBundle;
  persistBundle: (
    next: TBundle,
    reason: string,
    options?: PersistBundleOptions
  ) => void;
  formatTime: (value: string) => string;
  formatModuleLabel: (module: TModuleKey) => string;
  historyStorageKey: string;
  setStatusMessage: (message: string) => void;
};

export function useConfigHistoryActions<
  TBundle extends BundleLike,
  THistoryItem extends HistoryItemLike<TBundle>,
  TModuleKey extends keyof TBundle & string
>(input: UseConfigHistoryActionsInput<TBundle, THistoryItem, TModuleKey>) {
  const [activeDiffHistoryId, setActiveDiffHistoryId] = useState("");

  const activeDiffHistoryItem = useMemo(
    () =>
      input.configHistory.find((item) => item.id === activeDiffHistoryId) ?? null,
    [activeDiffHistoryId, input.configHistory]
  );

  useEffect(() => {
    if (!activeDiffHistoryId) {
      return;
    }
    const exists = input.configHistory.some(
      (item) => item.id === activeDiffHistoryId
    );
    if (!exists) {
      setActiveDiffHistoryId("");
    }
  }, [activeDiffHistoryId, input.configHistory]);

  const handleRollbackHistoryItem = useCallback(
    (item: THistoryItem) => {
      const rollbackBundle = input.normalizeBundle({
        ...item.bundle,
        meta: input.bundle.meta
      });
      input.persistBundle(rollbackBundle, `回滚到：${item.reason}`, {
        profileId: input.bundle.meta.profileId,
        profileLabel: input.bundle.meta.profileLabel
      });
      input.setStatusMessage(`已回滚到 ${input.formatTime(item.at)} 的配置快照。`);
    },
    [input]
  );

  const handleRollbackHistoryModule = useCallback(
    (item: THistoryItem, module: TModuleKey) => {
      const merged = input.normalizeBundle({
        ...input.bundle,
        [module]: item.bundle[module]
      });
      input.persistBundle(
        merged,
        `仅回滚${input.formatModuleLabel(module)}：${item.reason}`,
        {
          profileId: input.bundle.meta.profileId,
          profileLabel: input.bundle.meta.profileLabel
        }
      );
      input.setStatusMessage(
        `已回滚 ${input.formatModuleLabel(module)} 到 ${input.formatTime(
          item.at
        )} 的快照。`
      );
    },
    [input]
  );

  const handleToggleHistoryDiff = useCallback((itemId: string) => {
    setActiveDiffHistoryId((prev) => (prev === itemId ? "" : itemId));
  }, []);

  const handleClearHistory = useCallback(() => {
    input.setConfigHistory(() => []);
    setActiveDiffHistoryId("");
    window.localStorage.removeItem(input.historyStorageKey);
    input.setStatusMessage("已清空配置变更历史。");
  }, [input]);

  return {
    activeDiffHistoryId,
    activeDiffHistoryItem,
    handleRollbackHistoryItem,
    handleRollbackHistoryModule,
    handleToggleHistoryDiff,
    handleClearHistory
  };
}

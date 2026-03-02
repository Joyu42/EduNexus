import { useCallback } from "react";

type UseImportAuditJsonImportInput<
  TItem extends { id: string },
  TStore,
  TBundle,
  TPayload
> = {
  jsonDraft: string;
  profileStore: TStore;
  bundle: TBundle;
  importAuditLog: TItem[];
  importAuditLimit: number;
  setImportAuditLog: (updater: (prev: TItem[]) => TItem[]) => void;
  setStatusMessage: (message: string) => void;
  normalizeImportAuditPayload: (input: unknown) => TPayload;
  normalizeImportAuditEntries: (
    payload: TPayload,
    profileStore: TStore,
    bundle: TBundle
  ) => TItem[];
};

export function useImportAuditJsonImport<
  TItem extends { id: string },
  TStore,
  TBundle,
  TPayload
>(input: UseImportAuditJsonImportInput<TItem, TStore, TBundle, TPayload>) {
  const handleImportAuditFromJsonDraft = useCallback(() => {
    try {
      const parsed = JSON.parse(input.jsonDraft) as unknown;
      const normalized = input.normalizeImportAuditEntries(
        input.normalizeImportAuditPayload(parsed),
        input.profileStore,
        input.bundle
      );
      if (normalized.length === 0) {
        input.setStatusMessage("当前 JSON 未识别到可导入的日志记录。");
        return;
      }
      const merged = [...normalized, ...input.importAuditLog];
      const seen = new Set<string>();
      const unique: TItem[] = [];
      let duplicatedCount = 0;
      for (const item of merged) {
        if (seen.has(item.id)) {
          duplicatedCount += 1;
          continue;
        }
        seen.add(item.id);
        unique.push(item);
      }
      const truncatedCount = Math.max(0, unique.length - input.importAuditLimit);
      input.setImportAuditLog(() => unique.slice(0, input.importAuditLimit));
      const duplicateText =
        duplicatedCount > 0 ? `；跳过重复 ${duplicatedCount} 条` : "";
      const truncateText =
        truncatedCount > 0 ? `；超出上限截断 ${truncatedCount} 条` : "";
      input.setStatusMessage(
        `已导入日志记录 ${normalized.length} 条${duplicateText}${truncateText}。`
      );
    } catch {
      input.setStatusMessage("JSON 解析失败，日志导入未执行。");
    }
  }, [input]);

  return {
    handleImportAuditFromJsonDraft
  };
}

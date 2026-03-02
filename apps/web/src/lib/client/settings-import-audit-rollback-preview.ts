import type {
  ConfigBundle,
  ConfigProfileStore,
  ImportAuditItem,
  ImportAuditRollbackPreview
} from "@/lib/client/settings-config-types";
import { buildImportRollbackPreview } from "@/lib/client/settings-import-rollback";
import { buildBundleDiffRows } from "@/lib/client/settings-page-utils";

type CreateImportAuditRollbackPreviewBuilderInput = {
  normalizeProfileStorePayload: (
    payload: unknown,
    fallbackBundle: ConfigBundle
  ) => { store: ConfigProfileStore };
  normalizeBundle: (input: unknown) => ConfigBundle;
};

export function createImportAuditRollbackPreviewBuilder(
  input: CreateImportAuditRollbackPreviewBuilderInput
) {
  return function buildImportAuditRollbackPreview(
    currentStore: ConfigProfileStore,
    currentBundle: ConfigBundle,
    item: ImportAuditItem
  ): ImportAuditRollbackPreview {
    const snapshotStoreResult = input.normalizeProfileStorePayload(
      item.snapshot.profileStore,
      item.snapshot.activeBundle
    );
    const snapshotStore = snapshotStoreResult.store;
    const snapshotActiveProfile =
      snapshotStore.profiles.find(
        (profile) => profile.id === snapshotStore.activeProfileId
      ) ?? snapshotStore.profiles[0];
    const snapshotBundle =
      snapshotActiveProfile?.bundle ?? input.normalizeBundle(item.snapshot.activeBundle);

    const preview = buildImportRollbackPreview({
      currentStore,
      targetStore: snapshotStore,
      bundleDiffCount: buildBundleDiffRows(currentBundle, snapshotBundle).length
    });

    return {
      impact: preview.impact,
      changes: preview.changes,
      snapshotStore,
      snapshotBundle
    };
  };
}

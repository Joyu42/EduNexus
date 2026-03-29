# Decisions
## 2026-03-29
- `syncedPaths` is now treated as legacy compatibility storage only for non-pack-backed paths; any path whose `pathId` matches a `learningPack.packId` is projected from `learningPacks` in graph view and AI pack generation no longer writes a separate synced-path row.
- `upsertSyncedPath` remains as a compatibility stub for callers that still depend on the API shape, but it no longer persists direct writes; pack-backed data must flow through pack bindings and `setPackKbDocument`.

- Added \`reorderLearningPackModules\` to \`learning-pack-store.ts\` to support reordering modules directly in the canonical pack model.
- Removed direct write to \`syncedPaths\` (\`upsertSyncedPath\`) in AI chat route. Instead, pack projection (\`projectLearningPackCompatibilityPath\`) dynamically serves pack-based paths in \`loadSyncedPaths\` for legacy compatibility.
- Updated \`path-storage.ts\` client sync function to explicitly route saves for \`lp_*\` path IDs to a new \`POST /api/graph/learning-pack/sync\` endpoint. This endpoint invokes \`setPackKbDocument\` and \`reorderLearningPackModules\` directly on the pack store.

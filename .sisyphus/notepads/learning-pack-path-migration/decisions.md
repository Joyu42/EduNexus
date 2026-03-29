# Decisions
## 2026-03-29
- `syncedPaths` is now treated as legacy compatibility storage only for non-pack-backed paths; any path whose `pathId` matches a `learningPack.packId` is projected from `learningPacks` in graph view and AI pack generation no longer writes a separate synced-path row.
- `upsertSyncedPath` remains as a compatibility stub for callers that still depend on the API shape, but it no longer persists direct writes; pack-backed data must flow through pack bindings and `setPackKbDocument`.

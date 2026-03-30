import { loadDb, saveDb, projectLearningPackCompatibilityPath, type SyncedPathRecord, type SyncedPathTaskRecord } from "./store";
import type { LearningPackRecord } from "../learning-pack/schema";

export type UpsertSyncedPathInput = {
  userId: string;
  pathId: string;
  title: string;
  description?: string;
  status: "not_started" | "in_progress" | "completed";
  progress: number;
  tags?: string[];
  tasks?: Array<{
    taskId: string;
    title: string;
    description?: string;
    estimatedTime?: string;
    status?: "not_started" | "in_progress" | "completed";
    progress?: number;
    dependencies?: string[];
    documentBinding?: {
      documentId: string;
      boundAt: string;
    };
  }>;
};

function normalizeTask(task: NonNullable<UpsertSyncedPathInput["tasks"]>[number]): SyncedPathTaskRecord {
  return {
    taskId: task.taskId,
    title: task.title,
    description: task.description,
    estimatedTime: task.estimatedTime,
    status: task.status,
    progress: typeof task.progress === "number" ? Math.max(0, Math.min(100, Math.round(task.progress))) : undefined,
    dependencies: Array.isArray(task.dependencies) ? task.dependencies.filter(Boolean) : [],
    documentBinding:
      task.documentBinding &&
      typeof task.documentBinding.documentId === "string" &&
      typeof task.documentBinding.boundAt === "string"
        ? {
            documentId: task.documentBinding.documentId,
            boundAt: task.documentBinding.boundAt,
          }
        : undefined,
  };
}

export { projectLearningPackCompatibilityPath as projectLearningPackToCompatibilityPath };

function syncedPathToLearningPack(syncedPath: SyncedPathRecord): LearningPackRecord {
  const now = new Date().toISOString();
  return {
    packId: syncedPath.pathId,
    userId: syncedPath.userId,
    title: syncedPath.title,
    topic: syncedPath.tags[0] ?? "general",
    modules: syncedPath.tasks.map((task, index) => ({
      moduleId: task.taskId,
      title: task.title,
      kbDocumentId: task.documentBinding?.documentId ?? "",
      stage:
        task.status === "completed"
          ? "mastered"
          : task.status === "in_progress"
            ? "understood"
            : "seen",
      order: index,
      studyMinutes: 0,
      lastStudiedAt: null,
    })),
    activeModuleId: syncedPath.tasks[0]?.taskId ?? null,
    stage:
      syncedPath.status === "completed"
        ? "mastered"
        : syncedPath.status === "in_progress"
          ? "applied"
          : "seen",
    totalStudyMinutes: 0,
    createdAt: syncedPath.updatedAt,
    updatedAt: now,
  };
}

export async function backfillSyncedPathsToLearningPacks(): Promise<{ backfilled: number; skipped: number }> {
  const db = await loadDb();
  const existingPackKeys = new Set(db.learningPacks.map((pack) => `${pack.userId}::${pack.packId}`));
  const legacyPaths = db.syncedPaths.filter((path) => !path.pathId.startsWith("lp_"));

  let backfilled = 0;
  let skipped = 0;

  for (const path of legacyPaths) {
    const packKey = `${path.userId}::${path.pathId}`;
    if (existingPackKeys.has(packKey)) {
      skipped++;
      continue;
    }

    db.learningPacks.push(syncedPathToLearningPack(path));
    // Remove the legacy row so loadSyncedPaths doesn't return duplicates
    db.syncedPaths = db.syncedPaths.filter((p) => !(p.userId === path.userId && p.pathId === path.pathId));
    existingPackKeys.add(packKey);
    backfilled++;
  }

  if (backfilled > 0) {
    await saveDb(db);
    console.log(`[backfill] Backfilled ${backfilled} legacy syncedPaths, skipped ${skipped}`);
  } else {
    console.log(`[backfill] No legacy syncedPaths to backfill (skipped ${skipped})`);
  }

  return { backfilled, skipped };
}

export async function upsertSyncedPath(input: UpsertSyncedPathInput) {
  const db = await loadDb();
  const existingPack = db.learningPacks.find(
    (item) => item.packId === input.pathId && item.userId === input.userId
  );

  if (existingPack) {
    return projectLearningPackCompatibilityPath(existingPack);
  }

  const syncedRecord: SyncedPathRecord = {
    userId: input.userId,
    pathId: input.pathId,
    title: input.title,
    description: input.description ?? "",
    status: input.status,
    progress: Math.max(0, Math.min(100, Math.round(input.progress))),
    tags: Array.isArray(input.tags) ? input.tags.filter(Boolean) : [],
    tasks: Array.isArray(input.tasks) ? input.tasks.map(normalizeTask) : [],
    updatedAt: new Date().toISOString(),
  };

  const pack = syncedPathToLearningPack(syncedRecord);
  db.learningPacks.push(pack);
  await saveDb(db);
  console.log(`[upsertSyncedPath] Backfilled legacy path ${input.pathId} to learningPacks`);

  return projectLearningPackCompatibilityPath(pack);
}

export async function loadSyncedPaths(userId: string): Promise<SyncedPathRecord[]> {
  const db = await loadDb();
  const packs = db.learningPacks.filter((p) => p.userId === userId);
  const packIds = new Set(packs.map((p) => p.packId));

  // Clean up lp_* entries from syncedPaths that have been migrated to learningPacks
  const hasMigrated = db.syncedPaths.some(
    (p) => p.userId === userId && p.pathId.startsWith("lp_") && packIds.has(p.pathId)
  );
  if (hasMigrated) {
    db.syncedPaths = db.syncedPaths.filter(
      (p) => !(p.userId === userId && p.pathId.startsWith("lp_") && packIds.has(p.pathId))
    );
    await saveDb(db);
  }

  const legacyPaths = db.syncedPaths.filter((p) => p.userId === userId && !p.pathId.startsWith("lp_"));
  const projectedPacks = packs.map(projectLearningPackCompatibilityPath);
  return [...legacyPaths, ...projectedPacks];
}

export async function deleteSyncedPath(pathId: string, userId: string) {
  const db = await loadDb();
  db.syncedPaths = db.syncedPaths.filter(
    (item) => !(item.pathId === pathId && item.userId === userId)
  );
  db.learningPacks = db.learningPacks.filter(
    (item) => !(item.packId === pathId && item.userId === userId)
  );
  await saveDb(db);
}

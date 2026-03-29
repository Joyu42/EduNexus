import { loadDb, saveDb, projectLearningPackCompatibilityPath, type SyncedPathRecord, type SyncedPathTaskRecord } from "./store";

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

export async function upsertSyncedPath(input: UpsertSyncedPathInput) {
  console.warn("[path-sync-service] upsertSyncedPath is compatibility-only; direct writes are ignored.");
  const db = await loadDb();
  const pack = db.learningPacks.find(
    (item) => item.packId === input.pathId && item.userId === input.userId
  );

  if (pack) {
    return projectLearningPackCompatibilityPath(pack);
  }

  return {
    userId: input.userId,
    pathId: input.pathId,
    title: input.title,
    description: input.description ?? "",
    status: input.status,
    progress: Math.max(0, Math.min(100, Math.round(input.progress))),
    tags: Array.isArray(input.tags) ? input.tags.filter(Boolean) : [],
    tasks: Array.isArray(input.tasks) ? input.tasks.map(normalizeTask) : [],
    updatedAt: new Date().toISOString(),
  } satisfies SyncedPathRecord;
}

export async function loadSyncedPaths(userId: string): Promise<SyncedPathRecord[]> {
  const db = await loadDb();
  const legacyPaths = db.syncedPaths.filter((p) => p.userId === userId && !p.pathId.startsWith("lp_"));
  const packs = db.learningPacks.filter((p) => p.userId === userId);
  const projectedPacks = packs.map(projectLearningPackCompatibilityPath);
  return [...legacyPaths, ...projectedPacks];
}

export async function deleteSyncedPath(pathId: string, userId: string) {
  const db = await loadDb();
  db.syncedPaths = db.syncedPaths.filter(
    (item) => !(item.pathId === pathId && item.userId === userId)
  );
  await saveDb(db);
}

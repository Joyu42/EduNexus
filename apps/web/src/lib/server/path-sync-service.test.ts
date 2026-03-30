import { beforeEach, describe, expect, it, vi } from "vitest";

const loadDbMock = vi.fn();
const saveDbMock = vi.fn();

vi.mock("./store", () => ({
  loadDb: (...args: unknown[]) => loadDbMock(...args),
  saveDb: (...args: unknown[]) => saveDbMock(...args),
  projectLearningPackCompatibilityPath: (pack: any) => ({
    userId: pack.userId,
    pathId: pack.packId,
    title: pack.title,
    description: `AI 规划的学习路径：${pack.topic}`,
    status:
      pack.stage === "mastered"
        ? "completed"
        : pack.stage === "understood" || pack.stage === "applied"
          ? "in_progress"
          : "not_started",
    progress: pack.stage === "mastered" ? 100 : pack.stage === "applied" ? 67 : pack.stage === "understood" ? 33 : 0,
    tags: [pack.topic],
    tasks: (pack.modules ?? []).map((module: any) => ({
      taskId: module.moduleId,
      title: module.title,
      status:
        module.stage === "mastered"
          ? "completed"
          : module.stage === "understood" || module.stage === "applied"
            ? "in_progress"
            : "not_started",
      progress: module.stage === "mastered" ? 100 : module.stage === "applied" ? 67 : module.stage === "understood" ? 33 : 0,
      ...(module.kbDocumentId ? { documentBinding: { documentId: module.kbDocumentId, boundAt: pack.updatedAt } } : {}),
    })),
    updatedAt: pack.updatedAt,
  }),
}));

const { backfillSyncedPathsToLearningPacks, deleteSyncedPath, loadSyncedPaths, upsertSyncedPath } = await import("./path-sync-service");

describe("backfillSyncedPathsToLearningPacks", () => {
  beforeEach(() => {
    loadDbMock.mockReset();
    saveDbMock.mockReset();
  });

  it("backfills legacy synced paths into learningPacks", async () => {
    const dbState = {
      syncedPaths: [
        {
          userId: "u1",
          pathId: "legacy_path_1",
          title: "Legacy Path",
          description: "",
          status: "in_progress",
          progress: 50,
          tags: ["java"],
          tasks: [{ taskId: "t1", title: "Task 1", status: "in_progress" }],
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      learningPacks: [],
    };
    loadDbMock.mockResolvedValue(dbState);
    saveDbMock.mockResolvedValue(undefined);

    const result = await backfillSyncedPathsToLearningPacks();

    expect(result).toEqual({ backfilled: 1, skipped: 0 });
    expect(saveDbMock).toHaveBeenCalledTimes(1);
    const savedDb = saveDbMock.mock.calls[0]?.[0] as any;
    expect(savedDb.learningPacks).toHaveLength(1);
    expect(savedDb.learningPacks[0]).toMatchObject({
      packId: "legacy_path_1",
      userId: "u1",
      title: "Legacy Path",
      topic: "java",
      activeModuleId: "t1",
      stage: "applied",
      totalStudyMinutes: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("skips synced paths already represented in learningPacks", async () => {
    const dbState = {
      syncedPaths: [
        {
          userId: "u1",
          pathId: "legacy_path_3",
          title: "Already Migrated",
          description: "",
          status: "completed",
          progress: 100,
          tags: [],
          tasks: [],
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      learningPacks: [
        {
          packId: "legacy_path_3",
          userId: "u1",
          title: "LP Pack",
          topic: "python",
          modules: [],
          activeModuleId: null,
          stage: "mastered",
          totalStudyMinutes: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    loadDbMock.mockResolvedValue(dbState);

    const result = await backfillSyncedPathsToLearningPacks();

    expect(result).toEqual({ backfilled: 0, skipped: 1 });
    expect(saveDbMock).not.toHaveBeenCalled();
  });

  it("backfills matching pathIds independently per user", async () => {
    const dbState = {
      syncedPaths: [
        {
          userId: "u1",
          pathId: "legacy_path_shared",
          title: "Legacy U1",
          description: "",
          status: "in_progress",
          progress: 50,
          tags: [],
          tasks: [],
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        {
          userId: "u2",
          pathId: "legacy_path_shared",
          title: "Legacy U2",
          description: "",
          status: "completed",
          progress: 100,
          tags: [],
          tasks: [],
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      learningPacks: [
        {
          packId: "legacy_path_shared",
          userId: "u2",
          title: "Pack U2",
          topic: "python",
          modules: [],
          activeModuleId: null,
          stage: "mastered",
          totalStudyMinutes: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    };
    loadDbMock.mockResolvedValue(dbState);
    saveDbMock.mockResolvedValue(undefined);

    const result = await backfillSyncedPathsToLearningPacks();

    expect(result).toEqual({ backfilled: 1, skipped: 1 });
    expect(saveDbMock).toHaveBeenCalledTimes(1);
    const savedDb = saveDbMock.mock.calls[0]?.[0] as any;
    expect(savedDb.learningPacks).toHaveLength(2);
    expect(savedDb.syncedPaths).toEqual([
      expect.objectContaining({ userId: "u2", pathId: "legacy_path_shared" }),
    ]);
  });
});

describe("upsertSyncedPath", () => {
  beforeEach(() => {
    loadDbMock.mockReset();
    saveDbMock.mockReset();
  });

  it("backfills a legacy path into learningPacks on write", async () => {
    const dbState = {
      syncedPaths: [],
      learningPacks: [],
    };
    loadDbMock.mockResolvedValue(dbState);
    saveDbMock.mockResolvedValue(undefined);

    const result = await upsertSyncedPath({
      userId: "u1",
      pathId: "legacy_path_2",
      title: "Legacy Path 2",
      description: "desc",
      status: "in_progress",
      progress: 51,
      tags: ["go", ""],
      tasks: [
        {
          taskId: "task_1",
          title: "Task 1",
          status: "completed",
          progress: 100,
        },
      ],
    });

    expect(saveDbMock).toHaveBeenCalledTimes(1);
    const savedDb = saveDbMock.mock.calls[0]?.[0] as any;
    expect(savedDb.learningPacks).toHaveLength(1);
    expect(savedDb.learningPacks[0]).toMatchObject({
      packId: "legacy_path_2",
      userId: "u1",
      title: "Legacy Path 2",
      topic: "go",
      activeModuleId: "task_1",
      stage: "applied",
    });
    expect(result).toMatchObject({
      pathId: "legacy_path_2",
      userId: "u1",
      title: "Legacy Path 2",
    });
  });
});

describe("loadSyncedPaths", () => {
  beforeEach(() => {
    loadDbMock.mockReset();
    saveDbMock.mockReset();
  });

  it("returns legacy synced paths alongside projected packs", async () => {
    loadDbMock.mockResolvedValue({
      syncedPaths: [
        {
          userId: "u1",
          pathId: "legacy_path",
          title: "Legacy",
          description: "",
          status: "in_progress",
          progress: 50,
          tags: ["java"],
          tasks: [{ taskId: "t1", title: "Task 1", status: "in_progress" }],
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      learningPacks: [
        {
          packId: "lp_pack",
          userId: "u1",
          title: "Pack",
          topic: "python",
          modules: [],
          activeModuleId: null,
          stage: "seen",
          totalStudyMinutes: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    const paths = await loadSyncedPaths("u1");

    expect(paths).toHaveLength(2);
    expect(paths.map((p) => p.pathId)).toEqual(["legacy_path", "lp_pack"]);
  });
});

describe("deleteSyncedPath", () => {
  beforeEach(() => {
    loadDbMock.mockReset();
    saveDbMock.mockReset();
  });

  it("removes path from both syncedPaths and learningPacks", async () => {
    loadDbMock.mockResolvedValue({
      syncedPaths: [
        { userId: "u1", pathId: "path_x", title: "Legacy", description: "", status: "in_progress", progress: 50, tags: [], tasks: [], updatedAt: "2026-01-01T00:00:00.000Z" },
      ],
      learningPacks: [
        { packId: "path_x", userId: "u1", title: "Pack", topic: "python", modules: [], activeModuleId: null, stage: "seen", totalStudyMinutes: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      ],
    });
    saveDbMock.mockResolvedValue(undefined);

    await deleteSyncedPath("path_x", "u1");

    expect(saveDbMock).toHaveBeenCalledTimes(1);
    const savedDb = saveDbMock.mock.calls[0]?.[0] as any;
    const remainingSynced = savedDb.syncedPaths.filter((p: any) => p.pathId === "path_x");
    const remainingPacks = savedDb.learningPacks.filter((p: any) => p.packId === "path_x");
    expect(remainingSynced).toHaveLength(0);
    expect(remainingPacks).toHaveLength(0);
  });

  it("only removes matching userId", async () => {
    loadDbMock.mockResolvedValue({
      syncedPaths: [
        { userId: "u1", pathId: "path_x", title: "U1 Legacy", description: "", status: "in_progress", progress: 50, tags: [], tasks: [], updatedAt: "2026-01-01T00:00:00.000Z" },
        { userId: "u2", pathId: "path_x", title: "U2 Legacy", description: "", status: "in_progress", progress: 50, tags: [], tasks: [], updatedAt: "2026-01-01T00:00:00.000Z" },
      ],
      learningPacks: [
        { packId: "path_x", userId: "u1", title: "U1 Pack", topic: "python", modules: [], activeModuleId: null, stage: "seen", totalStudyMinutes: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
        { packId: "path_x", userId: "u2", title: "U2 Pack", topic: "python", modules: [], activeModuleId: null, stage: "seen", totalStudyMinutes: 0, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
      ],
    });
    saveDbMock.mockResolvedValue(undefined);

    await deleteSyncedPath("path_x", "u1");

    const savedDb = saveDbMock.mock.calls[0]?.[0] as any;
    expect(savedDb.syncedPaths).toHaveLength(1);
    expect(savedDb.syncedPaths[0].userId).toBe("u2");
    expect(savedDb.learningPacks).toHaveLength(1);
    expect(savedDb.learningPacks[0].userId).toBe("u2");
  });
});

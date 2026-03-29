import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn().mockResolvedValue([]),
}));

vi.mock("./prisma", () => ({
  prisma: {
    document: {
      findMany,
    },
  },
}));

const { getGraphView } = await import("./graph-service");
const { loadDb, projectLearningPackCompatibilityPath } = await import("./store");

const originalDataDir = process.env.EDUNEXUS_DATA_DIR;

async function createDataDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), "edunexus-store-test-"));
}

async function writeDbFile(dataDir: string, payload: unknown) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(path.join(dataDir, "db.json"), JSON.stringify(payload), "utf8");
}

describe("server store", () => {
  afterEach(async () => {
    if (originalDataDir) {
      process.env.EDUNEXUS_DATA_DIR = originalDataDir;
    } else {
      delete process.env.EDUNEXUS_DATA_DIR;
    }
  });

  it("returns normalized workspace and public content keys for legacy db payload", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;

    await writeDbFile(dataDir, {
      sessions: [
        {
          id: "ws_legacy",
          title: "旧会话",
          userId: "u1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          lastLevel: 2,
          messages: []
        }
      ],
      plans: [],
      masteryByNode: { seq: 0.4 },
      resources: [{ id: "r1" }],
      users: [{ id: "u1" }]
    });

    const db = await loadDb();

    expect(Object.keys(db).sort()).toEqual([
      "analyticsEvents",
      "analyticsSnapshots",
      "communityComments",
      "communityFollows",
      "communityReactions",
      "communityTopics",
      "groupMembers",
      "groupPosts",
      "groupResources",
      "groupSharedResources",
      "groupTasks",
      "learningPacks",
      "masteryByNode",
      "needsReviewNodes",
      "plans",
      "publicGroups",
      "publicPosts",
      "publicResources",
      "publicTopics",
      "resourceBookmarks",
      "resourceFolders",
      "resourceNotes",
      "resourceRatings",
      "sessions",
      "syncedPaths"
    ]);
    expect(db.sessions[0]?.id).toBe("ws_legacy");
    expect(db.masteryByNode.seq).toBe(0.4);

    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("normalizes group resource records from legacy db payload", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;

    await writeDbFile(dataDir, {
      sessions: [],
      plans: [],
      masteryByNode: {},
      groupResources: [
        {
          id: "gr_1",
          groupId: "group-1",
          title: "组内资源",
          description: "资源说明",
          url: "https://example.com/resource",
          createdBy: " user-1 ",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-02T00:00:00.000Z"
        },
        {
          id: "gr_invalid",
          groupId: "group-1",
          title: "无效资源",
          url: "https://example.com/invalid",
          createdBy: ""
        }
      ]
    });

    const db = await loadDb();

    expect(db.groupResources).toEqual([
      {
        id: "gr_1",
        groupId: "group-1",
        title: "组内资源",
        description: "资源说明",
        url: "https://example.com/resource",
        createdBy: "user-1",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z"
      }
    ]);

    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("drops session records that do not include an authenticated user id", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;

    await writeDbFile(dataDir, {
      sessions: [
        {
          id: "ws_missing_user",
          title: "旧匿名会话",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          lastLevel: 1,
          messages: []
        },
        {
          id: "ws_user_scoped",
          title: "用户会话",
          userId: "user-1",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          lastLevel: 2,
          messages: []
        }
      ],
      plans: [],
      masteryByNode: {}
    });

    const db = await loadDb();

    expect(db.sessions).toEqual([
      expect.objectContaining({ id: "ws_user_scoped", userId: "user-1" })
    ]);

    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("treats pack-backed synced paths as derived projections from learning packs", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;

    const db = await loadDb();
    const now = new Date().toISOString();
    const pack = {
      packId: "lp_python_projection",
      userId: "u1",
      title: "Python 学习路线",
      topic: "python",
      activeModuleId: "mod_intro",
      stage: "seen" as const,
      totalStudyMinutes: 0,
      createdAt: now,
      updatedAt: now,
      modules: [
        {
          moduleId: "mod_intro",
          title: "Python 入门",
          kbDocumentId: "doc_py_1",
          stage: "seen" as const,
          order: 0,
          studyMinutes: 0,
          lastStudiedAt: null,
        },
        {
          moduleId: "mod_advanced",
          title: "Python 进阶",
          kbDocumentId: "doc_py_2",
          stage: "seen" as const,
          order: 1,
          studyMinutes: 0,
          lastStudiedAt: null,
        },
      ],
    };

    db.learningPacks.push(pack);
    db.syncedPaths.push({
      userId: "u1",
      pathId: "lp_python_projection",
      title: "旧版 Python 路径",
      description: "stale synced path",
      status: "completed",
      progress: 100,
      tags: ["legacy"],
      stages: [
        {
          stageId: "legacy_stage",
          nodeIds: ["doc_py_1", "doc_py_2"],
        },
      ],
      tasks: [],
      updatedAt: now,
    });
    await writeDbFile(dataDir, db);

    findMany.mockResolvedValueOnce([
      { id: "doc_py_1", title: "Python 入门" },
      { id: "doc_py_2", title: "Python 进阶" },
    ]);

    const graph = await getGraphView("u1", { packId: "lp_python_projection" });
    const projectedPath = projectLearningPackCompatibilityPath(pack);

    expect(graph.nodes[0]?.pathMemberships).toEqual([
      {
        pathId: projectedPath.pathId,
        pathName: projectedPath.title,
        stage: projectedPath.pathId,
        orderWithinStage: 0,
      },
    ]);
    expect(graph.nodes[1]?.pathMemberships).toEqual([
      {
        pathId: projectedPath.pathId,
        pathName: projectedPath.title,
        stage: projectedPath.pathId,
        orderWithinStage: 1,
      },
    ]);

    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("derives synced path status and progress from learning pack stage and active module", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;

    const now = new Date().toISOString();
    const pack = {
      packId: "lp_progress_projection",
      userId: "u1",
      title: "Python 学习路线",
      topic: "python",
      activeModuleId: "mod_mid",
      stage: "understood" as const,
      totalStudyMinutes: 0,
      createdAt: now,
      updatedAt: now,
      modules: [
        {
          moduleId: "mod_intro",
          title: "Python 入门",
          kbDocumentId: "doc_py_1",
          stage: "seen" as const,
          order: 0,
          studyMinutes: 0,
          lastStudiedAt: null,
        },
        {
          moduleId: "mod_mid",
          title: "Python 进阶",
          kbDocumentId: "doc_py_2",
          stage: "applied" as const,
          order: 1,
          studyMinutes: 0,
          lastStudiedAt: null,
        },
        {
          moduleId: "mod_end",
          title: "Python 实战",
          kbDocumentId: "doc_py_3",
          stage: "mastered" as const,
          order: 2,
          studyMinutes: 0,
          lastStudiedAt: null,
        },
      ],
    };

    const projectedPath = projectLearningPackCompatibilityPath(pack);

    expect(projectedPath.status).toBe("in_progress");
    expect(projectedPath.progress).toBe(33);
    expect(projectedPath.tasks).toEqual([
      expect.objectContaining({ taskId: "mod_intro", status: "not_started", progress: 0 }),
      expect.objectContaining({ taskId: "mod_mid", status: "in_progress", progress: 67 }),
      expect.objectContaining({ taskId: "mod_end", status: "completed", progress: 100 }),
    ]);

    await fs.rm(dataDir, { recursive: true, force: true });
  });
});

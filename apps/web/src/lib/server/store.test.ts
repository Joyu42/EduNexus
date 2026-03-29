import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadDb } from "./store";

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
});

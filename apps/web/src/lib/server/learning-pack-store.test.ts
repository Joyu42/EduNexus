import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadDb } from "./store";

const originalDataDir = process.env.EDUNEXUS_DATA_DIR;

async function createDataDir() {
  return fs.promises.mkdtemp(path.join(os.tmpdir(), "edunexus-lp-store-test-"));
}

async function writeDbFile(dataDir: string, payload: unknown) {
  await fs.promises.mkdir(dataDir, { recursive: true });
  await fs.promises.writeFile(path.join(dataDir, "db.json"), JSON.stringify(payload), "utf8");
}

describe("learning-pack-store", () => {
  afterEach(async () => {
    if (originalDataDir) {
      process.env.EDUNEXUS_DATA_DIR = originalDataDir;
    } else {
      delete process.env.EDUNEXUS_DATA_DIR;
    }
  });

  it("loadDb returns empty learningPacks array by default", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;
    await writeDbFile(dataDir, { sessions: [], plans: [], syncedPaths: [], masteryByNode: {}, needsReviewNodes: [] });
    const db = await loadDb();
    expect(db.learningPacks).toEqual([]);
    await fs.promises.rm(dataDir, { recursive: true, force: true });
  });

  it("loadDb returns normalized learningPacks from persisted db", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;
    await writeDbFile(dataDir, {
      sessions: [], plans: [], syncedPaths: [], masteryByNode: {}, needsReviewNodes: [],
      learningPacks: [
        {
          packId: "lp_java_001",
          userId: "user_1",
          title: "Java 基础",
          topic: "java",
          modules: [
            { moduleId: "mod_1", title: "变量与类型", kbDocumentId: "kb_java_001", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
            { moduleId: "mod_2", title: "控制流程", kbDocumentId: "kb_java_002", stage: "understood", order: 1, studyMinutes: 5, lastStudiedAt: "2026-03-24T10:00:00.000Z" },
          ],
          activeModuleId: "mod_1",
          stage: "understood",
          totalStudyMinutes: 5,
          createdAt: "2026-03-24T00:00:00.000Z",
          updatedAt: "2026-03-24T10:00:00.000Z",
        },
      ],
    });
    const db = await loadDb();
    expect(db.learningPacks).toHaveLength(1);
    expect(db.learningPacks[0].packId).toBe("lp_java_001");
    expect(db.learningPacks[0].modules).toHaveLength(2);
    expect(db.learningPacks[0].stage).toBe("understood");
    await fs.promises.rm(dataDir, { recursive: true, force: true });
  });

  it("loadDb drops malformed learningPack records", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;
    await writeDbFile(dataDir, {
      sessions: [], plans: [], syncedPaths: [], masteryByNode: {}, needsReviewNodes: [],
      learningPacks: [
        { packId: "lp_valid", userId: "u1", title: "Valid", topic: "java", modules: [], activeModuleId: null, stage: "seen", totalStudyMinutes: 0, createdAt: "2026-03-24T00:00:00.000Z", updatedAt: "2026-03-24T00:00:00.000Z" },
        { packId: "lp_invalid", title: "Missing userId and wrong stage" },
        { packId: "lp_also_valid", userId: "u2", title: "Also Valid", topic: "go", modules: [], activeModuleId: null, stage: "seen", totalStudyMinutes: 0, createdAt: "2026-03-24T00:00:00.000Z", updatedAt: "2026-03-24T00:00:00.000Z" },
      ],
    });
    const db = await loadDb();
    expect(db.learningPacks).toHaveLength(2);
    expect(db.learningPacks.map((p) => p.packId)).toEqual(["lp_valid", "lp_also_valid"]);
    await fs.promises.rm(dataDir, { recursive: true, force: true });
  });
});

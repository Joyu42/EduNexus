import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadDb } from "./store";
import {
  detachDocumentFromLearningPacks,
  setPackKbDocument,
  createLearningPack,
  getPackById,
  reorderLearningPackModules,
  LearningPackDocumentBindingConflictError,
} from "./learning-pack-store";

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

  it("detaches deleted doc and removes fully orphaned packs", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;
    await writeDbFile(dataDir, {
      sessions: [], plans: [], syncedPaths: [], masteryByNode: {}, needsReviewNodes: [],
      learningPacks: [
        {
          packId: "lp_keep",
          userId: "u1",
          title: "Keep Pack",
          topic: "java",
          modules: [
            { moduleId: "m1", title: "A", kbDocumentId: "doc_1", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
            { moduleId: "m2", title: "B", kbDocumentId: "doc_2", stage: "seen", order: 1, studyMinutes: 0, lastStudiedAt: null },
          ],
          activeModuleId: "m1",
          stage: "seen",
          totalStudyMinutes: 0,
          createdAt: "2026-03-24T00:00:00.000Z",
          updatedAt: "2026-03-24T00:00:00.000Z",
        },
        {
          packId: "lp_remove",
          userId: "u1",
          title: "Remove Pack",
          topic: "python",
          modules: [
            { moduleId: "m3", title: "C", kbDocumentId: "doc_1", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
          ],
          activeModuleId: "m3",
          stage: "seen",
          totalStudyMinutes: 0,
          createdAt: "2026-03-24T00:00:00.000Z",
          updatedAt: "2026-03-24T00:00:00.000Z",
        },
      ],
    });

    const result = await detachDocumentFromLearningPacks("u1", "doc_1");
    const db = await loadDb();

    expect(result.updatedPackIds).toEqual(["lp_keep"]);
    expect(result.removedPackIds).toEqual(["lp_remove"]);
    expect(db.learningPacks.map((p) => p.packId)).toEqual(["lp_keep"]);
    expect(db.learningPacks[0]?.modules.map((m) => m.kbDocumentId)).toEqual(["", "doc_2"]);

    await fs.promises.rm(dataDir, { recursive: true, force: true });
  });

  it("setPackKbDocument rejects when a document is already bound elsewhere", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;
    await writeDbFile(dataDir, {
      sessions: [], plans: [], syncedPaths: [], masteryByNode: {}, needsReviewNodes: [],
      learningPacks: [
        {
          packId: "lp_path_1",
          userId: "u1",
          title: "Path Pack",
          topic: "java",
          modules: [
            { moduleId: "m1", title: "First", kbDocumentId: "doc_1", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
          ],
          activeModuleId: "m1",
          stage: "seen",
          totalStudyMinutes: 0,
          createdAt: "2026-03-24T00:00:00.000Z",
          updatedAt: "2026-03-24T00:00:00.000Z",
        },
        {
          packId: "lp_path_2",
          userId: "u1",
          title: "Other Pack",
          topic: "python",
          modules: [
            { moduleId: "n1", title: "Other", kbDocumentId: "doc_2", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
          ],
          activeModuleId: "n1",
          stage: "seen",
          totalStudyMinutes: 0,
          createdAt: "2026-03-24T00:00:00.000Z",
          updatedAt: "2026-03-24T00:00:00.000Z",
        },
      ],
    });

    await expect(
      setPackKbDocument("lp_path_2", "n1", "doc_1", "u1")
    ).rejects.toBeInstanceOf(LearningPackDocumentBindingConflictError);

    const db = await loadDb();
    expect(db.learningPacks[1]?.modules[0]?.kbDocumentId).toBe("doc_2");

    await fs.promises.rm(dataDir, { recursive: true, force: true });
  });

  it("setPackKbDocument rejects when a document is bound twice in sequential calls", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;
    await writeDbFile(dataDir, {
      sessions: [], plans: [], syncedPaths: [], masteryByNode: {}, needsReviewNodes: [],
      learningPacks: [
        {
          packId: "lp_path_1",
          userId: "u1",
          title: "Path Pack",
          topic: "java",
          modules: [
            { moduleId: "m1", title: "First", kbDocumentId: "", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
            { moduleId: "m2", title: "Second", kbDocumentId: "", stage: "seen", order: 1, studyMinutes: 0, lastStudiedAt: null },
          ],
          activeModuleId: "m1",
          stage: "seen",
          totalStudyMinutes: 0,
          createdAt: "2026-03-24T00:00:00.000Z",
          updatedAt: "2026-03-24T00:00:00.000Z",
        },
      ],
    });

    await setPackKbDocument("lp_path_1", "m1", "doc_1", "u1");

    await expect(
      setPackKbDocument("lp_path_1", "m2", "doc_1", "u1")
    ).rejects.toBeInstanceOf(LearningPackDocumentBindingConflictError);

    await fs.promises.rm(dataDir, { recursive: true, force: true });
  });

  it("reorderLearningPackModules updates the module order", async () => {
    const pack = await createLearningPack("u1", "Reorder Test", "topic", ["M1", "M2", "M3"]);
    const m1 = pack.modules[0].moduleId;
    const m2 = pack.modules[1].moduleId;
    const m3 = pack.modules[2].moduleId;

    await reorderLearningPackModules(pack.packId, [m3, m1, m2], "u1");

    const read = await getPackById(pack.packId, "u1");
    expect(read).toBeDefined();
    expect(read!.modules[0].moduleId).toBe(m3);
    expect(read!.modules[0].order).toBe(0);
    expect(read!.modules[1].moduleId).toBe(m1);
    expect(read!.modules[1].order).toBe(1);
    expect(read!.modules[2].moduleId).toBe(m2);
    expect(read!.modules[2].order).toBe(2);
  });
});
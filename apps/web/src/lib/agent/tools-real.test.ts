import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { getAllTools } from "./tools-real";
import { DEMO_PATH_SEEDS } from "@/lib/server/demo-content";
import { loadDb, saveDb } from "@/lib/server/store";

const originalDataDir = process.env.EDUNEXUS_DATA_DIR;

async function createDataDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), "edunexus-agent-tools-test-"));
}

describe("query_learning_progress tool", () => {
  afterEach(async () => {
    if (originalDataDir) {
      process.env.EDUNEXUS_DATA_DIR = originalDataDir;
    } else {
      delete process.env.EDUNEXUS_DATA_DIR;
    }
  });

  it("seeds demo synced paths on demand for demo users", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;

    const db = await loadDb();
    db.syncedPaths = [
      {
        userId: "demo-user",
        pathId: "demo_path_exam_focus",
        title: "stale",
        description: "stale",
        status: "in_progress",
        progress: 10,
        tags: [],
        tasks: [],
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    await saveDb(db);

    const tool = getAllTools({ userId: "demo-user", isDemo: true }).find(
      (item) => item.name === "query_learning_progress"
    );
    expect(tool).toBeDefined();

    const raw = await tool!.invoke({ pathId: "" });
    const result = JSON.parse(typeof raw === "string" ? raw : JSON.stringify(raw));

    expect(result.count).toBe(DEMO_PATH_SEEDS.length);
    expect(result.reason).toBeUndefined();

    const latest = await loadDb();
    const seeded = latest.syncedPaths.filter((item) => item.userId === "demo-user");
    expect(seeded.length).toBe(DEMO_PATH_SEEDS.length);
    expect(seeded.some((item) => item.pathId === "demo_path_exam_focus")).toBe(false);

    await fs.rm(dataDir, { recursive: true, force: true });
  });
});

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { getAllTools } from "./tools-real";
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

  it("does not seed synced paths for demo users", async () => {
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

    expect(result.count).toBe(1);
    expect(result.paths).toHaveLength(1);
    expect(result.paths[0]?.pathId).toBe("demo_path_exam_focus");

    const latest = await loadDb();
    const scoped = latest.syncedPaths.filter((item) => item.userId === "demo-user");
    expect(scoped).toHaveLength(1);
    expect(scoped[0]?.pathId).toBe("demo_path_exam_focus");

    await fs.rm(dataDir, { recursive: true, force: true });
  });
});

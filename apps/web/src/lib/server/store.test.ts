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

  it("returns only core workspace keys when loading legacy db payload", async () => {
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

    expect(Object.keys(db).sort()).toEqual(["masteryByNode", "plans", "sessions"]);
    expect(db.sessions[0]?.id).toBe("ws_legacy");
    expect(db.masteryByNode.seq).toBe(0.4);

    await fs.rm(dataDir, { recursive: true, force: true });
  });
});

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createSession, getSession, listSessions } from "./session-service";

const originalDataDir = process.env.EDUNEXUS_DATA_DIR;

async function createDataDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), "edunexus-session-test-"));
}

describe("session service", () => {
  afterEach(async () => {
    if (originalDataDir) {
      process.env.EDUNEXUS_DATA_DIR = originalDataDir;
    } else {
      delete process.env.EDUNEXUS_DATA_DIR;
    }
  });

  it("can create and read sessions inside core json store boundary", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;

    const created = await createSession({ title: "Core Session" }, "u1");
    const sessions = await listSessions(undefined, "u1");
    const fetched = await getSession(created.id, "u1");

    expect(sessions.some((session) => session.id === created.id)).toBe(true);
    expect(fetched?.id).toBe(created.id);
    expect(await getSession(created.id, "u2")).toBeNull();

    await fs.rm(dataDir, { recursive: true, force: true });
  });
});

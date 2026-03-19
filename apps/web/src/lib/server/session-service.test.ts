import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { appendSessionMessage, createSession, getSession, listSessions } from "./session-service";

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

  it("enforces a 10-session cap per user without deleting another user's sessions", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;

    const user1SessionIds: string[] = [];
    for (let index = 0; index < 11; index += 1) {
      const created = await createSession({ title: `User 1 Session ${index + 1}` }, "user-1");
      user1SessionIds.push(created.id);
    }

    const user2First = await createSession({ title: "User 2 Session 1" }, "user-2");
    const user2Second = await createSession({ title: "User 2 Session 2" }, "user-2");

    const user1Sessions = await listSessions(undefined, "user-1");
    const user2Sessions = await listSessions(undefined, "user-2");

    expect(user1Sessions).toHaveLength(10);
    expect(user1Sessions.map((session) => session.id)).not.toContain(user1SessionIds[0]);
    expect(user1Sessions.map((session) => session.id)).toContain(user1SessionIds[10]);
    expect(user2Sessions.map((session) => session.id)).toEqual([user2Second.id, user2First.id]);

    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("generates the title from the first user message when no title is provided", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;

    const firstMessage = "我想系统学习 React 组件设计与状态管理";

    const created = await createSession({ firstMessage }, "user-1");

    expect(created.title).toBe("我想系统学习 React 组件设计与状态管理");

    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("updates updatedAt when a message is appended", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;

    const created = await createSession({ title: "Append Target" }, "user-1");

    await new Promise((resolve) => setTimeout(resolve, 5));
    const updated = await appendSessionMessage(
      created.id,
      {
        role: "user",
        content: "Explain session retention rules"
      },
      "user-1"
    );

    expect(updated).not.toBeNull();
    expect(updated?.updatedAt).not.toBe(created.updatedAt);
    expect(updated?.messages.at(-1)).toMatchObject({
      role: "user",
      content: "Explain session retention rules"
    });

    await fs.rm(dataDir, { recursive: true, force: true });
  });
});

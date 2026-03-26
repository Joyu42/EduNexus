import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const { loadDb, saveDb } = await import("./store");
const { isActiveMember, isActiveOwner, getActiveMembership } = await import("./groups-service");

const originalDataDir = process.env.EDUNEXUS_DATA_DIR;

async function createDataDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), "edunexus-groups-service-test-"));
}

describe("group permission helpers", () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;
  });

  afterEach(async () => {
    if (dataDir) {
      await fs.rm(dataDir, { recursive: true, force: true });
    }
    if (originalDataDir) {
      process.env.EDUNEXUS_DATA_DIR = originalDataDir;
    } else {
      delete process.env.EDUNEXUS_DATA_DIR;
    }
  });

  describe("getActiveMembership", () => {
    it("returns membership record for active owner", async () => {
      const db = await loadDb();
      db.groupMembers.push({
        id: "gm_1",
        groupId: "group_alpha",
        userId: "user_owner",
        role: "owner",
        status: "active",
        joinedAt: new Date().toISOString()
      });
      await saveDb(db);

      const result = await getActiveMembership("group_alpha", "user_owner");
      expect(result).not.toBeNull();
      expect(result?.role).toBe("owner");
    });

    it("returns membership record for active member", async () => {
      const db = await loadDb();
      db.groupMembers.push({
        id: "gm_2",
        groupId: "group_alpha",
        userId: "user_member",
        role: "member",
        status: "active",
        joinedAt: new Date().toISOString()
      });
      await saveDb(db);

      const result = await getActiveMembership("group_alpha", "user_member");
      expect(result).not.toBeNull();
      expect(result?.role).toBe("member");
    });

    it("returns null for missing membership", async () => {
      const result = await getActiveMembership("group_alpha", "user_nonexistent");
      expect(result).toBeNull();
    });

    it("returns null for inactive membership", async () => {
      const db = await loadDb();
      db.groupMembers.push({
        id: "gm_3",
        groupId: "group_alpha",
        userId: "user_inactive",
        role: "member",
        status: "removed",
        joinedAt: new Date().toISOString()
      });
      await saveDb(db);

      const result = await getActiveMembership("group_alpha", "user_inactive");
      expect(result).toBeNull();
    });
  });

  describe("isActiveMember", () => {
    it("returns true for active owner", async () => {
      const db = await loadDb();
      db.groupMembers.push({
        id: "gm_owner_1",
        groupId: "group_beta",
        userId: "user_owner",
        role: "owner",
        status: "active",
        joinedAt: new Date().toISOString()
      });
      await saveDb(db);

      const result = await isActiveMember("group_beta", "user_owner");
      expect(result).toBe(true);
    });

    it("returns true for active admin", async () => {
      const db = await loadDb();
      db.groupMembers.push({
        id: "gm_admin_1",
        groupId: "group_beta",
        userId: "user_admin",
        role: "admin",
        status: "active",
        joinedAt: new Date().toISOString()
      });
      await saveDb(db);

      const result = await isActiveMember("group_beta", "user_admin");
      expect(result).toBe(true);
    });

    it("returns true for active member", async () => {
      const db = await loadDb();
      db.groupMembers.push({
        id: "gm_member_1",
        groupId: "group_beta",
        userId: "user_member",
        role: "member",
        status: "active",
        joinedAt: new Date().toISOString()
      });
      await saveDb(db);

      const result = await isActiveMember("group_beta", "user_member");
      expect(result).toBe(true);
    });

    it("returns false for missing membership", async () => {
      const result = await isActiveMember("group_beta", "user_nonexistent");
      expect(result).toBe(false);
    });

    it("returns false for inactive membership", async () => {
      const db = await loadDb();
      db.groupMembers.push({
        id: "gm_inactive_1",
        groupId: "group_beta",
        userId: "user_inactive",
        role: "member",
        status: "invited",
        joinedAt: new Date().toISOString()
      });
      await saveDb(db);

      const result = await isActiveMember("group_beta", "user_inactive");
      expect(result).toBe(false);
    });

    it("returns false for removed membership", async () => {
      const db = await loadDb();
      db.groupMembers.push({
        id: "gm_removed_1",
        groupId: "group_beta",
        userId: "user_removed",
        role: "member",
        status: "removed",
        joinedAt: new Date().toISOString()
      });
      await saveDb(db);

      const result = await isActiveMember("group_beta", "user_removed");
      expect(result).toBe(false);
    });
  });

  describe("isActiveOwner", () => {
    it("returns true for active owner", async () => {
      const db = await loadDb();
      db.groupMembers.push({
        id: "gm_owner_2",
        groupId: "group_gamma",
        userId: "user_owner",
        role: "owner",
        status: "active",
        joinedAt: new Date().toISOString()
      });
      await saveDb(db);

      const result = await isActiveOwner("group_gamma", "user_owner");
      expect(result).toBe(true);
    });

    it("returns false for active admin", async () => {
      const db = await loadDb();
      db.groupMembers.push({
        id: "gm_admin_2",
        groupId: "group_gamma",
        userId: "user_admin",
        role: "admin",
        status: "active",
        joinedAt: new Date().toISOString()
      });
      await saveDb(db);

      const result = await isActiveOwner("group_gamma", "user_admin");
      expect(result).toBe(false);
    });

    it("returns false for active member", async () => {
      const db = await loadDb();
      db.groupMembers.push({
        id: "gm_member_2",
        groupId: "group_gamma",
        userId: "user_member",
        role: "member",
        status: "active",
        joinedAt: new Date().toISOString()
      });
      await saveDb(db);

      const result = await isActiveOwner("group_gamma", "user_member");
      expect(result).toBe(false);
    });

    it("returns false for missing membership", async () => {
      const result = await isActiveOwner("group_gamma", "user_nonexistent");
      expect(result).toBe(false);
    });

    it("returns false for inactive owner membership", async () => {
      const db = await loadDb();
      db.groupMembers.push({
        id: "gm_owner_inactive",
        groupId: "group_gamma",
        userId: "user_owner_inactive",
        role: "owner",
        status: "removed",
        joinedAt: new Date().toISOString()
      });
      await saveDb(db);

      const result = await isActiveOwner("group_gamma", "user_owner_inactive");
      expect(result).toBe(false);
    });
  });
});

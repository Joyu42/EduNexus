import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const { loadDb, saveDb } = await import("./store");
const {
  isActiveMember,
  isActiveOwner,
  getActiveMembership,
  createGroupResource,
  getGroupResource,
  updateGroupResource,
  deleteGroupResource,
  listGroupResources
} = await import("./groups-service");

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

describe("group resource CRUD", () => {
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

  it("creates a group resource record", async () => {
    const record = await createGroupResource({
      groupId: "group_alpha",
      title: "Resource title",
      description: "Resource description",
      url: "https://example.com/resource",
      createdBy: "user_creator"
    });

    expect(record.groupId).toBe("group_alpha");
    expect(record.title).toBe("Resource title");
    expect(record.description).toBe("Resource description");
    expect(record.url).toBe("https://example.com/resource");
    expect(record.createdBy).toBe("user_creator");

    const db = await loadDb();
    expect(db.groupResources[0]).toEqual(record);
  });

  it("returns a group resource by id", async () => {
    const created = await createGroupResource({
      groupId: "group_alpha",
      title: "Lookup title",
      description: "Lookup description",
      url: "https://example.com/lookup",
      createdBy: "user_creator"
    });

    const result = await getGroupResource(created.id);
    expect(result).toEqual(created);
  });

  it("updates a group resource record", async () => {
    const created = await createGroupResource({
      groupId: "group_alpha",
      title: "Original title",
      description: "Original description",
      url: "https://example.com/original",
      createdBy: "user_creator"
    });

    await new Promise((resolve) => setTimeout(resolve, 2));

    const updated = await updateGroupResource(created.id, {
      title: "Updated title",
      description: "Updated description",
      url: "https://example.com/updated"
    });

    expect(updated).not.toBeNull();
    expect(updated?.title).toBe("Updated title");
    expect(updated?.description).toBe("Updated description");
    expect(updated?.url).toBe("https://example.com/updated");
    expect(updated?.updatedAt).not.toBe(created.updatedAt);
  });

  it("deletes a group resource record", async () => {
    const created = await createGroupResource({
      groupId: "group_alpha",
      title: "Delete title",
      description: "Delete description",
      url: "https://example.com/delete",
      createdBy: "user_creator"
    });

    const deleted = await deleteGroupResource(created.id);
    expect(deleted).toBe(true);
    expect(await getGroupResource(created.id)).toBeNull();
  });

  it("lists group resources with optional group filtering", async () => {
    const first = await createGroupResource({
      groupId: "group_alpha",
      title: "Alpha resource",
      description: "Alpha description",
      url: "https://example.com/alpha",
      createdBy: "user_creator"
    });
    const second = await createGroupResource({
      groupId: "group_beta",
      title: "Beta resource",
      description: "Beta description",
      url: "https://example.com/beta",
      createdBy: "user_creator"
    });

    const filtered = await listGroupResources("group_alpha");
    expect(filtered).toEqual([first]);

    const all = await listGroupResources();
    expect(all).toEqual([second, first]);
  });
});

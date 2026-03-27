import fs from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QA_GROUP_ID } from "@/lib/server/cleanup-demo-manifest";
import { applyDemoCleanup } from "@/lib/server/cleanup-demo";

const getCurrentUserId = vi.fn();
const loadDb = vi.fn();
const saveDb = vi.fn();
const createGroup = vi.fn();
const createGroupMember = vi.fn();
const syncGroupMemberCount = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId
}));

vi.mock("@/lib/server/store", () => ({
  loadDb,
  saveDb
}));

vi.mock("@/lib/server/groups-service", () => ({
  createGroup,
  createGroupMember,
  syncGroupMemberCount
}));

const { GET: listGroupsRoute, POST: createGroupRoute } = await import("./route");

const pollutedFixturePath = path.resolve(process.cwd(), "scripts/fixtures/cleanup-demo-polluted-db.json");

type CleanupInputDb = Parameters<typeof applyDemoCleanup>[0];

async function loadPollutedFixtureDb(): Promise<CleanupInputDb> {
  const raw = await fs.readFile(pollutedFixturePath, "utf8");
  return JSON.parse(raw) as CleanupInputDb;
}

describe("groups api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("session-user");
    loadDb.mockResolvedValue({});
    createGroup.mockResolvedValue({
      id: "group_test",
      name: "默认小组",
      description: "",
      memberCount: 1,
      createdBy: "user_test",
      createdAt: "2026-03-17T00:00:00.000Z"
    });
    createGroupMember.mockResolvedValue({
      id: "group_member_owner",
      groupId: "group_test",
      userId: "session-user",
      role: "owner",
      status: "active",
      joinedAt: "2026-03-17T00:00:00.000Z"
    });
    syncGroupMemberCount.mockResolvedValue({
      id: "group_test",
      name: "默认小组",
      description: "",
      memberCount: 1,
      createdBy: "user_test",
      createdAt: "2026-03-17T00:00:00.000Z"
    });
  });

  it("creates a group using current user id", async () => {
    const response = await createGroupRoute(
      new Request("http://localhost/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "学习小组",
          description: "一起学习",
          category: "frontend",
        })
      })
    );

    expect(response.status).toBe(201);
    expect(createGroup).toHaveBeenCalledTimes(1);
    expect(createGroupMember).toHaveBeenCalledTimes(1);
    expect(syncGroupMemberCount).toHaveBeenCalledWith("group_test");
    expect(createGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "学习小组",
        description: "一起学习",
        createdBy: "session-user"
      })
    );

    const payload = (await response.json()) as {
      success: boolean;
      data: { group: unknown };
    };
    expect(payload.success).toBe(true);
    expect(payload.data.group).toEqual(
      expect.objectContaining({
        name: "默认小组",
        createdBy: "user_test"
      })
    );
  });

  it("rejects unauthenticated requests with 401", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const response = await createGroupRoute(
      new Request("http://localhost/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "学习小组" })
      })
    );

    expect(response.status).toBe(401);
    expect(createGroup).not.toHaveBeenCalled();
    expect(createGroupMember).not.toHaveBeenCalled();
    expect(syncGroupMemberCount).not.toHaveBeenCalled();
  });

  it("rejects empty-name requests with 400", async () => {
    const response = await createGroupRoute(
      new Request("http://localhost/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" })
      })
    );

    expect(response.status).toBe(400);
    expect(createGroup).not.toHaveBeenCalled();
    expect(createGroupMember).not.toHaveBeenCalled();
    expect(syncGroupMemberCount).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only name with 400", async () => {
    const response = await createGroupRoute(
      new Request("http://localhost/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "   " })
      })
    );

    expect(response.status).toBe(400);
    expect(createGroup).not.toHaveBeenCalled();
    expect(createGroupMember).not.toHaveBeenCalled();
    expect(syncGroupMemberCount).not.toHaveBeenCalled();
  });

  it("rejects missing name with 400", async () => {
    const response = await createGroupRoute(
      new Request("http://localhost/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      })
    );

    expect(response.status).toBe(400);
    expect(createGroup).not.toHaveBeenCalled();
    expect(createGroupMember).not.toHaveBeenCalled();
    expect(syncGroupMemberCount).not.toHaveBeenCalled();
  });

  it("returns concrete group.id in response payload for redirect use", async () => {
    const response = await createGroupRoute(
      new Request("http://localhost/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "重定向小组" })
      })
    );

    expect(response.status).toBe(201);
    const payload = (await response.json()) as {
      success: boolean;
      data: { group: { id: string } };
    };
    expect(payload.success).toBe(true);
    expect(payload.data.group.id).toBe("group_test");
  });

  it("creates owner membership with creator as owner", async () => {
    await createGroupRoute(
      new Request("http://localhost/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "owner验证小组" })
      })
    );

    expect(createGroupMember).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "group_test",
        userId: "session-user",
        role: "owner",
        status: "active"
      })
    );
  });

  it("shows QA group before cleanup and excludes it after cleanup in list surface", async () => {
    const pollutedDb = await loadPollutedFixtureDb();
    const cleanedDb = applyDemoCleanup(pollutedDb, { includeSeededArtifacts: true }).db;

    loadDb.mockResolvedValueOnce(pollutedDb).mockResolvedValueOnce(cleanedDb);

    const beforeCleanupResponse = await listGroupsRoute();
    expect(beforeCleanupResponse.status).toBe(200);
    const beforeCleanupPayload = (await beforeCleanupResponse.json()) as {
      success: boolean;
      data: { groups: Array<{ id: string }> };
    };
    expect(beforeCleanupPayload.success).toBe(true);
    expect(beforeCleanupPayload.data.groups.some((group) => group.id === QA_GROUP_ID)).toBe(true);

    const afterCleanupResponse = await listGroupsRoute();
    expect(afterCleanupResponse.status).toBe(200);
    const afterCleanupPayload = (await afterCleanupResponse.json()) as {
      success: boolean;
      data: { groups: Array<{ id: string }> };
    };
    expect(afterCleanupPayload.success).toBe(true);
    expect(afterCleanupPayload.data.groups.some((group) => group.id === QA_GROUP_ID)).toBe(false);
  });
});

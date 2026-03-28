import fs from "node:fs/promises";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QA_GROUP_ID } from "@/lib/server/cleanup-demo-manifest";
import { applyDemoCleanup } from "@/lib/server/cleanup-demo";

const getCurrentUserId = vi.fn();
const loadDb = vi.fn();

const listGroupMembers = vi.fn();
const listGroupPosts = vi.fn();
const listGroupTasks = vi.fn();
const listGroupSharedResources = vi.fn();

const deleteGroupMember = vi.fn();
const deleteGroupPost = vi.fn();
const deleteGroupTask = vi.fn();
const deleteGroupSharedResource = vi.fn();
const deleteGroup = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId,
}));

vi.mock("@/lib/server/store", () => ({
  loadDb,
}));

vi.mock("@/lib/server/groups-service", () => ({
  deleteGroup,
  deleteGroupMember,
  deleteGroupPost,
  deleteGroupSharedResource,
  deleteGroupTask,
  listGroupMembers,
  listGroupPosts,
  listGroupSharedResources,
  listGroupTasks,
  syncGroupMemberCount: vi.fn(),
  updateGroup: vi.fn(),
}));

const { GET: getGroupDetailRoute, DELETE: deleteGroupRoute } = await import("./route");

const pollutedFixturePath = path.resolve(process.cwd(), "scripts/fixtures/cleanup-demo-polluted-db.json");

type CleanupInputDb = Parameters<typeof applyDemoCleanup>[0];

async function loadPollutedFixtureDb(): Promise<CleanupInputDb> {
  const raw = await fs.readFile(pollutedFixturePath, "utf8");
  return JSON.parse(raw) as CleanupInputDb;
}

describe("group detail api delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("owner-user");
    loadDb.mockResolvedValue({
      publicGroups: [
        {
          id: "group_1",
          name: "Group",
          description: "",
          memberCount: 1,
          createdBy: "owner-user",
          createdAt: "2026-03-17T00:00:00.000Z",
        },
      ],
      groupMembers: [],
    });

    listGroupMembers.mockResolvedValue([{ id: "m1" }, { id: "m2" }]);
    listGroupPosts.mockResolvedValue([{ id: "p1" }]);
    listGroupTasks.mockResolvedValue([{ id: "t1" }]);
    listGroupSharedResources.mockResolvedValue([{ id: "r1" }, { id: "r2" }]);

    deleteGroupMember.mockResolvedValue(true);
    deleteGroupPost.mockResolvedValue(true);
    deleteGroupTask.mockResolvedValue(true);
    deleteGroupSharedResource.mockResolvedValue(true);
    deleteGroup.mockResolvedValue(true);
  });

  it("returns 401 when unauthenticated", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const response = await deleteGroupRoute(new Request("http://localhost/api/groups/group_1"), {
      params: Promise.resolve({ groupId: "group_1" }),
    });

    expect(response.status).toBe(401);
    expect(loadDb).not.toHaveBeenCalled();
    expect(deleteGroup).not.toHaveBeenCalled();
  });

  it("returns 404 when group does not exist", async () => {
    loadDb.mockResolvedValue({ publicGroups: [], groupMembers: [] });

    const response = await deleteGroupRoute(new Request("http://localhost/api/groups/group_missing"), {
      params: Promise.resolve({ groupId: "group_missing" }),
    });

    expect(response.status).toBe(404);
    expect(deleteGroup).not.toHaveBeenCalled();
    expect(listGroupMembers).not.toHaveBeenCalled();
  });

  it("returns 403 when user is not group owner", async () => {
    getCurrentUserId.mockResolvedValue("other-user");
    loadDb.mockResolvedValue({
      publicGroups: [
        {
          id: "group_1",
          name: "Group",
          description: "",
          memberCount: 1,
          createdBy: "owner-user",
          createdAt: "2026-03-17T00:00:00.000Z",
        },
      ],
    });

    const response = await deleteGroupRoute(new Request("http://localhost/api/groups/group_1"), {
      params: Promise.resolve({ groupId: "group_1" }),
    });

    expect(response.status).toBe(403);
    expect(listGroupMembers).not.toHaveBeenCalled();
    expect(deleteGroup).not.toHaveBeenCalled();
  });

  it("deletes dependent records and group for the owner", async () => {
    const response = await deleteGroupRoute(new Request("http://localhost/api/groups/group_1"), {
      params: Promise.resolve({ groupId: "group_1" }),
    });

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { success: boolean; data: { deleted: boolean } };
    expect(payload.success).toBe(true);
    expect(payload.data.deleted).toBe(true);

    expect(listGroupMembers).toHaveBeenCalledWith("group_1");
    expect(listGroupPosts).toHaveBeenCalledWith("group_1");
    expect(listGroupTasks).toHaveBeenCalledWith("group_1");
    expect(listGroupSharedResources).toHaveBeenCalledWith("group_1");

    expect(deleteGroupMember).toHaveBeenCalledTimes(2);
    expect(deleteGroupMember).toHaveBeenNthCalledWith(1, "m1");
    expect(deleteGroupMember).toHaveBeenNthCalledWith(2, "m2");

    expect(deleteGroupPost).toHaveBeenCalledWith("p1");
    expect(deleteGroupTask).toHaveBeenCalledWith("t1");

    expect(deleteGroupSharedResource).toHaveBeenCalledTimes(2);
    expect(deleteGroupSharedResource).toHaveBeenNthCalledWith(1, "r1");
    expect(deleteGroupSharedResource).toHaveBeenNthCalledWith(2, "r2");

    expect(deleteGroup).toHaveBeenCalledTimes(1);
    expect(deleteGroup).toHaveBeenCalledWith("group_1");
  });

  it("returns QA group detail before cleanup and GROUP_NOT_FOUND after cleanup", async () => {
    const pollutedDb = await loadPollutedFixtureDb();
    const cleanedDb = applyDemoCleanup(pollutedDb, { includeSeededArtifacts: true }).db;

    loadDb.mockResolvedValueOnce(pollutedDb).mockResolvedValueOnce(cleanedDb);

    const beforeCleanupResponse = await getGroupDetailRoute(
      new Request(`http://localhost/api/groups/${QA_GROUP_ID}`),
      { params: Promise.resolve({ groupId: QA_GROUP_ID }) }
    );

    expect(beforeCleanupResponse.status).toBe(200);
    const beforeCleanupPayload = (await beforeCleanupResponse.json()) as {
      success: boolean;
      data: { group: { id: string } };
    };
    expect(beforeCleanupPayload.success).toBe(true);
    expect(beforeCleanupPayload.data.group.id).toBe(QA_GROUP_ID);

    const afterCleanupResponse = await getGroupDetailRoute(
      new Request(`http://localhost/api/groups/${QA_GROUP_ID}`),
      { params: Promise.resolve({ groupId: QA_GROUP_ID }) }
    );

    expect(afterCleanupResponse.status).toBe(404);
    const afterCleanupPayload = (await afterCleanupResponse.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(afterCleanupPayload.success).toBe(false);
    expect(afterCleanupPayload.error.code).toBe("GROUP_NOT_FOUND");
  });
});

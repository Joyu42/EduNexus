import { beforeEach, describe, expect, it, vi } from "vitest";

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

const { POST: createGroupRoute } = await import("./route");

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
});

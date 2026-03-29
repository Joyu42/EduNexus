import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const loadDb = vi.fn();
const getGroupResource = vi.fn();
const updateGroupResource = vi.fn();
const deleteGroupResource = vi.fn();
const isActiveMember = vi.fn();
const isActiveOwner = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId
}));

vi.mock("@/lib/server/store", () => ({
  loadDb
}));

vi.mock("@/lib/server/groups-service", () => ({
  getGroupResource,
  updateGroupResource,
  deleteGroupResource,
  isActiveMember,
  isActiveOwner
}));

const { GET: getResourceRoute, PUT: updateResourceRoute, DELETE: deleteResourceRoute } = await import("./route");

describe("group resource item api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("session-user");
    loadDb.mockResolvedValue({
      publicGroups: [{ id: "group_1", createdBy: "owner", name: "g", description: "", memberCount: 1, createdAt: "" }]
    });
    isActiveMember.mockResolvedValue(true);
    isActiveOwner.mockResolvedValue(false);
    getGroupResource.mockResolvedValue({
      id: "group_resource_1",
      groupId: "group_1",
      title: "test resource",
      description: "",
      url: "https://example.com",
      createdBy: "session-user",
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z"
    });
    updateGroupResource.mockResolvedValue({
      id: "group_resource_1",
      groupId: "group_1",
      title: "updated",
      description: "updated description",
      url: "https://example.com/updated",
      createdBy: "session-user",
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:01.000Z"
    });
    deleteGroupResource.mockResolvedValue(true);
  });

  it("returns a resource for an active member", async () => {
    const response = await getResourceRoute(new Request("http://localhost/api/groups/group_1/resources/group_resource_1"), {
      params: Promise.resolve({ groupId: "group_1", resourceId: "group_resource_1" })
    });

    expect(response.status).toBe(200);
    expect(getGroupResource).toHaveBeenCalledWith("group_resource_1");
    const payload = (await response.json()) as { success: boolean; data: { groupResource: { id: string } } };
    expect(payload.success).toBe(true);
    expect(payload.data.groupResource.id).toBe("group_resource_1");
  });

  it("rejects getting a resource when the user is not a member", async () => {
    isActiveMember.mockResolvedValue(false);

    const response = await getResourceRoute(new Request("http://localhost/api/groups/group_1/resources/group_resource_1"), {
      params: Promise.resolve({ groupId: "group_1", resourceId: "group_resource_1" })
    });

    expect(response.status).toBe(403);
    expect(getGroupResource).not.toHaveBeenCalled();
  });

  it("rejects updating a resource when not logged in", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const response = await updateResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources/group_resource_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "updated", description: "updated description", url: "https://example.com/updated" })
      }),
      { params: Promise.resolve({ groupId: "group_1", resourceId: "group_resource_1" }) }
    );

    expect(response.status).toBe(401);
    expect(updateGroupResource).not.toHaveBeenCalled();
  });

  it("updates an owned resource for an active member", async () => {
    const response = await updateResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources/group_resource_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: " updated ", description: "updated description", url: " https://example.com/updated " })
      }),
      { params: Promise.resolve({ groupId: "group_1", resourceId: "group_resource_1" }) }
    );

    expect(response.status).toBe(200);
    expect(updateGroupResource).toHaveBeenCalledWith(
      "group_resource_1",
      expect.objectContaining({
        title: "updated",
        description: "updated description",
        url: "https://example.com/updated"
      })
    );
  });

  it("rejects deleting a resource when the user is not the owner", async () => {
    getGroupResource.mockResolvedValue({
      id: "group_resource_1",
      groupId: "group_1",
      title: "test resource",
      description: "",
      url: "https://example.com",
      createdBy: "other-user",
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z"
    });

    const response = await deleteResourceRoute(new Request("http://localhost/api/groups/group_1/resources/group_resource_1", {
      method: "DELETE"
    }), {
      params: Promise.resolve({ groupId: "group_1", resourceId: "group_resource_1" })
    });

    expect(response.status).toBe(403);
    expect(deleteGroupResource).not.toHaveBeenCalled();
  });

  it("deletes an owned resource for an active member", async () => {
    const response = await deleteResourceRoute(new Request("http://localhost/api/groups/group_1/resources/group_resource_1", {
      method: "DELETE"
    }), {
      params: Promise.resolve({ groupId: "group_1", resourceId: "group_resource_1" })
    });

    expect(response.status).toBe(200);
    expect(deleteGroupResource).toHaveBeenCalledTimes(1);
    expect(deleteGroupResource).toHaveBeenCalledWith("group_resource_1");
  });
});

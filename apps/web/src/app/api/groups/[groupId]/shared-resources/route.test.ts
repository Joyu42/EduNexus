import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const loadDb = vi.fn();
const listGroupSharedResources = vi.fn();
const createGroupSharedResource = vi.fn();
const isActiveMember = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId
}));

vi.mock("@/lib/server/store", () => ({
  loadDb
}));

vi.mock("@/lib/server/groups-service", () => ({
  listGroupSharedResources,
  createGroupSharedResource,
  isActiveMember
}));

const { GET: listResourcesRoute, POST: shareResourceRoute } = await import("./route");

describe("group resources api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("session-user");
    loadDb.mockResolvedValue({
      publicGroups: [{ id: "group_1", createdBy: "owner", name: "g", description: "", memberCount: 1, createdAt: "" }],
      publicResources: [{ id: "resource_1", title: "test resource", content: "", createdBy: "user_a", createdAt: "" }]
    });
    listGroupSharedResources.mockResolvedValue([
      {
        id: "group_shared_resource_1",
        groupId: "group_1",
        resourceId: "resource_1",
        sharedBy: "user_a",
        note: "",
        createdAt: "2026-03-17T00:00:00.000Z"
      }
    ]);
    isActiveMember.mockResolvedValue(true);
    createGroupSharedResource.mockResolvedValue({
      id: "group_shared_resource_new",
      groupId: "group_1",
      resourceId: "resource_1",
      sharedBy: "session-user",
      note: "",
      createdAt: "2026-03-17T00:00:00.000Z"
    });
  });

  it("lists shared resources for existing group", async () => {
    const response = await listResourcesRoute(new Request("http://localhost/api/groups/group_1/resources"), {
      params: Promise.resolve({ groupId: "group_1" })
    });

    expect(response.status).toBe(200);
    expect(listGroupSharedResources).toHaveBeenCalledTimes(1);
    expect(listGroupSharedResources).toHaveBeenCalledWith("group_1");
    const payload = (await response.json()) as { success: boolean; data: { sharedResources: unknown[] } };
    expect(payload.success).toBe(true);
    expect(payload.data.sharedResources).toHaveLength(1);
  });

  it("rejects sharing resource when not logged in", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const response = await shareResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: "resource_1" })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(401);
    expect(createGroupSharedResource).not.toHaveBeenCalled();
  });

  it("rejects sharing resource when group not found", async () => {
    loadDb.mockResolvedValue({
      publicGroups: [],
      publicResources: [{ id: "resource_1", title: "test resource", content: "", createdBy: "user_a", createdAt: "" }]
    });

    const response = await shareResourceRoute(
      new Request("http://localhost/api/groups/group_404/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: "resource_1" })
      }),
      { params: Promise.resolve({ groupId: "group_404" }) }
    );

    expect(response.status).toBe(404);
    expect(createGroupSharedResource).not.toHaveBeenCalled();
  });

  it("rejects sharing resource when resource not found", async () => {
    loadDb.mockResolvedValue({
      publicGroups: [{ id: "group_1", createdBy: "owner", name: "g", description: "", memberCount: 1, createdAt: "" }],
      publicResources: []
    });

    const response = await shareResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: "resource_404" })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(404);
    expect(createGroupSharedResource).not.toHaveBeenCalled();
  });

  it("rejects sharing resource when user not an active member", async () => {
    isActiveMember.mockResolvedValue(false);

    const response = await shareResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: "resource_1" })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(403);
    expect(createGroupSharedResource).not.toHaveBeenCalled();
  });

  it("shares a resource for active member", async () => {
    const response = await shareResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: "resource_1" })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(201);
    expect(createGroupSharedResource).toHaveBeenCalledTimes(1);
    expect(createGroupSharedResource).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "group_1",
        resourceId: "resource_1",
        sharedBy: "session-user"
      })
    );
  });

  it("rejects sharing resource without resourceId", async () => {
    const response = await shareResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(400);
    expect(createGroupSharedResource).not.toHaveBeenCalled();
  });

  it("rejects sharing resource with whitespace-only resourceId", async () => {
    const response = await shareResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId: "   " })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(400);
    expect(createGroupSharedResource).not.toHaveBeenCalled();
  });
});

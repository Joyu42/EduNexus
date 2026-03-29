import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const loadDb = vi.fn();
const listGroupResources = vi.fn();
const createGroupResource = vi.fn();
const isActiveMember = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId
}));

vi.mock("@/lib/server/store", () => ({
  loadDb
}));

vi.mock("@/lib/server/groups-service", () => ({
  listGroupResources,
  createGroupResource,
  isActiveMember
}));

const { GET: listResourcesRoute, POST: createResourceRoute } = await import("./route");

describe("group resources api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("session-user");
    loadDb.mockResolvedValue({
      publicGroups: [{ id: "group_1", createdBy: "owner", name: "g", description: "", memberCount: 1, createdAt: "" }]
    });
    listGroupResources.mockResolvedValue([
      {
        id: "group_resource_1",
        groupId: "group_1",
        title: "test resource",
        description: "",
        url: "https://example.com",
        createdBy: "session-user",
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z"
      }
    ]);
    isActiveMember.mockResolvedValue(true);
    createGroupResource.mockResolvedValue({
      id: "group_resource_new",
      groupId: "group_1",
      title: "hello",
      description: "world",
      url: "https://example.com/new",
      createdBy: "session-user",
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z"
    });
  });

  it("lists resources for existing group", async () => {
    const response = await listResourcesRoute(new Request("http://localhost/api/groups/group_1/resources"), {
      params: Promise.resolve({ groupId: "group_1" })
    });

    expect(response.status).toBe(200);
    expect(listGroupResources).toHaveBeenCalledTimes(1);
    expect(listGroupResources).toHaveBeenCalledWith("group_1");
    const payload = (await response.json()) as { success: boolean; data: { groupResources: unknown[] } };
    expect(payload.success).toBe(true);
    expect(payload.data.groupResources).toHaveLength(1);
  });

  it("rejects listing resources when user is not a member", async () => {
    isActiveMember.mockResolvedValue(false);

    const response = await listResourcesRoute(new Request("http://localhost/api/groups/group_1/resources"), {
      params: Promise.resolve({ groupId: "group_1" })
    });

    expect(response.status).toBe(403);
    expect(listGroupResources).not.toHaveBeenCalled();
  });

  it("rejects creating resource when not logged in", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const response = await createResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "t", description: "d", url: "https://example.com" })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(401);
    expect(createGroupResource).not.toHaveBeenCalled();
  });

  it("rejects creating resource when group not found", async () => {
    loadDb.mockResolvedValue({ publicGroups: [] });

    const response = await createResourceRoute(
      new Request("http://localhost/api/groups/group_404/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "t", description: "d", url: "https://example.com" })
      }),
      { params: Promise.resolve({ groupId: "group_404" }) }
    );

    expect(response.status).toBe(404);
    expect(createGroupResource).not.toHaveBeenCalled();
  });

  it("rejects creating resource when user is not a member", async () => {
    isActiveMember.mockResolvedValue(false);

    const response = await createResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "t", description: "d", url: "https://example.com" })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(403);
    expect(createGroupResource).not.toHaveBeenCalled();
  });

  it("creates a resource for a group member", async () => {
    const response = await createResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "  hello ", description: "world", url: " https://example.com/new " })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(201);
    expect(createGroupResource).toHaveBeenCalledTimes(1);
    expect(createGroupResource).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "group_1",
        createdBy: "session-user",
        title: "hello",
        description: "world",
        url: "https://example.com/new"
      })
    );
  });

  it("rejects creating resource without title", async () => {
    const response = await createResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "world", url: "https://example.com/new" })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(400);
    expect(createGroupResource).not.toHaveBeenCalled();
  });
});

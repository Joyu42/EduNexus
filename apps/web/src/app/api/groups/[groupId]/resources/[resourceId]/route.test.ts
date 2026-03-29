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
  const baseGroup = { id: "group_1", createdBy: "owner", name: "g", description: "", memberCount: 1, createdAt: "" };
  const baseResource = {
    id: "group_resource_1",
    groupId: "group_1",
    title: "test resource",
    description: "",
    url: "https://example.com",
    createdBy: "session-user",
    createdAt: "2026-03-17T00:00:00.000Z",
    updatedAt: "2026-03-17T00:00:00.000Z"
  };

  function makeResource(overrides: Partial<typeof baseResource> = {}) {
    return { ...baseResource, ...overrides };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("session-user");
    loadDb.mockResolvedValue({ publicGroups: [baseGroup] });
    isActiveMember.mockResolvedValue(true);
    isActiveOwner.mockResolvedValue(false);
    getGroupResource.mockResolvedValue(makeResource());
    updateGroupResource.mockResolvedValue({
      ...baseResource,
      title: "updated",
      description: "updated description",
      url: "https://example.com/updated",
      updatedAt: "2026-03-17T00:00:01.000Z"
    });
    deleteGroupResource.mockResolvedValue(true);
  });

  it("GET 单个资源 - 组成员成功获取", async () => {
    const response = await getResourceRoute(new Request("http://localhost/api/groups/group_1/resources/group_resource_1"), {
      params: Promise.resolve({ groupId: "group_1", resourceId: "group_resource_1" })
    });

    expect(response.status).toBe(200);
    expect(getGroupResource).toHaveBeenCalledWith("group_resource_1");
    const payload = (await response.json()) as { success: boolean; data: { groupResource: { id: string } } };
    expect(payload.success).toBe(true);
    expect(payload.data.groupResource.id).toBe("group_resource_1");
  });

  it("GET 单个资源 - 非组成员失败", async () => {
    isActiveMember.mockResolvedValue(false);

    const response = await getResourceRoute(new Request("http://localhost/api/groups/group_1/resources/group_resource_1"), {
      params: Promise.resolve({ groupId: "group_1", resourceId: "group_resource_1" })
    });

    expect(response.status).toBe(403);
    expect(getGroupResource).not.toHaveBeenCalled();
  });

  it("GET 单个资源 - 资源不属于该组时返回 404", async () => {
    getGroupResource.mockResolvedValue(makeResource({ groupId: "group_2" }));

    const response = await getResourceRoute(new Request("http://localhost/api/groups/group_1/resources/group_resource_1"), {
      params: Promise.resolve({ groupId: "group_1", resourceId: "group_resource_1" })
    });

    expect(response.status).toBe(404);
  });

  it("PUT 更新资源 - 创建者成功", async () => {
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

  it("PUT 更新资源 - 非创建者但 owner 成功", async () => {
    getGroupResource.mockResolvedValue(makeResource({ createdBy: "other-user" }));
    isActiveOwner.mockResolvedValue(true);

    const response = await updateResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources/group_resource_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "updated", description: "updated description", url: "https://example.com/updated" })
      }),
      { params: Promise.resolve({ groupId: "group_1", resourceId: "group_resource_1" }) }
    );

    expect(response.status).toBe(200);
    expect(updateGroupResource).toHaveBeenCalledTimes(1);
  });

  it("PUT 更新资源 - 无权限失败", async () => {
    getGroupResource.mockResolvedValue(makeResource({ createdBy: "other-user" }));
    isActiveOwner.mockResolvedValue(false);

    const response = await updateResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources/group_resource_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "updated", description: "updated description", url: "https://example.com/updated" })
      }),
      { params: Promise.resolve({ groupId: "group_1", resourceId: "group_resource_1" }) }
    );

    expect(response.status).toBe(403);
    expect(updateGroupResource).not.toHaveBeenCalled();
  });

  it("PUT 更新资源 - 资源不存在时返回 404", async () => {
    getGroupResource.mockResolvedValue(null);

    const response = await updateResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources/group_resource_1", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "updated", description: "updated description", url: "https://example.com/updated" })
      }),
      { params: Promise.resolve({ groupId: "group_1", resourceId: "group_resource_1" }) }
    );

    expect(response.status).toBe(404);
    expect(updateGroupResource).not.toHaveBeenCalled();
  });

  it("DELETE 删除资源 - 创建者成功", async () => {
    const response = await deleteResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources/group_resource_1", {
        method: "DELETE"
      }),
      { params: Promise.resolve({ groupId: "group_1", resourceId: "group_resource_1" }) }
    );

    expect(response.status).toBe(200);
    expect(deleteGroupResource).toHaveBeenCalledTimes(1);
    expect(deleteGroupResource).toHaveBeenCalledWith("group_resource_1");
  });

  it("DELETE 删除资源 - owner 成功", async () => {
    getGroupResource.mockResolvedValue(makeResource({ createdBy: "other-user" }));
    isActiveOwner.mockResolvedValue(true);

    const response = await deleteResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources/group_resource_1", {
        method: "DELETE"
      }),
      { params: Promise.resolve({ groupId: "group_1", resourceId: "group_resource_1" }) }
    );

    expect(response.status).toBe(200);
    expect(deleteGroupResource).toHaveBeenCalledTimes(1);
  });

  it("DELETE 删除资源 - 无权限失败", async () => {
    getGroupResource.mockResolvedValue(makeResource({ createdBy: "other-user" }));
    isActiveOwner.mockResolvedValue(false);

    const response = await deleteResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources/group_resource_1", {
        method: "DELETE"
      }),
      { params: Promise.resolve({ groupId: "group_1", resourceId: "group_resource_1" }) }
    );

    expect(response.status).toBe(403);
    expect(deleteGroupResource).not.toHaveBeenCalled();
  });

  it("DELETE 删除资源 - 资源不存在时返回 404", async () => {
    getGroupResource.mockResolvedValue(null);

    const response = await deleteResourceRoute(
      new Request("http://localhost/api/groups/group_1/resources/group_resource_1", {
        method: "DELETE"
      }),
      { params: Promise.resolve({ groupId: "group_1", resourceId: "group_resource_1" }) }
    );

    expect(response.status).toBe(404);
    expect(deleteGroupResource).not.toHaveBeenCalled();
  });
});

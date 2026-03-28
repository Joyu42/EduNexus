import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const loadDb = vi.fn();
const listGroupPosts = vi.fn();
const createGroupPost = vi.fn();
const listGroupMembers = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId
}));

vi.mock("@/lib/server/store", () => ({
  loadDb
}));

vi.mock("@/lib/server/groups-service", () => ({
  listGroupPosts,
  createGroupPost,
  listGroupMembers
}));

const { GET: listPostsRoute, POST: createPostRoute } = await import("./route");

describe("group posts api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("session-user");
    loadDb.mockResolvedValue({
      publicGroups: [{ id: "group_1", createdBy: "owner", name: "g", description: "", memberCount: 1, createdAt: "" }]
    });
    listGroupPosts.mockResolvedValue([
      {
        id: "group_post_1",
        groupId: "group_1",
        authorId: "user_a",
        title: "t",
        content: "c",
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z"
      }
    ]);
    listGroupMembers.mockResolvedValue([
      {
        id: "group_member_1",
        groupId: "group_1",
        userId: "session-user",
        role: "member",
        status: "active",
        joinedAt: "2026-03-17T00:00:00.000Z"
      }
    ]);
    createGroupPost.mockResolvedValue({
      id: "group_post_new",
      groupId: "group_1",
      authorId: "session-user",
      title: "hello",
      content: "world",
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z"
    });
  });

  it("lists posts for existing group", async () => {
    const response = await listPostsRoute(new Request("http://localhost/api/groups/group_1/posts"), {
      params: Promise.resolve({ groupId: "group_1" })
    });

    expect(response.status).toBe(200);
    expect(listGroupPosts).toHaveBeenCalledTimes(1);
    expect(listGroupPosts).toHaveBeenCalledWith("group_1");
    const payload = (await response.json()) as { success: boolean; data: { posts: unknown[] } };
    expect(payload.success).toBe(true);
    expect(payload.data.posts).toHaveLength(1);
  });

  it("rejects creating post when not logged in", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const response = await createPostRoute(
      new Request("http://localhost/api/groups/group_1/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "t", content: "c" })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(401);
    expect(createGroupPost).not.toHaveBeenCalled();
  });

  it("rejects creating post when group not found", async () => {
    loadDb.mockResolvedValue({ publicGroups: [] });

    const response = await createPostRoute(
      new Request("http://localhost/api/groups/group_404/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "t", content: "c" })
      }),
      { params: Promise.resolve({ groupId: "group_404" }) }
    );

    expect(response.status).toBe(404);
    expect(createGroupPost).not.toHaveBeenCalled();
  });

  it("rejects creating post when user not a group member", async () => {
    listGroupMembers.mockResolvedValue([]);

    const response = await createPostRoute(
      new Request("http://localhost/api/groups/group_1/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "t", content: "c" })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(403);
    expect(createGroupPost).not.toHaveBeenCalled();
  });

  it("creates a post for group member", async () => {
    const response = await createPostRoute(
      new Request("http://localhost/api/groups/group_1/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "  hello ", content: " world  " })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(201);
    expect(createGroupPost).toHaveBeenCalledTimes(1);
    expect(createGroupPost).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "group_1",
        authorId: "session-user",
        title: "hello",
        content: "world"
      })
    );
  });
});

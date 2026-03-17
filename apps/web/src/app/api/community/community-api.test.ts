import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const loadDb = vi.fn();
const saveDb = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId
}));

vi.mock("@/lib/server/store", () => ({
  loadDb,
  saveDb
}));

const { GET: listPosts, POST: createPost } = await import("./posts/route");

describe("community api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("session-user");
    loadDb.mockResolvedValue({
      sessions: [],
      plans: [],
      masteryByNode: {},
      publicPosts: [],
      publicTopics: [],
      publicGroups: [],
      publicResources: []
    });
  });

  it("allows anonymous users to read community posts", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const response = await listPosts(new Request("http://localhost/api/community/posts"));

    expect(response.status).toBe(200);
  });

  it("rejects anonymous users when creating community posts", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const response = await createPost(
      new Request("http://localhost/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "匿名帖子",
          content: "不应允许匿名发布"
        })
      })
    );

    expect(response.status).toBe(403);
    expect(saveDb).not.toHaveBeenCalled();
  });

  it("allows authenticated users to create community posts", async () => {
    const response = await createPost(
      new Request("http://localhost/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "可发布帖子",
          content: "登录用户可以发布"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(saveDb).toHaveBeenCalledTimes(1);
  });
});

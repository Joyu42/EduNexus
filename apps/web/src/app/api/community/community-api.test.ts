import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const loadDb = vi.fn();
const saveDb = vi.fn();
const createPost = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId
}));

vi.mock("@/lib/server/store", () => ({
  loadDb,
  saveDb
}));

vi.mock("@/lib/server/community-service", () => ({
  createPost
}));

const { GET: listPosts, POST: createPostRoute } = await import("./posts/route");

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
    const response = await listPosts(new Request("http://localhost/api/community/posts"));

    expect(response.status).toBe(200);
  });

  it("creates community posts with author fields", async () => {
    createPost.mockResolvedValue({
      id: "post_1",
      title: "可发布帖子",
      content: "登录用户可以发布",
      authorId: "author_1",
      authorName: "Alice",
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z"
    });

    const response = await createPostRoute(
      new Request("http://localhost/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "可发布帖子",
          content: "登录用户可以发布",
          authorId: "author_1",
          authorName: "Alice"
        })
      })
    );

    expect(response.status).toBe(201);
    expect(createPost).toHaveBeenCalledTimes(1);

    const body = await response.json();
    expect(body.data.post.authorId).toBe("author_1");
  });

  it("rejects invalid create post request", async () => {
    const response = await createPostRoute(
      new Request("http://localhost/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: " ",
          content: ""
        })
      })
    );

    expect(response.status).toBe(400);
    expect(createPost).not.toHaveBeenCalled();
  });
});

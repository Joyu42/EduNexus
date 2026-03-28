import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const loadDb = vi.fn();

const listCommunityReactions = vi.fn();
const createCommunityReaction = vi.fn();
const deleteCommunityReaction = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId
}));

vi.mock("@/lib/server/store", () => ({
  loadDb
}));

vi.mock("@/lib/server/community-service", () => ({
  listCommunityReactions,
  createCommunityReaction,
  deleteCommunityReaction
}));

const { GET: getReactions, POST: upsertReaction } = await import("./posts/[postId]/reactions/route");

describe("community reactions api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("session-user");
    loadDb.mockResolvedValue({
      sessions: [],
      plans: [],
      syncedPaths: [],
      masteryByNode: {},
      publicPosts: [{ id: "post_1" }],
      publicTopics: [],
      publicGroups: [],
      publicResources: [],
      resourceBookmarks: [],
      resourceFolders: [],
      resourceNotes: [],
      resourceRatings: [],
      groupMembers: [],
      groupPosts: [],
      groupTasks: [],
      groupSharedResources: [],
      communityComments: [],
      communityReactions: [],
      communityFollows: [],
      communityTopics: [],
      analyticsEvents: [],
      analyticsSnapshots: []
    });
  });

  it("allows anonymous users to read reaction stats", async () => {
    getCurrentUserId.mockResolvedValue(null);
    listCommunityReactions.mockResolvedValue([
      { id: "r1", targetType: "post", targetId: "post_1", actorId: "u1", reactionType: "like" },
      { id: "r2", targetType: "post", targetId: "post_1", actorId: "u2", reactionType: "like" },
      { id: "r3", targetType: "post", targetId: "post_1", actorId: "u3", reactionType: "love" }
    ]);

    const response = await getReactions(new Request("http://localhost/api/community/posts/post_1/reactions"), {
      params: Promise.resolve({ postId: "post_1" })
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.stats.total).toBe(3);
    expect(body.data.stats.byType.like).toBe(2);
    expect(body.data.stats.byType.love).toBe(1);
  });

  it("requires login to upsert reactions", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const response = await upsertReaction(
      new Request("http://localhost/api/community/posts/post_1/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "like" })
      }),
      { params: Promise.resolve({ postId: "post_1" }) }
    );

    expect(response.status).toBe(401);
    expect(createCommunityReaction).not.toHaveBeenCalled();
  });

  it("creates a reaction when user has none", async () => {
    listCommunityReactions.mockResolvedValue([]);
    createCommunityReaction.mockResolvedValue({
      id: "new",
      targetType: "post",
      targetId: "post_1",
      actorId: "session-user",
      reactionType: "like"
    });

    const response = await upsertReaction(
      new Request("http://localhost/api/community/posts/post_1/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "like" })
      }),
      { params: Promise.resolve({ postId: "post_1" }) }
    );

    expect(response.status).toBe(200);
    expect(createCommunityReaction).toHaveBeenCalledWith({
        targetType: "post",
        targetId: "post_1",
        actorId: "session-user",
        reactionType: "like"
      });
  });

  it("rejects unsupported reaction type", async () => {
    const response = await upsertReaction(
      new Request("http://localhost/api/community/posts/post_1/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "laugh" })
      }),
      { params: Promise.resolve({ postId: "post_1" }) }
    );

    expect(response.status).toBe(400);
    expect(createCommunityReaction).not.toHaveBeenCalled();
  });

  it("updates a reaction when user already reacted", async () => {
    listCommunityReactions.mockResolvedValue([
      { id: "old", targetType: "post", targetId: "post_1", actorId: "session-user", reactionType: "like" }
    ]);
    createCommunityReaction.mockResolvedValue({ id: "new" });

    const response = await upsertReaction(
      new Request("http://localhost/api/community/posts/post_1/reactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "love" })
      }),
      { params: Promise.resolve({ postId: "post_1" }) }
    );

    expect(response.status).toBe(200);
    expect(deleteCommunityReaction).toHaveBeenCalledWith("old");
    expect(createCommunityReaction).toHaveBeenCalledWith(
      expect.objectContaining({
        targetId: "post_1",
        actorId: "session-user",
        reactionType: "love"
      })
    );
  });
});

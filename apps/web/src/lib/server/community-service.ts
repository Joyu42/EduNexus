import {
  loadDb,
  saveDb,
  type CommunityCommentRecord,
  type CommunityFollowRecord,
  type CommunityReactionRecord,
  type CommunityTopicRecord,
  type PublicPostRecord
} from "./store";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listCommunityPosts() {
  const db = await loadDb();
  return db.publicPosts.slice();
}

export async function createCommunityPost(input: {
  title: string;
  content: string;
  authorId: string;
  authorName?: string;
}) {
  const db = await loadDb();
  const now = new Date().toISOString();
  const record: PublicPostRecord = {
    id: createId("community_post"),
    title: input.title,
    content: input.content,
    authorId: input.authorId,
    authorName: input.authorName ?? "匿名用户",
    createdAt: now,
    updatedAt: now
  };

  db.publicPosts.unshift(record);
  await saveDb(db);
  return record;
}

export const createPost = createCommunityPost;

export async function updateCommunityPost(
  postId: string,
  input: Partial<Pick<PublicPostRecord, "title" | "content" | "authorName">>
) {
  const db = await loadDb();
  const record = db.publicPosts.find((item) => item.id === postId);
  if (!record) {
    return null;
  }

  if (typeof input.title === "string") {
    record.title = input.title;
  }
  if (typeof input.content === "string") {
    record.content = input.content;
  }
  if (typeof input.authorName === "string") {
    record.authorName = input.authorName;
  }
  record.updatedAt = new Date().toISOString();

  await saveDb(db);
  return record;
}

export async function deleteCommunityPost(postId: string) {
  const db = await loadDb();
  const before = db.publicPosts.length;
  db.publicPosts = db.publicPosts.filter((item) => item.id !== postId);
  if (db.publicPosts.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

export async function listCommunityComments(postId?: string) {
  const db = await loadDb();
  return postId ? db.communityComments.filter((comment) => comment.postId === postId) : db.communityComments.slice();
}

export async function createCommunityComment(input: {
  postId: string;
  authorId: string;
  content: string;
  parentCommentId?: string | null;
}) {
  const db = await loadDb();
  const now = new Date().toISOString();
  const record: CommunityCommentRecord = {
    id: createId("community_comment"),
    postId: input.postId,
    authorId: input.authorId,
    content: input.content,
    parentCommentId: input.parentCommentId ?? null,
    createdAt: now,
    updatedAt: now
  };

  db.communityComments.unshift(record);
  await saveDb(db);
  return record;
}

export async function updateCommunityComment(
  commentId: string,
  input: Pick<CommunityCommentRecord, "content">
) {
  const db = await loadDb();
  const record = db.communityComments.find((item) => item.id === commentId);
  if (!record) {
    return null;
  }

  record.content = input.content;
  record.updatedAt = new Date().toISOString();
  await saveDb(db);
  return record;
}

export async function deleteCommunityComment(commentId: string) {
  const db = await loadDb();
  const before = db.communityComments.length;
  db.communityComments = db.communityComments.filter((item) => item.id !== commentId);
  if (db.communityComments.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

export async function listCommunityReactions(targetType?: CommunityReactionRecord["targetType"], targetId?: string) {
  const db = await loadDb();
  return db.communityReactions.filter((reaction) => {
    if (targetType && reaction.targetType !== targetType) return false;
    if (targetId && reaction.targetId !== targetId) return false;
    return true;
  });
}

export async function createCommunityReaction(input: {
  targetType: CommunityReactionRecord["targetType"];
  targetId: string;
  actorId: string;
  reactionType: string;
}) {
  const db = await loadDb();
  const record: CommunityReactionRecord = {
    id: createId("community_reaction"),
    targetType: input.targetType,
    targetId: input.targetId,
    actorId: input.actorId,
    reactionType: input.reactionType,
    createdAt: new Date().toISOString()
  };

  db.communityReactions.unshift(record);
  await saveDb(db);
  return record;
}

export async function deleteCommunityReaction(reactionId: string) {
  const db = await loadDb();
  const before = db.communityReactions.length;
  db.communityReactions = db.communityReactions.filter((item) => item.id !== reactionId);
  if (db.communityReactions.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

export async function listCommunityFollows(followerId?: string, followeeId?: string) {
  const db = await loadDb();
  return db.communityFollows.filter((follow) => {
    if (followerId && follow.followerId !== followerId) return false;
    if (followeeId && follow.followeeId !== followeeId) return false;
    return true;
  });
}

export async function createCommunityFollow(input: {
  followerId: string;
  followeeId: string;
}) {
  const db = await loadDb();
  const record: CommunityFollowRecord = {
    id: createId("community_follow"),
    followerId: input.followerId,
    followeeId: input.followeeId,
    createdAt: new Date().toISOString()
  };

  db.communityFollows.unshift(record);
  await saveDb(db);
  return record;
}

export async function deleteCommunityFollow(followId: string) {
  const db = await loadDb();
  const before = db.communityFollows.length;
  db.communityFollows = db.communityFollows.filter((item) => item.id !== followId);
  if (db.communityFollows.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

export async function listCommunityTopics() {
  const db = await loadDb();
  return db.communityTopics.slice();
}

export async function createCommunityTopic(input: {
  name: string;
  description?: string;
  createdBy: string;
}) {
  const db = await loadDb();
  const now = new Date().toISOString();
  const record: CommunityTopicRecord = {
    id: createId("community_topic"),
    name: input.name,
    description: input.description ?? "",
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now
  };

  db.communityTopics.unshift(record);
  await saveDb(db);
  return record;
}

export async function updateCommunityTopic(
  topicId: string,
  input: Partial<Pick<CommunityTopicRecord, "name" | "description">>
) {
  const db = await loadDb();
  const record = db.communityTopics.find((item) => item.id === topicId);
  if (!record) {
    return null;
  }

  if (typeof input.name === "string") {
    record.name = input.name;
  }
  if (typeof input.description === "string") {
    record.description = input.description;
  }
  record.updatedAt = new Date().toISOString();

  await saveDb(db);
  return record;
}

export async function deleteCommunityTopic(topicId: string) {
  const db = await loadDb();
  const before = db.communityTopics.length;
  db.communityTopics = db.communityTopics.filter((item) => item.id !== topicId);
  if (db.communityTopics.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

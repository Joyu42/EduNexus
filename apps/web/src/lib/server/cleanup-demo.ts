import type { DbSchema } from "./store";
import {
  SEEDED_GROUP_PREFIX,
  SEEDED_KB_DOC_TITLES,
  SEEDED_NODE_PREFIX,
  SEEDED_POST_PREFIX,
  SEEDED_PREFIXES,
  SEEDED_RESOURCE_PREFIX,
} from "./cleanup-demo-manifest";

type CleanupOptions = {
  groupId?: string;
  includeSeededArtifacts?: boolean;
};

type CleanupAudit = {
  before: Record<string, number>;
  after: Record<string, number>;
};

function startsWithAny(value: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => value.startsWith(prefix));
}

function auditDb(db: DbSchema): Record<string, number> {
  return {
    sessions: db.sessions.length,
    plans: db.plans.length,
    syncedPaths: db.syncedPaths.length,
    masteryByNode: Object.keys(db.masteryByNode).length,
    needsReviewNodes: db.needsReviewNodes.length,
    publicPosts: db.publicPosts.length,
    publicTopics: db.publicTopics.length,
    publicGroups: db.publicGroups.length,
    publicResources: db.publicResources.length,
    resourceBookmarks: db.resourceBookmarks.length,
    resourceFolders: db.resourceFolders.length,
    resourceNotes: db.resourceNotes.length,
    resourceRatings: db.resourceRatings.length,
    groupMembers: db.groupMembers.length,
    groupPosts: db.groupPosts.length,
    groupTasks: db.groupTasks.length,
    groupSharedResources: db.groupSharedResources.length,
    communityComments: db.communityComments.length,
    communityReactions: db.communityReactions.length,
    communityFollows: db.communityFollows.length,
    communityTopics: db.communityTopics.length,
    analyticsEvents: db.analyticsEvents.length,
    analyticsSnapshots: db.analyticsSnapshots.length,
    learningPacks: db.learningPacks.length,
  };
}

export function applyDemoCleanup(db: DbSchema, options: CleanupOptions): { db: DbSchema; audit: CleanupAudit } {
  const before = auditDb(db);
  const next: DbSchema = structuredClone(db);
  const groupId = typeof options.groupId === "string" && options.groupId.trim() ? options.groupId.trim() : undefined;
  const includeSeeded = options.includeSeededArtifacts === true;

  if (groupId) {
    next.publicGroups = next.publicGroups.filter((g) => g.id !== groupId);
    next.groupMembers = next.groupMembers.filter((m) => m.groupId !== groupId);
    next.groupPosts = next.groupPosts.filter((p) => p.groupId !== groupId);
    next.groupTasks = next.groupTasks.filter((t) => t.groupId !== groupId);
    next.groupSharedResources = next.groupSharedResources.filter((r) => r.groupId !== groupId);
  }

  if (includeSeeded) {
    next.publicTopics = next.publicTopics.filter((t) => !startsWithAny(t.id, SEEDED_PREFIXES.publicTopics));
    next.publicResources = next.publicResources.filter((r) => !startsWithAny(r.id, SEEDED_PREFIXES.publicResources));

    // Collect removed group IDs first for cascade deletion to dependents
    const removedGroupIds = new Set(
      next.publicGroups.filter((g) => startsWithAny(g.id, SEEDED_PREFIXES.publicGroups)).map((g) => g.id)
    );
    next.publicGroups = next.publicGroups.filter((g) => !startsWithAny(g.id, SEEDED_PREFIXES.publicGroups));

    next.publicPosts = next.publicPosts.filter((p) => !startsWithAny(p.id, SEEDED_PREFIXES.publicPosts));

    next.resourceBookmarks = next.resourceBookmarks.filter(
      (b) =>
        !startsWithAny(b.id, SEEDED_PREFIXES.resourceBookmarks) &&
        !b.resourceId.startsWith(SEEDED_RESOURCE_PREFIX)
    );
    next.resourceNotes = next.resourceNotes.filter(
      (n) =>
        !startsWithAny(n.id, SEEDED_PREFIXES.resourceNotes) &&
        !n.resourceId.startsWith(SEEDED_RESOURCE_PREFIX)
    );
    next.resourceRatings = next.resourceRatings.filter(
      (r) =>
        !startsWithAny(r.id, SEEDED_PREFIXES.resourceRatings) &&
        !r.resourceId.startsWith(SEEDED_RESOURCE_PREFIX)
    );

    // Cascade deletion: remove dependents by groupId including literal seeded group IDs
    next.groupMembers = next.groupMembers.filter(
      (m) => !startsWithAny(m.id, SEEDED_PREFIXES.groupMembers) && !removedGroupIds.has(m.groupId)
    );
    next.groupPosts = next.groupPosts.filter(
      (p) => !startsWithAny(p.id, SEEDED_PREFIXES.groupPosts) && !removedGroupIds.has(p.groupId)
    );
    next.groupTasks = next.groupTasks.filter(
      (t) => !startsWithAny(t.id, SEEDED_PREFIXES.groupTasks) && !removedGroupIds.has(t.groupId)
    );
    next.groupSharedResources = next.groupSharedResources.filter(
      (r) => !removedGroupIds.has(r.groupId)
    );

    next.communityComments = next.communityComments.filter(
      (c) => !startsWithAny(c.id, SEEDED_PREFIXES.communityComments) && !c.postId.startsWith(SEEDED_POST_PREFIX)
    );
    next.communityReactions = next.communityReactions.filter(
      (r) => !startsWithAny(r.id, SEEDED_PREFIXES.communityReactions) && !r.targetId.startsWith(SEEDED_POST_PREFIX)
    );

    next.sessions = next.sessions.filter((s) => !startsWithAny(s.id, SEEDED_PREFIXES.sessions));
    next.syncedPaths = next.syncedPaths.filter((p) => !startsWithAny(p.pathId, SEEDED_PREFIXES.syncedPaths));
    next.plans = next.plans.filter((p) => !startsWithAny(p.planId, SEEDED_PREFIXES.plans));

    for (const key of Object.keys(next.masteryByNode)) {
      if (key.startsWith(SEEDED_NODE_PREFIX)) {
        delete next.masteryByNode[key];
      }
    }
    next.needsReviewNodes = next.needsReviewNodes.filter((id) => !id.startsWith(SEEDED_NODE_PREFIX));
  }

  const after = auditDb(next);
  return { db: next, audit: { before, after } };
}

export type { CleanupAudit, CleanupOptions };
export { SEEDED_KB_DOC_TITLES };

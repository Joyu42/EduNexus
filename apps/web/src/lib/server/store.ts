import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { normalizeLearningPackRecord } from "../learning-pack/schema";
import type { LearningPackRecord } from "../learning-pack/schema";

type SessionRecord = {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lastLevel: number;
  messages: SessionMessage[];
};

type SessionMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  learningPack?: {
    packId: string;
    title: string;
    topic: string;
    graphUrl: string;
  };
};

type PlanRecord = {
  planId: string;
  goalType: "exam" | "project" | "certificate";
  goal: string;
  focusNodeId?: string | null;
  focusNodeLabel?: string | null;
  focusNodeRisk?: number | null;
  relatedNodes?: string[];
  tasks: Array<{
    taskId: string;
    title: string;
    priority: number;
    reason: string;
    dueDate: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

type SyncedPathTaskRecord = {
  taskId: string;
  title: string;
  description?: string;
  estimatedTime?: string;
  status?: "not_started" | "in_progress" | "completed";
  progress?: number;
  dependencies?: string[];
  documentBinding?: {
    documentId: string;
    boundAt: string;
  };
};

type SyncedPathRecord = {
  userId: string;
  pathId: string;
  title: string;
  description: string;
  status: "not_started" | "in_progress" | "completed";
  progress: number;
  tags: string[];
  stages?: Array<{
    stageId: string;
    nodeIds: string[];
  }>;
  tasks: SyncedPathTaskRecord[];
  updatedAt: string;
};

type PublicPostRecord = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
};

type PublicTopicRecord = {
  id: string;
  name: string;
  createdAt: string;
};

type PublicGroupRecord = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  createdBy: string;
  createdAt: string;
};

type PublicResourceRecord = {
  id: string;
  title: string;
  description: string;
  url: string;
  createdBy: string;
  createdAt: string;
  type?: "document" | "video" | "tool" | "website" | "book";
  tags?: string[];
  category?: string;
  status?: "active" | "archived";
  viewCount?: number;
  bookmarkCount?: number;
  rating?: number;
  ratingCount?: number;
};

type ResourceBookmarkRecord = {
  id: string;
  userId: string;
  resourceId: string;
  createdAt: string;
};

type ResourceFolderRecord = {
  id: string;
  userId: string;
  name: string;
  description: string;
  resourceIds: string[];
  createdAt: string;
  updatedAt: string;
};

type ResourceNoteRecord = {
  id: string;
  userId: string;
  resourceId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type ResourceRatingRecord = {
  id: string;
  userId: string;
  resourceId: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
};

type GroupMemberRecord = {
  id: string;
  groupId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  status: "active" | "invited" | "removed";
  joinedAt: string;
};

type GroupPostRecord = {
  id: string;
  groupId: string;
  authorId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type GroupTaskRecord = {
  id: string;
  groupId: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type GroupSharedResourceRecord = {
  id: string;
  groupId: string;
  resourceId: string;
  sharedBy: string;
  note: string;
  createdAt: string;
};

type GroupResourceRecord = {
  id: string;
  groupId: string;
  title: string;
  description: string;
  url: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type CommunityCommentRecord = {
  id: string;
  postId: string;
  authorId: string;
  authorName?: string;
  content: string;
  parentCommentId: string | null;
  createdAt: string;
  updatedAt: string;
};

type CommunityReactionRecord = {
  id: string;
  targetType: "post" | "comment";
  targetId: string;
  actorId: string;
  reactionType: string;
  createdAt: string;
};

type CommunityFollowRecord = {
  id: string;
  followerId: string;
  followeeId: string;
  createdAt: string;
};

type CommunityTopicRecord = {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

type JsonScalar = string | number | boolean | null;

type AnalyticsEventRecord = {
  id: string;
  userId: string | null;
  name: string;
  category: string;
  occurredAt: string;
  payload: Record<string, JsonScalar>;
};

type AnalyticsSnapshotRecord = {
  id: string;
  userId: string | null;
  scope: string;
  period: string;
  metrics: Record<string, number>;
  capturedAt: string;
};

type DbSchema = {
  sessions: SessionRecord[];
  plans: PlanRecord[];
  syncedPaths: SyncedPathRecord[];
  masteryByNode: Record<string, number>;
  needsReviewNodes: string[];
  publicPosts: PublicPostRecord[];
  publicTopics: PublicTopicRecord[];
  publicGroups: PublicGroupRecord[];
  publicResources: PublicResourceRecord[];
  resourceBookmarks: ResourceBookmarkRecord[];
  resourceFolders: ResourceFolderRecord[];
  resourceNotes: ResourceNoteRecord[];
  resourceRatings: ResourceRatingRecord[];
  groupMembers: GroupMemberRecord[];
  groupPosts: GroupPostRecord[];
  groupTasks: GroupTaskRecord[];
  groupSharedResources: GroupSharedResourceRecord[];
  groupResources: GroupResourceRecord[];
  communityComments: CommunityCommentRecord[];
  communityReactions: CommunityReactionRecord[];
  communityFollows: CommunityFollowRecord[];
  communityTopics: CommunityTopicRecord[];
  analyticsEvents: AnalyticsEventRecord[];
  analyticsSnapshots: AnalyticsSnapshotRecord[];
  learningPacks: LearningPackRecord[];
};

const DEFAULT_DB: DbSchema = {
  sessions: [],
  plans: [],
  syncedPaths: [],
  masteryByNode: {},
  needsReviewNodes: [],
  publicPosts: [],
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
  groupResources: [],
  communityComments: [],
  communityReactions: [],
  communityFollows: [],
  communityTopics: [],
  analyticsEvents: [],
  analyticsSnapshots: [],
  learningPacks: []
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSessionMessage(input: unknown, fallbackCreatedAt: string): SessionMessage | null {
  if (!isRecord(input)) return null;
  const role = input.role;
  if (role !== "user" && role !== "assistant" && role !== "system") {
    return null;
  }

  const content = typeof input.content === "string" ? input.content : "";
  const createdAt = typeof input.createdAt === "string" ? input.createdAt : fallbackCreatedAt;
  const learningPack = isRecord(input.learningPack)
    && typeof input.learningPack.packId === "string"
    && typeof input.learningPack.title === "string"
    && typeof input.learningPack.topic === "string"
    && typeof input.learningPack.graphUrl === "string"
    ? {
        packId: input.learningPack.packId,
        title: input.learningPack.title,
        topic: input.learningPack.topic,
        graphUrl: input.learningPack.graphUrl,
      }
    : undefined;
  return {
    role,
    content,
    createdAt,
    ...(learningPack ? { learningPack } : {}),
  };
}

function normalizeSessionRecord(input: unknown): SessionRecord | null {
  if (!isRecord(input)) return null;
  const now = new Date().toISOString();
  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  if (!userId) {
    return null;
  }
  const messagesSource = Array.isArray(input.messages) ? input.messages : [];
  const messages = messagesSource
    .map((message) => normalizeSessionMessage(message, now))
    .filter((message): message is SessionMessage => message !== null);

  return {
    id: typeof input.id === "string" ? input.id : "",
    title: typeof input.title === "string" ? input.title : "未命名学习会话",
    userId,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : now,
    lastLevel: typeof input.lastLevel === "number" ? input.lastLevel : 1,
    messages
  };
}

function normalizePlanTask(input: unknown): PlanRecord["tasks"][number] | null {
  if (!isRecord(input)) return null;
  return {
    taskId: typeof input.taskId === "string" ? input.taskId : "",
    title: typeof input.title === "string" ? input.title : "",
    priority: typeof input.priority === "number" ? input.priority : 0,
    reason: typeof input.reason === "string" ? input.reason : "",
    dueDate: typeof input.dueDate === "string" ? input.dueDate : ""
  };
}

function normalizePlanRecord(input: unknown): PlanRecord | null {
  if (!isRecord(input)) return null;
  const tasksSource = Array.isArray(input.tasks) ? input.tasks : [];
  const tasks = tasksSource
    .map((task) => normalizePlanTask(task))
    .filter((task): task is PlanRecord["tasks"][number] => task !== null);
  const now = new Date().toISOString();

  return {
    planId: typeof input.planId === "string" ? input.planId : "",
    goalType:
      input.goalType === "exam" || input.goalType === "project" || input.goalType === "certificate"
        ? input.goalType
        : "project",
    goal: typeof input.goal === "string" ? input.goal : "",
    focusNodeId:
      typeof input.focusNodeId === "string" || input.focusNodeId === null
        ? input.focusNodeId
        : undefined,
    focusNodeLabel:
      typeof input.focusNodeLabel === "string" || input.focusNodeLabel === null
        ? input.focusNodeLabel
        : undefined,
    focusNodeRisk: typeof input.focusNodeRisk === "number" ? input.focusNodeRisk : undefined,
    relatedNodes: Array.isArray(input.relatedNodes)
      ? input.relatedNodes.filter((item): item is string => typeof item === "string")
      : undefined,
    tasks,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : now
  };
}

function normalizeMasteryByNode(input: unknown): Record<string, number> {
  if (!isRecord(input)) return {};
  const entries = Object.entries(input)
    .filter(([, value]) => typeof value === "number")
    .map(([key, value]) => [key, value]);
  return Object.fromEntries(entries);
}

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeJsonScalarRecord(input: unknown): Record<string, JsonScalar> {
  if (!isRecord(input)) {
    return {};
  }

  const entries = Object.entries(input).filter(([, value]) => {
    return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
  }) as [string, JsonScalar][];

  return Object.fromEntries(entries);
}

function normalizeSyncedPathTaskRecord(input: unknown): SyncedPathTaskRecord | null {
  if (!isRecord(input)) return null;
  const taskId = typeof input.taskId === "string" ? input.taskId : "";
  const title = typeof input.title === "string" ? input.title : "";
  if (!taskId || !title) {
    return null;
  }

  const status = input.status;
  const normalizedStatus =
    status === "not_started" || status === "in_progress" || status === "completed" ? status : undefined;

  const dependenciesSource = Array.isArray(input.dependencies) ? input.dependencies : [];
  const dependencies = dependenciesSource
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    taskId,
    title,
    description: typeof input.description === "string" ? input.description : undefined,
    estimatedTime: typeof input.estimatedTime === "string" ? input.estimatedTime : undefined,
    status: normalizedStatus,
    progress: typeof input.progress === "number" ? input.progress : undefined,
    dependencies: dependencies.length > 0 ? dependencies : undefined,
    documentBinding:
      isRecord(input.documentBinding) &&
      typeof input.documentBinding.documentId === "string" &&
      typeof input.documentBinding.boundAt === "string"
        ? {
            documentId: input.documentBinding.documentId,
            boundAt: input.documentBinding.boundAt,
          }
        : undefined,
  };
}

function normalizeSyncedPathRecord(input: unknown): SyncedPathRecord | null {
  if (!isRecord(input)) return null;
  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  const pathId = typeof input.pathId === "string" ? input.pathId : "";
  const title = typeof input.title === "string" ? input.title : "";
  if (!pathId || !title) {
    return null;
  }

  const status = input.status;
  const normalizedStatus =
    status === "not_started" || status === "in_progress" || status === "completed" ? status : "not_started";

  const tagsSource = Array.isArray(input.tags) ? input.tags : [];
  const tags = tagsSource
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const tasksSource = Array.isArray(input.tasks) ? input.tasks : [];
  const tasks = tasksSource
    .map((task) => normalizeSyncedPathTaskRecord(task))
    .filter((task): task is SyncedPathTaskRecord => task !== null);

  const stagesSource = Array.isArray(input.stages) ? input.stages : [];
  const stages = stagesSource
    .map((stage) => {
      if (!isRecord(stage)) {
        return null;
      }

      const stageId = typeof stage.stageId === "string" ? stage.stageId.trim() : "";
      const nodeIds = Array.isArray(stage.nodeIds)
        ? stage.nodeIds
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

      if (!stageId || nodeIds.length === 0) {
        return null;
      }

      return { stageId, nodeIds };
    })
    .filter((stage): stage is NonNullable<SyncedPathRecord["stages"]>[number] => stage !== null);

  return {
    userId,
    pathId,
    title,
    description: typeof input.description === "string" ? input.description : "",
    status: normalizedStatus,
    progress: typeof input.progress === "number" ? input.progress : 0,
    tags,
    stages: stages.length > 0 ? stages : undefined,
    tasks,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : new Date().toISOString(),
  };
}

export function projectLearningPackCompatibilityPath(pack: LearningPackRecord): SyncedPathRecord {
  const now = pack.updatedAt;
  const modules = pack.modules.slice().sort((a, b) => a.order - b.order);
  const totalModules = modules.length;
  const activeModuleIndex = totalModules > 0 ? modules.findIndex((module) => module.moduleId === pack.activeModuleId) : -1;
  const activeModuleProgress =
    activeModuleIndex >= 0 && totalModules > 0
      ? Math.max(0, Math.min(100, Math.round((activeModuleIndex / totalModules) * 100)))
      : 0;
  const pathStatus =
    pack.stage === "mastered"
      ? "completed"
      : pack.stage === "understood" || pack.stage === "applied"
        ? "in_progress"
        : "not_started";
  const pathProgress =
    pack.stage === "mastered"
      ? 100
      : pack.activeModuleId
          ? activeModuleProgress
          : pack.stage === "applied"
            ? 67
            : pack.stage === "understood"
              ? 33
              : 0;

  function getTaskStatus(stage: LearningPackRecord["stage"]): SyncedPathTaskRecord["status"] {
    if (stage === "mastered") return "completed";
    if (stage === "understood" || stage === "applied") return "in_progress";
    return "not_started";
  }

  function getTaskProgress(stage: LearningPackRecord["stage"]): number {
    if (stage === "mastered") return 100;
    if (stage === "applied") return 67;
    if (stage === "understood") return 33;
    return 0;
  }

  return {
    userId: pack.userId,
    pathId: pack.packId,
    title: pack.title,
    description: `AI 规划的学习路径：${pack.topic}`,
    status: pathStatus,
    progress: pathProgress,
    tags: [pack.topic],
    tasks: modules.map((module) => {
      return {
        taskId: module.moduleId,
        title: module.title,
        status: getTaskStatus(module.stage),
        progress: getTaskProgress(module.stage),
        ...(module.kbDocumentId.trim().length > 0
          ? {
              documentBinding: {
                documentId: module.kbDocumentId.trim(),
                boundAt: now,
              },
            }
          : {}),
      };
    }),
    updatedAt: now,
  };
}

function normalizePublicPostRecord(input: unknown): PublicPostRecord | null {
  if (!isRecord(input)) return null;
  const now = new Date().toISOString();
  const id = typeof input.id === "string" ? input.id : "";
  const title = typeof input.title === "string" ? input.title : "";
  const content = typeof input.content === "string" ? input.content : "";
  const authorId = typeof input.authorId === "string" ? input.authorId : "";
  const authorName = typeof input.authorName === "string" ? input.authorName : "匿名用户";

  if (!id || !title || !content || !authorId) {
    return null;
  }

  return {
    id,
    title,
    content,
    authorId,
    authorName,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : now
  };
}

function normalizePublicTopicRecord(input: unknown): PublicTopicRecord | null {
  if (!isRecord(input)) return null;
  const id = typeof input.id === "string" ? input.id : "";
  const name = typeof input.name === "string" ? input.name : "";
  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString()
  };
}

function normalizePublicGroupRecord(input: unknown): PublicGroupRecord | null {
  if (!isRecord(input)) return null;
  const id = typeof input.id === "string" ? input.id : "";
  const name = typeof input.name === "string" ? input.name : "";
  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    description: typeof input.description === "string" ? input.description : "",
    memberCount: typeof input.memberCount === "number" ? input.memberCount : 1,
    createdBy: typeof input.createdBy === "string" ? input.createdBy : "",
    createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString()
  };
}

function normalizePublicResourceRecord(input: unknown): PublicResourceRecord | null {
  if (!isRecord(input)) return null;
  const id = typeof input.id === "string" ? input.id : "";
  const title = typeof input.title === "string" ? input.title : "";
  if (!id || !title) {
    return null;
  }

  const tags = normalizeStringArray(input.tags);

  return {
    id,
    title,
    description: typeof input.description === "string" ? input.description : "",
    url: typeof input.url === "string" ? input.url : "",
    createdBy: typeof input.createdBy === "string" ? input.createdBy : "",
    createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString(),
    type:
      input.type === "document" ||
      input.type === "video" ||
      input.type === "tool" ||
      input.type === "website" ||
      input.type === "book"
        ? input.type
        : undefined,
    tags,
    category: typeof input.category === "string" ? input.category : "",
    status: input.status === "active" || input.status === "archived" ? input.status : "active",
    viewCount: typeof input.viewCount === "number" ? input.viewCount : 0,
    bookmarkCount: typeof input.bookmarkCount === "number" ? input.bookmarkCount : 0,
    rating: typeof input.rating === "number" ? input.rating : 0,
    ratingCount: typeof input.ratingCount === "number" ? input.ratingCount : 0
  };
}

function normalizeResourceBookmarkRecord(input: unknown): ResourceBookmarkRecord | null {
  if (!isRecord(input)) return null;
  const id = typeof input.id === "string" ? input.id : "";
  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  const resourceId = typeof input.resourceId === "string" ? input.resourceId : "";
  if (!id || !userId || !resourceId) {
    return null;
  }

  return {
    id,
    userId,
    resourceId,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString()
  };
}

function normalizeResourceFolderRecord(input: unknown): ResourceFolderRecord | null {
  if (!isRecord(input)) return null;
  const now = new Date().toISOString();
  const id = typeof input.id === "string" ? input.id : "";
  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!id || !userId || !name) {
    return null;
  }

  return {
    id,
    userId,
    name,
    description: typeof input.description === "string" ? input.description : "",
    resourceIds: normalizeStringArray(input.resourceIds),
    createdAt: typeof input.createdAt === "string" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : now
  };
}

function normalizeResourceNoteRecord(input: unknown): ResourceNoteRecord | null {
  if (!isRecord(input)) return null;
  const now = new Date().toISOString();
  const id = typeof input.id === "string" ? input.id : "";
  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  const resourceId = typeof input.resourceId === "string" ? input.resourceId : "";
  const content = typeof input.content === "string" ? input.content : "";
  if (!id || !userId || !resourceId) {
    return null;
  }

  return {
    id,
    userId,
    resourceId,
    content,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : now
  };
}

function normalizeResourceRatingRecord(input: unknown): ResourceRatingRecord | null {
  if (!isRecord(input)) return null;
  const now = new Date().toISOString();
  const id = typeof input.id === "string" ? input.id : "";
  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  const resourceId = typeof input.resourceId === "string" ? input.resourceId : "";
  const rating = typeof input.rating === "number" ? Math.max(1, Math.min(5, Math.round(input.rating))) : null;
  if (!id || !userId || !resourceId || rating === null) {
    return null;
  }

  return {
    id,
    userId,
    resourceId,
    rating,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : now
  };
}

function normalizeGroupMemberRecord(input: unknown): GroupMemberRecord | null {
  if (!isRecord(input)) return null;
  const id = typeof input.id === "string" ? input.id : "";
  const groupId = typeof input.groupId === "string" ? input.groupId : "";
  const userId = typeof input.userId === "string" ? input.userId.trim() : "";
  const role = input.role;
  const status = input.status;
  if (
    !id ||
    !groupId ||
    !userId ||
    (role !== "owner" && role !== "admin" && role !== "member") ||
    (status !== "active" && status !== "invited" && status !== "removed")
  ) {
    return null;
  }

  return {
    id,
    groupId,
    userId,
    role,
    status,
    joinedAt: typeof input.joinedAt === "string" ? input.joinedAt : new Date().toISOString()
  };
}

function normalizeGroupPostRecord(input: unknown): GroupPostRecord | null {
  if (!isRecord(input)) return null;
  const now = new Date().toISOString();
  const id = typeof input.id === "string" ? input.id : "";
  const groupId = typeof input.groupId === "string" ? input.groupId : "";
  const authorId = typeof input.authorId === "string" ? input.authorId.trim() : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const content = typeof input.content === "string" ? input.content : "";
  if (!id || !groupId || !authorId || !title || !content) {
    return null;
  }

  return {
    id,
    groupId,
    authorId,
    title,
    content,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : now
  };
}

function normalizeGroupTaskRecord(input: unknown): GroupTaskRecord | null {
  if (!isRecord(input)) return null;
  const now = new Date().toISOString();
  const id = typeof input.id === "string" ? input.id : "";
  const groupId = typeof input.groupId === "string" ? input.groupId : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const status = input.status;
  if (!id || !groupId || !title || (status !== "todo" && status !== "in_progress" && status !== "done")) {
    return null;
  }

  return {
    id,
    groupId,
    title,
    description: typeof input.description === "string" ? input.description : "",
    status,
    assigneeId: typeof input.assigneeId === "string" && input.assigneeId.trim() ? input.assigneeId : null,
    dueDate: typeof input.dueDate === "string" && input.dueDate ? input.dueDate : null,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : now
  };
}

function normalizeGroupSharedResourceRecord(input: unknown): GroupSharedResourceRecord | null {
  if (!isRecord(input)) return null;
  const id = typeof input.id === "string" ? input.id : "";
  const groupId = typeof input.groupId === "string" ? input.groupId : "";
  const resourceId = typeof input.resourceId === "string" ? input.resourceId : "";
  const sharedBy = typeof input.sharedBy === "string" ? input.sharedBy.trim() : "";
  if (!id || !groupId || !resourceId || !sharedBy) {
    return null;
  }

  return {
    id,
    groupId,
    resourceId,
    sharedBy,
    note: typeof input.note === "string" ? input.note : "",
    createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString()
  };
}

function normalizeGroupResourceRecord(input: unknown): GroupResourceRecord | null {
  if (!isRecord(input)) return null;
  const id = typeof input.id === "string" ? input.id : "";
  const groupId = typeof input.groupId === "string" ? input.groupId : "";
  const createdBy = typeof input.createdBy === "string" ? input.createdBy.trim() : "";
  if (!id || !groupId || !createdBy) {
    return null;
  }
  return {
    id,
    groupId,
    title: typeof input.title === "string" ? input.title : "",
    description: typeof input.description === "string" ? input.description : "",
    url: typeof input.url === "string" ? input.url : "",
    createdBy,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString(),
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : new Date().toISOString()
  };
}

function normalizeCommunityCommentRecord(input: unknown): CommunityCommentRecord | null {
  if (!isRecord(input)) return null;
  const now = new Date().toISOString();
  const id = typeof input.id === "string" ? input.id : "";
  const postId = typeof input.postId === "string" ? input.postId : "";
  const authorId = typeof input.authorId === "string" ? input.authorId.trim() : "";
  const content = typeof input.content === "string" ? input.content : "";
  if (!id || !postId || !authorId || !content) {
    return null;
  }

  return {
    id,
    postId,
    authorId,
    content,
    parentCommentId:
      typeof input.parentCommentId === "string" && input.parentCommentId ? input.parentCommentId : null,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : now
  };
}

function normalizeCommunityReactionRecord(input: unknown): CommunityReactionRecord | null {
  if (!isRecord(input)) return null;
  const id = typeof input.id === "string" ? input.id : "";
  const targetType = input.targetType;
  const targetId = typeof input.targetId === "string" ? input.targetId : "";
  const actorId = typeof input.actorId === "string" ? input.actorId.trim() : "";
  const reactionType = typeof input.reactionType === "string" ? input.reactionType.trim() : "";
  if (!id || !targetId || !actorId || !reactionType || (targetType !== "post" && targetType !== "comment")) {
    return null;
  }

  return {
    id,
    targetType,
    targetId,
    actorId,
    reactionType,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString()
  };
}

function normalizeCommunityFollowRecord(input: unknown): CommunityFollowRecord | null {
  if (!isRecord(input)) return null;
  const id = typeof input.id === "string" ? input.id : "";
  const followerId = typeof input.followerId === "string" ? input.followerId.trim() : "";
  const followeeId = typeof input.followeeId === "string" ? input.followeeId.trim() : "";
  if (!id || !followerId || !followeeId) {
    return null;
  }

  return {
    id,
    followerId,
    followeeId,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString()
  };
}

function normalizeCommunityTopicRecord(input: unknown): CommunityTopicRecord | null {
  if (!isRecord(input)) return null;
  const now = new Date().toISOString();
  const id = typeof input.id === "string" ? input.id : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const createdBy = typeof input.createdBy === "string" ? input.createdBy.trim() : "";
  if (!id || !name || !createdBy) {
    return null;
  }

  return {
    id,
    name,
    description: typeof input.description === "string" ? input.description : "",
    createdBy,
    createdAt: typeof input.createdAt === "string" ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : now
  };
}

function normalizeAnalyticsEventRecord(input: unknown): AnalyticsEventRecord | null {
  if (!isRecord(input)) return null;
  const id = typeof input.id === "string" ? input.id : "";
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  if (!id || !name || !category) {
    return null;
  }

  return {
    id,
    userId: typeof input.userId === "string" && input.userId.trim() ? input.userId : null,
    name,
    category,
    occurredAt: typeof input.occurredAt === "string" ? input.occurredAt : new Date().toISOString(),
    payload: normalizeJsonScalarRecord(input.payload)
  };
}

function normalizeAnalyticsSnapshotRecord(input: unknown): AnalyticsSnapshotRecord | null {
  if (!isRecord(input)) return null;
  const id = typeof input.id === "string" ? input.id : "";
  const scope = typeof input.scope === "string" ? input.scope.trim() : "";
  const period = typeof input.period === "string" ? input.period.trim() : "";
  if (!id || !scope || !period) {
    return null;
  }

  return {
    id,
    userId: typeof input.userId === "string" && input.userId.trim() ? input.userId : null,
    scope,
    period,
    metrics: normalizeMasteryByNode(input.metrics),
    capturedAt: typeof input.capturedAt === "string" ? input.capturedAt : new Date().toISOString()
  };
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

function getRootCandidates(): string[] {
  return [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "../../..")
  ];
}

function findProjectRootSync(): string {
  for (const base of getRootCandidates()) {
    const marker = path.join(base, "vault");
    try {
      const stat = fsSync.statSync(marker);
      if (stat.isDirectory()) {
        return base;
      }
    } catch {
      continue;
    }
  }
  return process.cwd();
}

function getDbFilePath() {
  if (process.env.EDUNEXUS_DATA_DIR) {
    return path.join(process.env.EDUNEXUS_DATA_DIR, "db.json");
  }
  const root = findProjectRootSync();
  return path.join(root, ".edunexus", "data", "db.json");
}

export async function loadDb(): Promise<DbSchema> {
  const filePath = getDbFilePath();
  const dataDir = path.dirname(filePath);
  await ensureDir(dataDir);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<DbSchema>;
    const sessionsSource = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    const plansSource = Array.isArray(parsed.plans) ? parsed.plans : [];
    const sessions = sessionsSource
      .map((session) => normalizeSessionRecord(session))
      .filter((session): session is SessionRecord => session !== null);
    const plans = plansSource
      .map((plan) => normalizePlanRecord(plan))
      .filter((plan): plan is PlanRecord => plan !== null);
    const syncedPathsSource = Array.isArray(parsed.syncedPaths) ? parsed.syncedPaths : [];
    const syncedPaths = syncedPathsSource
      .map((item) => normalizeSyncedPathRecord(item))
      .filter((item): item is SyncedPathRecord => item !== null);
    const postsSource = Array.isArray(parsed.publicPosts) ? parsed.publicPosts : [];
    const topicsSource = Array.isArray(parsed.publicTopics) ? parsed.publicTopics : [];
    const groupsSource = Array.isArray(parsed.publicGroups) ? parsed.publicGroups : [];
    const resourcesSource = Array.isArray(parsed.publicResources)
      ? parsed.publicResources
      : [];
    const resourceBookmarksSource = Array.isArray(parsed.resourceBookmarks) ? parsed.resourceBookmarks : [];
    const resourceFoldersSource = Array.isArray(parsed.resourceFolders) ? parsed.resourceFolders : [];
    const resourceNotesSource = Array.isArray(parsed.resourceNotes) ? parsed.resourceNotes : [];
    const resourceRatingsSource = Array.isArray(parsed.resourceRatings) ? parsed.resourceRatings : [];
    const groupMembersSource = Array.isArray(parsed.groupMembers) ? parsed.groupMembers : [];
    const groupPostsSource = Array.isArray(parsed.groupPosts) ? parsed.groupPosts : [];
    const groupTasksSource = Array.isArray(parsed.groupTasks) ? parsed.groupTasks : [];
    const groupSharedResourcesSource = Array.isArray(parsed.groupSharedResources)
      ? parsed.groupSharedResources
      : [];
    const groupResourcesSource = Array.isArray(parsed.groupResources) ? parsed.groupResources : [];
    const communityCommentsSource = Array.isArray(parsed.communityComments) ? parsed.communityComments : [];
    const communityReactionsSource = Array.isArray(parsed.communityReactions) ? parsed.communityReactions : [];
    const communityFollowsSource = Array.isArray(parsed.communityFollows) ? parsed.communityFollows : [];
    const communityTopicsSource = Array.isArray(parsed.communityTopics) ? parsed.communityTopics : [];
    const analyticsEventsSource = Array.isArray(parsed.analyticsEvents) ? parsed.analyticsEvents : [];
    const analyticsSnapshotsSource = Array.isArray(parsed.analyticsSnapshots) ? parsed.analyticsSnapshots : [];
    const learningPacksSource = Array.isArray(parsed.learningPacks) ? parsed.learningPacks : [];

    return {
      sessions,
      plans,
      syncedPaths,
      masteryByNode: normalizeMasteryByNode(parsed.masteryByNode),
      needsReviewNodes: normalizeStringArray(parsed.needsReviewNodes),
      publicPosts: postsSource
        .map((post) => normalizePublicPostRecord(post))
        .filter((post): post is PublicPostRecord => post !== null),
      publicTopics: topicsSource
        .map((topic) => normalizePublicTopicRecord(topic))
        .filter((topic): topic is PublicTopicRecord => topic !== null),
      publicGroups: groupsSource
        .map((group) => normalizePublicGroupRecord(group))
        .filter((group): group is PublicGroupRecord => group !== null),
      publicResources: resourcesSource
        .map((resource) => normalizePublicResourceRecord(resource))
        .filter((resource): resource is PublicResourceRecord => resource !== null),
      resourceBookmarks: resourceBookmarksSource
        .map((bookmark) => normalizeResourceBookmarkRecord(bookmark))
        .filter((bookmark): bookmark is ResourceBookmarkRecord => bookmark !== null),
      resourceFolders: resourceFoldersSource
        .map((folder) => normalizeResourceFolderRecord(folder))
        .filter((folder): folder is ResourceFolderRecord => folder !== null),
      resourceNotes: resourceNotesSource
        .map((note) => normalizeResourceNoteRecord(note))
        .filter((note): note is ResourceNoteRecord => note !== null),
      resourceRatings: resourceRatingsSource
        .map((rating) => normalizeResourceRatingRecord(rating))
        .filter((rating): rating is ResourceRatingRecord => rating !== null),
      groupMembers: groupMembersSource
        .map((member) => normalizeGroupMemberRecord(member))
        .filter((member): member is GroupMemberRecord => member !== null),
      groupPosts: groupPostsSource
        .map((post) => normalizeGroupPostRecord(post))
        .filter((post): post is GroupPostRecord => post !== null),
      groupTasks: groupTasksSource
        .map((task) => normalizeGroupTaskRecord(task))
        .filter((task): task is GroupTaskRecord => task !== null),
      groupSharedResources: groupSharedResourcesSource
        .map((resource) => normalizeGroupSharedResourceRecord(resource))
        .filter((resource): resource is GroupSharedResourceRecord => resource !== null),
      groupResources: groupResourcesSource
        .map((resource) => normalizeGroupResourceRecord(resource))
        .filter((resource): resource is GroupResourceRecord => resource !== null),
      communityComments: communityCommentsSource
        .map((comment) => normalizeCommunityCommentRecord(comment))
        .filter((comment): comment is CommunityCommentRecord => comment !== null),
      communityReactions: communityReactionsSource
        .map((reaction) => normalizeCommunityReactionRecord(reaction))
        .filter((reaction): reaction is CommunityReactionRecord => reaction !== null),
      communityFollows: communityFollowsSource
        .map((follow) => normalizeCommunityFollowRecord(follow))
        .filter((follow): follow is CommunityFollowRecord => follow !== null),
      communityTopics: communityTopicsSource
        .map((topic) => normalizeCommunityTopicRecord(topic))
        .filter((topic): topic is CommunityTopicRecord => topic !== null),
      analyticsEvents: analyticsEventsSource
        .map((event) => normalizeAnalyticsEventRecord(event))
        .filter((event): event is AnalyticsEventRecord => event !== null),
      analyticsSnapshots: analyticsSnapshotsSource
        .map((snapshot) => normalizeAnalyticsSnapshotRecord(snapshot))
        .filter((snapshot): snapshot is AnalyticsSnapshotRecord => snapshot !== null),
      learningPacks: learningPacksSource
        .map((pack) => normalizeLearningPackRecord(pack))
        .filter((pack): pack is LearningPackRecord => pack !== null)
    };
  } catch {
    await fs.writeFile(filePath, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
    return structuredClone(DEFAULT_DB);
  }
}

export async function saveDb(db: DbSchema): Promise<void> {
  const filePath = getDbFilePath();
  const dataDir = path.dirname(filePath);
  await ensureDir(dataDir);
  await fs.writeFile(filePath, JSON.stringify(db, null, 2), "utf8");
}

export type {
  AnalyticsEventRecord,
  AnalyticsSnapshotRecord,
  CommunityCommentRecord,
  CommunityFollowRecord,
  CommunityReactionRecord,
  CommunityTopicRecord,
  DbSchema,
  GroupMemberRecord,
  GroupPostRecord,
  GroupResourceRecord,
  GroupSharedResourceRecord,
  GroupTaskRecord,
  JsonScalar,
  PlanRecord,
  PublicGroupRecord,
  PublicPostRecord,
  PublicResourceRecord,
  PublicTopicRecord,
  ResourceBookmarkRecord,
  ResourceFolderRecord,
  ResourceNoteRecord,
  ResourceRatingRecord,
  SessionRecord,
  SyncedPathRecord,
  SyncedPathTaskRecord
};

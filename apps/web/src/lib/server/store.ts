import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

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
};

type DbSchema = {
  sessions: SessionRecord[];
  plans: PlanRecord[];
  masteryByNode: Record<string, number>;
  publicPosts: PublicPostRecord[];
  publicTopics: PublicTopicRecord[];
  publicGroups: PublicGroupRecord[];
  publicResources: PublicResourceRecord[];
};

const DEFAULT_DB: DbSchema = {
  sessions: [],
  plans: [],
  masteryByNode: {},
  publicPosts: [],
  publicTopics: [],
  publicGroups: [],
  publicResources: []
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
  return {
    role,
    content,
    createdAt
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

  return {
    id,
    title,
    description: typeof input.description === "string" ? input.description : "",
    url: typeof input.url === "string" ? input.url : "",
    createdBy: typeof input.createdBy === "string" ? input.createdBy : "",
    createdAt: typeof input.createdAt === "string" ? input.createdAt : new Date().toISOString()
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
    const postsSource = Array.isArray(parsed.publicPosts) ? parsed.publicPosts : [];
    const topicsSource = Array.isArray(parsed.publicTopics) ? parsed.publicTopics : [];
    const groupsSource = Array.isArray(parsed.publicGroups) ? parsed.publicGroups : [];
    const resourcesSource = Array.isArray(parsed.publicResources)
      ? parsed.publicResources
      : [];

    return {
      sessions,
      plans,
      masteryByNode: normalizeMasteryByNode(parsed.masteryByNode),
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
        .filter((resource): resource is PublicResourceRecord => resource !== null)
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

export type { DbSchema, SessionRecord, PlanRecord, SyncedPathRecord, SyncedPathTaskRecord };

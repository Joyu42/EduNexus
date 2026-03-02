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

type DbSchema = {
  sessions: SessionRecord[];
  plans: PlanRecord[];
  masteryByNode: Record<string, number>;
};

const DEFAULT_DB: DbSchema = {
  sessions: [],
  plans: [],
  masteryByNode: {}
};

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
    const sessions = (parsed.sessions ?? []).map((session) => ({
      id: session.id ?? "",
      title: session.title ?? "未命名学习会话",
      userId: session.userId ?? "demo_user",
      createdAt: session.createdAt ?? new Date().toISOString(),
      updatedAt: session.updatedAt ?? new Date().toISOString(),
      lastLevel: session.lastLevel ?? 1,
      messages: session.messages ?? []
    }));
    return {
      sessions,
      plans: parsed.plans ?? [],
      masteryByNode: parsed.masteryByNode ?? {}
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

export type { DbSchema, SessionRecord, PlanRecord };

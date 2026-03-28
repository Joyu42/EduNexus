import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

export type StoredModelConfig = {
  userId: string;
  apiKey: string;
  apiEndpoint: string;
  modelName: string;
  updatedAt: string;
};

type ModelConfigDatabase = {
  configs: StoredModelConfig[];
};

const EMPTY_DB: ModelConfigDatabase = {
  configs: [],
};

function getRootCandidates() {
  return [
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    path.resolve(process.cwd(), "../../.."),
  ];
}

function findProjectRootSync() {
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

function getConfigFilePath() {
  if (process.env.EDUNEXUS_DATA_DIR) {
    return path.join(process.env.EDUNEXUS_DATA_DIR, "model-config.json");
  }
  const root = findProjectRootSync();
  return path.join(root, ".edunexus", "data", "model-config.json");
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function readDb(): Promise<ModelConfigDatabase> {
  const filePath = getConfigFilePath();
  await ensureDir(path.dirname(filePath));
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.configs)) {
      return EMPTY_DB;
    }
    const configs = parsed.configs.filter((record: unknown): record is StoredModelConfig => {
      return Boolean(
        record &&
        typeof record === "object" &&
        typeof (record as StoredModelConfig).userId === "string" &&
        typeof (record as StoredModelConfig).apiKey === "string" &&
        typeof (record as StoredModelConfig).apiEndpoint === "string" &&
        typeof (record as StoredModelConfig).modelName === "string" &&
        typeof (record as StoredModelConfig).updatedAt === "string"
      );
    });
    return { configs };
  } catch {
    return EMPTY_DB;
  }
}

async function writeDb(db: ModelConfigDatabase): Promise<void> {
  const filePath = getConfigFilePath();
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(db, null, 2), "utf8");
}

export async function getStoredModelConfig(userId: string): Promise<StoredModelConfig | null> {
  const db = await readDb();
  const match = db.configs.find((record) => record.userId === userId);
  return match ?? null;
}

export async function saveStoredModelConfig(input: {
  userId: string;
  apiKey: string;
  apiEndpoint: string;
  modelName: string;
}): Promise<StoredModelConfig> {
  const db = await readDb();
  const record: StoredModelConfig = {
    userId: input.userId,
    apiKey: input.apiKey,
    apiEndpoint: input.apiEndpoint,
    modelName: input.modelName,
    updatedAt: new Date().toISOString(),
  };

  const nextConfigs = db.configs.filter((item) => item.userId !== input.userId);
  nextConfigs.push(record);
  await writeDb({ configs: nextConfigs });
  return record;
}

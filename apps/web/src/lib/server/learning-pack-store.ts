import { randomUUID } from "crypto";
import { loadDb, saveDb } from "./store";
import type { LearningPackRecord, LearningPackModuleRecord } from "../learning-pack/schema";
import { deriveModuleStage, derivePackStage, normalizeLearningPackModuleOrder } from "../learning-pack/schema";

export type { LearningPackRecord, LearningPackModuleRecord, MasteryStage } from "../learning-pack/schema";
export { MASTERY_STAGES } from "../learning-pack/schema";

export class LearningPackDocumentBindingConflictError extends Error {
  constructor(message = "知识文档已绑定到其他路径节点。") {
    super(message);
    this.name = "LearningPackDocumentBindingConflictError";
  }
}

export type LearningPackModuleInput = Pick<LearningPackModuleRecord, "moduleId" | "title" | "kbDocumentId" | "order">;

function generatePackId(): string {
  return `lp_${randomUUID()}`;
}

function generateModuleId(): string {
  return `mod_${randomUUID()}`;
}

async function getAllPacks(): Promise<LearningPackRecord[]> {
  const db = await loadDb();
  return db.learningPacks;
}

async function putAllPacks(packs: LearningPackRecord[]): Promise<void> {
  const db = await loadDb();
  db.learningPacks = packs;
  await saveDb(db);
}

function normalizeBindingDocId(value: string | undefined): string {
  return (value ?? "").trim();
}



export async function upsertLearningPack(pack: LearningPackRecord): Promise<void> {
  const packs = await getAllPacks();
  const normalizedPack = {
    ...pack,
    modules: normalizeLearningPackModuleOrder(pack.modules),
  };
  const idx = packs.findIndex((p) => p.packId === pack.packId && p.userId === pack.userId);
  if (idx >= 0) {
    packs[idx] = normalizedPack;
  } else {
    packs.push(normalizedPack);
  }
  await putAllPacks(packs);
}

export async function createLearningPack(
  userId: string,
  title: string,
  topic: string,
  moduleTitles: string[]
): Promise<LearningPackRecord> {
  const now = new Date().toISOString();
  const modules: LearningPackModuleRecord[] = moduleTitles.map((title, i) => ({
    moduleId: generateModuleId(),
    title,
    kbDocumentId: "",
    stage: "seen",
    order: i,
    studyMinutes: 0,
    lastStudiedAt: null,
  }));
  const pack: LearningPackRecord = {
    packId: generatePackId(),
    userId,
    title,
    topic,
    modules,
    activeModuleId: modules[0]?.moduleId ?? null,
    stage: "seen",
    totalStudyMinutes: 0,
    createdAt: now,
    updatedAt: now,
  };
  await upsertLearningPack(pack);
  return pack;
}

export async function getPackById(packId: string, userId: string): Promise<LearningPackRecord | null> {
  const packs = await getAllPacks();
  return packs.find((p) => p.packId === packId && p.userId === userId) ?? null;
}

export async function getPacksByUser(userId: string): Promise<LearningPackRecord[]> {
  const packs = await getAllPacks();
  return packs
    .filter((p) => p.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getActivePack(userId: string): Promise<LearningPackRecord | null> {
  const packs = await getAllPacks();
  const userPacks = packs.filter((p) => p.userId === userId);
  if (userPacks.length === 0) return null;
  return userPacks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
}

export async function setActivePack(packId: string, userId: string): Promise<void> {
  const packs = await getAllPacks();
  const now = new Date().toISOString();
  const updated = packs.map((p) => {
    if (p.packId === packId && p.userId === userId) {
      return { ...p, updatedAt: now };
    }
    return p;
  });
  await putAllPacks(updated);
}

export async function setPackKbDocument(packId: string, moduleId: string, kbDocumentId: string, userId: string): Promise<void> {
  const packs = await getAllPacks();
  const normalizedDocId = normalizeBindingDocId(kbDocumentId);
  const now = new Date().toISOString();

  if (normalizedDocId.length > 0) {
    const conflict = packs.find(
      (item) =>
        item.userId === userId &&
        item.modules.some(
          (m) =>
            m.kbDocumentId === normalizedDocId &&
            (item.packId !== packId || m.moduleId !== moduleId)
        )
    );
    if (conflict) {
      throw new LearningPackDocumentBindingConflictError();
    }
  }

  const updated = packs.map((p) => {
    if (p.packId !== packId) return p;
    return {
      ...p,
      modules: p.modules.map((m) => (m.moduleId === moduleId ? { ...m, kbDocumentId: normalizedDocId } : m)),
      updatedAt: now,
    };
  });
  await putAllPacks(updated);
}

export async function recordModuleStudy(
  packId: string,
  moduleId: string,
  minutes: number
): Promise<void> {
  const packs = await getAllPacks();
  const now = new Date().toISOString();
  const updated = packs.map((p) => {
    if (p.packId !== packId) return p;
    const modules = p.modules.map((m) => {
      if (m.moduleId !== moduleId) return m;
      const newMinutes = m.studyMinutes + minutes;
      return {
        ...m,
        studyMinutes: newMinutes,
        lastStudiedAt: now,
        stage: deriveModuleStage(newMinutes),
      };
    });
    return {
      ...p,
      modules,
      totalStudyMinutes: modules.reduce((sum, m) => sum + m.studyMinutes, 0),
      updatedAt: now,
    };
  });
  await putAllPacks(updated);
}

export async function updateModuleStage(
  packId: string,
  moduleId: string,
  stage: "seen" | "understood" | "applied" | "mastered"
): Promise<void> {
  const packs = await getAllPacks();
  const now = new Date().toISOString();
  const updated = packs.map((p) => {
    if (p.packId !== packId) return p;
    const modules = p.modules.map((m) => (m.moduleId === moduleId ? { ...m, stage } : m));
    return {
      ...p,
      modules,
      stage: derivePackStage(modules),
      updatedAt: now,
    };
  });
  await putAllPacks(updated);
}

export async function updatePackStage(packId: string, userId: string): Promise<void> {
  const pack = await getPackById(packId, userId);
  if (!pack) return;
  const now = new Date().toISOString();
  const stage = derivePackStage(pack.modules);
  const packs = await getAllPacks();
  const updated = packs.map((p) =>
    p.packId === packId && p.userId === userId ? { ...p, stage, updatedAt: now } : p
  );
  await putAllPacks(updated);
}

export async function detachDocumentFromLearningPacks(
  userId: string,
  docId: string
): Promise<{ updatedPackIds: string[]; removedPackIds: string[] }> {
  const packs = await getAllPacks();
  const now = new Date().toISOString();
  const updatedPackIds: string[] = [];
  const removedPackIds: string[] = [];
  let changed = false;

  const nextPacks = packs.flatMap((pack) => {
    if (pack.userId !== userId) {
      return [pack];
    }

    let touched = false;
    const modules = pack.modules.map((module) => {
      if (module.kbDocumentId !== docId) {
        return module;
      }
      touched = true;
      return { ...module, kbDocumentId: "" };
    });

    if (!touched) {
      return [pack];
    }

    changed = true;
    const hasBoundDocument = modules.some((module) => module.kbDocumentId.trim().length > 0);

    if (!hasBoundDocument) {
      removedPackIds.push(pack.packId);
      return [];
    }

    updatedPackIds.push(pack.packId);
    return [
      {
        ...pack,
        modules,
        activeModuleId:
          modules.find((module) => module.moduleId === pack.activeModuleId)?.moduleId ??
          modules[0]?.moduleId ??
          null,
        updatedAt: now,
      },
    ];
  });

  if (changed) {
    await putAllPacks(nextPacks);
  }

  return { updatedPackIds, removedPackIds };
}

export async function pruneStaleLearningPacks(
  userId: string,
  validDocIds: Set<string>
): Promise<{ updatedPackIds: string[]; removedPackIds: string[] }> {
  const packs = await getAllPacks();
  const now = new Date().toISOString();
  const updatedPackIds: string[] = [];
  const removedPackIds: string[] = [];
  let changed = false;

  const nextPacks = packs.flatMap((pack) => {
    if (pack.userId !== userId) {
      return [pack];
    }

    let touched = false;
    const modules = pack.modules.map((module) => {
      const docId = module.kbDocumentId.trim();
      if (!docId || validDocIds.has(docId)) {
        return module;
      }

      touched = true;
      return { ...module, kbDocumentId: "" };
    });

    const hasBoundDocument = modules.some((module) => module.kbDocumentId.trim().length > 0);
    if (!hasBoundDocument) {
      changed = true;
      removedPackIds.push(pack.packId);
      return [];
    }

    if (!touched) {
      return [pack];
    }

    changed = true;
    updatedPackIds.push(pack.packId);
    const preferredActiveModule =
      modules.find((module) => module.moduleId === pack.activeModuleId && module.kbDocumentId.trim().length > 0)
        ?.moduleId ??
      modules.find((module) => module.kbDocumentId.trim().length > 0)?.moduleId ??
      modules[0]?.moduleId ??
      null;

    return [
      {
        ...pack,
        modules,
        activeModuleId: preferredActiveModule,
        updatedAt: now,
      },
    ];
  });

  if (changed) {
    await putAllPacks(nextPacks);
  }

  return { updatedPackIds, removedPackIds };
}

export async function setActiveModule(packId: string, moduleId: string, userId: string): Promise<void> {
  const packs = await getAllPacks();
  const now = new Date().toISOString();
  const updated = packs.map((p) => {
    if (p.packId !== packId || p.userId !== userId) return p;
    return { ...p, activeModuleId: moduleId, updatedAt: now };
  });
  await putAllPacks(updated);
}

/**
 * Normalize a topic string for deterministic comparison.
 * Lowercase, trims whitespace, and removes leading/trailing special chars.
 */
export function normalizeTopic(topic: string): string {
  return topic
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^[#.+_-]+|[#.+_-]+$/g, "");
}

/**
 * Find packs for a user whose normalized topic matches the given normalized topic.
 * Returns packs sorted newest-first.
 */
export async function findPacksByTopic(
  userId: string,
  topic: string
): Promise<LearningPackRecord[]> {
  const normalized = normalizeTopic(topic);
  const packs = await getAllPacks();
  return packs
    .filter((p) => p.userId === userId && normalizeTopic(p.topic) === normalized)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function reorderLearningPackModules(
  packId: string,
  orderedModuleIds: string[],
  userId: string
): Promise<void> {
  const packs = await getAllPacks();
  const now = new Date().toISOString();
  let changed = false;

  const updated = packs.map((p) => {
    if (p.packId !== packId || p.userId !== userId) return p;

    // reorder
    const currentModules = [...p.modules];
    const newModules: typeof currentModules = [];
    const orderedSet = new Set<string>();

    for (let i = 0; i < orderedModuleIds.length; i++) {
      const mId = orderedModuleIds[i];
      const m = currentModules.find(x => x.moduleId === mId);
      if (m) {
        newModules.push({ ...m, order: i });
        orderedSet.add(mId);
      }
    }

    // append any missing modules at the end
    let orderIndex = newModules.length;
    for (const m of currentModules) {
      if (!orderedSet.has(m.moduleId)) {
        newModules.push({ ...m, order: orderIndex++ });
      }
    }

    changed = true;
    return {
      ...p,
      modules: newModules,
      updatedAt: now,
    };
  });

  if (changed) {
    await putAllPacks(updated);
  }
}

import { z } from "zod";

export const MASTERY_STAGES = ["seen", "understood", "applied", "mastered"] as const;
export type MasteryStage = (typeof MASTERY_STAGES)[number];

export const LearningPackModuleSchema = z.object({
  moduleId: z.string().min(1),
  title: z.string().min(1),
  kbDocumentId: z.string().default(""),
  stage: z.enum(MASTERY_STAGES).default("seen"),
  order: z.number().int().min(0).default(0),
  studyMinutes: z.number().int().min(0).default(0),
  lastStudiedAt: z.string().datetime().nullable().default(null),
});

export type LearningPackModuleRecord = z.infer<typeof LearningPackModuleSchema>;

export const LearningPackSchema = z.object({
  packId: z.string().min(1),
  userId: z.string().min(1),
  title: z.string().min(1),
  topic: z.string().min(1),
  modules: z.array(LearningPackModuleSchema),
  activeModuleId: z.string().nullable(),
  stage: z.enum(MASTERY_STAGES).default("seen"),
  totalStudyMinutes: z.number().int().min(0).default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type LearningPackRecord = z.infer<typeof LearningPackSchema>;

const STAGE_ORDER: Record<MasteryStage, number> = {
  seen: 0,
  understood: 1,
  applied: 2,
  mastered: 3,
};

export function stageOrder(stage: MasteryStage): number {
  return STAGE_ORDER[stage] ?? 0;
}

export function advanceStage(current: MasteryStage): MasteryStage {
  if (current === "seen") return "understood";
  if (current === "understood") return "applied";
  if (current === "applied") return "mastered";
  return "mastered";
}

export function isTerminalStage(stage: MasteryStage): boolean {
  return stage === "mastered";
}

export function deriveModuleStage(studyMinutes: number): MasteryStage {
  if (studyMinutes >= 10) return "mastered";
  if (studyMinutes >= 5) return "applied";
  if (studyMinutes >= 2) return "understood";
  return "seen";
}

export function derivePackStage(modules: LearningPackModuleRecord[]): MasteryStage {
  if (modules.length === 0) return "seen";
  let highest: MasteryStage = "seen";
  for (const mod of modules) {
    if (stageOrder(mod.stage) > stageOrder(highest)) {
      highest = mod.stage;
      if (isTerminalStage(highest)) break;
    }
  }
  return highest;
}

export function isLearningPackRecord(value: unknown): value is LearningPackRecord {
  return LearningPackSchema.safeParse(value).success;
}

export function isLearningPackModuleRecord(value: unknown): value is LearningPackModuleRecord {
  return LearningPackModuleSchema.safeParse(value).success;
}

export function normalizeLearningPackRecord(input: unknown): LearningPackRecord | null {
  return LearningPackSchema.safeParse(input).success ? LearningPackSchema.parse(input) : null;
}

export function normalizeLearningPackModuleRecord(input: unknown): LearningPackModuleRecord | null {
  return LearningPackModuleSchema.safeParse(input).success ? LearningPackModuleSchema.parse(input) : null;
}

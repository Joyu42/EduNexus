import { describe, expect, it } from "vitest";
import {
  MASTERY_STAGES,
  LearningPackModuleSchema,
  LearningPackSchema,
  stageOrder,
  advanceStage,
  isTerminalStage,
  deriveModuleStage,
  derivePackStage,
  isLearningPackRecord,
  isLearningPackModuleRecord,
  normalizeLearningPackRecord,
  normalizeLearningPackModuleRecord,
} from "./schema";

describe("MASTERY_STAGES", () => {
  it("contains all four stages", () => {
    expect(MASTERY_STAGES).toEqual(["seen", "understood", "applied", "mastered"]);
  });
});

describe("stageOrder", () => {
  it("returns 0 for seen", () => expect(stageOrder("seen")).toBe(0));
  it("returns 1 for understood", () => expect(stageOrder("understood")).toBe(1));
  it("returns 2 for applied", () => expect(stageOrder("applied")).toBe(2));
  it("returns 3 for mastered", () => expect(stageOrder("mastered")).toBe(3));
});

describe("advanceStage", () => {
  it("seen → understood", () => expect(advanceStage("seen")).toBe("understood"));
  it("understood → applied", () => expect(advanceStage("understood")).toBe("applied"));
  it("applied → mastered", () => expect(advanceStage("applied")).toBe("mastered"));
  it("mastered → mastered (terminal)", () => expect(advanceStage("mastered")).toBe("mastered"));
});

describe("isTerminalStage", () => {
  it("returns true only for mastered", () => {
    expect(isTerminalStage("seen")).toBe(false);
    expect(isTerminalStage("understood")).toBe(false);
    expect(isTerminalStage("applied")).toBe(false);
    expect(isTerminalStage("mastered")).toBe(true);
  });
});

describe("deriveModuleStage", () => {
  it("0 min → seen", () => expect(deriveModuleStage(0)).toBe("seen"));
  it("1 min → seen", () => expect(deriveModuleStage(1)).toBe("seen"));
  it("2 min → understood", () => expect(deriveModuleStage(2)).toBe("understood"));
  it("4 min → understood", () => expect(deriveModuleStage(4)).toBe("understood"));
  it("5 min → applied", () => expect(deriveModuleStage(5)).toBe("applied"));
  it("9 min → applied", () => expect(deriveModuleStage(9)).toBe("applied"));
  it("10 min → mastered", () => expect(deriveModuleStage(10)).toBe("mastered"));
  it("100 min → mastered", () => expect(deriveModuleStage(100)).toBe("mastered"));
});

describe("derivePackStage", () => {
  it("empty modules → seen", () => expect(derivePackStage([])).toBe("seen"));

  it("single seen → seen", () => {
    const mods = [{ moduleId: "1", title: "A", kbDocumentId: "k1", stage: "seen" as const, order: 0, studyMinutes: 0, lastStudiedAt: null }];
    expect(derivePackStage(mods)).toBe("seen");
  });

  it("single understood → understood", () => {
    const mods = [{ moduleId: "1", title: "A", kbDocumentId: "k1", stage: "understood" as const, order: 0, studyMinutes: 2, lastStudiedAt: null }];
    expect(derivePackStage(mods)).toBe("understood");
  });

  it("mixed → highest stage", () => {
    const mods = [
      { moduleId: "1", title: "A", kbDocumentId: "k1", stage: "seen" as const, order: 0, studyMinutes: 0, lastStudiedAt: null },
      { moduleId: "2", title: "B", kbDocumentId: "k2", stage: "applied" as const, order: 1, studyMinutes: 5, lastStudiedAt: null },
      { moduleId: "3", title: "C", kbDocumentId: "k3", stage: "mastered" as const, order: 2, studyMinutes: 20, lastStudiedAt: null },
    ];
    expect(derivePackStage(mods)).toBe("mastered");
  });

  it("no mastered but has applied → applied", () => {
    const mods = [
      { moduleId: "1", title: "A", kbDocumentId: "k1", stage: "seen" as const, order: 0, studyMinutes: 0, lastStudiedAt: null },
      { moduleId: "2", title: "B", kbDocumentId: "k2", stage: "applied" as const, order: 1, studyMinutes: 5, lastStudiedAt: null },
    ];
    expect(derivePackStage(mods)).toBe("applied");
  });
});

describe("LearningPackModuleSchema", () => {
  it("parses a valid module", () => {
    const result = LearningPackModuleSchema.safeParse({
      moduleId: "mod_1",
      title: "Java 基础语法",
      kbDocumentId: "kb_java_001",
      stage: "seen",
      order: 0,
      studyMinutes: 0,
      lastStudiedAt: null,
    });
    expect(result.success).toBe(true);
  });

  it("applies defaults", () => {
    const result = LearningPackModuleSchema.safeParse({
      moduleId: "mod_1",
      title: "Test",
      kbDocumentId: "kb_1",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stage).toBe("seen");
      expect(result.data.order).toBe(0);
      expect(result.data.studyMinutes).toBe(0);
    }
  });

  it("rejects empty moduleId", () => {
    const result = LearningPackModuleSchema.safeParse({
      moduleId: "",
      title: "Test",
      kbDocumentId: "kb_1",
    });
    expect(result.success).toBe(false);
  });
});

describe("LearningPackSchema", () => {
  it("parses a valid pack", () => {
    const result = LearningPackSchema.safeParse({
      packId: "lp_abc",
      userId: "user_1",
      title: "Java 学习路线",
      topic: "java",
      modules: [],
      activeModuleId: null,
      stage: "seen",
      totalStudyMinutes: 0,
      createdAt: "2026-03-24T00:00:00.000Z",
      updatedAt: "2026-03-24T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = LearningPackSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("isLearningPackRecord / isLearningPackModuleRecord", () => {
  it("isLearningPackRecord returns true for valid pack", () => {
    expect(isLearningPackRecord({
      packId: "lp_1", userId: "u1", title: "T", topic: "java", modules: [],
      activeModuleId: null, stage: "seen", totalStudyMinutes: 0,
      createdAt: "2026-03-24T00:00:00.000Z", updatedAt: "2026-03-24T00:00:00.000Z",
    })).toBe(true);
  });

  it("isLearningPackRecord returns false for invalid", () => {
    expect(isLearningPackRecord({})).toBe(false);
    expect(isLearningPackRecord({ packId: "lp_1" })).toBe(false);
  });

  it("normalizeLearningPackRecord returns null for invalid", () => {
    expect(normalizeLearningPackRecord(null)).toBe(null);
    expect(normalizeLearningPackRecord({})).toBe(null);
  });
});

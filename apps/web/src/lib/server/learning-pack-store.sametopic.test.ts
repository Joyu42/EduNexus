import { describe, expect, it, vi } from "vitest";
import { normalizeTopic, findPacksByTopic } from "./learning-pack-store";
import { loadDb } from "@/lib/server/store";
import type { DbSchema } from "@/lib/server/store";

const mockDbData = vi.hoisted(() =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ({
    learningPacks: [
      {
        packId: "lp_java_1",
        userId: "u1",
        title: "Java 学习路线图",
        topic: "java",
        stage: "seen" as const,
        modules: [] as any[],
        activeModuleId: null,
        totalStudyMinutes: 0,
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-01T00:00:00.000Z",
      },
      {
        packId: "lp_python_1",
        userId: "u1",
        title: "Python 学习路线图",
        topic: "python",
        stage: "seen" as const,
        modules: [] as any[],
        activeModuleId: null,
        totalStudyMinutes: 0,
        createdAt: "2025-01-02T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      },
      {
        packId: "lp_java_2",
        userId: "u2",
        title: "Java 进阶",
        topic: "java",
        stage: "seen" as const,
        modules: [] as any[],
        activeModuleId: null,
        totalStudyMinutes: 0,
        createdAt: "2025-01-03T00:00:00.000Z",
        updatedAt: "2025-01-03T00:00:00.000Z",
      },
    ],
    syncedPaths: [],
  })
);

vi.mock("@/lib/server/store", () => ({
  loadDb: vi.fn().mockResolvedValue(mockDbData as unknown as DbSchema),
  saveDb: vi.fn().mockResolvedValue(undefined),
}));

describe("normalizeTopic", () => {
  it("handles basic lowercase", () => {
    expect(normalizeTopic("Java")).toBe("java");
  });

  it("trims whitespace", () => {
    expect(normalizeTopic("  java  ")).toBe("java");
  });

  it("collapses internal whitespace", () => {
    expect(normalizeTopic("java  python")).toBe("java python");
  });

  it("removes leading/trailing special chars", () => {
    expect(normalizeTopic("#java")).toBe("java");
    expect(normalizeTopic("java-")).toBe("java");
    expect(normalizeTopic("_python_")).toBe("python");
  });

  it("is case-insensitive", () => {
    expect(normalizeTopic("JAVA")).toBe("java");
  });
});

describe("findPacksByTopic", () => {
  it("returns packs matching normalized topic for the correct user", async () => {
    const packs = await findPacksByTopic("u1", "java");
    expect(packs).toHaveLength(1);
    expect(packs[0].packId).toBe("lp_java_1");
  });

  it("is case-insensitive", async () => {
    const packs = await findPacksByTopic("u1", "JAVA");
    expect(packs).toHaveLength(1);
    expect(packs[0].packId).toBe("lp_java_1");
  });

  it("does not return packs from other users", async () => {
    const packs = await findPacksByTopic("u1", "python");
    expect(packs).toHaveLength(1);
    expect(packs[0].packId).toBe("lp_python_1");
  });

  it("returns empty when no matching packs exist", async () => {
    const packs = await findPacksByTopic("u1", "rust");
    expect(packs).toHaveLength(0);
  });

  it("returns packs sorted newest-first", async () => {
    vi.mocked(loadDb).mockResolvedValueOnce({
      ...mockDbData,
      learningPacks: [
        { ...mockDbData.learningPacks[0], createdAt: "2025-01-01T00:00:00.000Z" },
        { ...mockDbData.learningPacks[0], packId: "lp_java_new", createdAt: "2025-02-01T00:00:00.000Z" },
      ],
    } as unknown as DbSchema);
    const packs = await findPacksByTopic("u1", "java");
    expect(packs[0].packId).toBe("lp_java_new");
    expect(packs[1].packId).toBe("lp_java_1");
  });
});

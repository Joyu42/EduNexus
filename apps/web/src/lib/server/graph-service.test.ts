import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({
  findMany: vi.fn().mockResolvedValue([])
}));

vi.mock("./prisma", () => ({
  prisma: {
    document: {
      findMany
    }
  }
}));

const { loadDb, saveDb } = await import("./store");
const { getGraphView } = await import("./graph-service");

const originalDataDir = process.env.EDUNEXUS_DATA_DIR;

async function createDataDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), "edunexus-graph-service-test-"));
}

describe("graph service projection", () => {
  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([]);
  });

  afterEach(async () => {
    if (originalDataDir) {
      process.env.EDUNEXUS_DATA_DIR = originalDataDir;
    } else {
      delete process.env.EDUNEXUS_DATA_DIR;
    }
  });

  it("builds sequential edges for learning-pack modules", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;

    const db = await loadDb();
    const now = new Date().toISOString();
    db.learningPacks.push({
      packId: "lp_java_test",
      userId: "pack-user",
      title: "Java 学习路线图",
      topic: "java",
      activeModuleId: "mod_1",
      stage: "seen",
      totalStudyMinutes: 0,
      createdAt: now,
      updatedAt: now,
      modules: [
        {
          moduleId: "mod_1",
          title: "Java 基础",
          kbDocumentId: "doc_java_1",
          stage: "seen",
          order: 0,
          studyMinutes: 0,
          lastStudiedAt: null,
        },
        {
          moduleId: "mod_2",
          title: "Java OOP",
          kbDocumentId: "doc_java_2",
          stage: "seen",
          order: 1,
          studyMinutes: 0,
          lastStudiedAt: null,
        },
        {
          moduleId: "mod_3",
          title: "Java 项目实战",
          kbDocumentId: "doc_java_3",
          stage: "seen",
          order: 2,
          studyMinutes: 0,
          lastStudiedAt: null,
        },
      ],
    });
    await saveDb(db);

    findMany.mockResolvedValueOnce([
      { id: "doc_java_1", title: "Java 基础" },
      { id: "doc_java_2", title: "Java OOP" },
      { id: "doc_java_3", title: "Java 项目实战" },
    ]);

    const graph = await getGraphView("pack-user", { packId: "lp_java_test" });

    expect(graph.nodes).toHaveLength(3);
    expect(graph.edges).toEqual([
      { source: "doc_java_1", target: "doc_java_2", weight: 0.9 },
      { source: "doc_java_2", target: "doc_java_3", weight: 0.9 },
    ]);

    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("projects pack bindings into graph path memberships without synced paths", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;

    const db = await loadDb();
    const now = new Date().toISOString();
    db.learningPacks.push({
      packId: "lp_java_compat",
      userId: "pack-user",
      title: "Java 学习路线图",
      topic: "java",
      activeModuleId: "mod_1",
      stage: "seen",
      totalStudyMinutes: 0,
      createdAt: now,
      updatedAt: now,
      modules: [
        {
          moduleId: "mod_2",
          title: "Java OOP",
          kbDocumentId: "doc_java_2",
          stage: "seen",
          order: 1,
          studyMinutes: 0,
          lastStudiedAt: null,
        },
        {
          moduleId: "mod_1",
          title: "Java 基础",
          kbDocumentId: "doc_java_1",
          stage: "seen",
          order: 0,
          studyMinutes: 0,
          lastStudiedAt: null,
        },
      ],
    });
    await saveDb(db);

    findMany.mockResolvedValueOnce([
      { id: "doc_java_1", title: "Java 基础" },
      { id: "doc_java_2", title: "Java OOP" },
    ]);

    const graph = await getGraphView("pack-user", { packId: "lp_java_compat" });

    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes.map((node) => node.id)).toEqual(["doc_java_1", "doc_java_2"]);
    expect(graph.nodes[0]?.pathMemberships).toEqual([
      {
        pathId: "lp_java_compat",
        pathName: "Java 学习路线图",
        stage: "lp_java_compat",
        orderWithinStage: 0,
      },
    ]);
    expect(graph.nodes[1]?.pathMemberships).toEqual([
      {
        pathId: "lp_java_compat",
        pathName: "Java 学习路线图",
        stage: "lp_java_compat",
        orderWithinStage: 1,
      },
    ]);

    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("builds module nodes and edges even when kb docs are not yet bound", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;

    const db = await loadDb();
    const now = new Date().toISOString();
    db.learningPacks.push({
      packId: "lp_pending_docs",
      userId: "pack-user",
      title: "Java 学习路线图",
      topic: "java",
      activeModuleId: "mod_2",
      stage: "seen",
      totalStudyMinutes: 0,
      createdAt: now,
      updatedAt: now,
      modules: [
        {
          moduleId: "mod_2",
          title: "Java 语法核心",
          kbDocumentId: "",
          stage: "seen",
          order: 1,
          studyMinutes: 0,
          lastStudiedAt: null,
        },
        {
          moduleId: "mod_1",
          title: "Java 基础与环境搭建",
          kbDocumentId: "",
          stage: "seen",
          order: 0,
          studyMinutes: 0,
          lastStudiedAt: null,
        },
        {
          moduleId: "mod_3",
          title: "Java 综合项目实战",
          kbDocumentId: "",
          stage: "seen",
          order: 2,
          studyMinutes: 0,
          lastStudiedAt: null,
        },
      ],
    });
    await saveDb(db);

    const graph = await getGraphView("pack-user", { packId: "lp_pending_docs" });

    expect(graph.nodes).toHaveLength(3);
    expect(graph.nodes.map((node) => node.id)).toEqual([
      "pack:lp_pending_docs:mod_1",
      "pack:lp_pending_docs:mod_2",
      "pack:lp_pending_docs:mod_3",
    ]);
    expect(graph.nodes.map((node) => node.label)).toEqual([
      "Java 基础与环境搭建",
      "Java 语法核心",
      "Java 综合项目实战",
    ]);
    expect(graph.edges).toEqual([
      { source: "pack:lp_pending_docs:mod_1", target: "pack:lp_pending_docs:mod_2", weight: 0.9 },
      { source: "pack:lp_pending_docs:mod_2", target: "pack:lp_pending_docs:mod_3", weight: 0.9 },
    ]);

    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("builds explore edges from learning-pack compatibility stages", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;

    const db = await loadDb();
    const now = new Date().toISOString();

    db.learningPacks.push({
      packId: "lp_frontend_1",
      userId: "user-path",
      title: "前端路径",
      topic: "frontend",
      activeModuleId: "stage_1",
      stage: "seen",
      totalStudyMinutes: 0,
      createdAt: now,
      updatedAt: now,
      modules: [
        {
          moduleId: "stage_1",
          title: "HTML → CSS → JavaScript",
          kbDocumentId: "doc_html",
          stage: "seen",
          order: 0,
          studyMinutes: 0,
          lastStudiedAt: null,
        },
        {
          moduleId: "stage_2",
          title: "CSS 进阶",
          kbDocumentId: "doc_css",
          stage: "seen",
          order: 1,
          studyMinutes: 0,
          lastStudiedAt: null,
        },
        {
          moduleId: "stage_3",
          title: "JavaScript 进阶",
          kbDocumentId: "doc_js",
          stage: "seen",
          order: 2,
          studyMinutes: 0,
          lastStudiedAt: null,
        },
      ],
    });
    await saveDb(db);

    findMany.mockResolvedValueOnce([
      {
        id: "doc_html",
        title: "HTML",
        updatedAt: new Date(now),
      },
      {
        id: "doc_css",
        title: "CSS",
        updatedAt: new Date(now),
      },
      {
        id: "doc_js",
        title: "JavaScript",
        updatedAt: new Date(now),
      },
    ]);

    const graph = await getGraphView("user-path");

    expect(graph.nodes).toHaveLength(3);
    expect(graph.nodes.map((node) => node.pathMemberships[0]?.pathId)).toEqual([
      "lp_frontend_1",
      "lp_frontend_1",
      "lp_frontend_1",
    ]);
    expect(graph.edges).toEqual([
      { source: "doc_html", target: "doc_css", weight: 0.9 },
      { source: "doc_css", target: "doc_js", weight: 0.9 },
    ]);

    await fs.rm(dataDir, { recursive: true, force: true });
  });

  it("builds explore edges from all learning packs", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;

    const db = await loadDb();
    const now = new Date().toISOString();
    db.learningPacks.push({
      packId: "lp_java_1",
      userId: "user-pack",
      title: "Java 路径",
      topic: "java",
      activeModuleId: "m1",
      stage: "seen",
      totalStudyMinutes: 0,
      createdAt: now,
      updatedAt: now,
      modules: [
        { moduleId: "m1", title: "Java 基础", kbDocumentId: "doc_j1", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
        { moduleId: "m2", title: "Java OOP", kbDocumentId: "doc_j2", stage: "seen", order: 1, studyMinutes: 0, lastStudiedAt: null },
      ],
    });
    db.learningPacks.push({
      packId: "lp_go_1",
      userId: "user-pack",
      title: "Go 路径",
      topic: "go",
      activeModuleId: "g1",
      stage: "seen",
      totalStudyMinutes: 0,
      createdAt: now,
      updatedAt: now,
      modules: [
        { moduleId: "g1", title: "Go 基础", kbDocumentId: "doc_g1", stage: "seen", order: 0, studyMinutes: 0, lastStudiedAt: null },
        { moduleId: "g2", title: "Go 并发", kbDocumentId: "doc_g2", stage: "seen", order: 1, studyMinutes: 0, lastStudiedAt: null },
      ],
    });
    await saveDb(db);

    findMany.mockResolvedValueOnce([
      { id: "doc_j1", title: "Java 基础", updatedAt: new Date(now) },
      { id: "doc_j2", title: "Java OOP", updatedAt: new Date(now) },
      { id: "doc_g1", title: "Go 基础", updatedAt: new Date(now) },
      { id: "doc_g2", title: "Go 并发", updatedAt: new Date(now) },
    ]);

    const graph = await getGraphView("user-pack");

    expect(graph.edges).toEqual(
      expect.arrayContaining([
        { source: "doc_j1", target: "doc_j2", weight: 0.9 },
        { source: "doc_g1", target: "doc_g2", weight: 0.9 },
      ])
    );

    await fs.rm(dataDir, { recursive: true, force: true });
  });

});

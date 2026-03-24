import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

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

describe("graph service demo projection", () => {
  afterEach(async () => {
    if (originalDataDir) {
      process.env.EDUNEXUS_DATA_DIR = originalDataDir;
    } else {
      delete process.env.EDUNEXUS_DATA_DIR;
    }
  });

  it("projects demo node memberships and kb links from seeded metadata", async () => {
    const dataDir = await createDataDir();
    process.env.EDUNEXUS_DATA_DIR = dataDir;

    const db = await loadDb();
    const now = new Date().toISOString();
    db.syncedPaths.push({
      userId: "demo-user",
      pathId: "demo_path_frontend_foundations",
      title: "前端基础打底",
      description: "demo",
      status: "in_progress",
      progress: 40,
      tags: ["演示", "前端"],
      tasks: [],
      updatedAt: now,
      stages: [
        {
          stageId: "foundation",
          nodeIds: ["demo_node_html_basics"]
        }
      ]
    } as (typeof db.syncedPaths)[number] & {
      stages: Array<{ stageId: string; nodeIds: string[] }>;
    });
    db.masteryByNode.demo_node_html_basics = 0.92;
    db.plans.push({
      planId: "demo_graph_node::demo_node_html_basics",
      goalType: "project",
      goal: "HTML 基础",
      focusNodeId: "demo_node_html_basics",
      focusNodeLabel: "kb_doc_html",
      tasks: [],
      createdAt: now,
      updatedAt: now
    });
    db.plans.push({
      planId: "demo_graph_edge::demo_edge_html_css",
      goalType: "project",
      goal: "edge",
      focusNodeId: "demo_node_html_basics",
      focusNodeLabel: "demo_node_css_basics",
      focusNodeRisk: 0.9,
      tasks: [],
      createdAt: now,
      updatedAt: now
    });
    await saveDb(db);

    const graph = await getGraphView("demo-user");
    const htmlNode = graph.nodes.find((node) => node.id === "demo_node_html_basics");

    expect(htmlNode).toBeDefined();
    expect(htmlNode?.kbDocumentId).toBe("kb_doc_html");
    expect(htmlNode?.documentIds).toEqual(["kb_doc_html"]);
    expect(htmlNode?.pathMemberships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pathId: "demo_path_frontend_foundations",
          stage: "foundation"
        })
      ])
    );

    await fs.rm(dataDir, { recursive: true, force: true });
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
});

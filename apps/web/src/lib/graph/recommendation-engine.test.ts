import { describe, expect, it, vi } from "vitest";
import { RecommendationEngine } from "./recommendation-engine";
import type { GraphEdge, GraphNode } from "./types";

function createNode(overrides: Partial<GraphNode>): GraphNode {
  const now = new Date("2026-03-24T00:00:00.000Z");

  return {
    id: "node-default",
    name: "default",
    type: "concept",
    status: "unlearned",
    importance: 0.5,
    mastery: 0,
    connections: 1,
    noteCount: 0,
    practiceCount: 0,
    practiceCompleted: 0,
    createdAt: now,
    updatedAt: now,
    documentIds: [],
    ...overrides,
  };
}

describe("RecommendationEngine", () => {
  it("generates unique ids for recommended learning paths", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1774310107022);

    const nodes: GraphNode[] = [
      createNode({ id: "learning", name: "学习中节点", status: "learning", importance: 0.8 }),
      createNode({ id: "goal-1", name: "目标一", status: "unlearned", importance: 0.95 }),
      createNode({ id: "goal-2", name: "目标二", status: "unlearned", importance: 0.9 }),
    ];

    const edges: GraphEdge[] = [
      { source: "learning", target: "goal-1", type: "related", strength: 0.8 },
      { source: "learning", target: "goal-2", type: "related", strength: 0.7 },
    ];

    const engine = new RecommendationEngine(nodes, edges);
    const paths = engine.recommendLearningPaths(3);
    const ids = paths.map((path) => path.id);

    expect(paths).toHaveLength(2);
    expect(new Set(ids).size).toBe(ids.length);

    nowSpy.mockRestore();
  });
});

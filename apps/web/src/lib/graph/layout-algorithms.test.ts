import { describe, expect, it } from "vitest";

import { LayoutAlgorithms } from "./layout-algorithms";
import type { GraphEdge, GraphNode } from "./types";

function baseNode(id: string, overrides: Partial<GraphNode> = {}): GraphNode {
  const now = new Date("2026-03-25T00:00:00.000Z");
  return {
    id,
    name: id,
    type: "concept",
    status: "unlearned",
    importance: 0.5,
    mastery: 0.2,
    connections: 0,
    noteCount: 0,
    practiceCount: 0,
    practiceCompleted: 0,
    createdAt: now,
    updatedAt: now,
    documentIds: [],
    ...overrides,
  };
}

describe("LayoutAlgorithms", () => {
  it("makes timeline layout deterministic per node id", () => {
    const nodes: GraphNode[] = [
      baseNode("a", { createdAt: new Date("2026-03-01T00:00:00.000Z") }),
      baseNode("b", { createdAt: new Date("2026-03-02T00:00:00.000Z") }),
      baseNode("c", { createdAt: new Date("2026-03-03T00:00:00.000Z") }),
    ];
    const edges: GraphEdge[] = [];

    const run1 = LayoutAlgorithms.applyLayout(nodes, edges, "timeline", undefined);
    const run2 = LayoutAlgorithms.applyLayout(nodes, edges, "timeline", undefined);

    const byId1 = new Map(run1.map((n) => [n.id, n]));
    for (const node of run2) {
      const other = byId1.get(node.id);
      expect(other).toBeDefined();
      expect(node.fx).toBe(other?.fx);
      expect(node.fy).toBe(other?.fy);
    }
  });

  it("produces identical polygon-style positions regardless of input array order when nodes have pathMemberships", () => {
    const pathA = { pathId: "p-a", pathName: "A", stage: "s1", orderWithinStage: 0 };
    const pathB = { pathId: "p-b", pathName: "B", stage: "s1", orderWithinStage: 0 };

    const nodes: GraphNode[] = [
      baseNode("n1", { pathMemberships: [pathA] }),
      baseNode("n2", { pathMemberships: [pathA] }),
      baseNode("n3", { pathMemberships: [pathB] }),
      baseNode("n4", { pathMemberships: [pathB] }),
      baseNode("shared", { pathMemberships: [pathA, pathB] }),
    ];

    const edges: GraphEdge[] = [
      { source: "n1", target: "n2", type: "related", strength: 0.6 },
      { source: "n3", target: "n4", type: "related", strength: 0.6 },
      { source: "n2", target: "shared", type: "related", strength: 0.6 },
      { source: "n4", target: "shared", type: "related", strength: 0.6 },
    ];

    const runA = LayoutAlgorithms.applyLayout(nodes, edges, "force", undefined);
    const runB = LayoutAlgorithms.applyLayout(nodes.slice().reverse(), edges.slice().reverse(), "force", undefined);

    const byIdA = new Map(runA.map((n) => [n.id, n]));
    for (const node of runB) {
      const other = byIdA.get(node.id);
      expect(other).toBeDefined();
      expect(node.fx).toBe(other?.fx);
      expect(node.fy).toBe(other?.fy);
    }

    for (const node of runA) {
      expect(typeof node.fx).toBe("number");
      expect(typeof node.fy).toBe("number");
    }
  });
});

// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InteractiveGraph } from "./interactive-graph";
import type { GraphEdge, GraphNode } from "@/lib/graph/types";

let capturedProps: Record<string, unknown> | null = null;

vi.mock("next/dynamic", () => ({
  default: () => {
    return function MockForceGraph2D(props: Record<string, unknown>) {
      capturedProps = props;
      return <div data-testid="mock-force-graph" />;
    };
  },
}));

const now = new Date("2026-03-25T00:00:00.000Z");

const nodes: GraphNode[] = [
  {
    id: "n1",
    name: "A",
    type: "concept",
    status: "learning",
    importance: 0.6,
    mastery: 0.2,
    connections: 1,
    noteCount: 0,
    practiceCount: 0,
    practiceCompleted: 0,
    createdAt: now,
    updatedAt: now,
    documentIds: [],
  },
  {
    id: "n2",
    name: "B",
    type: "concept",
    status: "unlearned",
    importance: 0.6,
    mastery: 0.1,
    connections: 1,
    noteCount: 0,
    practiceCount: 0,
    practiceCompleted: 0,
    createdAt: now,
    updatedAt: now,
    documentIds: [],
  },
];

const edges: GraphEdge[] = [
  {
    source: "n1",
    target: "n2",
    type: "related",
    strength: 0.8,
  },
];

describe("InteractiveGraph", () => {
  it("does not render relation particles in explore mode", () => {
    capturedProps = null;

    render(
      <InteractiveGraph
        nodes={nodes}
        edges={edges}
        selectedNode={null}
        onNodeClick={() => undefined}
        onNodeHover={() => undefined}
        layout="force"
        theme="tech"
        showLearningPath={false}
        pathNodes={[]}
      />
    );

    expect(screen.getAllByTestId("mock-force-graph").length).toBeGreaterThan(0);
    const particles = (capturedProps as { linkDirectionalParticles?: unknown } | null)
      ?.linkDirectionalParticles;
    if (typeof particles === "function") {
      expect(particles({ source: "n1", target: "n2" })).toBe(0);
      return;
    }
    expect(typeof particles).toBe("number");
    expect(particles).toBe(0);
  });

  it("renders directional particles only for highlighted learning path links", () => {
    capturedProps = null;

    render(
      <InteractiveGraph
        nodes={nodes}
        edges={edges}
        selectedNode={null}
        onNodeClick={() => undefined}
        onNodeHover={() => undefined}
        layout="force"
        theme="tech"
        showLearningPath={true}
        pathNodes={["n1", "n2"]}
      />
    );

    expect(screen.getAllByTestId("mock-force-graph").length).toBeGreaterThan(0);
    const particles = (capturedProps as { linkDirectionalParticles?: unknown } | null)
      ?.linkDirectionalParticles;
    if (typeof particles === "function") {
      expect(particles({ source: "n1", target: "n2" })).toBeGreaterThan(0);
      return;
    }
    expect(typeof particles).toBe("number");
    expect((particles as number) > 0).toBe(true);
  });
});

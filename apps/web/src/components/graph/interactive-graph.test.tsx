// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InteractiveGraph, buildGraphTopologyKey, mergeNodePositions } from "./interactive-graph";
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
  it("builds same topology key for structurally equivalent node/edge arrays", () => {
    const keyA = buildGraphTopologyKey(nodes, edges, "force");
    const keyB = buildGraphTopologyKey(
      nodes.map((node) => ({ ...node })),
      edges.map((edge) => ({ ...edge })),
      "force"
    );

    expect(keyA).toBe(keyB);
  });

  it("keeps existing positions when node metadata updates without topology changes", () => {
    const previousNodes: GraphNode[] = [
      { ...nodes[0], x: 100, y: 200, vx: 1, vy: -1 },
      { ...nodes[1], x: 300, y: 400, vx: -0.5, vy: 0.25 },
    ];
    const nextNodes: GraphNode[] = [
      { ...nodes[0], mastery: 0.9 },
      { ...nodes[1], mastery: 0.7 },
    ];

    const merged = mergeNodePositions(nextNodes, previousNodes);
    expect(merged[0]?.x).toBe(100);
    expect(merged[0]?.y).toBe(200);
    expect(merged[1]?.x).toBe(300);
    expect(merged[1]?.y).toBe(400);
  });

  it("renders dynamic relation particles in explore mode", () => {
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
      expect(particles({ source: "n1", target: "n2", type: "related", strength: 0.8 })).toBeGreaterThan(0);
    } else {
      expect(typeof particles).toBe("number");
      expect((particles as number) > 0).toBe(true);
    }

    const particleColor = (capturedProps as { linkDirectionalParticleColor?: unknown } | null)
      ?.linkDirectionalParticleColor;
    if (typeof particleColor === "function") {
      const color = particleColor({ source: "n1", target: "n2", type: "related", strength: 0.8 });
      expect(typeof color).toBe("string");
      expect(String(color).startsWith("rgba(")).toBe(true);
    }

    const particleSpeed = (capturedProps as { linkDirectionalParticleSpeed?: unknown } | null)
      ?.linkDirectionalParticleSpeed;
    if (typeof particleSpeed === "function") {
      expect(particleSpeed({ source: "n1", target: "n2", type: "related", strength: 0.8 })).toBeGreaterThan(0);
    }

    const enableNodeDrag = (capturedProps as { enableNodeDrag?: unknown } | null)?.enableNodeDrag;
    expect(enableNodeDrag).toBe(true);

    const onNodeDragEnd = (capturedProps as { onNodeDragEnd?: unknown } | null)?.onNodeDragEnd;
    expect(typeof onNodeDragEnd).toBe("function");

    const pointerPainter = (capturedProps as { nodePointerAreaPaint?: unknown } | null)
      ?.nodePointerAreaPaint;
    if (typeof pointerPainter === "function") {
      const ctx = {
        fillStyle: "",
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
      } as unknown as CanvasRenderingContext2D;
      expect(() => pointerPainter({ ...nodes[0], x: 12, y: 34 }, "rgb(1,2,3)", ctx, 1)).not.toThrow();
    }
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
      expect(particles({ source: "n1", target: "n2", type: "related", strength: 0.8 })).toBeGreaterThan(0);
    } else {
      expect(typeof particles).toBe("number");
      expect((particles as number) > 0).toBe(true);
    }

    const particleColor = (capturedProps as { linkDirectionalParticleColor?: unknown } | null)
      ?.linkDirectionalParticleColor;
    if (typeof particleColor === "function") {
      expect(
        particleColor({ source: "n1", target: "n2", type: "related", strength: 0.8 })
      ).toBe("#60a5fa");
    }

    const linkColor = (capturedProps as { linkColor?: unknown } | null)?.linkColor;
    if (typeof linkColor === "function") {
      expect(
        linkColor({ source: "n1", target: "n2", type: "related", strength: 0.8 })
      ).toBe("#60a5fa");
    }
  });

  it("keeps graphData reference stable across hover/selection rerenders", () => {
    capturedProps = null;

    const { rerender } = render(
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

    const firstGraphData = (capturedProps as { graphData?: unknown } | null)?.graphData;
    expect(firstGraphData).toBeDefined();

    rerender(
      <InteractiveGraph
        nodes={nodes}
        edges={edges}
        selectedNode={nodes[0] ?? null}
        onNodeClick={() => undefined}
        onNodeHover={() => undefined}
        layout="force"
        theme="tech"
        showLearningPath={false}
        pathNodes={[]}
      />
    );

    const secondGraphData = (capturedProps as { graphData?: unknown } | null)?.graphData;
    expect(secondGraphData).toBe(firstGraphData);
  });
});

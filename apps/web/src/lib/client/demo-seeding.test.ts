import { describe, expect, it, vi } from "vitest";

import type { DemoBootstrapPayload } from "@/lib/client/demo-bootstrap";
import { buildDemoStarterBundle } from "@/lib/client/demo-bootstrap";
import { seedDemoContentBundle, type DemoSeedingAdapters } from "@/lib/client/demo-seeding";

function createPayload(): DemoBootstrapPayload {
  return {
    workspace: { sessions: [] },
    practice: { banks: [] },
    graph: {
      nodes: [
        { id: "demo_node_html", label: "HTML", domain: "frontend", mastery: 0.6, risk: 0.3 },
        { id: "demo_node_css", label: "CSS", domain: "frontend", mastery: 0.4, risk: 0.4 }
      ],
      edges: [
        {
          id: "demo_edge_html_css",
          source: "demo_node_html",
          target: "demo_node_css",
          weight: 0.8
        }
      ]
    },
    goals: {
      items: [
        {
        id: "demo_goal_1",
        title: "Frontend Sprint",
        description: "Launch a mini frontend project",
        goalType: "project",
        category: "project",
        linkedPathIds: ["demo_path_frontend"],
        smart: {
          specific: "Build static + responsive pages",
          measurable: "Ship milestone and review notes",
          achievable: "Practice daily",
          relevant: "Support career progression",
          timeBound: "2026-04-01"
        },
        startDate: "2026-03-15",
        endDate: "2026-04-01",
        progress: 25,
        status: "active"
        }
      ]
    },
    paths: {
      items: [
        {
        id: "demo_path_frontend",
        title: "Frontend Path",
        description: "Frontend foundations and React",
        status: "in_progress",
        progress: 30,
        tags: ["frontend", "demo"],
        goalId: "demo_goal_1",
        tasks: [
          {
            id: "demo_task_html",
            title: "Semantic HTML",
            description: "Master semantic structures",
            estimatedTime: "2h",
            progress: 100,
            status: "completed",
            dependencies: [],
            resources: [],
            notes: "completed"
          }
        ],
        milestones: [{ id: "demo_milestone_1", title: "Basics", taskIds: ["demo_task_html"] }]
        }
      ]
    },
    path: {
      goalType: "project",
      goal: "Frontend Sprint",
      tasks: [
        {
          taskId: "demo_task_html",
          title: "Semantic HTML",
          reason: "Build foundations",
          dueDate: "2026-03-20",
          priority: 1
        }
      ]
    }
  };
}

describe("seedDemoContentBundle", () => {
  it("does not duplicate entities when called repeatedly", async () => {
    const payload = createPayload();
    const bundle = buildDemoStarterBundle(payload, "2026-03-17T00:00:00.000Z");
    const goals = new Map<string, unknown>();
    const paths = new Map<string, unknown>();
    const graphNodes = new Map<string, unknown>();
    const graphEdges = new Map<string, unknown>();

    const adapters: DemoSeedingAdapters = {
      getGoals: () => Array.from(goals.values()) as any,
      saveGoal: (_userId, goal) => {
        goals.set(goal.id, goal);
      },
      getPaths: async () => Array.from(paths.values()) as any,
      createPath: async (_userId, path) => {
        paths.set(path.id, path);
      },
      updatePath: async (_userId, id, updates) => {
        paths.set(id, { ...(paths.get(id) as Record<string, unknown>), ...updates, id });
      },
      getGraphNodes: async () => Array.from(graphNodes.values()) as any,
      upsertGraphNode: async (_userId, node) => {
        graphNodes.set(node.id, node);
      },
      getGraphEdges: async () => Array.from(graphEdges.values()) as any,
      upsertGraphEdge: async (_userId, edge) => {
        graphEdges.set(edge.id, edge);
      }
    };

    await seedDemoContentBundle("demo-user", bundle, adapters);
    await seedDemoContentBundle("demo-user", bundle, adapters);

    expect(goals.size).toBe(1);
    expect(paths.size).toBe(1);
    expect(graphNodes.size).toBe(2);
    expect(graphEdges.size).toBe(1);
  });

  it("updates existing records by stable id", async () => {
    const payload = createPayload();
    const bundle = buildDemoStarterBundle(payload, "2026-03-17T00:00:00.000Z");
    const saveGoal = vi.fn();
    const updatePath = vi.fn();
    const upsertGraphNode = vi.fn();

    const adapters: DemoSeedingAdapters = {
      getGoals: () => [{ ...bundle.goals[0], title: "old" }],
      saveGoal,
      getPaths: async () => [{ ...bundle.paths[0], title: "old path" }],
      createPath: async () => {
        throw new Error("should not create");
      },
      updatePath: async (_userId, id, path) => {
        updatePath(_userId, id, path);
      },
      getGraphNodes: async () => [{ ...bundle.graph.nodes[0], name: "old node" }],
      upsertGraphNode: async (_userId, node) => {
        upsertGraphNode(node);
      },
      getGraphEdges: async () => [],
      upsertGraphEdge: async () => {}
    };

    await seedDemoContentBundle("demo-user", bundle, adapters);

    expect(saveGoal).toHaveBeenCalledWith(
      "demo-user",
      expect.objectContaining({ id: "demo_goal_1", title: "Frontend Sprint" })
    );
    expect(updatePath).toHaveBeenCalledWith(
      "demo-user",
      "demo_path_frontend",
      expect.objectContaining({ title: "Frontend Path" })
    );
    expect(upsertGraphNode).toHaveBeenCalledWith(
      expect.objectContaining({ id: "demo_node_html", name: "HTML" })
    );
  });
});

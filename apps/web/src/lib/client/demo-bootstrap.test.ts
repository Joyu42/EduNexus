import { describe, expect, it } from "vitest";

import {
  buildDemoStarterBundle,
  buildDemoStarterContent,
  type DemoBootstrapPayload
} from "@/lib/client/demo-bootstrap";

describe("demo bootstrap content", () => {
  it("builds starter goal and path from demo bootstrap payload", () => {
    const result = buildDemoStarterContent({
      goalType: "exam",
      goal: "Demo Goal",
      tasks: [
        {
          taskId: "task-1",
          title: "Task 1",
          reason: "Reason 1",
          dueDate: "2026-03-20",
          priority: 1,
        },
      ],
    });

    expect(result.goal.title).toBe("Demo Goal");
    expect(result.path.title).toBe("Demo Goal");
    expect(result.path.tasks).toHaveLength(1);
    expect(result.path.tasks[0]).toMatchObject({
      id: "task-1",
      title: "Task 1",
      description: "Reason 1",
      status: "not_started",
      progress: 0,
    });
  });

  it("builds full starter bundle with goals paths and graph", () => {
    const now = "2026-03-17T00:00:00.000Z";
    const payload: DemoBootstrapPayload = {
      workspace: { sessions: [] },
      practice: { banks: [] },
      graph: {
        nodes: [
          {
            id: "graph_node_1",
            label: "HTML Basics",
            domain: "frontend",
            mastery: 0.35,
            risk: 0.5,
            kbDocumentId: "kb_doc_html",
            documentIds: ["kb_doc_html"]
          }
        ],
        edges: [
          {
            id: "graph_edge_1",
            source: "graph_node_1",
            target: "graph_node_2",
            weight: 0.8
          }
        ]
      },
      goals: {
        items: [
          {
          id: "demo_goal_1",
          title: "Frontend Sprint",
          description: "Build a frontend learning baseline",
          goalType: "project",
          category: "project",
          linkedPathIds: ["demo_path_frontend"],
          smart: {
            specific: "Ship a responsive learning page",
            measurable: "Complete milestone and project demo",
            achievable: "2 hours daily practice",
            relevant: "Supports portfolio goals",
            timeBound: "2026-04-01"
          },
          startDate: "2026-03-17",
          endDate: "2026-04-01",
          progress: 20,
          status: "active"
          }
        ]
      },
      paths: {
        items: [
          {
          id: "demo_path_frontend",
          title: "Frontend Learning Path",
          description: "Core frontend path",
          status: "in_progress",
          progress: 35,
          tags: ["frontend", "demo"],
          goalId: "demo_goal_1",
          tasks: [
            {
              id: "path_task_1",
              title: "HTML semantic tags",
              description: "Master semantic HTML",
              estimatedTime: "2 hours",
              progress: 100,
              status: "completed",
              dependencies: [],
              resources: [],
              notes: "done"
            }
          ],
          milestones: [{ id: "m1", title: "Foundation", taskIds: ["path_task_1"] }]
          }
        ]
      },
      path: {
        goalType: "project",
        goal: "Frontend Sprint",
        tasks: [
          {
            taskId: "path_task_1",
            title: "HTML semantic tags",
            reason: "Build fundamentals",
            dueDate: "2026-03-20",
            priority: 1
          }
        ]
      }
    };

    const bundle = buildDemoStarterBundle(payload, now);

    expect(bundle.goals).toHaveLength(1);
    expect(bundle.paths).toHaveLength(1);
    expect(bundle.graph.nodes[0]).toMatchObject({
      id: "graph_node_1",
      name: "HTML Basics",
      type: "concept",
      kbDocumentId: "kb_doc_html",
      documentIds: ["kb_doc_html"]
    });
    expect(bundle.goals[0]).toMatchObject({
      id: "demo_goal_1",
      linkedPathIds: ["demo_path_frontend"]
    });
    expect(bundle.paths[0]).toMatchObject({
      id: "demo_path_frontend",
      goalId: "demo_goal_1"
    });
    expect(bundle.paths[0]?.createdAt.toISOString()).toBe(now);
  });

  it("derives canonical kbDocumentId from documentIds to prevent disconnected demo nodes", () => {
    const payload: DemoBootstrapPayload = {
      workspace: { sessions: [] },
      practice: { banks: [] },
      graph: {
        nodes: [
          {
            id: "graph_node_legacy",
            label: "Legacy linked node",
            documentIds: ["", "kb_doc_legacy", "kb_doc_legacy"],
          },
        ],
        edges: [],
      },
      goals: { items: [] },
      paths: { items: [] },
      path: {
        goalType: "project",
        goal: "Demo Goal",
        tasks: [],
      },
    };

    const bundle = buildDemoStarterBundle(payload, "2026-03-17T00:00:00.000Z");

    expect(bundle.graph.nodes[0]).toMatchObject({
      id: "graph_node_legacy",
      kbDocumentId: "kb_doc_legacy",
      documentIds: ["kb_doc_legacy"],
    });
  });
});

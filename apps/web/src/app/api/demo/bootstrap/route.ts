import { auth } from "@/auth";
import { createDocument, listDocuments } from "@/lib/server/document-service";
import {
  DEMO_GOAL_SEEDS,
  DEMO_GRAPH_BOOTSTRAP,
  DEMO_KB_DOCUMENTS,
  DEMO_PATH_BOOTSTRAP,
  DEMO_PATH_SEEDS,
  DEMO_PRACTICE_BANKS,
  DEMO_PUBLIC_GROUP_SEEDS,
  DEMO_PUBLIC_POST_SEEDS,
  DEMO_PUBLIC_RESOURCE_SEEDS,
  DEMO_PUBLIC_TOPIC_SEEDS,
  DEMO_WORKSPACE_SESSIONS
} from "@/lib/server/demo-content";
import { buildDemoStarterBundle } from "@/lib/client/demo-bootstrap";
import { seedDemoContentBundle } from "@/lib/client/demo-seeding";
import { fail, ok } from "@/lib/server/response";
import { loadDb, saveDb } from "@/lib/server/store";

export const runtime = "nodejs";

type SessionPayload = {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lastLevel: number;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    createdAt: string;
  }>;
};

const DEMO_PATH_NODE_MEMBERSHIPS: Record<string, Array<{ stageId: string; nodeIds: string[] }>> = {
  demo_path_frontend_foundations: [
    {
      stageId: "foundation",
      nodeIds: [
        "demo_node_html_basics",
        "demo_node_css_basics",
        "demo_node_js_fundamentals",
        "demo_node_flexbox",
        "demo_node_grid"
      ]
    }
  ],
  demo_path_react_interface: [
    {
      stageId: "advanced_ui",
      nodeIds: [
        "demo_node_react_intro",
        "demo_node_responsive",
        "demo_node_accessibility"
      ]
    }
  ]
};

function buildDemoSession(
  seed: (typeof DEMO_WORKSPACE_SESSIONS)[number],
  userId: string,
  now: string
): SessionPayload {
  return {
    id: seed.id,
    title: seed.title,
    userId,
    createdAt: now,
    updatedAt: now,
    lastLevel: seed.lastLevel,
    messages: seed.messages.map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: now
    }))
  };
}

function buildDemoGraphWithDocuments(
  documents: Array<{ id: string; title: string }>
): {
  graph: {
    nodes: Array<{
      id: string;
      label: string;
      domain: string;
      mastery: number;
      risk: number;
      kbDocumentId: string;
      documentIds: string[];
    }>;
    edges: typeof DEMO_GRAPH_BOOTSTRAP.edges;
  };
  nodeDocumentIds: Map<string, string>;
} {
  const documentsByTitle = new Map(documents.map((doc) => [doc.title, doc.id]));
  const nodeDocumentIds = new Map<string, string>();

  const nodes = DEMO_GRAPH_BOOTSTRAP.nodes.map((node) => {
    const kbDocumentId = documentsByTitle.get(node.label) ?? "";
    if (kbDocumentId) {
      nodeDocumentIds.set(node.id, kbDocumentId);
    }

    return {
      ...node,
      kbDocumentId,
      documentIds: kbDocumentId ? [kbDocumentId] : []
    };
  });

  return {
    graph: {
      nodes,
      edges: DEMO_GRAPH_BOOTSTRAP.edges
    },
    nodeDocumentIds
  };
}

/**
 * Explicitly seed all demo paths to db.syncedPaths (idempotent)
 */
function seedDemoPathsToDb(
  db: {
    syncedPaths: Array<{
      userId: string;
      pathId: string;
      title: string;
      description: string;
      status: string;
      progress: number;
      tags: string[];
      tasks: Array<{
        taskId: string;
        title: string;
        description?: string;
        estimatedTime?: string;
        status?: string;
        progress?: number;
        dependencies?: string[];
      }>;
      stages?: Array<{
        stageId: string;
        nodeIds: string[];
      }>;
      updatedAt: string;
    }>;
  },
  userId: string,
  now: string
): void {
  for (const pathSeed of DEMO_PATH_SEEDS) {
    // Check if path already exists (idempotency)
    const existingIndex = db.syncedPaths.findIndex(
      (p) => p.userId === userId && p.pathId === pathSeed.id
    );

    const pathRecord = {
      userId,
      pathId: pathSeed.id,
      title: pathSeed.title,
      description: pathSeed.description,
      status: pathSeed.status,
      progress: pathSeed.progress,
      tags: pathSeed.tags,
      stages: DEMO_PATH_NODE_MEMBERSHIPS[pathSeed.id] ?? [],
      tasks: pathSeed.tasks.map((task) => ({
        taskId: task.id,
        title: task.title,
        description: task.description,
        estimatedTime: task.estimatedTime,
        status: task.status,
        progress: task.progress,
        dependencies: task.dependencies
      })),
      updatedAt: now
    };

    if (existingIndex >= 0) {
      // Update existing path
      db.syncedPaths[existingIndex] = pathRecord;
    } else {
      // Add new path
      db.syncedPaths.push(pathRecord);
    }
  }
}

/**
 * Explicitly seed all demo goals to db.plans (idempotent)
 */
function seedDemoGoalsToDb(
  db: {
    plans: Array<{
      planId: string;
      goalType: "exam" | "project" | "certificate";
      goal: string;
      relatedNodes?: string[];
      tasks: Array<{
        taskId: string;
        title: string;
        priority: number;
        reason: string;
        dueDate: string;
      }>;
      createdAt: string;
      updatedAt: string;
    }>;
  }
): void {
  for (const goalSeed of DEMO_GOAL_SEEDS) {
    // Check if goal already exists (idempotency)
    const existingIndex = db.plans.findIndex((p) => p.planId === goalSeed.id);

    const goalRecord = {
      planId: goalSeed.id,
      goalType: goalSeed.goalType,
      goal: goalSeed.title,
      relatedNodes: goalSeed.linkedPathIds,
      tasks: [],
      createdAt: goalSeed.startDate,
      updatedAt: goalSeed.endDate
    };

    if (existingIndex >= 0) {
      // Update existing goal
      db.plans[existingIndex] = { ...db.plans[existingIndex], ...goalRecord };
    } else {
      // Add new goal
      db.plans.push(goalRecord);
    }
  }
}

/**
 * Explicitly seed all demo graph nodes to db.masteryByNode (idempotent)
 */
function seedDemoGraphNodesToDb(
  db: {
    masteryByNode: Record<string, number>;
    plans: Array<{
      planId: string;
      goalType: "exam" | "project" | "certificate";
      goal: string;
      focusNodeId?: string | null;
      focusNodeLabel?: string | null;
      focusNodeRisk?: number | null;
      tasks: Array<{
        taskId: string;
        title: string;
        priority: number;
        reason: string;
        dueDate: string;
      }>;
      createdAt: string;
      updatedAt: string;
    }>;
  },
  nodeDocumentIds: Map<string, string>,
  now: string
): void {
  for (const nodeSeed of DEMO_GRAPH_BOOTSTRAP.nodes) {
    db.masteryByNode[nodeSeed.id] = nodeSeed.mastery;

    const planId = `demo_graph_node::${nodeSeed.id}`;
    const existingIndex = db.plans.findIndex((plan) => plan.planId === planId);
    const record = {
      planId,
      goalType: "project" as const,
      goal: nodeSeed.label,
      focusNodeId: nodeSeed.id,
      focusNodeLabel: nodeDocumentIds.get(nodeSeed.id) ?? null,
      focusNodeRisk: nodeSeed.risk,
      tasks: [],
      createdAt: now,
      updatedAt: now
    };

    if (existingIndex >= 0) {
      db.plans[existingIndex] = { ...db.plans[existingIndex], ...record };
    } else {
      db.plans.push(record);
    }
  }
}

/**
 * Explicitly seed all demo graph edges to db.plans (idempotent)
 */
function seedDemoGraphEdgesToDb(
  db: {
    plans: Array<{
      planId: string;
      goalType: "exam" | "project" | "certificate";
      goal: string;
      focusNodeId?: string | null;
      focusNodeLabel?: string | null;
      focusNodeRisk?: number | null;
      tasks: Array<{
        taskId: string;
        title: string;
        priority: number;
        reason: string;
        dueDate: string;
      }>;
      createdAt: string;
      updatedAt: string;
    }>;
  },
  now: string
): void {
  for (const edgeSeed of DEMO_GRAPH_BOOTSTRAP.edges) {
    const planId = `demo_graph_edge::${edgeSeed.id}`;
    
    // Check if edge already exists (idempotency)
    const existingIndex = db.plans.findIndex((p) => p.planId === planId);

    const edgeRecord = {
      planId,
      goalType: "project" as const,
      goal: `demo edge ${edgeSeed.id}`,
      focusNodeId: edgeSeed.source,
      focusNodeLabel: edgeSeed.target,
      focusNodeRisk: edgeSeed.weight,
      tasks: [],
      createdAt: now,
      updatedAt: now
    };

    if (existingIndex >= 0) {
      // Update existing edge
      db.plans[existingIndex] = { ...db.plans[existingIndex], ...edgeRecord };
    } else {
      // Add new edge
      db.plans.push(edgeRecord);
    }
  }
}

function seedDemoSocialToDb(
  db: Awaited<ReturnType<typeof loadDb>>,
  now: string
): void {
  db.publicTopics = Array.isArray(db.publicTopics) ? db.publicTopics : [];
  db.publicResources = Array.isArray(db.publicResources) ? db.publicResources : [];
  db.publicGroups = Array.isArray(db.publicGroups) ? db.publicGroups : [];
  db.publicPosts = Array.isArray(db.publicPosts) ? db.publicPosts : [];

  const topicIds = new Set(DEMO_PUBLIC_TOPIC_SEEDS.map((item) => item.id));
  db.publicTopics = db.publicTopics.filter(
    (item) => !(item.id.startsWith("demo_topic_") && !topicIds.has(item.id))
  );
  for (const topic of DEMO_PUBLIC_TOPIC_SEEDS) {
    const index = db.publicTopics.findIndex((item) => item.id === topic.id);
    const record = {
      id: topic.id,
      name: topic.name,
      createdAt: now
    };
    if (index >= 0) {
      db.publicTopics[index] = record;
    } else {
      db.publicTopics.push(record);
    }
  }

  const resourceIds = new Set(DEMO_PUBLIC_RESOURCE_SEEDS.map((item) => item.id));
  db.publicResources = db.publicResources.filter(
    (item) => !(item.id.startsWith("demo_public_res_") && !resourceIds.has(item.id))
  );
  for (const resource of DEMO_PUBLIC_RESOURCE_SEEDS) {
    const index = db.publicResources.findIndex((item) => item.id === resource.id);
    const record = {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      url: resource.url,
      createdBy: resource.createdBy,
      createdAt: now
    };
    if (index >= 0) {
      db.publicResources[index] = record;
    } else {
      db.publicResources.push(record);
    }
  }

  const groupIds = new Set(DEMO_PUBLIC_GROUP_SEEDS.map((item) => item.id));
  db.publicGroups = db.publicGroups.filter(
    (item) => !(item.id.startsWith("demo_group_") && !groupIds.has(item.id))
  );
  for (const group of DEMO_PUBLIC_GROUP_SEEDS) {
    const index = db.publicGroups.findIndex((item) => item.id === group.id);
    const record = {
      id: group.id,
      name: group.name,
      description: group.description,
      memberCount: group.memberCount,
      createdBy: group.createdBy,
      createdAt: now
    };
    if (index >= 0) {
      db.publicGroups[index] = record;
    } else {
      db.publicGroups.push(record);
    }
  }

  const postIds = new Set(DEMO_PUBLIC_POST_SEEDS.map((item) => item.id));
  db.publicPosts = db.publicPosts.filter(
    (item) => !(item.id.startsWith("demo_post_") && !postIds.has(item.id))
  );
  for (const post of DEMO_PUBLIC_POST_SEEDS) {
    const index = db.publicPosts.findIndex((item) => item.id === post.id);
    const record = {
      id: post.id,
      title: post.title,
      content: post.content,
      authorId: post.authorId,
      authorName: post.authorName,
      createdAt: now,
      updatedAt: now
    };
    if (index >= 0) {
      db.publicPosts[index] = record;
    } else {
      db.publicPosts.push(record);
    }
  }
}

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return fail({ code: "UNAUTHORIZED", message: "用户未登录。" }, 401);
    }
    if (session.user.isDemo !== true) {
      return fail({ code: "FORBIDDEN", message: "仅演示账号可访问演示内容。" }, 403);
    }

    const userId = session.user.id;
    const existingDocuments = await listDocuments(userId);
    const existingDocumentMap = new Map(existingDocuments.map((doc) => [doc.title, doc]));
    const demoDocuments = [] as Array<{ id: string; title: string }>;

    for (const docSeed of DEMO_KB_DOCUMENTS) {
      const existing = existingDocumentMap.get(docSeed.title);
      if (existing) {
        demoDocuments.push({ id: existing.id, title: existing.title });
        continue;
      }

      const created = await createDocument({
        title: docSeed.title,
        content: docSeed.content,
        authorId: userId
      });
      demoDocuments.push({ id: created.id, title: created.title });
    }

    const { graph: graphBootstrapWithLinks, nodeDocumentIds } = buildDemoGraphWithDocuments(demoDocuments);

    const db = await loadDb();
    const existingUserSessions = db.sessions.filter((item) => item.userId === userId);
    const existingSessionTitles = new Set(existingUserSessions.map((item) => item.title));
    const now = new Date().toISOString();
    const seededSessions = DEMO_WORKSPACE_SESSIONS.filter(
      (seed) => !existingSessionTitles.has(seed.title)
    ).map((seed) => buildDemoSession(seed, userId, now));

    if (seededSessions.length > 0) {
      db.sessions.unshift(...seededSessions);
    }

    const workspaceSessions = DEMO_WORKSPACE_SESSIONS.map((seed) => {
      const persisted =
        db.sessions.find((item) => item.userId === userId && item.title === seed.title) ??
        seededSessions.find((item) => item.title === seed.title);

      const persistedMessages = Array.isArray(persisted?.messages) ? persisted.messages : [];
      const messages =
        persistedMessages.length > 0
          ? persistedMessages
          : seed.messages.map((message) => ({
              role: message.role,
              content: message.content,
              createdAt: now
            }));

      return {
        id: persisted?.id ?? seed.id,
        title: seed.title,
        lastLevel: persisted?.lastLevel ?? seed.lastLevel,
        messages
      };
    });

    const bundle = buildDemoStarterBundle(
      {
        workspace: { sessions: workspaceSessions },
        practice: { banks: DEMO_PRACTICE_BANKS },
        graph: graphBootstrapWithLinks,
        goals: { items: DEMO_GOAL_SEEDS },
        paths: { items: DEMO_PATH_SEEDS },
        path: DEMO_PATH_BOOTSTRAP
      },
      now
    );

    // First, use the seedDemoContentBundle for initial seeding via adapters
    await seedDemoContentBundle(userId, bundle, {
      getGoals: () =>
        db.plans
          .filter((plan) => plan.planId.startsWith("demo_goal_"))
          .map((plan) => ({
            id: plan.planId,
            title: plan.goal,
            description: "演示目标",
            type: "mid-term" as const,
            category: "project" as const,
            status: "active" as const,
            smart: {
              specific: plan.goal,
              measurable: "完成演示任务",
              achievable: "按路径推进",
              relevant: "体验平台流程",
              timeBound: plan.updatedAt
            },
            progress: 0,
            linkedPathIds: plan.relatedNodes ?? [],
            relatedKnowledge: [],
            startDate: plan.createdAt,
            endDate: plan.updatedAt,
            createdAt: plan.createdAt,
            updatedAt: plan.updatedAt
          })),
      saveGoal: (_seedUserId, goal) => {
        const index = db.plans.findIndex((plan) => plan.planId === goal.id);
        const record = {
          planId: goal.id,
          goalType: "project" as const,
          goal: goal.title,
          relatedNodes: goal.linkedPathIds,
          tasks: [],
          createdAt: goal.createdAt,
          updatedAt: goal.updatedAt
        };

        if (index >= 0) {
          db.plans[index] = { ...db.plans[index], ...record };
        } else {
          db.plans.push(record);
        }
      },
      getPaths: async () =>
        db.syncedPaths
          .filter((path) => path.userId === userId && path.pathId.startsWith("demo_path_"))
          .map((path) => ({
            id: path.pathId,
            title: path.title,
            description: path.description,
            status: path.status,
            progress: path.progress,
            tags: path.tags,
            createdAt: new Date(path.updatedAt),
            updatedAt: new Date(path.updatedAt),
            tasks: path.tasks.map((task) => ({
              id: task.taskId,
              title: task.title,
              description: task.description ?? "",
              estimatedTime: task.estimatedTime ?? "1小时",
              progress: task.progress ?? 0,
              status: task.status ?? "not_started",
              dependencies: task.dependencies ?? [],
              resources: [],
              notes: "",
              createdAt: new Date(path.updatedAt)
            })),
            milestones: []
          })),
      createPath: async (_seedUserId, path) => {
        db.syncedPaths.push({
          userId,
          pathId: path.id,
          title: path.title,
          description: path.description,
          status: path.status,
          progress: path.progress,
          tags: path.tags,
          tasks: path.tasks.map((task) => ({
            taskId: task.id,
            title: task.title,
            description: task.description,
            estimatedTime: task.estimatedTime,
            status: task.status,
            progress: task.progress,
            dependencies: task.dependencies
          })),
          updatedAt: path.updatedAt.toISOString()
        });
      },
      updatePath: async (_seedUserId, id, path) => {
        const index = db.syncedPaths.findIndex((record) => record.userId === userId && record.pathId === id);
        const next = {
          userId,
          pathId: path.id,
          title: path.title,
          description: path.description,
          status: path.status,
          progress: path.progress,
          tags: path.tags,
          tasks: path.tasks.map((task) => ({
            taskId: task.id,
            title: task.title,
            description: task.description,
            estimatedTime: task.estimatedTime,
            status: task.status,
            progress: task.progress,
            dependencies: task.dependencies
          })),
          updatedAt: path.updatedAt.toISOString()
        };
        if (index >= 0) {
          db.syncedPaths[index] = next;
        } else {
          db.syncedPaths.push(next);
        }
      },
      getGraphNodes: async () =>
        Object.entries(db.masteryByNode)
          .filter(([nodeId]) => nodeId.startsWith("demo_node_"))
          .map(([nodeId, mastery]) => {
            const nodeMeta = DEMO_GRAPH_BOOTSTRAP.nodes.find((node) => node.id === nodeId);
            const nodePlan = db.plans.find((plan) => plan.planId === `demo_graph_node::${nodeId}`);
            const kbDocumentId =
              typeof nodePlan?.focusNodeLabel === "string" && nodePlan.focusNodeLabel.trim().length > 0
                ? nodePlan.focusNodeLabel
                : "";

            return {
              id: nodeId,
              name: nodeMeta?.label ?? nodeId,
              type: "concept" as const,
              status: "learning" as const,
              importance: 0.5,
              mastery,
              connections: 0,
              noteCount: 0,
              practiceCount: 0,
              practiceCompleted: 0,
              createdAt: new Date(now),
              updatedAt: new Date(now),
              kbDocumentId,
              documentIds: kbDocumentId ? [kbDocumentId] : []
            };
          }),
      upsertGraphNode: async (_seedUserId, node) => {
        db.masteryByNode[node.id] = node.mastery;
      },
      getGraphEdges: async () =>
        db.plans
          .filter((plan) => plan.planId.startsWith("demo_graph_edge::"))
          .map((plan) => ({
            id: plan.planId.replace("demo_graph_edge::", ""),
            source: plan.focusNodeId ?? "",
            target: plan.focusNodeLabel ?? "",
            type: "related" as const,
            strength: plan.focusNodeRisk ?? 0.5
          })),
      upsertGraphEdge: async (_seedUserId, edge) => {
        const planId = `demo_graph_edge::${edge.id}`;
        const index = db.plans.findIndex((plan) => plan.planId === planId);
        const record = {
          planId,
          goalType: "project" as const,
          goal: `demo edge ${edge.id}`,
          focusNodeId: typeof edge.source === "string" ? edge.source : edge.source.id,
          focusNodeLabel: typeof edge.target === "string" ? edge.target : edge.target.id,
          focusNodeRisk: edge.strength,
          tasks: [],
          createdAt: now,
          updatedAt: now
        };
        if (index >= 0) {
          db.plans[index] = { ...db.plans[index], ...record };
        } else {
          db.plans.push(record);
        }
      }
    });

    // EXPLICIT SEEDING: Ensure all demo data is seeded directly to db
    // This guarantees the data is saved even if seedDemoContentBundle has issues
    const demoPathIds = new Set(DEMO_PATH_SEEDS.map((item) => item.id));
    db.syncedPaths = db.syncedPaths.filter(
      (record) =>
        !(record.userId === userId && record.pathId.startsWith("demo_path_") && !demoPathIds.has(record.pathId))
    );

    // 1. Seed all 3 paths to db.syncedPaths (idempotent)
    seedDemoPathsToDb(db, userId, now);
    
    // 2. Seed all 3 goals to db.plans (idempotent)
    seedDemoGoalsToDb(db);
    
    // 3. Seed graph nodes to db.masteryByNode (idempotent)
    seedDemoGraphNodesToDb(db, nodeDocumentIds, now);
    
    // 4. Seed graph edges to db.plans (idempotent)
    seedDemoGraphEdgesToDb(db, now);

    seedDemoSocialToDb(db, now);

    // Always save after seeding (even if no changes, ensures data is persisted)
    await saveDb(db);

    return ok({
      kb: { documents: demoDocuments },
      workspace: { sessions: workspaceSessions },
      practice: { banks: DEMO_PRACTICE_BANKS },
      graph: graphBootstrapWithLinks,
      goals: { items: DEMO_GOAL_SEEDS },
      paths: { items: DEMO_PATH_SEEDS },
      path: DEMO_PATH_BOOTSTRAP,
      social: {
        resources: DEMO_PUBLIC_RESOURCE_SEEDS,
        groups: DEMO_PUBLIC_GROUP_SEEDS,
        topics: DEMO_PUBLIC_TOPIC_SEEDS,
        posts: DEMO_PUBLIC_POST_SEEDS
      },
      seeded: {
        paths: DEMO_PATH_SEEDS.map(p => p.id),
        goals: DEMO_GOAL_SEEDS.map(g => g.id),
        graphNodes: DEMO_GRAPH_BOOTSTRAP.nodes.map(n => n.id),
        graphEdges: DEMO_GRAPH_BOOTSTRAP.edges.map(e => e.id),
        resources: DEMO_PUBLIC_RESOURCE_SEEDS.map((item) => item.id),
        groups: DEMO_PUBLIC_GROUP_SEEDS.map((item) => item.id),
        topics: DEMO_PUBLIC_TOPIC_SEEDS.map((item) => item.id),
        posts: DEMO_PUBLIC_POST_SEEDS.map((item) => item.id)
      }
    });
  } catch (error) {
    return fail(
      {
        code: "DEMO_BOOTSTRAP_FAILED",
        message: "初始化演示内容失败。",
        details: error instanceof Error ? error.message : error
      },
      500
    );
  }
}

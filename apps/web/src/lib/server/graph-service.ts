import { prisma } from './prisma';
import { loadDb } from './store';
import { DEMO_GRAPH_BOOTSTRAP } from './demo-content';

const MAX_NODES_PER_USER = 200;

export type GraphNode = {
  id: string;
  label: string;
  mastery: number;
  risk: number;
  domain: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  weight: number;
};

export type GraphView = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type MasteryStage = "seen" | "understood" | "applied" | "mastered";

export type PathMembership = {
  pathId: string;
  pathName: string;
  stage: string;
  orderWithinStage: number;
};

export type WorkspaceGraphNode = GraphNode & {
  masteryStage: MasteryStage;
  needsReview: boolean;
  pathMemberships: PathMembership[];
  category: string;
  kbDocumentId: string;
};

export type WorkspaceGraphView = {
  nodes: WorkspaceGraphNode[];
  edges: GraphEdge[];
};

function deriveMasteryStage(mastery: number): MasteryStage {
  if (mastery >= 0.8) return "mastered";
  if (mastery >= 0.5) return "applied";
  if (mastery >= 0.25) return "understood";
  return "seen";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildPathMembershipMap(paths: unknown[]): Map<string, PathMembership[]> {
  const membershipMap = new Map<string, PathMembership[]>();

  for (const path of paths) {
    if (!isRecord(path)) continue;

    const pathId = typeof path.pathId === "string" ? path.pathId : "";
    if (!pathId) continue;

    const pathName = typeof path.title === "string" && path.title.trim()
      ? path.title.trim()
      : "未命名路径";

    let appendedByStages = false;
    const stages = Array.isArray(path.stages) ? path.stages : [];
    for (const stageItem of stages) {
      if (!isRecord(stageItem)) continue;
      const stageId =
        typeof stageItem.stageId === "string" && stageItem.stageId.trim()
          ? stageItem.stageId
          : "默认";
      const nodeIds = Array.isArray(stageItem.nodeIds)
        ? stageItem.nodeIds.filter((nodeId): nodeId is string => typeof nodeId === "string")
        : [];

      for (const [index, nodeId] of nodeIds.entries()) {
        if (!membershipMap.has(nodeId)) {
          membershipMap.set(nodeId, []);
        }
        membershipMap.get(nodeId)?.push({
          pathId,
          pathName,
          stage: stageId,
          orderWithinStage: index,
        });
        appendedByStages = true;
      }
    }

    if (appendedByStages) {
      continue;
    }

    const tasks = Array.isArray(path.tasks) ? path.tasks : [];
    for (const [index, task] of tasks.entries()) {
      if (!isRecord(task) || typeof task.taskId !== "string" || !task.taskId.trim()) {
        continue;
      }

      const taskNodeId = task.taskId.trim();
      const stage =
        typeof task.status === "string" && task.status.trim()
          ? task.status
          : "task";

      if (!membershipMap.has(taskNodeId)) {
        membershipMap.set(taskNodeId, []);
      }
      membershipMap.get(taskNodeId)?.push({
        pathId,
        pathName,
        stage,
        orderWithinStage: index,
      });
    }
  }

  return membershipMap;
}

function resolveNodeCategory(input: {
  defaultDomain: string;
  pathMemberships: PathMembership[];
  userPaths: unknown[];
}): string {
  for (const membership of input.pathMemberships) {
    const matchedPath = input.userPaths.find((path) => {
      if (!isRecord(path)) return false;
      return path.pathId === membership.pathId;
    });

    if (!isRecord(matchedPath) || !Array.isArray(matchedPath.tags)) {
      continue;
    }

    const firstTag = matchedPath.tags.find((tag): tag is string => typeof tag === "string" && tag.trim().length > 0);
    if (firstTag) {
      return firstTag;
    }
  }

  return input.defaultDomain;
}

export async function getGraphView(userId: string, input?: { domain?: string }): Promise<WorkspaceGraphView>;
export async function getGraphView(input?: { domain?: string; owner?: string }): Promise<WorkspaceGraphView>;
export async function getGraphView(
  arg1?: string | { domain?: string; owner?: string },
  arg2?: { domain?: string }
): Promise<WorkspaceGraphView> {
  const userId = typeof arg1 === 'string' ? arg1 : arg1?.owner;
  const domain = typeof arg1 === 'string' ? arg2?.domain : arg1?.domain;

  if (!userId) {
    return { nodes: [], edges: [] };
  }

  const db = await loadDb();
  const hasDemoPaths = db.syncedPaths.some(
    (path) => path.userId === userId && path.pathId.startsWith("demo_path_")
  );

  if (hasDemoPaths) {
    const demoNodeMeta = new Map(
      DEMO_GRAPH_BOOTSTRAP.nodes.map((node) => [node.id, node])
    );

    const demoNodes = Object.entries(db.masteryByNode)
      .filter(([nodeId]) => nodeId.startsWith("demo_node_"))
      .map(([nodeId, mastery]) => {
        const meta = demoNodeMeta.get(nodeId);
        return {
          id: nodeId,
          label: meta?.label ?? nodeId,
          mastery,
          risk: meta?.risk ?? 0.5,
          domain: meta?.domain ?? "general",
          masteryStage: deriveMasteryStage(mastery),
          needsReview: false,
          pathMemberships: [],
          category: meta?.domain ?? "general",
          kbDocumentId: nodeId,
        } satisfies WorkspaceGraphNode;
      });

    const demoEdges = db.plans
      .filter((plan) => plan.planId.startsWith("demo_graph_edge::"))
      .map((plan) => ({
        source: plan.focusNodeId ?? "",
        target: plan.focusNodeLabel ?? "",
        weight: plan.focusNodeRisk ?? 0.5,
      }))
      .filter((edge) => edge.source && edge.target);

    const fallbackEdges = DEMO_GRAPH_BOOTSTRAP.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
    }));

    return {
      nodes: domain ? demoNodes.filter((node) => node.domain === domain) : demoNodes,
      edges: demoEdges.length > 0 ? demoEdges : fallbackEdges,
    };
  }

  const documents = await prisma.document.findMany({
    where: { authorId: userId },
    take: MAX_NODES_PER_USER,
    orderBy: { updatedAt: 'desc' },
  });

  const userPaths = db.syncedPaths.filter((path) => path.userId === userId);
  const pathMembershipMap = buildPathMembershipMap(userPaths);

  const nodes: WorkspaceGraphNode[] = documents.map((doc) => {
    const mastery = db.masteryByNode[doc.id] ?? 0;
    const domainValue = "general";
    const pathMemberships = pathMembershipMap.get(doc.id) ?? [];
    const category = resolveNodeCategory({
      defaultDomain: domainValue,
      pathMemberships,
      userPaths,
    });

    return {
      id: doc.id,
      label: doc.title,
      mastery,
      risk: 0.5,
      domain: domainValue,
      masteryStage: deriveMasteryStage(mastery),
      needsReview: false,
      pathMemberships,
      category,
      kbDocumentId: doc.id,
    };
  });

  const edges: GraphEdge[] = [];

  return {
    nodes: domain ? nodes.filter((node) => node.domain === domain) : nodes,
    edges,
  };
}

export async function getGraphNodeDetail(nodeId: string, userId: string) {
  const doc = await prisma.document.findFirst({
    where: { id: nodeId, authorId: userId },
  });

  if (!doc) {
    return null;
  }

  return {
    node: {
      id: doc.id,
      label: doc.title,
      mastery: 0.5,
      risk: 0.5,
      domain: 'general',
    },
    evidences: [
      {
        sourceId: `db:${doc.id}`,
        chunkRef: 'summary',
        quote: `节点「${doc.title}」来自用户的知识库。`,
      },
    ],
  };
}

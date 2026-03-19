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

export async function getGraphView(userId: string, input?: { domain?: string }): Promise<GraphView>;
export async function getGraphView(input?: { domain?: string; owner?: string }): Promise<GraphView>;
export async function getGraphView(
  arg1?: string | { domain?: string; owner?: string },
  arg2?: { domain?: string }
): Promise<GraphView> {
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
        } satisfies GraphNode;
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

  const nodes: GraphNode[] = documents.map((doc) => ({
    id: doc.id,
    label: doc.title,
    mastery: 0.5,
    risk: 0.5,
    domain: 'general',
  }));

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

import { prisma } from './prisma';

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

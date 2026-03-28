import type { GraphEdge, GraphNode, NodeStatus, PathMembership } from "@/lib/graph/types";

type GraphViewApiNode = {
  id: string;
  label: string;
  domain?: string;
  mastery?: number;
  risk?: number;
  masteryStage?: "seen" | "understood" | "applied" | "mastered";
  needsReview?: boolean;
  pathMemberships?: PathMembership[];
  category?: string;
  kbDocumentId?: string;
};

type GraphViewApiEdge = {
  source: string;
  target: string;
  weight?: number;
};

type GraphViewApiResponse = {
  success?: boolean;
  data?: {
    nodes?: GraphViewApiNode[];
    edges?: GraphViewApiEdge[];
    packId?: string;
    packMissing?: boolean;
  };
  nodes?: GraphViewApiNode[];
  edges?: GraphViewApiEdge[];
  packId?: string;
  packMissing?: boolean;
};

type GraphViewStateInput = {
  isLoading: boolean;
  nodes: GraphNode[];
  packId?: string;
  packMissing?: boolean;
};

type GraphViewState =
  | { kind: "loading" }
  | { kind: "content" }
  | {
      kind: "empty";
      title: string;
      description: string;
    };

type GraphData = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  packId?: string;
  packMissing?: boolean;
};

function resolveNodeStatus(mastery: number): NodeStatus {
  if (mastery >= 0.8) {
    return "mastered";
  }
  if (mastery >= 0.3) {
    return "learning";
  }
  return "unlearned";
}

function resolveMasteryStage(mastery: number): "seen" | "understood" | "applied" | "mastered" {
  if (mastery >= 0.8) {
    return "mastered";
  }
  if (mastery >= 0.5) {
    return "applied";
  }
  if (mastery >= 0.25) {
    return "understood";
  }
  return "seen";
}

function buildConnectionMap(nodes: GraphViewApiNode[], edges: GraphViewApiEdge[]) {
  const counts = new Map(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    counts.set(edge.source, (counts.get(edge.source) ?? 0) + 1);
    counts.set(edge.target, (counts.get(edge.target) ?? 0) + 1);
  }
  return counts;
}

function normalizeGraphResponse(payload: GraphViewApiResponse): GraphData {
  const apiNodes = payload.data?.nodes ?? payload.nodes ?? [];
  const apiEdges = payload.data?.edges ?? payload.edges ?? [];
  const connectionMap = buildConnectionMap(apiNodes, apiEdges);
  const now = new Date();

  return {
    nodes: apiNodes.map((node) => {
      const mastery = Math.max(0, Math.min(node.mastery ?? 0.45, 1));
      const normalizedPathMemberships = Array.isArray(node.pathMemberships) ? node.pathMemberships : [];
      const category = node.category ?? node.domain ?? "general";
      const kbDocumentId = node.kbDocumentId ?? node.id;
      return {
        id: node.id,
        name: node.label,
        type: "concept",
        status: resolveNodeStatus(mastery),
        importance: Math.max(0.3, Math.min(1, 0.45 + (connectionMap.get(node.id) ?? 0) * 0.1)),
        mastery,
        connections: connectionMap.get(node.id) ?? 0,
        noteCount: 1,
        practiceCount: 0,
        practiceCompleted: 0,
        documentIds: [kbDocumentId],
        keywords: Array.from(new Set([node.domain, category].filter((value): value is string => Boolean(value)))),
        masteryStage: node.masteryStage ?? resolveMasteryStage(mastery),
        needsReview: node.needsReview ?? false,
        pathMemberships: normalizedPathMemberships,
        category,
        kbDocumentId,
        createdAt: now,
        updatedAt: now,
      } satisfies GraphNode;
    }),
    edges: apiEdges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      type: "related",
      strength: Math.max(0.1, Math.min(edge.weight ?? 0.5, 1)),
    } satisfies GraphEdge)),
  };
}

export async function loadPrivateGraphView(
  packId?: string,
  fetcher: typeof fetch = fetch
): Promise<GraphData> {
  const url = packId ? `/api/graph/view?packId=${encodeURIComponent(packId)}` : "/api/graph/view";
  const response = await fetcher(url, {
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      return { nodes: [], edges: [] };
    }
    throw new Error(`Failed to fetch graph view: ${response.status}`);
  }

  const payload = (await response.json()) as GraphViewApiResponse;
  const data = normalizeGraphResponse(payload);
  const resolvedPackId =
    payload.packId ??
    (typeof payload.data?.packId === "string" ? payload.data.packId : undefined);
  const resolvedPackMissing =
    payload.packMissing ??
    (typeof payload.data?.packMissing === "boolean"
      ? payload.data.packMissing
      : undefined);

  return { ...data, packId: resolvedPackId, packMissing: resolvedPackMissing };
}

export function getGraphViewState(input: GraphViewStateInput): GraphViewState {
  if (input.isLoading) {
    return { kind: "loading" };
  }

  if (input.nodes.length === 0) {
    if (input.packMissing) {
      return {
        kind: "empty",
        title: "学习包不存在",
        description: "该学习包不存在或你无权访问。",
      };
    }
    if (input.packId) {
      return {
        kind: "empty",
        title: "学习包还在生成中",
        description: "模块文档尚未创建，请在知识库中查看进度。",
      };
    }
    return {
      kind: "empty",
      title: "你的知识星图还是空的",
      description: "先在知识库中创建或导入文档，系统才会为你生成图谱关系。",
    };
  }

  return { kind: "content" };
}

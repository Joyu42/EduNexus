import {
  buildNodeDegreeMap,
  rankHighRiskNodes,
  resolveNodeMastery,
  resolveNodeRisk,
  type GraphViewEdge,
  type GraphViewNode
} from "@/lib/client/graph-view-model";

export type GraphHistorySnapshot = {
  id: string;
  at: string;
  nodeCount: number;
  edgeCount: number;
  averageMastery: number;
  highRiskCount: number;
  isolatedNodeCount: number;
  topRiskNodeLabel: string;
  signature: string;
};

export function buildGraphHistorySnapshot(input: {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
}): GraphHistorySnapshot {
  const degreeMap = buildNodeDegreeMap(input.nodes, input.edges);
  const nodeCount = input.nodes.length;
  const edgeCount = input.edges.length;
  const averageMastery =
    nodeCount === 0
      ? 0
      : Number(
          (
            input.nodes.reduce((sum, node) => sum + resolveNodeMastery(node), 0) / nodeCount
          ).toFixed(2)
        );
  const highRiskCount = input.nodes.filter((node) => resolveNodeRisk(node) >= 0.6).length;
  const isolatedNodeCount = Array.from(degreeMap.values()).filter((value) => value === 0).length;
  const topRiskNodeLabel = rankHighRiskNodes(input.nodes, 1)[0]?.label ?? "无";
  const signature = [
    nodeCount,
    edgeCount,
    averageMastery.toFixed(2),
    highRiskCount,
    isolatedNodeCount,
    topRiskNodeLabel
  ].join("|");
  const at = new Date().toISOString();
  return {
    id: `graph_snapshot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    at,
    nodeCount,
    edgeCount,
    averageMastery,
    highRiskCount,
    isolatedNodeCount,
    topRiskNodeLabel,
    signature
  };
}

export function normalizeGraphHistoryPayload(
  payload: unknown,
  limit: number
): GraphHistorySnapshot[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .filter((item): item is GraphHistorySnapshot => {
      if (!item || typeof item !== "object") {
        return false;
      }
      const source = item as {
        id?: unknown;
        at?: unknown;
        nodeCount?: unknown;
        edgeCount?: unknown;
        averageMastery?: unknown;
        highRiskCount?: unknown;
        isolatedNodeCount?: unknown;
        topRiskNodeLabel?: unknown;
        signature?: unknown;
      };
      return (
        typeof source.id === "string" &&
        typeof source.at === "string" &&
        typeof source.nodeCount === "number" &&
        typeof source.edgeCount === "number" &&
        typeof source.averageMastery === "number" &&
        typeof source.highRiskCount === "number" &&
        typeof source.isolatedNodeCount === "number" &&
        typeof source.topRiskNodeLabel === "string" &&
        typeof source.signature === "string"
      );
    })
    .slice(0, Math.max(1, limit));
}

export function appendGraphHistory(
  history: GraphHistorySnapshot[],
  next: GraphHistorySnapshot,
  limit: number
) {
  if (history.length === 0) {
    return [next].slice(0, Math.max(1, limit));
  }
  const latest = history[0];
  if (latest && latest.signature === next.signature) {
    return [
      {
        ...latest,
        at: next.at
      },
      ...history.slice(1, Math.max(1, limit))
    ];
  }
  return [next, ...history].slice(0, Math.max(1, limit));
}

export function buildGraphHistoryDeltas(
  current: GraphHistorySnapshot,
  previous: GraphHistorySnapshot | null
) {
  if (!previous) {
    return {
      nodeDelta: 0,
      edgeDelta: 0,
      masteryDelta: 0,
      riskDelta: 0
    };
  }
  return {
    nodeDelta: current.nodeCount - previous.nodeCount,
    edgeDelta: current.edgeCount - previous.edgeCount,
    masteryDelta: Number((current.averageMastery - previous.averageMastery).toFixed(2)),
    riskDelta: current.highRiskCount - previous.highRiskCount
  };
}

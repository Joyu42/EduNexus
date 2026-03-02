import { buildGraphFromVault } from "./kb-lite";
import { loadDb } from "./store";

export async function getGraphView(input: { domain?: string; owner?: string }) {
  const graph = await buildGraphFromVault();
  const db = await loadDb();

  const nodes = graph.nodes
    .filter((node) => (input.domain ? node.domain === input.domain : true))
    .map((node) => {
      const mastery = db.masteryByNode[node.id] ?? node.mastery ?? 0.45;
      return {
        ...node,
        mastery,
        risk: Number((1 - mastery).toFixed(2))
      };
    });

  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = graph.edges.filter((edge) => nodeIds.has(edge.source));

  return {
    nodes,
    edges
  };
}

export async function getGraphNodeDetail(nodeId: string) {
  const graph = await getGraphView({});
  const node = graph.nodes.find((item) => item.id === nodeId);
  if (!node) return null;

  return {
    node,
    evidences: [
      {
        sourceId: `vault:${nodeId}`,
        chunkRef: "summary",
        quote: `节点「${node.label}」来自本地知识库沉淀。`
      }
    ]
  };
}

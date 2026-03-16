import { buildGraphFromVault } from "./kb-lite";
import { loadDb } from "./store";

function toTaskNodeId(pathId: string, taskId: string) {
  return `path_task:${pathId}:${taskId}`;
}

function createSlug(input: string) {
  const normalized = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return normalized || "task";
}

export async function getGraphView(input: { domain?: string; owner?: string }) {
  const graph = await buildGraphFromVault();
  const db = await loadDb();

  const baseNodes = graph.nodes.map((node) => {
    const mastery = db.masteryByNode[node.id] ?? node.mastery ?? 0.45;
    return {
      ...node,
      mastery,
      risk: Number((1 - mastery).toFixed(2))
    };
  });

  const baseEdges = [...graph.edges];

  const pathNodes = db.syncedPaths.map((path) => {
    const pathNodeId = `path:${path.pathId}`;
    const mastery = Number(Math.max(0, Math.min(1, path.progress / 100)).toFixed(2));
    return {
      id: pathNodeId,
      label: path.title,
      domain: "learning_path",
      mastery,
      risk: Number((1 - mastery).toFixed(2))
    };
  });

  const taskNodes: Array<{
    id: string;
    label: string;
    domain: string;
    mastery: number;
    risk: number;
  }> = [];

  const pathEdges: Array<{ source: string; target: string; weight: number }> = [];

  for (const path of db.syncedPaths) {
    const pathNodeId = `path:${path.pathId}`;
    for (const task of path.tasks) {
      const taskNodeId = toTaskNodeId(path.pathId, task.taskId);
      const taskProgress = typeof task.progress === "number" ? task.progress : 0;
      const taskMastery = Number(Math.max(0, Math.min(1, taskProgress / 100)).toFixed(2));
      taskNodes.push({
        id: taskNodeId,
        label: task.title,
        domain: "learning_task",
        mastery: taskMastery,
        risk: Number((1 - taskMastery).toFixed(2))
      });

      pathEdges.push({
        source: pathNodeId,
        target: taskNodeId,
        weight: 1
      });

      const dependencies = Array.isArray(task.dependencies) ? task.dependencies : [];
      for (const dependencyId of dependencies) {
        const trimmed = dependencyId.trim();
        if (!trimmed) continue;
        pathEdges.push({
          source: toTaskNodeId(path.pathId, trimmed),
          target: taskNodeId,
          weight: 1
        });
      }
    }
  }

  const mergedNodes = [...baseNodes, ...pathNodes, ...taskNodes];
  const mergedEdges = [...baseEdges, ...pathEdges].filter((edge) => edge.source !== edge.target);

  const dedupedNodes = Array.from(new Map(mergedNodes.map((node) => [node.id, node])).values());
  const nodeIds = new Set(dedupedNodes.map((node) => node.id));

  const dedupedEdges = Array.from(
    new Map(
      mergedEdges
        .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
        .map((edge) => [`${edge.source}->${edge.target}`, edge])
    ).values()
  );

  const nodes = dedupedNodes.filter((node) => (input.domain ? node.domain === input.domain : true));
  const filteredNodeIds = new Set(nodes.map((node) => node.id));
  const edges = dedupedEdges.filter(
    (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
  );

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

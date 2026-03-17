import { getGraphView } from "./graph-service";
import { loadDb } from "./store";

type WorkspaceGraphContext = {
  taskNode: {
    id: string;
    label: string;
    domain?: string;
    mastery?: number;
    risk?: number;
  } | null;
  relatedNodes: Array<{
    id: string;
    label: string;
    domain?: string;
    mastery?: number;
    risk?: number;
  }>;
  relatedEdges: Array<{
    source: string;
    target: string;
    weight?: number;
  }>;
};

function createTaskNodeCandidates(taskId: string) {
  return [
    taskId,
    `plan_task:${taskId}`,
    `path_task:${taskId}`,
  ];
}

export async function buildWorkspaceGraphContext(input: {
  userId?: string;
  taskId?: string;
  taskTitle?: string;
}): Promise<WorkspaceGraphContext> {
  const graph = input.userId ? await getGraphView(input.userId) : { nodes: [], edges: [] };
  const db = await loadDb();

  const normalizedTaskId =
    typeof input.taskId === "string" && input.taskId.trim() ? input.taskId.trim() : undefined;
  const normalizedTaskTitle =
    typeof input.taskTitle === "string" && input.taskTitle.trim()
      ? input.taskTitle.trim().toLowerCase()
      : undefined;

  let taskNode = normalizedTaskId
    ? graph.nodes.find((node) => createTaskNodeCandidates(normalizedTaskId).includes(node.id))
    : undefined;

  if (!taskNode && normalizedTaskId) {
    taskNode =
      graph.nodes.find((node) => node.id.endsWith(`:${normalizedTaskId}`)) ||
      graph.nodes.find((node) => node.id.includes(`:${normalizedTaskId}:`));
  }

  if (!taskNode && normalizedTaskTitle) {
    taskNode =
      graph.nodes.find((node) => node.label.toLowerCase() === normalizedTaskTitle) ||
      graph.nodes.find(
        (node) =>
          node.label.toLowerCase().includes(normalizedTaskTitle) ||
          normalizedTaskTitle.includes(node.label.toLowerCase())
      );
  }

  if (!taskNode && normalizedTaskId) {
    const planWithTask = db.plans.find((plan) =>
      plan.tasks.some((task) => task.taskId === normalizedTaskId)
    );
    const matchedTaskTitle = planWithTask?.tasks.find((task) => task.taskId === normalizedTaskId)?.title;

    if (matchedTaskTitle) {
      const loweredMatchedTitle = matchedTaskTitle.trim().toLowerCase();
      taskNode =
        graph.nodes.find((node) => node.label.toLowerCase() === loweredMatchedTitle) ||
        graph.nodes.find(
          (node) =>
            node.label.toLowerCase().includes(loweredMatchedTitle) ||
            loweredMatchedTitle.includes(node.label.toLowerCase())
        );
    }
  }

  if (!taskNode && normalizedTaskId) {
    const syncedPathTask = db.syncedPaths
      .flatMap((path) => path.tasks)
      .find((task) => task.taskId === normalizedTaskId);

    if (syncedPathTask?.title) {
      const loweredMatchedTitle = syncedPathTask.title.trim().toLowerCase();
      taskNode =
        graph.nodes.find((node) => node.label.toLowerCase() === loweredMatchedTitle) ||
        graph.nodes.find(
          (node) =>
            node.label.toLowerCase().includes(loweredMatchedTitle) ||
            loweredMatchedTitle.includes(node.label.toLowerCase())
        );
    }
  }

  if (!taskNode) {
    return {
      taskNode: null,
      relatedNodes: [],
      relatedEdges: [],
    };
  }

  const nodeSet = new Set<string>([taskNode.id]);
  const relatedEdges = graph.edges
    .filter((edge) => edge.source === taskNode.id || edge.target === taskNode.id)
    .slice(0, 20);

  for (const edge of relatedEdges) {
    nodeSet.add(edge.source);
    nodeSet.add(edge.target);
  }

  const relatedNodes = graph.nodes
    .filter((node) => nodeSet.has(node.id) && node.id !== taskNode.id)
    .slice(0, 12)
    .map((node) => ({
      id: node.id,
      label: node.label,
      domain: node.domain,
      mastery: node.mastery,
      risk: node.risk,
    }));

  return {
    taskNode: {
      id: taskNode.id,
      label: taskNode.label,
      domain: taskNode.domain,
      mastery: taskNode.mastery,
      risk: taskNode.risk,
    },
    relatedNodes,
    relatedEdges: relatedEdges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      weight: edge.weight,
    })),
  };
}

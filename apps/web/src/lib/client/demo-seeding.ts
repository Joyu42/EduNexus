import { goalStorage, type Goal } from "@/lib/goals/goal-storage";
import { pathStorage, type LearningPath } from "@/lib/client/path-storage";
import { getKGSyncService } from "@/lib/graph/kg-sync-service";
import type { GraphEdge, GraphNode } from "@/lib/graph/types";
import type { buildDemoStarterBundle } from "@/lib/client/demo-bootstrap";

type DemoBundle = ReturnType<typeof buildDemoStarterBundle>;

export type DemoSeedingAdapters = {
  getGoals: (userId: string) => Goal[];
  saveGoal: (userId: string, goal: Goal) => void;
  getPaths: (userId: string) => Promise<LearningPath[]>;
  createPath: (userId: string, path: LearningPath) => Promise<void>;
  updatePath: (userId: string, id: string, path: LearningPath) => Promise<void>;
  getGraphNodes: (userId: string) => Promise<GraphNode[]>;
  upsertGraphNode: (userId: string, node: GraphNode) => Promise<void>;
  getGraphEdges: (userId: string) => Promise<Array<GraphEdge & { id: string }>>;
  upsertGraphEdge: (userId: string, edge: GraphEdge & { id: string }) => Promise<void>;
};

async function defaultGetGraphNodes(): Promise<GraphNode[]> {
  const service = getKGSyncService();
  return service.getAllNodes();
}

async function defaultUpsertGraphNode(node: GraphNode): Promise<void> {
  const service = getKGSyncService();
  await service.upsertNode(node);
}

async function defaultGetGraphEdges(): Promise<Array<GraphEdge & { id: string }>> {
  const service = getKGSyncService();
  const edges = await service.getAllEdges();
  return edges.map((edge, index) => ({
    ...edge,
    id: `edge_${typeof edge.source === "string" ? edge.source : edge.source.id}_${typeof edge.target === "string" ? edge.target : edge.target.id}_${index}`
  }));
}

async function defaultUpsertGraphEdge(edge: GraphEdge & { id: string }): Promise<void> {
  const service = getKGSyncService();
  await service.upsertEdge(edge);
}

function getDefaultAdapters(): DemoSeedingAdapters {
  return {
    getGoals: () => goalStorage.getGoals(),
    saveGoal: (_userId, goal) => {
      goalStorage.saveGoal(goal);
    },
    getPaths: async () => pathStorage.getAllPaths(),
    createPath: async (_userId, path) => {
      await pathStorage.createPath(path);
    },
    updatePath: async (_userId, id, path) => {
      await pathStorage.updatePath(id, path);
    },
    getGraphNodes: async () => defaultGetGraphNodes(),
    upsertGraphNode: async (_userId, node) => {
      await defaultUpsertGraphNode(node);
    },
    getGraphEdges: async () => defaultGetGraphEdges(),
    upsertGraphEdge: async (_userId, edge) => {
      await defaultUpsertGraphEdge(edge);
    }
  };
}

export async function seedDemoContentBundle(
  userId: string,
  bundle: DemoBundle,
  adapters: DemoSeedingAdapters = getDefaultAdapters()
): Promise<void> {
  const existingGoals = adapters.getGoals(userId);
  const existingGoalIds = new Set(existingGoals.map((goal) => goal.id));
  for (const goal of bundle.goals) {
    adapters.saveGoal(userId, {
      ...goal,
      linkedPathIds: [...goal.linkedPathIds]
    });
    existingGoalIds.add(goal.id);
  }

  const existingPaths = await adapters.getPaths(userId);
  const pathIdMap = new Map(existingPaths.map((path) => [path.id, path]));
  for (const path of bundle.paths) {
    const existing = pathIdMap.get(path.id);
    if (existing) {
      await adapters.updatePath(userId, path.id, {
        ...path,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: path.updatedAt,
        tasks: path.tasks,
        milestones: path.milestones
      });
      continue;
    }
    await adapters.createPath(userId, path);
  }

  const existingGraphNodes = await adapters.getGraphNodes(userId);
  const existingGraphNodeIds = new Set(existingGraphNodes.map((node) => node.id));
  for (const node of bundle.graph.nodes) {
    await adapters.upsertGraphNode(userId, node);
    existingGraphNodeIds.add(node.id);
  }

  const existingGraphEdges = await adapters.getGraphEdges(userId);
  const existingGraphEdgeIds = new Set(existingGraphEdges.map((edge) => edge.id));
  for (const edge of bundle.graph.edges) {
    await adapters.upsertGraphEdge(userId, edge);
    existingGraphEdgeIds.add(edge.id);
  }
}

import { prisma } from './prisma';
import { loadDb, projectLearningPackCompatibilityPath } from './store';
import { getPackById, getPacksByUser } from './learning-pack-store';

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
  documentIds: string[];
};

export type WorkspaceGraphView = {
  nodes: WorkspaceGraphNode[];
  edges: GraphEdge[];
  /** The packId that was used to produce this view, if any */
  packId?: string;
  /** True when packId was explicitly requested but the pack does not exist */
  packMissing?: boolean;
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

function collectPackBackedPathIds(packs: Array<{ packId: string }>): Set<string> {
  return new Set(packs.map((pack) => pack.packId));
}

function filterLegacyPaths(paths: unknown[], packBackedPathIds: Set<string>): unknown[] {
  return paths.filter((path) => {
    if (!isRecord(path)) {
      return true;
    }

    const pathId = typeof path.pathId === "string" ? path.pathId : "";
    return !pathId || !packBackedPathIds.has(pathId);
  });
}

function projectPackCompatibilityPaths(
  packs: Array<{ packId: string; userId: string; title: string; topic: string; modules: Array<{ moduleId: string; title: string; kbDocumentId: string; order: number }> }>
): unknown[] {
  return packs.map((pack) => projectLearningPackCompatibilityPath(pack as never));
}

function buildPackCompatibilityPathMembershipMap(
  packs: Array<{ packId: string; title: string; modules: Array<{ moduleId: string; title: string; kbDocumentId: string; order: number }> }>
): Map<string, PathMembership[]> {
  const membershipMap = new Map<string, PathMembership[]>();

  for (const pack of packs) {
    const compatibilityPath = projectLearningPackCompatibilityPath(pack as never);
    for (const [index, task] of compatibilityPath.tasks.entries()) {
      const docId = task.documentBinding?.documentId?.trim() ?? "";
      if (!docId) continue;

      if (!membershipMap.has(docId)) {
        membershipMap.set(docId, []);
      }

      membershipMap.get(docId)?.push({
        pathId: pack.packId,
        pathName: pack.title,
        stage: compatibilityPath.pathId,
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

function collectPathNodeSequence(path: Record<string, unknown>, existingNodeIds: Set<string>): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  const stages = Array.isArray(path.stages) ? path.stages : [];
  if (stages.length > 0) {
    for (const stageItem of stages) {
      if (!isRecord(stageItem)) continue;
      const nodeIds = Array.isArray(stageItem.nodeIds)
        ? stageItem.nodeIds.filter((nodeId): nodeId is string => typeof nodeId === "string")
        : [];

      for (const nodeId of nodeIds) {
        if (!existingNodeIds.has(nodeId) || seen.has(nodeId)) {
          continue;
        }
        seen.add(nodeId);
        result.push(nodeId);
      }
    }
  }

  if (result.length > 0) {
    return result;
  }

  const tasks = Array.isArray(path.tasks) ? path.tasks : [];
  for (const task of tasks) {
    if (!isRecord(task) || typeof task.taskId !== "string") {
      continue;
    }
    const nodeId = task.taskId.trim();
    if (!nodeId || !existingNodeIds.has(nodeId) || seen.has(nodeId)) {
      continue;
    }
    seen.add(nodeId);
    result.push(nodeId);
  }

  return result;
}

function buildPathEdges(userPaths: unknown[], existingNodeIds: Set<string>): GraphEdge[] {
  const edgeMap = new Map<string, GraphEdge>();

  for (const path of userPaths) {
    if (!isRecord(path)) {
      continue;
    }

    const sequence = collectPathNodeSequence(path, existingNodeIds);
    for (let i = 0; i < sequence.length - 1; i += 1) {
      const source = sequence[i];
      const target = sequence[i + 1];
      if (!source || !target || source === target) {
        continue;
      }

      const key = `${source}->${target}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { source, target, weight: 0.7 });
      }
    }
  }

  return Array.from(edgeMap.values());
}

function buildLearningPackEdges(
  packs: Array<{ packId: string; modules: Array<{ moduleId: string; kbDocumentId: string; order: number }> }>,
  existingNodeIds: Set<string>
): GraphEdge[] {
  const edgeMap = new Map<string, GraphEdge>();

  for (const pack of packs) {
    const orderedNodeIds = pack.modules
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((module) => {
        const docId = module.kbDocumentId?.trim();
        return docId?.length ? docId : `lp_task:${pack.packId}:${module.moduleId}`;
      })
      .filter((nodeId) => nodeId.length > 0);

    for (let index = 0; index < orderedNodeIds.length - 1; index += 1) {
      const source = orderedNodeIds[index];
      const target = orderedNodeIds[index + 1];
      if (!source || !target || source === target) {
        continue;
      }

      const key = `${source}->${target}`;
      if (!edgeMap.has(key)) {
        edgeMap.set(key, { source, target, weight: 0.9 });
      }
    }
  }

  return Array.from(edgeMap.values());
}

export async function getGraphView(userId: string, input?: { domain?: string; packId?: string }): Promise<WorkspaceGraphView>;
export async function getGraphView(input?: { domain?: string; owner?: string; packId?: string }): Promise<WorkspaceGraphView>;
export async function getGraphView(
  arg1?: string | { domain?: string; owner?: string; packId?: string },
  arg2?: { domain?: string; packId?: string }
): Promise<WorkspaceGraphView> {
  const userId = typeof arg1 === 'string' ? arg1 : arg1?.owner;
  const domain = typeof arg1 === 'string' ? arg2?.domain : arg1?.domain;
  const packId = typeof arg1 === 'string' ? arg2?.packId : arg1?.packId;

  if (!userId) {
    return { nodes: [], edges: [] };
  }

  if (packId) {
    const pack = await getPackById(packId, userId);
    if (!pack) {
      return { nodes: [], edges: [], packId, packMissing: true };
    }

    const orderedModules = pack.modules
      .slice()
      .sort((a, b) => a.order - b.order);

    const packDocIds = orderedModules
      .map((m) => m.kbDocumentId)
      .filter((id): id is string => id.length > 0);

    const packDocs =
      packDocIds.length > 0
        ? await prisma.document.findMany({
            where: { id: { in: packDocIds }, authorId: userId },
          })
        : [];

    const packDocsById = new Map(packDocs.map((doc) => [doc.id, doc]));
    const db = await loadDb();
    const userPaths = db.syncedPaths.filter((p) => p.userId === userId);
    const packBackedPathIds = collectPackBackedPathIds([pack]);
    const legacyUserPaths = filterLegacyPaths(userPaths, packBackedPathIds);
    const pathMembershipMap = buildPathMembershipMap(legacyUserPaths);
    const packCompatibilityMembershipMap = buildPackCompatibilityPathMembershipMap([pack]);
    const needsReviewSet = new Set(db.needsReviewNodes ?? []);

    const moduleNodeIdMap = new Map<string, string>();
    const nodes: WorkspaceGraphNode[] = orderedModules.map((module) => {
      const linkedDocId = module.kbDocumentId.trim();
      const linkedDoc = linkedDocId ? packDocsById.get(linkedDocId) : undefined;
      const nodeId = linkedDoc?.id ?? `pack:${pack.packId}:${module.moduleId}`;
      moduleNodeIdMap.set(module.moduleId, nodeId);

      const masteryKey = linkedDoc?.id ?? module.moduleId;
      const mastery = db.masteryByNode[masteryKey] ?? 0;
      const pathMemberships = linkedDoc
        ? [...(pathMembershipMap.get(linkedDoc.id) ?? []), ...(packCompatibilityMembershipMap.get(linkedDoc.id) ?? [])]
        : [];
      const kbDocumentId = linkedDoc?.id ?? linkedDocId;
      const documentIds = linkedDoc?.id ? [linkedDoc.id] : [];

      return {
        id: nodeId,
        label: linkedDoc?.title ?? module.title,
        mastery,
        risk: 0.5,
        domain: pack.topic,
        masteryStage: deriveMasteryStage(mastery),
        needsReview: needsReviewSet.has(masteryKey),
        pathMemberships,
        category: pack.topic,
        kbDocumentId,
        documentIds,
      };
    });

    const edges: GraphEdge[] = [];
    for (let index = 0; index < orderedModules.length - 1; index += 1) {
      const source = moduleNodeIdMap.get(orderedModules[index]?.moduleId);
      const target = moduleNodeIdMap.get(orderedModules[index + 1]?.moduleId);
      if (!source || !target || source === target) {
        continue;
      }
      edges.push({ source, target, weight: 0.9 });
    }

    return { nodes, edges, packId };
  }

  const db = await loadDb();
  const userPaths = db.syncedPaths.filter((path) => path.userId === userId);
  const packs = await getPacksByUser(userId);
  const packBackedPathIds = collectPackBackedPathIds(packs);
  const legacyUserPaths = filterLegacyPaths(userPaths, packBackedPathIds);
  const packCompatibilityPaths = projectPackCompatibilityPaths(packs);
  const pathMembershipMap = buildPathMembershipMap(legacyUserPaths);
  const packCompatibilityMembershipMap = buildPackCompatibilityPathMembershipMap(packs);
  const needsReviewSet = new Set(db.needsReviewNodes ?? []);

  const documents = await prisma.document.findMany({
    where: { authorId: userId },
    take: MAX_NODES_PER_USER,
    orderBy: { updatedAt: 'desc' },
  });

  const contentNodes: WorkspaceGraphNode[] = documents.map((doc) => {
    const mastery = db.masteryByNode[doc.id] ?? 0;
    const domainValue = "general";
    const pathMemberships = [
      ...(pathMembershipMap.get(doc.id) ?? []),
      ...(packCompatibilityMembershipMap.get(doc.id) ?? []),
    ];
    const category = resolveNodeCategory({
      defaultDomain: domainValue,
      pathMemberships,
      userPaths: [...legacyUserPaths, ...packCompatibilityPaths],
    });

    return {
      id: doc.id,
      label: doc.title,
      mastery,
      risk: 0.5,
      domain: domainValue,
      masteryStage: deriveMasteryStage(mastery),
      needsReview: needsReviewSet.has(doc.id),
      pathMemberships,
      category,
      kbDocumentId: doc.id,
      documentIds: [doc.id],
    };
  });

  // Add learning pack task nodes as graph nodes (even without kbDocumentId)
  const packTaskNodes: WorkspaceGraphNode[] = [];
  for (const pack of packs) {
    for (const module of pack.modules) {
      const docId = module.kbDocumentId?.trim();
      if (!docId?.length) {
        const nodeId = `lp_task:${pack.packId}:${module.moduleId}`;
        const membership = packCompatibilityMembershipMap.get(nodeId) ?? [];
        packTaskNodes.push({
          id: nodeId,
          label: module.title,
          mastery: 0,
          risk: 0.5,
          domain: pack.topic,
          masteryStage: "seen",
          needsReview: false,
          pathMemberships: membership,
          category: pack.topic,
          kbDocumentId: "",
          documentIds: [],
        });
      }
    }
  }

  const allNodes = [...contentNodes, ...packTaskNodes];
  const existingNodeIds = new Set(allNodes.map((node) => node.id));
  const pathEdges = buildPathEdges(legacyUserPaths, existingNodeIds);
  const learningPackEdges = buildLearningPackEdges(packs, existingNodeIds);

  const mergedEdgesByKey = new Map<string, GraphEdge>();
  for (const edge of [...pathEdges, ...learningPackEdges]) {
    const key = `${edge.source}->${edge.target}`;
    const existing = mergedEdgesByKey.get(key);
    if (!existing || edge.weight > existing.weight) {
      mergedEdgesByKey.set(key, edge);
    }
  }
  const edges = Array.from(mergedEdgesByKey.values());

  return {
    nodes: domain ? allNodes.filter((node) => node.domain === domain) : allNodes,
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

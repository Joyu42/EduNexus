// 布局算法

import type { GraphNode, GraphEdge, LayoutType } from "./types";

function stableUnitHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 1_000_000) / 1_000_000;
}

type HexCoord = { q: number; r: number };

function hexRing(radius: number): HexCoord[] {
  if (radius <= 0) {
    return [{ q: 0, r: 0 }];
  }

  const directions = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
  ];

  let q = directions[4].q * radius;
  let r = directions[4].r * radius;
  const results: HexCoord[] = [];

  for (let side = 0; side < 6; side += 1) {
    const dir = directions[side];
    for (let step = 0; step < radius; step += 1) {
      results.push({ q, r });
      q += dir.q;
      r += dir.r;
    }
  }

  return results;
}

function hexSpiral(count: number): HexCoord[] {
  if (count <= 0) {
    return [];
  }

  const coords: HexCoord[] = [{ q: 0, r: 0 }];
  for (let radius = 1; coords.length < count; radius += 1) {
    coords.push(...hexRing(radius));
  }
  return coords.slice(0, count);
}

function axialToXY(coord: HexCoord, spacing: number): { x: number; y: number } {
  const x = spacing * (Math.sqrt(3) * coord.q + (Math.sqrt(3) / 2) * coord.r);
  const y = spacing * ((3 / 2) * coord.r);
  return { x, y };
}

export class LayoutAlgorithms {
  /**
   * 力导向布局（默认）
   */
  static forceDirected(
    nodes: GraphNode[],
    edges: GraphEdge[]
  ): GraphNode[] {
    const hasPathMemberships = nodes.some(
      (node) => Array.isArray(node.pathMemberships) && node.pathMemberships.length > 0
    );
    if (hasPathMemberships) {
      return this.radial(nodes, edges);
    }

    // react-force-graph 会自动处理力导向布局
    // 这里只需要返回节点，不需要手动计算位置
    return nodes;
  }

  /**
   * 层次布局
   */
  static hierarchical(
    nodes: GraphNode[],
    edges: GraphEdge[]
  ): GraphNode[] {
    // 计算每个节点的层级
    const levels = new Map<string, number>();
    const visited = new Set<string>();

    // 找到根节点（没有入边的节点）
    const inDegree = new Map<string, number>();
    nodes.forEach((n) => inDegree.set(n.id, 0));
    edges.forEach((e) => {
      const targetId = typeof e.target === "string" ? e.target : e.target.id;
      inDegree.set(targetId, (inDegree.get(targetId) || 0) + 1);
    });

    const roots = nodes.filter((n) => inDegree.get(n.id) === 0);

    // BFS 分配层级
    const queue: Array<{ nodeId: string; level: number }> = roots.map((n) => ({
      nodeId: n.id,
      level: 0,
    }));

    while (queue.length > 0) {
      const { nodeId, level } = queue.shift()!;
      if (visited.has(nodeId)) continue;

      visited.add(nodeId);
      levels.set(nodeId, level);

      // 找到所有子节点
      const children = edges
        .filter((e) => {
          const sourceId =
            typeof e.source === "string" ? e.source : e.source.id;
          return sourceId === nodeId;
        })
        .map((e) => (typeof e.target === "string" ? e.target : e.target.id));

      children.forEach((childId) => {
        if (!visited.has(childId)) {
          queue.push({ nodeId: childId, level: level + 1 });
        }
      });
    }

    // 计算每层的节点数量
    const levelCounts = new Map<number, number>();
    levels.forEach((level) => {
      levelCounts.set(level, (levelCounts.get(level) || 0) + 1);
    });

    // 分配位置
    const levelIndices = new Map<number, number>();
    const width = 1200;
    const height = 800;
    const levelHeight = height / (Math.max(...levels.values()) + 1);

    return nodes.map((node) => {
      const level = levels.get(node.id) || 0;
      const levelCount = levelCounts.get(level) || 1;
      const index = levelIndices.get(level) || 0;
      levelIndices.set(level, index + 1);

      return {
        ...node,
        fx: (width / (levelCount + 1)) * (index + 1) - width / 2,
        fy: level * levelHeight - height / 2,
      };
    });
  }

  /**
   * 径向布局
   */
  static radial(
    nodes: GraphNode[],
    edges: GraphEdge[],
    centerNodeId?: string
  ): GraphNode[] {
    const nodesWithPaths = nodes.filter(
      (node) => Array.isArray(node.pathMemberships) && node.pathMemberships.length > 0
    );
    if (nodesWithPaths.length > 0) {
      const pathIdSet = new Set<string>();
      for (const node of nodesWithPaths) {
        for (const membership of node.pathMemberships ?? []) {
          if (membership && typeof membership.pathId === "string" && membership.pathId.trim()) {
            pathIdSet.add(membership.pathId.trim());
          }
        }
      }

      const pathIds = Array.from(pathIdSet).sort((a, b) => a.localeCompare(b));
      const regionCount = pathIds.length;
      const regionRadius = Math.min(520, 220 + regionCount * 18);

      const regionCenters = new Map<string, { x: number; y: number }>();
      for (const [index, pathId] of pathIds.entries()) {
        const angle = (2 * Math.PI * index) / Math.max(1, regionCount);
        regionCenters.set(pathId, {
          x: Math.cos(angle) * regionRadius,
          y: Math.sin(angle) * regionRadius,
        });
      }

      const primaryRegionByNodeId = new Map<string, string>();
      const sharedRegionIdsByNodeId = new Map<string, string[]>();
      for (const node of nodes) {
        const memberships = Array.isArray(node.pathMemberships) ? node.pathMemberships : [];
        const distinct = Array.from(
          new Set(
            memberships
              .map((m) => (m && typeof m.pathId === "string" ? m.pathId.trim() : ""))
              .filter((id) => id.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b));

        if (distinct.length === 0) {
          continue;
        }

        primaryRegionByNodeId.set(node.id, distinct[0]);
        if (distinct.length > 1) {
          sharedRegionIdsByNodeId.set(node.id, distinct);
        }
      }

      const nodesByRegion = new Map<string, GraphNode[]>();
      for (const node of nodes) {
        const regionId = primaryRegionByNodeId.get(node.id);
        if (!regionId) {
          continue;
        }
        if (!nodesByRegion.has(regionId)) {
          nodesByRegion.set(regionId, []);
        }
        nodesByRegion.get(regionId)?.push(node);
      }

      const spacing = Math.max(60, 44 + (nodes.length - 10) * 2);
      const positionsById = new Map<string, { fx: number; fy: number }>();

      for (const [pathId, regionNodes] of nodesByRegion.entries()) {
        const center = regionCenters.get(pathId) ?? { x: 0, y: 0 };
        const sortedNodes = regionNodes.slice().sort((a, b) => a.id.localeCompare(b.id));
        const coords = hexSpiral(sortedNodes.length);
        for (const [idx, node] of sortedNodes.entries()) {
          const local = axialToXY(coords[idx] ?? { q: 0, r: 0 }, spacing);
          positionsById.set(node.id, { fx: center.x + local.x, fy: center.y + local.y });
        }
      }

      for (const [nodeId, regionIds] of sharedRegionIdsByNodeId.entries()) {
        const a = regionCenters.get(regionIds[0] ?? "");
        const b = regionCenters.get(regionIds[1] ?? "");
        if (!a || !b) {
          continue;
        }
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const jitter = (stableUnitHash(nodeId) - 0.5) * spacing * 1.2;
        positionsById.set(nodeId, { fx: midX + nx * jitter, fy: midY + ny * jitter });
      }

      const unassigned = nodes
        .filter((node) => !primaryRegionByNodeId.has(node.id))
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id));
      const unassignedCoords = hexSpiral(unassigned.length);
      for (const [idx, node] of unassigned.entries()) {
        const local = axialToXY(unassignedCoords[idx] ?? { q: 0, r: 0 }, spacing);
        positionsById.set(node.id, { fx: local.x * 0.9, fy: local.y * 0.9 });
      }

      return nodes.map((node) => {
        const pos = positionsById.get(node.id);
        if (!pos) {
          return node;
        }
        return {
          ...node,
          fx: pos.fx,
          fy: pos.fy,
        };
      });
    }

    // 找到中心节点（最重要的节点或指定节点）
    const centerNode = centerNodeId
      ? nodes.find((n) => n.id === centerNodeId)
      : nodes.reduce((max, n) => (n.importance > max.importance ? n : max));

    if (!centerNode) return nodes;

    // 计算每个节点到中心的距离
    const distances = new Map<string, number>();
    distances.set(centerNode.id, 0);

    const queue: string[] = [centerNode.id];
    const visited = new Set<string>([centerNode.id]);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentDist = distances.get(currentId)!;

      // 找到所有相邻节点
      const neighbors = edges
        .filter((e) => {
          const sourceId =
            typeof e.source === "string" ? e.source : e.source.id;
          const targetId =
            typeof e.target === "string" ? e.target : e.target.id;
          return sourceId === currentId || targetId === currentId;
        })
        .map((e) => {
          const sourceId =
            typeof e.source === "string" ? e.source : e.source.id;
          const targetId =
            typeof e.target === "string" ? e.target : e.target.id;
          return sourceId === currentId ? targetId : sourceId;
        });

      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          distances.set(neighborId, currentDist + 1);
          queue.push(neighborId);
        }
      }
    }

    // 按距离分组
    const layers = new Map<number, string[]>();
    distances.forEach((dist, nodeId) => {
      if (!layers.has(dist)) layers.set(dist, []);
      layers.get(dist)!.push(nodeId);
    });

    // 分配位置
    const maxRadius = 400;
    return nodes.map((node) => {
      const dist = distances.get(node.id) || 0;
      if (dist === 0) {
        return { ...node, fx: 0, fy: 0 };
      }

      const layer = layers.get(dist)!;
      const index = layer.indexOf(node.id);
      const angleStep = (2 * Math.PI) / layer.length;
      const angle = index * angleStep;
      const radius = (dist / Math.max(...distances.values())) * maxRadius;

      return {
        ...node,
        fx: Math.cos(angle) * radius,
        fy: Math.sin(angle) * radius,
      };
    });
  }

  /**
   * 时间轴布局
   */
  static timeline(nodes: GraphNode[]): GraphNode[] {
    // 按创建时间排序
    const sorted = [...nodes].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    const width = 1200;
    const height = 600;
    const xStep = width / (sorted.length + 1);

    return sorted.map((node, index) => ({
      ...node,
      fx: (index + 1) * xStep - width / 2,
      fy: (stableUnitHash(node.id) - 0.5) * height * 0.6,
    }));
  }

  /**
   * 同心圆布局
   */
  static concentric(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
    const degreeMap = new Map<string, number>();
    nodes.forEach((n) => degreeMap.set(n.id, 0));
    edges.forEach((e) => {
      const sourceId = typeof e.source === "string" ? e.source : e.source.id;
      const targetId = typeof e.target === "string" ? e.target : e.target.id;
      if (degreeMap.has(sourceId)) degreeMap.set(sourceId, degreeMap.get(sourceId)! + 1);
      if (degreeMap.has(targetId)) degreeMap.set(targetId, degreeMap.get(targetId)! + 1);
    });

    const sortedNodes = [...nodes].sort((a, b) => {
      const degA = degreeMap.get(a.id) || 0;
      const degB = degreeMap.get(b.id) || 0;
      return degB - degA;
    });

    const levels: GraphNode[][] = [];
    let currentLevel: GraphNode[] = [];
    let nodesInCurrentLevel = 1;
    let count = 0;

    for (const node of sortedNodes) {
      currentLevel.push(node);
      count++;
      if (count >= nodesInCurrentLevel) {
        levels.push(currentLevel);
        currentLevel = [];
        count = 0;
        nodesInCurrentLevel = Math.floor(nodesInCurrentLevel * 1.8) + 3;
      }
    }
    if (currentLevel.length > 0) {
      levels.push(currentLevel);
    }

    const radiusStep = 100;
    return nodes.map((node) => {
      let levelIndex = 0;
      let nodeIndexInLevel = 0;
      for (let i = 0; i < levels.length; i++) {
        const idx = levels[i].indexOf(node);
        if (idx !== -1) {
          levelIndex = i;
          nodeIndexInLevel = idx;
          break;
        }
      }

      if (levelIndex === 0 && levels[0].length === 1) {
        return { ...node, fx: 0, fy: 0 };
      }

      const radius = levelIndex * radiusStep + 20;
      const angleStep = (2 * Math.PI) / Math.max(1, levels[levelIndex].length);
      const angle = nodeIndexInLevel * angleStep;

      return {
        ...node,
        fx: Math.cos(angle) * radius,
        fy: Math.sin(angle) * radius,
      };
    });
  }

  /**
   * 应用布局
   */
  static applyLayout(
    nodes: GraphNode[],
    edges: GraphEdge[],
    layout: LayoutType,
    centerNodeId?: string
  ): GraphNode[] {
    switch (layout) {
      case "hierarchical":
        return this.hierarchical(nodes, edges);
      case "radial":
        return this.radial(nodes, edges, centerNodeId);
      case "timeline":
        return this.timeline(nodes);
      case "concentric":
        return this.concentric(nodes, edges);
      case "force":
      default:
        return this.forceDirected(nodes, edges);
    }
  }
}

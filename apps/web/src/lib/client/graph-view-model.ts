export type GraphViewNode = {
  id: string;
  label: string;
  domain?: string;
  mastery?: number;
  risk?: number;
};

export type GraphViewEdge = {
  source: string;
  target: string;
  weight?: number;
};

export type DomainBucket = {
  domain: string;
  count: number;
};

export type GraphNodePlacement = {
  id: string;
  label: string;
  domain: string;
  mastery: number;
  risk: number;
  degree: number;
  x: number;
  y: number;
  radius: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function resolveNodeDomain(node: GraphViewNode) {
  return node.domain?.trim() || "general";
}

export function resolveNodeMastery(node: GraphViewNode) {
  return clamp(node.mastery ?? 0.45, 0, 1);
}

export function resolveNodeRisk(node: GraphViewNode) {
  if (typeof node.risk === "number") {
    return clamp(node.risk, 0, 1);
  }
  return Number((1 - resolveNodeMastery(node)).toFixed(2));
}

export function buildNodeDegreeMap(nodes: GraphViewNode[], edges: GraphViewEdge[]) {
  const degrees = new Map<string, number>();
  for (const node of nodes) {
    degrees.set(node.id, 0);
  }
  for (const edge of edges) {
    if (degrees.has(edge.source)) {
      degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
    }
    if (degrees.has(edge.target)) {
      degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
    }
  }
  return degrees;
}

export function buildDomainBuckets(nodes: GraphViewNode[]): DomainBucket[] {
  const counter = new Map<string, number>();
  for (const node of nodes) {
    const domain = resolveNodeDomain(node);
    counter.set(domain, (counter.get(domain) ?? 0) + 1);
  }
  return Array.from(counter.entries())
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain));
}

export function rankHighRiskNodes(nodes: GraphViewNode[], limit = 6) {
  return [...nodes]
    .sort((a, b) => {
      const riskDiff = resolveNodeRisk(b) - resolveNodeRisk(a);
      if (riskDiff !== 0) {
        return riskDiff;
      }
      const masteryDiff = resolveNodeMastery(a) - resolveNodeMastery(b);
      if (masteryDiff !== 0) {
        return masteryDiff;
      }
      return a.label.localeCompare(b.label);
    })
    .slice(0, Math.max(1, limit));
}

type BuildGraphLayoutInput = {
  nodes: GraphViewNode[];
  edges: GraphViewEdge[];
  width: number;
  height: number;
  padding?: number;
};

export function buildGraphLayout(input: BuildGraphLayoutInput): GraphNodePlacement[] {
  if (input.nodes.length === 0) {
    return [];
  }

  const padding = input.padding ?? 26;
  const centerX = input.width / 2;
  const centerY = input.height / 2;
  const degreeMap = buildNodeDegreeMap(input.nodes, input.edges);
  const domainBuckets = buildDomainBuckets(input.nodes);
  const domainMap = new Map(
    input.nodes.map((node) => [node.id, resolveNodeDomain(node)])
  );

  const groupedNodes = domainBuckets.map((bucket) => ({
    domain: bucket.domain,
    nodes: input.nodes.filter((node) => domainMap.get(node.id) === bucket.domain)
  }));

  const placements: GraphNodePlacement[] = [];
  const orbitRadius =
    groupedNodes.length <= 1
      ? 0
      : Math.max(70, Math.min(input.width, input.height) * 0.29);

  groupedNodes.forEach((group, domainIndex) => {
    const domainAngle =
      groupedNodes.length <= 1
        ? 0
        : (-Math.PI / 2 + (Math.PI * 2 * domainIndex) / groupedNodes.length);
    const domainCenterX = centerX + Math.cos(domainAngle) * orbitRadius;
    const domainCenterY = centerY + Math.sin(domainAngle) * orbitRadius;
    const ringRadius = clamp(36 + group.nodes.length * 4.2, 34, 140);

    group.nodes.forEach((node, nodeIndex) => {
      const nodeAngle =
        group.nodes.length <= 1
          ? 0
          : (Math.PI * 2 * nodeIndex) / group.nodes.length + domainIndex * 0.42;
      const ringDepth = group.nodes.length <= 1 ? 0 : ringRadius * (0.7 + (nodeIndex % 3) * 0.14);
      const x = clamp(
        domainCenterX + Math.cos(nodeAngle) * ringDepth,
        padding,
        input.width - padding
      );
      const y = clamp(
        domainCenterY + Math.sin(nodeAngle) * ringDepth,
        padding,
        input.height - padding
      );
      const degree = degreeMap.get(node.id) ?? 0;
      const mastery = resolveNodeMastery(node);
      const risk = resolveNodeRisk(node);
      const radius = clamp(8 + degree * 1.05 + (1 - risk) * 5.8, 8, 22);

      placements.push({
        id: node.id,
        label: node.label,
        domain: group.domain,
        mastery,
        risk,
        degree,
        x,
        y,
        radius
      });
    });
  });

  return placements;
}

import { describe, expect, it } from "vitest";
import {
  buildDomainBuckets,
  buildGraphLayout,
  buildNodeDegreeMap,
  rankHighRiskNodes,
  resolveNodeRisk
} from "@/lib/client/graph-view-model";

describe("graph-view-model", () => {
  const nodes = [
    { id: "n1", label: "函数", domain: "math", mastery: 0.3 },
    { id: "n2", label: "数列", domain: "math", mastery: 0.62 },
    { id: "n3", label: "文言文", domain: "chinese", mastery: 0.56 },
    { id: "n4", label: "英语语法", domain: "english", mastery: 0.41 }
  ];
  const edges = [
    { source: "n1", target: "n2" },
    { source: "n1", target: "n3" },
    { source: "n2", target: "n4" }
  ];

  it("builds degree map from edges", () => {
    const degreeMap = buildNodeDegreeMap(nodes, edges);
    expect(degreeMap.get("n1")).toBe(2);
    expect(degreeMap.get("n2")).toBe(2);
    expect(degreeMap.get("n3")).toBe(1);
    expect(degreeMap.get("n4")).toBe(1);
  });

  it("builds domain buckets by count", () => {
    const buckets = buildDomainBuckets(nodes);
    expect(buckets[0]).toMatchObject({ domain: "math", count: 2 });
    expect(buckets).toHaveLength(3);
  });

  it("ranks high risk nodes", () => {
    const ranked = rankHighRiskNodes(nodes, 2);
    expect(ranked).toHaveLength(2);
    expect(ranked[0]?.id).toBe("n1");
    expect(resolveNodeRisk(ranked[0]!)).toBeGreaterThan(resolveNodeRisk(ranked[1]!));
  });

  it("builds node placements within bounds", () => {
    const placements = buildGraphLayout({
      nodes,
      edges,
      width: 920,
      height: 520
    });
    expect(placements).toHaveLength(nodes.length);
    for (const placement of placements) {
      expect(placement.x).toBeGreaterThanOrEqual(26);
      expect(placement.x).toBeLessThanOrEqual(894);
      expect(placement.y).toBeGreaterThanOrEqual(26);
      expect(placement.y).toBeLessThanOrEqual(494);
      expect(placement.radius).toBeGreaterThanOrEqual(8);
      expect(placement.radius).toBeLessThanOrEqual(22);
    }
  });
});

import { describe, expect, it } from "vitest";
import {
  appendGraphHistory,
  buildGraphHistoryDeltas,
  buildGraphHistorySnapshot,
  normalizeGraphHistoryPayload
} from "@/lib/client/graph-history";

describe("graph-history", () => {
  const nodes = [
    { id: "n1", label: "函数", domain: "math", mastery: 0.36 },
    { id: "n2", label: "数列", domain: "math", mastery: 0.62 },
    { id: "n3", label: "文言文", domain: "chinese", mastery: 0.56 }
  ];
  const edges = [{ source: "n1", target: "n2", weight: 1 }];

  it("builds snapshot metrics", () => {
    const snapshot = buildGraphHistorySnapshot({ nodes, edges });
    expect(snapshot.nodeCount).toBe(3);
    expect(snapshot.edgeCount).toBe(1);
    expect(snapshot.averageMastery).toBe(0.51);
    expect(snapshot.isolatedNodeCount).toBe(1);
  });

  it("appends history and deduplicates same signature", () => {
    const first = buildGraphHistorySnapshot({ nodes, edges });
    const second = buildGraphHistorySnapshot({ nodes, edges });
    const appended = appendGraphHistory([first], second, 12);
    expect(appended).toHaveLength(1);
    expect(appended[0]?.signature).toBe(first.signature);
  });

  it("normalizes history payload", () => {
    const snapshot = buildGraphHistorySnapshot({ nodes, edges });
    const normalized = normalizeGraphHistoryPayload([snapshot, { foo: "bar" }], 12);
    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.id).toBe(snapshot.id);
  });

  it("builds deltas from two snapshots", () => {
    const previous = buildGraphHistorySnapshot({ nodes, edges });
    const current = {
      ...buildGraphHistorySnapshot({
        nodes: [...nodes, { id: "n4", label: "英语语法", domain: "english", mastery: 0.45 }],
        edges: [...edges, { source: "n2", target: "n4", weight: 1 }]
      }),
      averageMastery: 0.5,
      highRiskCount: 2
    };
    const deltas = buildGraphHistoryDeltas(current, previous);
    expect(deltas.nodeDelta).toBe(1);
    expect(deltas.edgeDelta).toBe(1);
  });
});

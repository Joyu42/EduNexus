export type BridgeSortMode = "risk_desc" | "risk_asc" | "weight_desc";
export type BridgeRelationMode = "all" | "cross_priority" | "same_priority";
export type BridgeReplayMode = "focus" | "all";

export type BridgeRiskRowLike = {
  sourceDomain: string;
  targetDomain: string;
  risk: number;
  weight: number;
};

export type BridgeHistoryEntryLike = {
  id: string;
};

export type BridgeHistorySnapshotLike<TEntry extends BridgeHistoryEntryLike> = {
  id: string;
  at: string;
  bridges: TEntry[];
};

export type BridgeReplayFrame<TEntry extends BridgeHistoryEntryLike> = {
  snapshotId: string;
  at: string;
  bridge: TEntry;
};

export function isCrossDomainBridge(row: BridgeRiskRowLike) {
  return row.sourceDomain !== row.targetDomain;
}

function compareBySortMode(
  a: BridgeRiskRowLike,
  b: BridgeRiskRowLike,
  sortMode: BridgeSortMode
) {
  if (sortMode === "risk_asc") {
    return a.risk - b.risk;
  }
  if (sortMode === "weight_desc") {
    return b.weight - a.weight || b.risk - a.risk;
  }
  return b.risk - a.risk || b.weight - a.weight;
}

export function sortBridgeRiskRows<T extends BridgeRiskRowLike>(
  rows: T[],
  sortMode: BridgeSortMode,
  relationMode: BridgeRelationMode
) {
  const baseSorted = [...rows].sort((a, b) => compareBySortMode(a, b, sortMode));
  if (relationMode === "all") {
    return baseSorted;
  }
  return baseSorted.sort((a, b) => {
    const rankA = isCrossDomainBridge(a) ? 1 : 0;
    const rankB = isCrossDomainBridge(b) ? 1 : 0;
    if (relationMode === "cross_priority") {
      return rankB - rankA;
    }
    return rankA - rankB;
  });
}

export function buildBridgeReplayFrames<TEntry extends BridgeHistoryEntryLike>(
  history: Array<BridgeHistorySnapshotLike<TEntry>>,
  options: {
    mode: BridgeReplayMode;
    targetBridgeId: string;
    focusLimit?: number;
    allLimit?: number;
  }
): Array<BridgeReplayFrame<TEntry>> {
  if (options.mode === "all") {
    const allFrames = history.flatMap((item) =>
      item.bridges.map((bridge) => ({
        snapshotId: item.id,
        at: item.at,
        bridge
      }))
    );
    return allFrames.slice(0, Math.max(1, options.allLimit ?? 18));
  }

  const frames = history
    .map((item) => {
      const matched = item.bridges.find((bridge) => bridge.id === options.targetBridgeId);
      const fallback = item.bridges[0];
      const bridge = matched ?? fallback;
      if (!bridge) {
        return null;
      }
      return {
        snapshotId: item.id,
        at: item.at,
        bridge
      };
    })
    .filter((item): item is BridgeReplayFrame<TEntry> => item !== null);

  return frames.slice(0, Math.max(1, options.focusLimit ?? 8));
}

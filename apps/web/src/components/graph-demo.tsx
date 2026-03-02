"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatErrorMessage, requestJson } from "@/lib/client/api";
import {
  clearGraphActivityFocusIdFromStorage,
  GRAPH_ACTIVITY_STORAGE_KEY,
  normalizeGraphActivityPayload,
  readGraphActivityFocusIdFromStorage,
  resolveGraphActivityRiskScore,
  type GraphActivityEvent
} from "@/lib/client/graph-activity";
import {
  appendGraphHistory,
  buildGraphHistoryDeltas,
  buildGraphHistorySnapshot,
  normalizeGraphHistoryPayload,
  type GraphHistorySnapshot
} from "@/lib/client/graph-history";
import {
  clearGraphFocusNodeFromStorage,
  readGraphFocusNodeFromStorage
} from "@/lib/client/graph-focus-bridge";
import {
  buildDomainBuckets,
  buildGraphLayout,
  rankHighRiskNodes,
  resolveNodeRisk,
  type GraphNodePlacement,
  type GraphViewEdge,
  type GraphViewNode
} from "@/lib/client/graph-view-model";
import {
  writePathFocusToStorage,
  writeWorkspaceFocusToStorage
} from "@/lib/client/path-focus-bridge";
import {
  buildBridgeReplayFrames,
  type BridgeReplayMode
} from "@/lib/client/bridge-insight";

const GRAPH_CANVAS_WIDTH = 920;
const GRAPH_CANVAS_HEIGHT = 520;
const GRAPH_HISTORY_STORAGE_KEY = "edunexus_graph_history_timeline";
const GRAPH_HISTORY_LIMIT = 10;
const GRAPH_HEATMAP_ENABLED_STORAGE_KEY = "edunexus_graph_heatmap_enabled";
const GRAPH_RISK_THRESHOLD_STORAGE_KEY = "edunexus_graph_risk_threshold";
const GRAPH_BRIDGE_HISTORY_STORAGE_KEY = "edunexus_graph_bridge_history_timeline";
const GRAPH_BRIDGE_HISTORY_LIMIT = 14;

type GraphNode = GraphViewNode;
type GraphEdge = GraphViewEdge;

type GraphPayload = {
  nodes: GraphNode[];
  edges: GraphEdge[];
};

type DomainClusterSummary = {
  domain: string;
  nodeCount: number;
  relationCount: number;
  averageRisk: number;
  averageMastery: number;
  highRiskCount: number;
};

type RiskBridgeSuggestion = {
  id: string;
  source: GraphNodePlacement;
  target: GraphNodePlacement;
  primary: GraphNodePlacement;
  secondary: GraphNodePlacement;
  risk: number;
  weight: number;
  summary: string;
};

type BridgeHistoryEntry = {
  id: string;
  sourceLabel: string;
  targetLabel: string;
  risk: number;
  weight: number;
};

type BridgeHistorySnapshot = {
  id: string;
  at: string;
  signature: string;
  bridges: BridgeHistoryEntry[];
};

function resolveRiskTone(risk: number) {
  if (risk >= 0.65) {
    return "high";
  }
  if (risk >= 0.45) {
    return "medium";
  }
  return "low";
}

function toPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value: string) {
  try {
    return new Date(value).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return value;
  }
}

function formatDelta(value: number, options?: { precision?: number; suffix?: string }) {
  if (value === 0) {
    return "0";
  }
  const precision = options?.precision ?? 0;
  const suffix = options?.suffix ?? "";
  const raw = value.toFixed(precision);
  return `${value > 0 ? "+" : ""}${raw}${suffix}`;
}

function resolveActivityRiskTone(risk: number) {
  if (risk >= 0.65) {
    return "high";
  }
  if (risk >= 0.45) {
    return "medium";
  }
  return "low";
}

function buildEdgeKey(sourceId: string, targetId: string) {
  return sourceId < targetId
    ? `${sourceId}__${targetId}`
    : `${targetId}__${sourceId}`;
}

function buildBridgeTaskTemplate(primaryLabel: string, secondaryLabel: string) {
  return `桥接任务模板：围绕「${primaryLabel}」与「${secondaryLabel}」先做概念映射，再完成“同构例题 + 反例辨析 + 迁移应用”三段训练。`;
}

function buildBridgeHistorySignature(entries: BridgeHistoryEntry[]) {
  if (entries.length === 0) {
    return "empty";
  }
  return entries
    .map((item) => `${item.id}:${item.risk.toFixed(2)}:${item.weight.toFixed(2)}`)
    .join("|");
}

function normalizeBridgeHistoryPayload(
  payload: unknown,
  limit: number
): BridgeHistorySnapshot[] {
  if (!Array.isArray(payload)) {
    return [];
  }
  return payload
    .filter((item): item is BridgeHistorySnapshot => {
      if (!item || typeof item !== "object") {
        return false;
      }
      const value = item as {
        id?: unknown;
        at?: unknown;
        signature?: unknown;
        bridges?: unknown;
      };
      return (
        typeof value.id === "string" &&
        typeof value.at === "string" &&
        typeof value.signature === "string" &&
        Array.isArray(value.bridges)
      );
    })
    .slice(0, Math.max(1, limit));
}

export function GraphDemo() {
  const router = useRouter();
  const [payload, setPayload] = useState<GraphPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [domainFilter, setDomainFilter] = useState("all");
  const [nodeKeyword, setNodeKeyword] = useState("");
  const [activeNodeId, setActiveNodeId] = useState("");
  const [graphHistory, setGraphHistory] = useState<GraphHistorySnapshot[]>([]);
  const [graphActivities, setGraphActivities] = useState<GraphActivityEvent[]>([]);
  const [focusedActivityId, setFocusedActivityId] = useState("");
  const [selectedBridgeId, setSelectedBridgeId] = useState("");
  const [bridgeHistory, setBridgeHistory] = useState<BridgeHistorySnapshot[]>([]);
  const [bridgeReplayMode, setBridgeReplayMode] = useState<BridgeReplayMode>("focus");
  const [bridgeReplayNodeFilter, setBridgeReplayNodeFilter] = useState("all");
  const [riskThresholdPercent, setRiskThresholdPercent] = useState(0);
  const [enableEdgeHeatmap, setEnableEdgeHeatmap] = useState(true);
  const [pathPushHint, setPathPushHint] = useState("");

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await requestJson<GraphPayload>("/api/graph/view");
      setPayload(data);
      setDomainFilter("all");
      setNodeKeyword("");
      const focusNodeId = readGraphFocusNodeFromStorage((key) =>
        window.localStorage.getItem(key)
      );
      if (focusNodeId) {
        const matchedNode = data.nodes.find((item) => item.id === focusNodeId);
        if (matchedNode) {
          setActiveNodeId(matchedNode.id);
          setDomainFilter(matchedNode.domain ?? "all");
        }
        clearGraphFocusNodeFromStorage((key) => window.localStorage.removeItem(key));
      }
      try {
        const rawActivities = window.localStorage.getItem(GRAPH_ACTIVITY_STORAGE_KEY);
        if (rawActivities) {
          const normalizedActivities = normalizeGraphActivityPayload(
            JSON.parse(rawActivities) as unknown,
            16
          );
          setGraphActivities(normalizedActivities);
          const focusActivityId = readGraphActivityFocusIdFromStorage((key) =>
            window.localStorage.getItem(key)
          );
          if (focusActivityId) {
            setFocusedActivityId(focusActivityId);
            const matchedEvent = normalizedActivities.find(
              (item) => item.id === focusActivityId
            );
            if (matchedEvent) {
              const matchedNode = data.nodes.find((item) => item.id === matchedEvent.nodeId);
              if (matchedNode) {
                setActiveNodeId(matchedNode.id);
                setDomainFilter(matchedNode.domain ?? "all");
              }
            }
            clearGraphActivityFocusIdFromStorage((key) =>
              window.localStorage.removeItem(key)
            );
          }
        }
      } catch {
        // ignore activity parse error
      }
    } catch (err) {
      setError(formatErrorMessage(err, "加载图谱失败。"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GRAPH_HISTORY_STORAGE_KEY);
      if (!raw) {
        setGraphHistory([]);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      setGraphHistory(normalizeGraphHistoryPayload(parsed, GRAPH_HISTORY_LIMIT));
    } catch {
      setGraphHistory([]);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GRAPH_BRIDGE_HISTORY_STORAGE_KEY);
      if (!raw) {
        setBridgeHistory([]);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      setBridgeHistory(
        normalizeBridgeHistoryPayload(parsed, GRAPH_BRIDGE_HISTORY_LIMIT)
      );
    } catch {
      setBridgeHistory([]);
    }
  }, []);

  useEffect(() => {
    const loadGraphActivities = () => {
      try {
        const raw = window.localStorage.getItem(GRAPH_ACTIVITY_STORAGE_KEY);
        if (!raw) {
          setGraphActivities([]);
          return;
        }
        const parsed = JSON.parse(raw) as unknown;
        setGraphActivities(normalizeGraphActivityPayload(parsed, 16));
      } catch {
        setGraphActivities([]);
      }
    };
    loadGraphActivities();
    window.addEventListener("focus", loadGraphActivities);
    return () => window.removeEventListener("focus", loadGraphActivities);
  }, []);

  useEffect(() => {
    try {
      const rawHeatmap = window.localStorage.getItem(GRAPH_HEATMAP_ENABLED_STORAGE_KEY);
      if (rawHeatmap === "0") {
        setEnableEdgeHeatmap(false);
      } else if (rawHeatmap === "1") {
        setEnableEdgeHeatmap(true);
      }
      const rawThreshold = window.localStorage.getItem(GRAPH_RISK_THRESHOLD_STORAGE_KEY);
      if (rawThreshold) {
        const parsed = Number(rawThreshold);
        if (Number.isFinite(parsed)) {
          setRiskThresholdPercent(Math.max(0, Math.min(80, Math.round(parsed))));
        }
      }
    } catch {
      // ignore storage read errors
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        GRAPH_HEATMAP_ENABLED_STORAGE_KEY,
        enableEdgeHeatmap ? "1" : "0"
      );
      window.localStorage.setItem(
        GRAPH_RISK_THRESHOLD_STORAGE_KEY,
        String(riskThresholdPercent)
      );
    } catch {
      // ignore storage write errors
    }
  }, [enableEdgeHeatmap, riskThresholdPercent]);

  useEffect(() => {
    if (!focusedActivityId) {
      return;
    }
    const exists = graphActivities.some((item) => item.id === focusedActivityId);
    if (!exists) {
      setFocusedActivityId("");
    }
  }, [focusedActivityId, graphActivities]);

  useEffect(() => {
    if (!payload) {
      return;
    }
    const snapshot = buildGraphHistorySnapshot({
      nodes: payload.nodes,
      edges: payload.edges
    });
    setGraphHistory((prev) => {
      const next = appendGraphHistory(prev, snapshot, GRAPH_HISTORY_LIMIT);
      try {
        window.localStorage.setItem(GRAPH_HISTORY_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore localStorage failures
      }
      return next;
    });
  }, [payload]);

  const domainBuckets = useMemo(
    () => buildDomainBuckets(payload?.nodes ?? []),
    [payload?.nodes]
  );

  const filteredNodes = useMemo(() => {
    if (!payload) {
      return [];
    }
    const keyword = nodeKeyword.trim().toLowerCase();
    const riskThreshold = riskThresholdPercent / 100;
    return payload.nodes.filter((node) => {
      if (domainFilter !== "all" && (node.domain ?? "general") !== domainFilter) {
        return false;
      }
      if (resolveNodeRisk(node) < riskThreshold) {
        return false;
      }
      if (!keyword) {
        return true;
      }
      return (
        node.label.toLowerCase().includes(keyword) ||
        node.id.toLowerCase().includes(keyword) ||
        (node.domain ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [domainFilter, nodeKeyword, payload, riskThresholdPercent]);

  const filteredNodeIds = useMemo(
    () => new Set(filteredNodes.map((node) => node.id)),
    [filteredNodes]
  );

  const filteredEdges = useMemo(() => {
    if (!payload) {
      return [];
    }
    return payload.edges.filter(
      (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
    );
  }, [filteredNodeIds, payload]);

  const placements = useMemo<GraphNodePlacement[]>(() => {
    return buildGraphLayout({
      nodes: filteredNodes,
      edges: filteredEdges,
      width: GRAPH_CANVAS_WIDTH,
      height: GRAPH_CANVAS_HEIGHT
    });
  }, [filteredEdges, filteredNodes]);

  const placementMap = useMemo(
    () => new Map(placements.map((item) => [item.id, item])),
    [placements]
  );

  const activeNode = useMemo(() => {
    if (placements.length === 0) {
      return null;
    }
    const selectedNode = placements.find((item) => item.id === activeNodeId);
    if (selectedNode) {
      return selectedNode;
    }
    return (
      [...placements].sort((a, b) => b.risk - a.risk || b.degree - a.degree)[0] ??
      placements[0]
    );
  }, [activeNodeId, placements]);

  useEffect(() => {
    if (!activeNode) {
      setActiveNodeId("");
      return;
    }
    if (activeNode.id !== activeNodeId) {
      setActiveNodeId(activeNode.id);
    }
  }, [activeNode, activeNodeId]);

  const connectedNodeIds = useMemo(() => {
    if (!activeNode) {
      return new Set<string>();
    }
    const ids = new Set<string>();
    for (const edge of filteredEdges) {
      if (edge.source === activeNode.id) {
        ids.add(edge.target);
      }
      if (edge.target === activeNode.id) {
        ids.add(edge.source);
      }
    }
    return ids;
  }, [activeNode, filteredEdges]);

  const relatedNodes = useMemo(
    () =>
      placements
        .filter((item) => connectedNodeIds.has(item.id))
        .sort((a, b) => b.degree - a.degree || b.risk - a.risk)
        .slice(0, 8),
    [connectedNodeIds, placements]
  );

  const highRiskNodes = useMemo(
    () =>
      rankHighRiskNodes(filteredNodes, 6).map((item) => {
        const placement = placementMap.get(item.id);
        return placement
          ? placement
          : {
              id: item.id,
              label: item.label,
              domain: item.domain ?? "general",
              mastery: item.mastery ?? 0.45,
              risk: resolveNodeRisk(item),
              degree: 0,
              x: 0,
              y: 0,
              radius: 10
            };
      }),
    [filteredNodes, placementMap]
  );

  const domainClusterOverview = useMemo<DomainClusterSummary[]>(() => {
    if (filteredNodes.length === 0) {
      return [];
    }
    const map = new Map<
      string,
      {
        nodeCount: number;
        relationCount: number;
        riskTotal: number;
        masteryTotal: number;
        highRiskCount: number;
      }
    >();

    for (const node of filteredNodes) {
      const domain = node.domain ?? "general";
      const risk = resolveNodeRisk(node);
      const mastery = 1 - risk;
      const snapshot = map.get(domain) ?? {
        nodeCount: 0,
        relationCount: 0,
        riskTotal: 0,
        masteryTotal: 0,
        highRiskCount: 0
      };
      snapshot.nodeCount += 1;
      snapshot.riskTotal += risk;
      snapshot.masteryTotal += mastery;
      if (risk >= 0.6) {
        snapshot.highRiskCount += 1;
      }
      map.set(domain, snapshot);
    }

    for (const edge of filteredEdges) {
      const sourceDomain = placementMap.get(edge.source)?.domain;
      const targetDomain = placementMap.get(edge.target)?.domain;
      if (!sourceDomain || !targetDomain) {
        continue;
      }
      if (sourceDomain === targetDomain) {
        const sourceCluster = map.get(sourceDomain);
        if (sourceCluster) {
          sourceCluster.relationCount += 1;
        }
      } else {
        const sourceCluster = map.get(sourceDomain);
        const targetCluster = map.get(targetDomain);
        if (sourceCluster) {
          sourceCluster.relationCount += 1;
        }
        if (targetCluster) {
          targetCluster.relationCount += 1;
        }
      }
    }

    return Array.from(map.entries())
      .map(([domain, value]) => ({
        domain,
        nodeCount: value.nodeCount,
        relationCount: value.relationCount,
        averageRisk: Number((value.riskTotal / Math.max(1, value.nodeCount)).toFixed(2)),
        averageMastery: Number(
          (value.masteryTotal / Math.max(1, value.nodeCount)).toFixed(2)
        ),
        highRiskCount: value.highRiskCount
      }))
      .sort((a, b) => b.averageRisk - a.averageRisk || b.nodeCount - a.nodeCount);
  }, [filteredEdges, filteredNodes, placementMap]);

  const riskBridgeSuggestions = useMemo<RiskBridgeSuggestion[]>(() => {
    if (filteredEdges.length === 0) {
      return [];
    }
    const bridgeMap = new Map<string, RiskBridgeSuggestion>();
    for (const edge of filteredEdges) {
      const source = placementMap.get(edge.source);
      const target = placementMap.get(edge.target);
      if (!source || !target) {
        continue;
      }
      const risk = Number((((source.risk + target.risk) / 2)).toFixed(2));
      if (risk < 0.48) {
        continue;
      }
      const weight = Number(edge.weight ?? 1);
      const key = buildEdgeKey(source.id, target.id);
      const primary = source.risk >= target.risk ? source : target;
      const secondary = primary.id === source.id ? target : source;
      const summary =
        source.domain === target.domain
          ? `同域脆弱链：${source.domain} 内部迁移不稳，建议先做“反例诊断 + 变式巩固”。`
          : `跨域断裂链：${source.domain} -> ${target.domain} 迁移弱，建议补“桥接任务”。`;
      const candidate: RiskBridgeSuggestion = {
        id: key,
        source,
        target,
        primary,
        secondary,
        risk,
        weight,
        summary
      };
      const previous = bridgeMap.get(key);
      if (
        !previous ||
        candidate.risk > previous.risk ||
        (candidate.risk === previous.risk && candidate.weight > previous.weight)
      ) {
        bridgeMap.set(key, candidate);
      }
    }
    return Array.from(bridgeMap.values())
      .sort((a, b) => b.risk - a.risk || b.weight - a.weight)
      .slice(0, 6);
  }, [filteredEdges, placementMap]);

  useEffect(() => {
    if (!selectedBridgeId) {
      return;
    }
    const exists = riskBridgeSuggestions.some((item) => item.id === selectedBridgeId);
    if (!exists) {
      setSelectedBridgeId("");
    }
  }, [riskBridgeSuggestions, selectedBridgeId]);

  useEffect(() => {
    if (riskBridgeSuggestions.length === 0) {
      return;
    }
    const entries: BridgeHistoryEntry[] = riskBridgeSuggestions.map((item) => ({
      id: item.id,
      sourceLabel: item.source.label,
      targetLabel: item.target.label,
      risk: item.risk,
      weight: item.weight
    }));
    const signature = buildBridgeHistorySignature(entries);
    setBridgeHistory((prev) => {
      if (prev[0]?.signature === signature) {
        return prev;
      }
      const snapshot: BridgeHistorySnapshot = {
        id: `bridge_hist_${Date.now().toString(36)}`,
        at: new Date().toISOString(),
        signature,
        bridges: entries
      };
      const next = [snapshot, ...prev].slice(0, GRAPH_BRIDGE_HISTORY_LIMIT);
      try {
        window.localStorage.setItem(
          GRAPH_BRIDGE_HISTORY_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        // ignore localStorage failures
      }
      return next;
    });
  }, [riskBridgeSuggestions]);

  const averageMastery = useMemo(() => {
    if (filteredNodes.length === 0) {
      return 0;
    }
    const total = filteredNodes.reduce((sum, node) => sum + (node.mastery ?? 0.45), 0);
    return total / filteredNodes.length;
  }, [filteredNodes]);

  const isolatedCount = useMemo(() => {
    if (placements.length === 0) {
      return 0;
    }
    return placements.filter((node) => node.degree === 0).length;
  }, [placements]);

  const activeTimeline = graphHistory[0] ?? null;
  const previousTimeline = graphHistory[1] ?? null;
  const timelineDelta = useMemo(() => {
    if (!activeTimeline) {
      return null;
    }
    return buildGraphHistoryDeltas(activeTimeline, previousTimeline);
  }, [activeTimeline, previousTimeline]);

  const bridgeSuggestionMap = useMemo(
    () => new Map(riskBridgeSuggestions.map((item) => [item.id, item])),
    [riskBridgeSuggestions]
  );

  const replayTargetBridgeId = useMemo(() => {
    if (selectedBridgeId) {
      return selectedBridgeId;
    }
    if (riskBridgeSuggestions[0]?.id) {
      return riskBridgeSuggestions[0].id;
    }
    return bridgeHistory[0]?.bridges[0]?.id ?? "";
  }, [bridgeHistory, riskBridgeSuggestions, selectedBridgeId]);

  const bridgeReplayFrames = useMemo(
    () =>
      buildBridgeReplayFrames(bridgeHistory, {
        mode: bridgeReplayMode,
        targetBridgeId: replayTargetBridgeId,
        focusLimit: 8,
        allLimit: 18
      }),
    [bridgeHistory, bridgeReplayMode, replayTargetBridgeId]
  );

  const bridgeReplayNodeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          bridgeReplayFrames.flatMap((frame) => [
            frame.bridge.sourceLabel,
            frame.bridge.targetLabel
          ])
        )
      )
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "zh-CN")),
    [bridgeReplayFrames]
  );

  const displayedBridgeReplayFrames = useMemo(() => {
    if (bridgeReplayNodeFilter === "all") {
      return bridgeReplayFrames;
    }
    return bridgeReplayFrames.filter(
      (frame) =>
        frame.bridge.sourceLabel === bridgeReplayNodeFilter ||
        frame.bridge.targetLabel === bridgeReplayNodeFilter
    );
  }, [bridgeReplayFrames, bridgeReplayNodeFilter]);

  useEffect(() => {
    if (bridgeReplayNodeFilter === "all") {
      return;
    }
    if (!bridgeReplayNodeOptions.includes(bridgeReplayNodeFilter)) {
      setBridgeReplayNodeFilter("all");
    }
  }, [bridgeReplayNodeFilter, bridgeReplayNodeOptions]);

  const handlePushActiveNodeToPath = useCallback(() => {
    if (!activeNode) {
      return;
    }
    writePathFocusToStorage(
      {
        nodeId: activeNode.id,
        nodeLabel: activeNode.label,
        domain: activeNode.domain,
        mastery: activeNode.mastery,
        risk: activeNode.risk,
        relatedNodes: relatedNodes.slice(0, 5).map((node) => node.label),
        at: new Date().toISOString(),
        focusSource: "graph"
      },
      (key, value) => window.localStorage.setItem(key, value)
    );
    const params = new URLSearchParams({
      from: "graph",
      focusNode: activeNode.id,
      focusLabel: activeNode.label
    });
    router.push(`/path?${params.toString()}`);
    setPathPushHint(`已将焦点节点「${activeNode.label}」推送到路径页。`);
  }, [activeNode, relatedNodes, router]);

  const handlePushActiveNodeToWorkspace = useCallback(() => {
    if (!activeNode) {
      return;
    }
    writeWorkspaceFocusToStorage(
      {
        nodeId: activeNode.id,
        nodeLabel: activeNode.label,
        domain: activeNode.domain,
        mastery: activeNode.mastery,
        risk: activeNode.risk,
        relatedNodes: relatedNodes.slice(0, 5).map((node) => node.label),
        at: new Date().toISOString(),
        focusSource: "graph"
      },
      (key, value) => window.localStorage.setItem(key, value)
    );
    router.push("/workspace");
    setPathPushHint(`已将焦点节点「${activeNode.label}」推送到工作区。`);
  }, [activeNode, relatedNodes, router]);

  const handleFocusBridge = useCallback((bridge: RiskBridgeSuggestion) => {
    setSelectedBridgeId(bridge.id);
    setDomainFilter(bridge.primary.domain ?? "all");
    setNodeKeyword("");
    setActiveNodeId(bridge.primary.id);
  }, []);

  const handleSelectReplayBridge = useCallback(
    (bridgeId: string) => {
      setSelectedBridgeId(bridgeId);
      const matched = bridgeSuggestionMap.get(bridgeId);
      if (!matched) {
        return;
      }
      setDomainFilter(matched.primary.domain ?? "all");
      setNodeKeyword("");
      setActiveNodeId(matched.primary.id);
    },
    [bridgeSuggestionMap]
  );

  const handlePushBridgeToPath = useCallback(
    (bridge: RiskBridgeSuggestion) => {
      setSelectedBridgeId(bridge.id);
      writePathFocusToStorage(
        {
          nodeId: bridge.primary.id,
          nodeLabel: bridge.primary.label,
          domain: bridge.primary.domain,
          mastery: bridge.primary.mastery,
          risk: bridge.primary.risk,
          relatedNodes: [
            bridge.secondary.label,
            ...relatedNodes.map((item) => item.label)
          ].slice(0, 5),
          at: new Date().toISOString(),
          focusSource: "graph_bridge",
          bridgePartnerLabel: bridge.secondary.label,
          bridgeTaskTemplate: buildBridgeTaskTemplate(
            bridge.primary.label,
            bridge.secondary.label
          )
        },
        (key, value) => window.localStorage.setItem(key, value)
      );
      const params = new URLSearchParams({
        from: "graph_bridge",
        focusNode: bridge.primary.id,
        focusLabel: bridge.primary.label,
        bridgePartner: bridge.secondary.label
      });
      router.push(`/path?${params.toString()}`);
      setPathPushHint(
        `已推送关系链建议：${bridge.primary.label} ↔ ${bridge.secondary.label}（风险 ${toPercent(
          bridge.risk
        )}）。`
      );
    },
    [relatedNodes, router]
  );

  const handleFocusGraphActivity = useCallback(
    (event: GraphActivityEvent) => {
      const matchedNode = payload?.nodes.find((item) => item.id === event.nodeId);
      if (matchedNode) {
        setDomainFilter(matchedNode.domain ?? "all");
      }
      setFocusedActivityId(event.id);
      setActiveNodeId(event.nodeId);
    },
    [payload]
  );

  return (
    <div className="graph-workbench">
      <div className="graph-control-bar">
        <button type="button" onClick={loadGraph} disabled={loading}>
          {loading ? "正在同步图谱..." : "刷新图谱"}
        </button>
        <div className="graph-domain-switch">
          <button
            type="button"
            className={domainFilter === "all" ? "active" : ""}
            onClick={() => setDomainFilter("all")}
          >
            全部域 ({payload?.nodes.length ?? 0})
          </button>
          {domainBuckets.map((bucket) => (
            <button
              key={bucket.domain}
              type="button"
              className={domainFilter === bucket.domain ? "active" : ""}
              onClick={() => setDomainFilter(bucket.domain)}
            >
              {bucket.domain} ({bucket.count})
            </button>
          ))}
        </div>
        <input
          type="search"
          value={nodeKeyword}
          onChange={(event) => setNodeKeyword(event.target.value)}
          placeholder="筛选节点/域名，例如 math"
          aria-label="筛选图谱节点"
        />
        <div className="graph-control-tools">
          <label className="graph-control-toggle">
            <input
              type="checkbox"
              checked={enableEdgeHeatmap}
              onChange={(event) => setEnableEdgeHeatmap(event.target.checked)}
            />
            关系热力图层
          </label>
          <label className="graph-control-slider">
            风险阈值 {riskThresholdPercent}%
            <input
              type="range"
              min={0}
              max={80}
              step={5}
              value={riskThresholdPercent}
              onChange={(event) => setRiskThresholdPercent(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            className="graph-control-reset"
            onClick={() => {
              setRiskThresholdPercent(0);
              setEnableEdgeHeatmap(true);
              setNodeKeyword("");
              setDomainFilter("all");
              setSelectedBridgeId("");
            }}
          >
            重置图谱筛选
          </button>
        </div>
      </div>
      {pathPushHint ? <div className="result-box success">{pathPushHint}</div> : null}

      {payload ? (
        <div className="graph-workbench-grid">
          <article className="graph-canvas-panel">
            <header className="graph-canvas-head">
              <strong>知识网络画布</strong>
              <span>
                节点 {filteredNodes.length} · 关系 {filteredEdges.length} · 平均掌握度{" "}
                {toPercent(averageMastery)}
              </span>
            </header>

            {placements.length === 0 ? (
              <p className="graph-empty-hint">当前筛选条件下没有节点，尝试清空关键词或切换域。</p>
            ) : (
              <>
                <svg
                  className="graph-canvas"
                  viewBox={`0 0 ${GRAPH_CANVAS_WIDTH} ${GRAPH_CANVAS_HEIGHT}`}
                  role="img"
                  aria-label="知识图谱可视化"
                >
                  <defs>
                    <radialGradient id="graphGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(144, 224, 255, 0.28)" />
                      <stop offset="100%" stopColor="rgba(144, 224, 255, 0)" />
                    </radialGradient>
                  </defs>
                  <rect
                    x="0"
                    y="0"
                    width={GRAPH_CANVAS_WIDTH}
                    height={GRAPH_CANVAS_HEIGHT}
                    fill="url(#graphGlow)"
                  />
                  {filteredEdges.map((edge, index) => {
                    const source = placementMap.get(edge.source);
                    const target = placementMap.get(edge.target);
                    if (!source || !target) {
                      return null;
                    }
                    const edgeKey = buildEdgeKey(edge.source, edge.target);
                    const midRisk = (source.risk + target.risk) / 2;
                    const tone = resolveRiskTone(midRisk);
                    const highlighted =
                      activeNode &&
                      (activeNode.id === source.id || activeNode.id === target.id);
                    const bridgeHighlighted = selectedBridgeId === edgeKey;
                    const heatOpacity = enableEdgeHeatmap
                      ? Number((0.15 + midRisk * 0.85).toFixed(2))
                      : undefined;
                    return (
                      <line
                        key={`${edge.source}_${edge.target}_${index}`}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        className={`graph-edge graph-edge-${tone}${highlighted ? " highlighted" : ""}${bridgeHighlighted ? " bridge-highlighted" : ""}${enableEdgeHeatmap ? " heatmap" : ""}`}
                        strokeWidth={
                          bridgeHighlighted
                            ? 3.1
                            : enableEdgeHeatmap
                              ? 1.2 + midRisk * 2.6
                            : highlighted
                              ? 2.4
                              : 1.2 + Math.min(1.8, edge.weight ?? 1)
                        }
                        style={enableEdgeHeatmap ? { opacity: heatOpacity } : undefined}
                      />
                    );
                  })}
                  {placements.map((node) => {
                    const tone = resolveRiskTone(node.risk);
                    const selected = activeNode?.id === node.id;
                    const related = connectedNodeIds.has(node.id);
                    return (
                      <g
                        key={node.id}
                        className={`graph-node graph-node-${tone}${selected ? " selected" : ""}${related ? " related" : ""}`}
                        onClick={() => setActiveNodeId(node.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setActiveNodeId(node.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <title>
                          {node.label} | 掌握度 {toPercent(node.mastery)} | 风险{" "}
                          {toPercent(node.risk)} | 关联度 {node.degree}
                        </title>
                        <circle cx={node.x} cy={node.y} r={node.radius + 5} className="graph-node-halo" />
                        <circle cx={node.x} cy={node.y} r={node.radius} className="graph-node-core" />
                        <text x={node.x} y={node.y + 4} textAnchor="middle">
                          {node.label.slice(0, 4)}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <div className="graph-legend-row">
                  <span className="graph-legend-item low">低风险</span>
                  <span className="graph-legend-item medium">中风险</span>
                  <span className="graph-legend-item high">高风险</span>
                  {enableEdgeHeatmap ? (
                    <span className="graph-legend-item heatmap">热力边已开启</span>
                  ) : null}
                  <span className="graph-legend-item neutral">
                    孤立节点 {isolatedCount} / {placements.length}
                  </span>
                </div>
              </>
            )}
          </article>

          <aside className="graph-insight-panel">
            <div className="graph-insight-card">
              <strong>领域聚类概览</strong>
              <p className="muted">按知识域聚合风险，点击可直接切换到该域深挖。</p>
              {domainClusterOverview.length > 0 ? (
                <div className="graph-domain-cluster-list">
                  {domainClusterOverview.map((cluster) => (
                    <button
                      type="button"
                      key={`cluster_${cluster.domain}`}
                      className={`graph-domain-cluster-item${
                        domainFilter === cluster.domain ? " active" : ""
                      }`}
                      onClick={() => {
                        setSelectedBridgeId("");
                        setDomainFilter(cluster.domain);
                      }}
                    >
                      <strong>{cluster.domain}</strong>
                      <span>
                        节点 {cluster.nodeCount} · 关系 {cluster.relationCount} · 高风险{" "}
                        {cluster.highRiskCount}
                      </span>
                      <em>
                        平均风险 {toPercent(cluster.averageRisk)} · 掌握度{" "}
                        {toPercent(cluster.averageMastery)}
                      </em>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted">当前筛选下暂无聚类数据。</p>
              )}
            </div>

            <div className="graph-insight-card">
              <strong>高风险节点 Top 6</strong>
              <p className="muted">优先复习这些节点，先补关系再做题。</p>
              <div className="graph-risk-list">
                {highRiskNodes.map((node) => (
                  <button
                    key={`risk_${node.id}`}
                    type="button"
                    className={`graph-risk-row${activeNode?.id === node.id ? " active" : ""}`}
                    onClick={() => setActiveNodeId(node.id)}
                  >
                    <span>{node.label}</span>
                    <em>{toPercent(node.risk)}</em>
                  </button>
                ))}
                {highRiskNodes.length === 0 ? (
                  <p className="muted">当前筛选下暂无节点。</p>
                ) : null}
              </div>
            </div>

            <div className="graph-insight-card">
              <strong>当前焦点</strong>
              {activeNode ? (
                <div className="graph-focus-box">
                  <h4>{activeNode.label}</h4>
                  <p>
                    域：{activeNode.domain} · 掌握度 {toPercent(activeNode.mastery)} · 风险{" "}
                    {toPercent(activeNode.risk)}
                  </p>
                  <p>关联节点：{connectedNodeIds.size} 个</p>
                  <button
                    type="button"
                    className="graph-path-cta"
                    onClick={handlePushActiveNodeToPath}
                  >
                    以该节点生成学习路径
                  </button>
                  <button
                    type="button"
                    className="graph-path-cta graph-workspace-cta"
                    onClick={handlePushActiveNodeToWorkspace}
                  >
                    以该节点进入工作区
                  </button>
                  <div className="graph-neighbor-list">
                    {relatedNodes.map((node) => (
                      <button
                        key={`neighbor_${node.id}`}
                        type="button"
                        className="graph-neighbor-chip"
                        onClick={() => setActiveNodeId(node.id)}
                      >
                        {node.label}
                        <em>{node.degree}</em>
                      </button>
                    ))}
                    {relatedNodes.length === 0 ? (
                      <span className="graph-neighbor-empty">该节点暂无可视关系边</span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="muted">暂无焦点节点。</p>
              )}
            </div>

            <div className="graph-insight-card">
              <strong>高风险关系链建议</strong>
              <p className="muted">优先修复这些关系链，可显著降低“会做单点、不会迁移”的风险。</p>
              {riskBridgeSuggestions.length > 0 ? (
                <div className="graph-bridge-list">
                  {riskBridgeSuggestions.map((bridge) => (
                    <article
                      key={`bridge_${bridge.id}`}
                      className={`graph-bridge-item risk-${resolveRiskTone(bridge.risk)}${
                        selectedBridgeId === bridge.id ? " active" : ""
                      }`}
                    >
                      <header>
                        <strong>
                          {bridge.source.label} ↔ {bridge.target.label}
                        </strong>
                        <span>风险 {toPercent(bridge.risk)}</span>
                      </header>
                      <p>{bridge.summary}</p>
                      <div className="graph-bridge-tools">
                        <button
                          type="button"
                          onClick={() => handleFocusBridge(bridge)}
                        >
                          聚焦主节点
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePushBridgeToPath(bridge)}
                        >
                          推送路径建议
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">当前筛选下暂无高风险关系链。</p>
              )}
            </div>

            <div className="graph-insight-card">
              <strong>关系链回放时间轴</strong>
              <p className="muted">记录每次图谱刷新后的关系链风险波动，用于回看干预是否生效。</p>
              <div className="graph-bridge-timeline-mode">
                <button
                  type="button"
                  className={bridgeReplayMode === "focus" ? "active" : ""}
                  onClick={() => setBridgeReplayMode("focus")}
                >
                  仅看当前关系链
                </button>
                <button
                  type="button"
                  className={bridgeReplayMode === "all" ? "active" : ""}
                  onClick={() => setBridgeReplayMode("all")}
                >
                  查看全部关系链
                </button>
                <span>
                  当前 {displayedBridgeReplayFrames.length} 条 · 模式
                  {bridgeReplayMode === "focus" ? " 焦点回放" : " 全量回放"}
                </span>
              </div>
              <div className="graph-bridge-timeline-filter">
                <label>
                  节点筛选
                  <select
                    value={bridgeReplayNodeFilter}
                    onChange={(event) => setBridgeReplayNodeFilter(event.target.value)}
                  >
                    <option value="all">全部节点</option>
                    {bridgeReplayNodeOptions.map((nodeLabel) => (
                      <option key={`bridge_replay_node_${nodeLabel}`} value={nodeLabel}>
                        {nodeLabel}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {displayedBridgeReplayFrames.length > 0 ? (
                <div className="graph-bridge-timeline-list">
                  {displayedBridgeReplayFrames.map((frame) => (
                    <button
                      type="button"
                      key={`${frame.snapshotId}_${frame.bridge.id}`}
                      className={`graph-bridge-timeline-item${
                        replayTargetBridgeId === frame.bridge.id ? " active" : ""
                      }`}
                      onClick={() => handleSelectReplayBridge(frame.bridge.id)}
                    >
                      <strong>
                        {frame.bridge.sourceLabel} ↔ {frame.bridge.targetLabel}
                      </strong>
                      <span>
                        {formatDateTime(frame.at)} · 风险 {toPercent(frame.bridge.risk)}
                      </span>
                      <em>关系权重 {frame.bridge.weight.toFixed(2)}</em>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted">暂无关系链回放记录，请先刷新图谱或调整筛选。</p>
              )}
            </div>

            <div className="graph-insight-card">
              <strong>图谱演化时间轴</strong>
              <p className="muted">持续记录结构变化，便于回看知识网络是否在收敛。</p>
              {activeTimeline ? (
                <div className="graph-timeline-current">
                  <p>
                    最新快照：{formatDateTime(activeTimeline.at)} · 节点{" "}
                    {activeTimeline.nodeCount} · 关系 {activeTimeline.edgeCount}
                  </p>
                  <p>
                    高风险 {activeTimeline.highRiskCount} · 孤立节点{" "}
                    {activeTimeline.isolatedNodeCount} · 平均掌握度{" "}
                    {toPercent(activeTimeline.averageMastery)}
                  </p>
                  <p>当前最高风险节点：{activeTimeline.topRiskNodeLabel}</p>
                  {timelineDelta ? (
                    <div className="graph-timeline-delta-row">
                      <span>节点 {formatDelta(timelineDelta.nodeDelta)}</span>
                      <span>关系 {formatDelta(timelineDelta.edgeDelta)}</span>
                      <span>掌握度 {formatDelta(timelineDelta.masteryDelta, { precision: 2 })}</span>
                      <span>高风险 {formatDelta(timelineDelta.riskDelta)}</span>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="muted">暂无历史快照。</p>
              )}

              {graphHistory.length > 0 ? (
                <div className="graph-timeline-list">
                  {graphHistory.map((item) => (
                    <div className="graph-timeline-item" key={item.id}>
                      <strong>{formatDateTime(item.at)}</strong>
                      <span>
                        N{item.nodeCount} · E{item.edgeCount} · 风险{item.highRiskCount}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {graphActivities.length > 0 ? (
                <div className="graph-activity-list">
                  <strong>闭环事件</strong>
                  {graphActivities.slice(0, 6).map((event) => (
                    <div
                      className={`graph-activity-item${
                        focusedActivityId === event.id ? " active" : ""
                      } risk-${resolveActivityRiskTone(
                        resolveGraphActivityRiskScore(event)
                      )}`}
                      key={event.id}
                    >
                      <p>
                        {event.source === "path_feedback" ? "路径反馈" : "工作区推进"} ·{" "}
                        {event.nodeLabel}
                      </p>
                      <span className="graph-activity-risk">
                        风险 {Math.round(resolveGraphActivityRiskScore(event) * 100)}%
                      </span>
                      <span>{formatDateTime(event.at)}</span>
                      <em>{event.detail}</em>
                      <button
                        type="button"
                        onClick={() => handleFocusGraphActivity(event)}
                      >
                        定位到节点
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {error ? <div className="result-box danger">{error}</div> : null}
    </div>
  );
}

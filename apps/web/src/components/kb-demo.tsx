"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatErrorMessage, requestJson } from "@/lib/client/api";
import { CollapsiblePanel } from "@/components/collapsible-panel";
import { SectionAnchorNav } from "@/components/section-anchor-nav";

type Candidate = {
  docId: string;
  score: number;
  snippet: string;
  reason: string[];
};

type DocDetail = {
  id: string;
  title: string;
  type: string;
  domain: string;
  tags: string[];
  links: string[];
  sourceRefs: string[];
  owner: string;
  updatedAt?: string;
  backlinks: string[];
  content: string;
};

type IndexSummary = {
  generatedAt: string;
  docCount: number;
  byType: Record<string, number>;
  byDomain: Record<string, number>;
};

type TagStat = {
  tag: string;
  count: number;
};

type BacklinkGraph = {
  focusDocId: string | null;
  nodes: Array<{ id: string; label: string; type: string; domain: string }>;
  edges: Array<{ source: string; target: string; weight: number }>;
};

type TimelineEntry = {
  id: string;
  label: string;
  detail: string;
};

type RelationDirection = "all" | "in" | "out";
type RelationGroupBy = "none" | "domain" | "type";
type MiniLayoutMode = "graph" | "chapter";
type ChapterSubgraphMode = "highlight" | "focus";
type ChapterTrendSpan = 7 | 14;

type MiniFlowNode = {
  id: string;
  label: string;
  shortLabel: string;
  chapterKey: string;
  x: number;
  y: number;
  isAnchor: boolean;
};

type MiniFlowEdge = {
  id: string;
  source: string;
  target: string;
  weight: number;
  path: string;
};

type MiniFlowLayout = {
  width: number;
  height: number;
  nodes: MiniFlowNode[];
  edges: MiniFlowEdge[];
};

type ChapterTreeGroup = {
  key: string;
  label: string;
  nodes: string[];
  edgeCount: number;
  isAnchor: boolean;
};

type ChapterSubgraphStats = {
  nodeCount: number;
  linkedEdgeCount: number;
  internalEdgeCount: number;
  crossEdgeCount: number;
  avgWeight: string;
  topNodes: Array<{ nodeId: string; count: number }>;
};

type ChapterTrendRow = {
  key: string;
  label: string;
  points: number[];
  latest: number;
  delta: number;
  isActive: boolean;
};

type ChapterPanelPreset = "insight" | "balanced" | "light" | "custom";

type ChapterPanelConfig = {
  topNodesLimit: number;
  trendRowsLimit: number;
  defaultSubgraphMode: ChapterSubgraphMode;
  defaultTrendSpan: ChapterTrendSpan;
};

type MiniFoldCardProps = {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderHighlightedText(text: string, keywords: string[]): ReactNode {
  const terms = Array.from(new Set(keywords.map((item) => item.trim()).filter((item) => item.length >= 2)))
    .sort((a, b) => b.length - a.length);

  if (terms.length === 0) {
    return text;
  }

  const matcher = new RegExp(`(${terms.map((item) => escapeRegExp(item)).join("|")})`, "gi");
  return text.split(matcher).map((part, index) => {
    const isHit = terms.some((term) => term.toLowerCase() === part.toLowerCase());
    if (!isHit) {
      return <span key={`txt_${index}`}>{part}</span>;
    }
    return (
      <mark className="citation-hit" key={`hit_${index}`}>
        {part}
      </mark>
    );
  });
}

function clipLabel(label: string, max = 12) {
  return label.length > max ? `${label.slice(0, max)}...` : label;
}

function deriveChapterAnchorKey(
  nodeId: string,
  meta?: { label?: string; type?: string; domain?: string }
) {
  const text = `${meta?.label ?? ""} ${nodeId}`.toLowerCase();
  const chapterMatch = text.match(/第([一二三四五六七八九十0-9]+)章/);
  if (chapterMatch) {
    return `章${chapterMatch[1]}`;
  }
  const chapterDigitMatch = text.match(/\bch(?:apter)?[_-]?(\d+)\b/);
  if (chapterDigitMatch) {
    return `ch${chapterDigitMatch[1]}`;
  }
  const unitMatch = text.match(/\bunit[_-]?(\d+)\b/);
  if (unitMatch) {
    return `unit${unitMatch[1]}`;
  }
  const tokens = nodeId.split(/[\\/_.-]/).filter(Boolean);
  if (tokens.length >= 3) {
    return `${tokens[0]}_${tokens[1]}`;
  }
  if (tokens.length >= 2) {
    return `${tokens[0]}_${tokens[1]}`;
  }
  return meta?.domain || meta?.type || tokens[0] || "misc";
}

function buildPseudoTrendPoints(seed: number, total: number) {
  const base = Math.max(2, seed);
  return Array.from({ length: total }, (_, index) => {
    const drift = ((index * 17 + base * 11) % 9) - 4;
    return Math.max(1, Math.round(base + drift));
  });
}

const DEFAULT_CHAPTER_PANEL_CONFIG: ChapterPanelConfig = {
  topNodesLimit: 4,
  trendRowsLimit: 5,
  defaultSubgraphMode: "highlight",
  defaultTrendSpan: 7
};

const CHAPTER_PANEL_PRESETS: Record<
  Exclude<ChapterPanelPreset, "custom">,
  ChapterPanelConfig
> = {
  insight: {
    topNodesLimit: 6,
    trendRowsLimit: 6,
    defaultSubgraphMode: "focus",
    defaultTrendSpan: 14
  },
  balanced: DEFAULT_CHAPTER_PANEL_CONFIG,
  light: {
    topNodesLimit: 3,
    trendRowsLimit: 4,
    defaultSubgraphMode: "highlight",
    defaultTrendSpan: 7
  }
};

function normalizeChapterPanelConfig(value?: Partial<ChapterPanelConfig>): ChapterPanelConfig {
  const merged = {
    ...DEFAULT_CHAPTER_PANEL_CONFIG,
    ...(value ?? {})
  };
  return {
    topNodesLimit: Math.min(8, Math.max(2, Number(merged.topNodesLimit) || 4)),
    trendRowsLimit: Math.min(8, Math.max(3, Number(merged.trendRowsLimit) || 5)),
    defaultSubgraphMode:
      merged.defaultSubgraphMode === "focus" ? "focus" : "highlight",
    defaultTrendSpan: merged.defaultTrendSpan === 14 ? 14 : 7
  };
}

function normalizeChapterPanelPreset(value: string): ChapterPanelPreset {
  if (value === "insight" || value === "light" || value === "custom") {
    return value;
  }
  return "balanced";
}

function formatChapterPanelPresetLabel(preset: ChapterPanelPreset) {
  if (preset === "insight") return "深度洞察";
  if (preset === "light") return "轻量概览";
  if (preset === "custom") return "自定义";
  return "平衡默认";
}

function MiniFoldCard({
  title,
  subtitle,
  defaultOpen = true,
  children
}: MiniFoldCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`obsidian-mini-card mini-fold-card ${open ? "open" : "closed"}`}>
      <header className="mini-fold-head">
        <div className="mini-fold-meta">
          <strong>{title}</strong>
          {subtitle ? <span>{subtitle}</span> : null}
        </div>
        <button type="button" onClick={() => setOpen((prev) => !prev)}>
          {open ? "收起" : "展开"}
        </button>
      </header>
      {open ? <div className="mini-fold-body">{children}</div> : null}
    </section>
  );
}

export function KbDemo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("等差数列");
  const [typeFilter, setTypeFilter] = useState("");
  const [domainFilter, setDomainFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [graphLimit, setGraphLimit] = useState(120);
  const [readingMode, setReadingMode] = useState<"cards" | "plain">("cards");
  const [citationFocus, setCitationFocus] = useState("");
  const [relationFocusNode, setRelationFocusNode] = useState("");
  const [relationDirection, setRelationDirection] = useState<RelationDirection>("all");
  const [relationGroupBy, setRelationGroupBy] = useState<RelationGroupBy>("none");
  const [relationLayoutMode, setRelationLayoutMode] = useState<MiniLayoutMode>("chapter");
  const [relationWeightMin, setRelationWeightMin] = useState(1);
  const [relationTopN, setRelationTopN] = useState(8);
  const [hoveredRelationId, setHoveredRelationId] = useState("");
  const [selectedChapterKey, setSelectedChapterKey] = useState("");
  const [chapterSubgraphMode, setChapterSubgraphMode] =
    useState<ChapterSubgraphMode>("highlight");
  const [chapterTrendSpan, setChapterTrendSpan] = useState<ChapterTrendSpan>(7);
  const [chapterPanelConfig, setChapterPanelConfig] = useState<ChapterPanelConfig>(
    DEFAULT_CHAPTER_PANEL_CONFIG
  );
  const [chapterPanelPreset, setChapterPanelPreset] =
    useState<ChapterPanelPreset>("balanced");
  const [isChapterPanelConfigReady, setIsChapterPanelConfigReady] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocDetail | null>(null);
  const [indexSummary, setIndexSummary] = useState<IndexSummary | null>(null);
  const [tags, setTags] = useState<TagStat[]>([]);
  const [graph, setGraph] = useState<BacklinkGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [externalContextHint, setExternalContextHint] = useState("");
  const [compactMode, setCompactMode] = useState(false);
  const externalContextAppliedRef = useRef("");
  const presetQuery = useMemo(
    () => searchParams.get("q")?.trim() ?? "",
    [searchParams]
  );
  const presetNoteId = useMemo(
    () => searchParams.get("noteId")?.trim() ?? "",
    [searchParams]
  );
  const presetFrom = useMemo(
    () => searchParams.get("from")?.trim().toLowerCase() ?? "",
    [searchParams]
  );
  const presetNodeLabel = useMemo(
    () => searchParams.get("nodeLabel")?.trim() ?? "",
    [searchParams]
  );
  const presetAutoSearch = useMemo(
    () => searchParams.get("auto") === "1",
    [searchParams]
  );
  const presetSessionId = useMemo(
    () => searchParams.get("sessionId")?.trim() ?? "",
    [searchParams]
  );

  useEffect(() => {
    try {
      setCompactMode(window.localStorage.getItem("edunexus_kb_compact_ui") === "1");
    } catch {
      setCompactMode(false);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("edunexus_kb_compact_ui", compactMode ? "1" : "0");
    } catch {
      // ignore persistence failures
    }
  }, [compactMode]);

  function resetKbLayout() {
    try {
      window.localStorage.removeItem("edunexus_kb_compact_ui");
      window.localStorage.removeItem("edunexus_anchor_nav_kb_demo");
      window.localStorage.removeItem("edunexus_collapsible_kb_candidates_panel");
      window.localStorage.removeItem("edunexus_collapsible_kb_doc_panel");
      window.localStorage.removeItem("edunexus_collapsible_kb_graph_panel");
      window.localStorage.removeItem("edunexus_collapsible_kb_index_panel");
    } catch {
      // ignore persistence failures
    }
    window.location.reload();
  }

  async function loadTags() {
    try {
      const data = await requestJson<{ tags: TagStat[] }>("/api/kb/tags");
      setTags(data.tags ?? []);
    } catch (err) {
      setError(formatErrorMessage(err, "获取标签聚合失败。"));
      console.error(err);
    }
  }

  async function loadGraph(focusDocId?: string, limit = graphLimit) {
    try {
      const params = new URLSearchParams();
      if (focusDocId) {
        params.set("focusDocId", focusDocId);
      }
      params.set("limit", String(limit));
      const data = await requestJson<BacklinkGraph>(`/api/kb/backlinks/graph?${params.toString()}`);
      setGraph(data);
    } catch (err) {
      setError(formatErrorMessage(err, "获取反链图失败。"));
      console.error(err);
    }
  }

  useEffect(() => {
    setError("");
    void loadTags();
    void loadGraph(undefined, graphLimit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphLimit]);

  useEffect(() => {
    try {
      const rawConfig = window.localStorage.getItem("edunexus_kb_chapter_panel_config");
      const rawPreset = window.localStorage.getItem("edunexus_kb_chapter_panel_preset");
      const nextConfig = rawConfig
        ? normalizeChapterPanelConfig(JSON.parse(rawConfig) as Partial<ChapterPanelConfig>)
        : DEFAULT_CHAPTER_PANEL_CONFIG;
      setChapterPanelConfig(nextConfig);
      setChapterPanelPreset(rawPreset ? normalizeChapterPanelPreset(rawPreset) : "balanced");
      setChapterSubgraphMode(nextConfig.defaultSubgraphMode);
      setChapterTrendSpan(nextConfig.defaultTrendSpan);
    } catch {
      setChapterPanelConfig(DEFAULT_CHAPTER_PANEL_CONFIG);
      setChapterPanelPreset("balanced");
      setChapterSubgraphMode(DEFAULT_CHAPTER_PANEL_CONFIG.defaultSubgraphMode);
      setChapterTrendSpan(DEFAULT_CHAPTER_PANEL_CONFIG.defaultTrendSpan);
    }
    setIsChapterPanelConfigReady(true);
  }, []);

  useEffect(() => {
    const handleConfigUpdated = () => {
      try {
        const rawConfig = window.localStorage.getItem("edunexus_kb_chapter_panel_config");
        const rawPreset = window.localStorage.getItem("edunexus_kb_chapter_panel_preset");
        const nextConfig = rawConfig
          ? normalizeChapterPanelConfig(JSON.parse(rawConfig) as Partial<ChapterPanelConfig>)
          : DEFAULT_CHAPTER_PANEL_CONFIG;
        const nextPreset = normalizeChapterPanelPreset(rawPreset ?? "balanced");
        setChapterPanelConfig(nextConfig);
        setChapterPanelPreset(nextPreset);
        setChapterSubgraphMode(nextConfig.defaultSubgraphMode);
        setChapterTrendSpan(nextConfig.defaultTrendSpan);
      } catch {
        setChapterPanelConfig(DEFAULT_CHAPTER_PANEL_CONFIG);
        setChapterPanelPreset("balanced");
        setChapterSubgraphMode(DEFAULT_CHAPTER_PANEL_CONFIG.defaultSubgraphMode);
        setChapterTrendSpan(DEFAULT_CHAPTER_PANEL_CONFIG.defaultTrendSpan);
      }
    };
    window.addEventListener("edunexus-config-updated", handleConfigUpdated);
    return () => {
      window.removeEventListener("edunexus-config-updated", handleConfigUpdated);
    };
  }, []);

  useEffect(() => {
    if (!isChapterPanelConfigReady) {
      return;
    }
    window.localStorage.setItem(
      "edunexus_kb_chapter_panel_config",
      JSON.stringify(chapterPanelConfig)
    );
    window.localStorage.setItem(
      "edunexus_kb_chapter_panel_preset",
      chapterPanelPreset
    );
  }, [chapterPanelConfig, chapterPanelPreset, isChapterPanelConfigReady]);

  const graphHeat = useMemo(() => {
    if (!graph || graph.nodes.length === 0) {
      return [];
    }
    const degree = new Map<string, number>();
    for (const node of graph.nodes) {
      degree.set(node.id, 0);
    }
    for (const edge of graph.edges) {
      degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
      degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    }
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));
    return Array.from(degree.entries())
      .map(([id, count]) => ({
        id,
        count,
        label: byId.get(id)?.label ?? id
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 8);
  }, [graph]);

  const notebookQuotes = useMemo(() => {
    if (!selectedDoc) {
      return [];
    }
    return selectedDoc.content
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length >= 16)
      .slice(0, 5);
  }, [selectedDoc]);

  const relatedCards = useMemo(() => {
    if (!selectedDoc) {
      return [];
    }

    const candidateMap = new Map(candidates.map((item) => [item.docId, item]));
    return selectedDoc.backlinks
      .slice(0, 6)
      .map((docId) => {
        const candidate = candidateMap.get(docId);
        return {
          id: docId,
          title: docId,
          snippet: candidate?.snippet ?? "该文档已与当前笔记建立双链，可跳转查看上下文。",
          score: candidate?.score ?? 0
        };
      });
  }, [selectedDoc, candidates]);

  const timelineEntries = useMemo<TimelineEntry[]>(() => {
    if (!selectedDoc) {
      return [];
    }

    return [
      {
        id: "updated",
        label: "更新时间",
        detail: selectedDoc.updatedAt || "未记录（建议后续沉淀时补充）"
      },
      {
        id: "links",
        label: "主动关联",
        detail:
          selectedDoc.links.length > 0
            ? `当前文档链接到 ${selectedDoc.links.length} 个节点`
            : "当前文档尚未建立主动链接"
      },
      {
        id: "backlinks",
        label: "被引用情况",
        detail:
          selectedDoc.backlinks.length > 0
            ? `有 ${selectedDoc.backlinks.length} 篇文档反向引用`
            : "暂无反向引用，可补充跨文档连接"
      },
      {
        id: "sources",
        label: "来源依据",
        detail:
          selectedDoc.sourceRefs.length > 0
            ? selectedDoc.sourceRefs.join("；")
            : "暂无 sourceRefs，建议补充来源锚点"
      }
    ];
  }, [selectedDoc]);

  const citationSnippets = useMemo(() => {
    if (!selectedDoc) {
      return [];
    }
    const lines = selectedDoc.content
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const focus = citationFocus.trim() || query.trim();
    if (!focus) {
      return lines.slice(0, 4);
    }

    const matched = lines.filter((line) => line.toLowerCase().includes(focus.toLowerCase()));
    return (matched.length > 0 ? matched : lines).slice(0, 4);
  }, [selectedDoc, citationFocus, query]);

  const highlightKeywords = useMemo(() => {
    const base = [query, tagFilter, citationFocus];
    if (selectedDoc) {
      base.push(...selectedDoc.sourceRefs, ...selectedDoc.tags);
    }
    return Array.from(new Set(base.map((item) => item.trim()).filter(Boolean)));
  }, [query, tagFilter, citationFocus, selectedDoc]);

  const miniGraphEdges = useMemo(() => {
    if (!selectedDoc || !graph) {
      return [];
    }
    return graph.edges
      .filter((edge) => edge.source === selectedDoc.id || edge.target === selectedDoc.id)
      .slice(0, 12);
  }, [selectedDoc, graph]);

  const miniGraphNodeList = useMemo(() => {
    if (!selectedDoc) {
      return [];
    }

    const order: string[] = [selectedDoc.id];
    const seen = new Set(order);
    for (const edge of miniGraphEdges) {
      if (!seen.has(edge.source)) {
        seen.add(edge.source);
        order.push(edge.source);
      }
      if (!seen.has(edge.target)) {
        seen.add(edge.target);
        order.push(edge.target);
      }
    }
    return order;
  }, [selectedDoc, miniGraphEdges]);

  const miniEdgeWeightMax = useMemo(() => {
    if (miniGraphEdges.length === 0) {
      return 1;
    }
    return Math.max(
      ...miniGraphEdges.map((edge) => Math.max(1, Math.round(edge.weight ?? 1))),
      1
    );
  }, [miniGraphEdges]);

  const miniEdgeTopNMax = useMemo(() => {
    return Math.max(1, miniGraphEdges.length);
  }, [miniGraphEdges]);

  const miniGraphNodeMetaMap = useMemo(() => {
    if (!graph) {
      return new Map<string, { id: string; label: string; type: string; domain: string }>();
    }
    return new Map(graph.nodes.map((node) => [node.id, node]));
  }, [graph]);

  const focusedMiniGraphEdges = useMemo(() => {
    const anchorNode = relationFocusNode || selectedDoc?.id || "";
    if (!anchorNode) {
      return miniGraphEdges;
    }

    const nodeFiltered = miniGraphEdges.filter(
      (edge) => edge.source === anchorNode || edge.target === anchorNode
    );

    const directionFiltered =
      relationDirection === "in"
        ? nodeFiltered.filter((edge) => edge.target === anchorNode)
        : relationDirection === "out"
          ? nodeFiltered.filter((edge) => edge.source === anchorNode)
          : nodeFiltered;

    return directionFiltered
      .filter((edge) => Math.max(1, Math.round(edge.weight ?? 1)) >= relationWeightMin)
      .sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1))
      .slice(0, relationTopN);
  }, [
    miniGraphEdges,
    relationDirection,
    relationFocusNode,
    relationWeightMin,
    relationTopN,
    selectedDoc
  ]);

  const chapterTreeGroups = useMemo<ChapterTreeGroup[]>(() => {
    const anchorNode = relationFocusNode || selectedDoc?.id || "";
    if (!anchorNode) {
      return [];
    }

    const nodeIds = new Set<string>([anchorNode]);
    for (const edge of focusedMiniGraphEdges) {
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    }
    if (nodeIds.size === 0) {
      return [];
    }

    const anchorChapter = deriveChapterAnchorKey(
      anchorNode,
      miniGraphNodeMetaMap.get(anchorNode)
    );
    const groups = new Map<
      string,
      { nodes: Set<string>; edgeCount: number; isAnchor: boolean }
    >();

    for (const nodeId of nodeIds) {
      const chapterKey = deriveChapterAnchorKey(nodeId, miniGraphNodeMetaMap.get(nodeId));
      const entry =
        groups.get(chapterKey) ??
        {
          nodes: new Set<string>(),
          edgeCount: 0,
          isAnchor: chapterKey === anchorChapter
        };
      entry.nodes.add(nodeId);
      entry.isAnchor = entry.isAnchor || chapterKey === anchorChapter;
      groups.set(chapterKey, entry);
    }

    for (const edge of focusedMiniGraphEdges) {
      const sourceChapter = deriveChapterAnchorKey(
        edge.source,
        miniGraphNodeMetaMap.get(edge.source)
      );
      const targetChapter = deriveChapterAnchorKey(
        edge.target,
        miniGraphNodeMetaMap.get(edge.target)
      );
      const sourceEntry = groups.get(sourceChapter);
      if (sourceEntry) {
        sourceEntry.edgeCount += 1;
      }
      if (targetChapter !== sourceChapter) {
        const targetEntry = groups.get(targetChapter);
        if (targetEntry) {
          targetEntry.edgeCount += 1;
        }
      }
    }

    return Array.from(groups.entries())
      .map(([key, value]) => ({
        key,
        label: value.isAnchor ? `${key}（当前焦点）` : key,
        nodes: Array.from(value.nodes).sort((a, b) => a.localeCompare(b, "zh-CN")),
        edgeCount: value.edgeCount,
        isAnchor: value.isAnchor
      }))
      .sort((a, b) => {
        if (a.isAnchor) return -1;
        if (b.isAnchor) return 1;
        if (b.nodes.length !== a.nodes.length) {
          return b.nodes.length - a.nodes.length;
        }
        return a.key.localeCompare(b.key, "zh-CN");
      });
  }, [focusedMiniGraphEdges, miniGraphNodeMetaMap, relationFocusNode, selectedDoc]);

  const selectedChapterNodeSet = useMemo(() => {
    if (!selectedChapterKey) {
      return new Set<string>();
    }
    const target = chapterTreeGroups.find((item) => item.key === selectedChapterKey);
    return new Set(target?.nodes ?? []);
  }, [chapterTreeGroups, selectedChapterKey]);

  const activeMiniGraphEdges = useMemo(() => {
    if (selectedChapterNodeSet.size === 0 || chapterSubgraphMode === "highlight") {
      return focusedMiniGraphEdges;
    }
    return focusedMiniGraphEdges.filter(
      (edge) =>
        selectedChapterNodeSet.has(edge.source) || selectedChapterNodeSet.has(edge.target)
    );
  }, [chapterSubgraphMode, focusedMiniGraphEdges, selectedChapterNodeSet]);

  const selectedChapterStats = useMemo<ChapterSubgraphStats | null>(() => {
    if (!selectedChapterKey || selectedChapterNodeSet.size === 0) {
      return null;
    }
    const chapterEdges = focusedMiniGraphEdges.filter(
      (edge) =>
        selectedChapterNodeSet.has(edge.source) || selectedChapterNodeSet.has(edge.target)
    );
    if (chapterEdges.length === 0) {
      return {
        nodeCount: selectedChapterNodeSet.size,
        linkedEdgeCount: 0,
        internalEdgeCount: 0,
        crossEdgeCount: 0,
        avgWeight: "0.0",
        topNodes: []
      };
    }

    let internalEdgeCount = 0;
    let weightSum = 0;
    const nodeHitCount = new Map<string, number>();
    for (const edge of chapterEdges) {
      const roundedWeight = Math.max(1, Math.round(edge.weight ?? 1));
      weightSum += roundedWeight;
      const sourceMatched = selectedChapterNodeSet.has(edge.source);
      const targetMatched = selectedChapterNodeSet.has(edge.target);
      if (sourceMatched && targetMatched) {
        internalEdgeCount += 1;
      }
      if (sourceMatched) {
        nodeHitCount.set(edge.source, (nodeHitCount.get(edge.source) ?? 0) + 1);
      }
      if (targetMatched) {
        nodeHitCount.set(edge.target, (nodeHitCount.get(edge.target) ?? 0) + 1);
      }
    }
    const crossEdgeCount = chapterEdges.length - internalEdgeCount;
    const topNodes = Array.from(nodeHitCount.entries())
      .map(([nodeId, count]) => ({ nodeId, count }))
      .sort((a, b) => b.count - a.count || a.nodeId.localeCompare(b.nodeId, "zh-CN"))
      .slice(0, chapterPanelConfig.topNodesLimit);

    return {
      nodeCount: selectedChapterNodeSet.size,
      linkedEdgeCount: chapterEdges.length,
      internalEdgeCount,
      crossEdgeCount,
      avgWeight: (weightSum / chapterEdges.length).toFixed(1),
      topNodes
    };
  }, [
    chapterPanelConfig.topNodesLimit,
    focusedMiniGraphEdges,
    selectedChapterKey,
    selectedChapterNodeSet
  ]);

  const chapterTrendRows = useMemo<ChapterTrendRow[]>(() => {
    if (chapterTreeGroups.length === 0) {
      return [];
    }
    return chapterTreeGroups
      .map((group) => {
        const points = buildPseudoTrendPoints(
          group.edgeCount * 2 + group.nodes.length,
          chapterTrendSpan
        );
        const latest = points[points.length - 1] ?? 0;
        return {
          key: group.key,
          label: group.label.replace("（当前焦点）", ""),
          points,
          latest,
          delta: latest - (points[0] ?? 0),
          isActive: group.key === selectedChapterKey
        };
      })
      .sort((a, b) => {
        if (a.isActive) return -1;
        if (b.isActive) return 1;
        return b.latest - a.latest || a.label.localeCompare(b.label, "zh-CN");
      })
      .slice(0, chapterPanelConfig.trendRowsLimit);
  }, [chapterPanelConfig.trendRowsLimit, chapterTreeGroups, chapterTrendSpan, selectedChapterKey]);

  const groupedMiniGraphEdges = useMemo(() => {
    if (activeMiniGraphEdges.length === 0) {
      return [];
    }

    if (relationGroupBy === "none") {
      return [
        {
          key: "all",
          label: "全部关系",
          edges: activeMiniGraphEdges
        }
      ];
    }

    const groups = new Map<
      string,
      Array<{ source: string; target: string; weight: number }>
    >();

    for (const edge of activeMiniGraphEdges) {
      const sourceMeta = miniGraphNodeMetaMap.get(edge.source);
      const targetMeta = miniGraphNodeMetaMap.get(edge.target);
      const sourceGroup =
        relationGroupBy === "domain"
          ? sourceMeta?.domain ?? "unknown"
          : sourceMeta?.type ?? "unknown";
      const targetGroup =
        relationGroupBy === "domain"
          ? targetMeta?.domain ?? "unknown"
          : targetMeta?.type ?? "unknown";
      const groupKey = `${sourceGroup} → ${targetGroup}`;
      const list = groups.get(groupKey) ?? [];
      list.push(edge);
      groups.set(groupKey, list);
    }

    return Array.from(groups.entries())
      .map(([key, edges]) => ({ key, label: key, edges }))
      .sort((a, b) => b.edges.length - a.edges.length || a.label.localeCompare(b.label));
  }, [activeMiniGraphEdges, miniGraphNodeMetaMap, relationGroupBy]);

  const miniFlowLayout = useMemo<MiniFlowLayout | null>(() => {
    const anchorNode = relationFocusNode || selectedDoc?.id || "";
    if (!anchorNode || activeMiniGraphEdges.length === 0) {
      return null;
    }

    const nodeIds = new Set<string>([anchorNode]);
    for (const edge of activeMiniGraphEdges) {
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    }
    const positionMap = new Map<string, { x: number; y: number }>();
    let width = 460;
    let height = 260;

    if (relationLayoutMode === "chapter") {
      const chapterGroups = new Map<string, string[]>();
      for (const nodeId of nodeIds) {
        const chapterKey = deriveChapterAnchorKey(nodeId, miniGraphNodeMetaMap.get(nodeId));
        const list = chapterGroups.get(chapterKey) ?? [];
        list.push(nodeId);
        chapterGroups.set(chapterKey, list);
      }

      const anchorChapter = deriveChapterAnchorKey(
        anchorNode,
        miniGraphNodeMetaMap.get(anchorNode)
      );
      const chapterOrder = Array.from(chapterGroups.keys()).sort((a, b) => {
        if (a === anchorChapter) return -1;
        if (b === anchorChapter) return 1;
        return a.localeCompare(b, "zh-CN");
      });

      const columnCount = Math.max(1, chapterOrder.length);
      const maxNodesPerColumn = Math.max(
        1,
        ...chapterOrder.map((key) => chapterGroups.get(key)?.length ?? 0)
      );
      width = Math.max(460, columnCount * 190 + 120);
      height = Math.max(260, maxNodesPerColumn * 86 + 90);
      const xSpacing = columnCount > 1 ? (width - 120) / (columnCount - 1) : 0;

      chapterOrder.forEach((chapterKey, columnIndex) => {
        const ids = [...(chapterGroups.get(chapterKey) ?? [])].sort((a, b) => {
          if (a === anchorNode) return -1;
          if (b === anchorNode) return 1;
          const aLabel = miniGraphNodeMetaMap.get(a)?.label ?? a;
          const bLabel = miniGraphNodeMetaMap.get(b)?.label ?? b;
          return aLabel.localeCompare(bLabel, "zh-CN");
        });
        const ySpacing = ids.length > 1 ? (height - 90) / (ids.length - 1) : 0;
        const x = columnCount > 1 ? 60 + columnIndex * xSpacing : width / 2;
        ids.forEach((nodeId, index) => {
          const y = ids.length > 1 ? 45 + index * ySpacing : height / 2;
          positionMap.set(nodeId, { x, y });
        });
      });
    } else {
      const adjacency = new Map<string, Set<string>>();
      for (const edge of activeMiniGraphEdges) {
        const sourceSet = adjacency.get(edge.source) ?? new Set<string>();
        sourceSet.add(edge.target);
        adjacency.set(edge.source, sourceSet);
        const targetSet = adjacency.get(edge.target) ?? new Set<string>();
        targetSet.add(edge.source);
        adjacency.set(edge.target, targetSet);
      }

      const depthMap = new Map<string, number>([[anchorNode, 0]]);
      const queue = [anchorNode];
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;
        const currentDepth = depthMap.get(current) ?? 0;
        const neighbors = adjacency.get(current) ?? new Set<string>();
        for (const next of neighbors) {
          if (depthMap.has(next)) {
            continue;
          }
          depthMap.set(next, currentDepth + 1);
          queue.push(next);
        }
      }

      let maxDepth = Math.max(...Array.from(depthMap.values()), 0);
      for (const nodeId of nodeIds) {
        if (depthMap.has(nodeId)) {
          continue;
        }
        maxDepth += 1;
        depthMap.set(nodeId, maxDepth);
      }

      const grouped = new Map<number, string[]>();
      for (const nodeId of nodeIds) {
        const depth = depthMap.get(nodeId) ?? 0;
        const list = grouped.get(depth) ?? [];
        list.push(nodeId);
        grouped.set(depth, list);
      }

      const layers = Array.from(grouped.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([depth, ids]) => ({
          depth,
          ids: ids.sort((a, b) => a.localeCompare(b, "zh-CN"))
        }));

      const layerCount = Math.max(1, layers.length);
      const maxNodesPerLayer = Math.max(1, ...layers.map((layer) => layer.ids.length));
      width = Math.max(460, layerCount * 180 + 120);
      height = Math.max(240, maxNodesPerLayer * 86 + 80);
      const xSpacing = layerCount > 1 ? (width - 120) / (layerCount - 1) : 0;

      layers.forEach((layer, layerIndex) => {
        const ySpacing =
          layer.ids.length > 1 ? (height - 80) / (layer.ids.length - 1) : 0;
        const x = 60 + layerIndex * xSpacing;
        layer.ids.forEach((nodeId, index) => {
          const y =
            layer.ids.length > 1 ? 40 + index * ySpacing : height / 2;
          positionMap.set(nodeId, { x, y });
        });
      });
    }

    const nodes: MiniFlowNode[] = Array.from(nodeIds).map((nodeId) => {
      const position = positionMap.get(nodeId) ?? { x: 60, y: height / 2 };
      const fullLabel = miniGraphNodeMetaMap.get(nodeId)?.label ?? nodeId;
      return {
        id: nodeId,
        label: fullLabel,
        shortLabel: clipLabel(fullLabel, 8),
        chapterKey: deriveChapterAnchorKey(nodeId, miniGraphNodeMetaMap.get(nodeId)),
        x: position.x,
        y: position.y,
        isAnchor: nodeId === anchorNode
      };
    });

    const edges: MiniFlowEdge[] = activeMiniGraphEdges
      .map((edge, index) => {
        const source = positionMap.get(edge.source);
        const target = positionMap.get(edge.target);
        if (!source || !target) {
          return null;
        }
        const midX = (source.x + target.x) / 2;
        const curve = Math.abs(target.y - source.y) < 14 ? 26 : 0;
        return {
          id: `${edge.source}_${edge.target}_${index}`,
          source: edge.source,
          target: edge.target,
          weight: Math.max(1, Math.round(edge.weight ?? 1)),
          path: `M ${source.x} ${source.y} C ${midX} ${source.y - curve}, ${midX} ${
            target.y + curve
          }, ${target.x} ${target.y}`
        };
      })
      .filter((item): item is MiniFlowEdge => item !== null);

    return {
      width,
      height,
      nodes,
      edges
    };
  }, [
    activeMiniGraphEdges,
    miniGraphNodeMetaMap,
    relationFocusNode,
    relationLayoutMode,
    selectedDoc
  ]);

  useEffect(() => {
    setRelationWeightMin((prev) => Math.min(prev, miniEdgeWeightMax));
  }, [miniEdgeWeightMax]);

  useEffect(() => {
    setRelationTopN((prev) => Math.min(prev, miniEdgeTopNMax));
  }, [miniEdgeTopNMax]);

  useEffect(() => {
    if (chapterTreeGroups.length === 0) {
      if (selectedChapterKey !== "") {
        setSelectedChapterKey("");
      }
      return;
    }
    if (selectedChapterKey && chapterTreeGroups.some((item) => item.key === selectedChapterKey)) {
      return;
    }
    const anchorChapter = chapterTreeGroups.find((item) => item.isAnchor)?.key;
    setSelectedChapterKey(anchorChapter ?? chapterTreeGroups[0]?.key ?? "");
  }, [chapterTreeGroups, selectedChapterKey]);

  async function search(overrides?: {
    query?: string;
    typeFilter?: string;
    domainFilter?: string;
    tagFilter?: string;
  }) {
    setLoading(true);
    setError("");
    try {
      const nextQuery = overrides?.query ?? query;
      const nextTypeFilter = overrides?.typeFilter ?? typeFilter;
      const nextDomainFilter = overrides?.domainFilter ?? domainFilter;
      const nextTagFilter = overrides?.tagFilter ?? tagFilter;

      const params = new URLSearchParams();
      params.set("q", nextQuery);
      if (nextTypeFilter.trim()) params.set("type", nextTypeFilter.trim());
      if (nextDomainFilter.trim()) params.set("domain", nextDomainFilter.trim());
      if (nextTagFilter.trim()) params.set("tag", nextTagFilter.trim());

      const data = await requestJson<{ candidates: Candidate[] }>(`/api/kb/search?${params.toString()}`);
      setCandidates(data.candidates ?? []);
      setSelectedDoc(null);
      setCitationFocus("");
      setRelationFocusNode("");
      setRelationDirection("all");
      setRelationGroupBy("none");
      setRelationLayoutMode("chapter");
      setRelationWeightMin(1);
      setRelationTopN(8);
      setHoveredRelationId("");
      setSelectedChapterKey("");
      setChapterSubgraphMode(chapterPanelConfig.defaultSubgraphMode);
      setChapterTrendSpan(chapterPanelConfig.defaultTrendSpan);
    } catch (err) {
      setError(formatErrorMessage(err, "检索失败。"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDoc(docId: string, options?: { silent?: boolean }) {
    setLoading(true);
    if (!options?.silent) {
      setError("");
    }
    try {
      const data = await requestJson<DocDetail>(`/api/kb/doc/${encodeURIComponent(docId)}`);
      setSelectedDoc(data);
      setCitationFocus(data.sourceRefs[0] ?? "");
      setRelationFocusNode(data.id);
      setRelationDirection("all");
      setRelationGroupBy("none");
      setRelationLayoutMode("chapter");
      setRelationWeightMin(1);
      setRelationTopN(8);
      setHoveredRelationId("");
      setSelectedChapterKey("");
      setChapterSubgraphMode(chapterPanelConfig.defaultSubgraphMode);
      setChapterTrendSpan(chapterPanelConfig.defaultTrendSpan);
      await loadGraph(docId, graphLimit);
      return true;
    } catch (err) {
      if (!options?.silent) {
        setError(formatErrorMessage(err, "加载文档详情失败。"));
        console.error(err);
      }
      return false;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const bootstrapQuery = presetQuery || presetNoteId;
    if (!bootstrapQuery) {
      return;
    }
    const contextKey = `${presetFrom}|${presetNodeLabel}|${presetNoteId}|${presetQuery}|${
      presetAutoSearch ? "1" : "0"
    }`;
    if (externalContextAppliedRef.current === contextKey) {
      return;
    }
    externalContextAppliedRef.current = contextKey;

    setQuery(bootstrapQuery);
    setTypeFilter("");
    setDomainFilter("");
    setTagFilter("");
    const sourceLabel =
      presetFrom === "graph_save"
        ? "图谱沉淀回看"
        : presetFrom
          ? presetFrom
          : "外部上下文";
    const nodeLabelHint = presetNodeLabel ? ` · 节点：${presetNodeLabel}` : "";
    setExternalContextHint(`已从${sourceLabel}带入检索词：${bootstrapQuery}${nodeLabelHint}`);

    const bootstrap = async () => {
      if (!presetAutoSearch) {
        return;
      }
      if (presetNoteId) {
        const opened = await loadDoc(presetNoteId, { silent: true });
        if (opened) {
          setExternalContextHint(
            `已从${sourceLabel}带入并自动打开笔记：${presetNoteId}${nodeLabelHint}`
          );
          return;
        }
      }
      await search({
        query: bootstrapQuery,
        typeFilter: "",
        domainFilter: "",
        tagFilter: ""
      });
      if (presetNoteId) {
        setExternalContextHint(
          `未直接命中笔记 ${presetNoteId}，已按上下文自动检索候选${nodeLabelHint}`
        );
      }
    };
    void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetAutoSearch, presetFrom, presetNodeLabel, presetNoteId, presetQuery]);

  async function rebuildIndex() {
    setLoading(true);
    setError("");
    try {
      const data = await requestJson<IndexSummary>("/api/kb/index/rebuild", { method: "POST" });
      setIndexSummary(data);
      await loadTags();
      await loadGraph(selectedDoc?.id, graphLimit);
    } catch (err) {
      setError(formatErrorMessage(err, "重建索引失败。"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function applyTag(tag: string) {
    setTagFilter(tag);
    setQuery(tag);
    void search({
      query: tag,
      tagFilter: tag
    });
  }

  function applyChapterPanelPreset(preset: Exclude<ChapterPanelPreset, "custom">) {
    const nextConfig = CHAPTER_PANEL_PRESETS[preset];
    setChapterPanelPreset(preset);
    setChapterPanelConfig(nextConfig);
    setChapterSubgraphMode(nextConfig.defaultSubgraphMode);
    setChapterTrendSpan(nextConfig.defaultTrendSpan);
  }

  const kbGraphNodeCount = graph?.nodes.length ?? 0;
  const kbGraphEdgeCount = graph?.edges.length ?? 0;

  return (
    <div className={`demo-form demo-form-kb${compactMode ? " is-compact" : ""}`}>
      <div className="demo-toolbar">
        <span>知识库检索工作台</span>
        <div className="demo-toolbar-actions">
          <button
            type="button"
            className={`demo-compact-toggle${compactMode ? " active" : ""}`}
            onClick={() => setCompactMode((prev) => !prev)}
          >
            {compactMode ? "紧凑模式" : "舒展模式"}
          </button>
          <button type="button" className="demo-reset-toggle" onClick={resetKbLayout}>
            重置分区
          </button>
        </div>
      </div>
      <SectionAnchorNav
        title="知识库分区导航"
        storageKey="kb_demo"
        items={[
          { id: "kb_search_panel", label: "检索控制" },
          { id: "kb_candidates_panel", label: "候选结果" },
          { id: "kb_doc_panel", label: "文档阅读" },
          { id: "kb_graph_panel", label: "关系图谱" },
          { id: "kb_index_panel", label: "索引摘要" },
          { id: "kb_error_panel", label: "状态反馈" }
        ]}
      />
      <div className="demo-metric-strip">
        <div className="demo-metric-chip">
          <span>候选结果</span>
          <strong>{candidates.length}</strong>
        </div>
        <div className="demo-metric-chip">
          <span>焦点文档</span>
          <strong>{selectedDoc ? selectedDoc.id : "未选中"}</strong>
        </div>
        <div className="demo-metric-chip">
          <span>图谱规模</span>
          <strong>
            {kbGraphNodeCount}/{kbGraphEdgeCount}
          </strong>
        </div>
        <div className="demo-metric-chip">
          <span>标签总数</span>
          <strong>{tags.length}</strong>
        </div>
      </div>
      <div id="kb_search_panel" className="kb-search-panel panel-surface anchor-target">
        <div className="section-head">
          <strong>检索控制台</strong>
          <span>关键词过滤、标签聚合与索引重建入口</span>
        </div>
        <div className="kb-filter-grid">
          <label className="form-field">
            <span>检索关键词</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="例如：等差数列 / 单调性 / 复盘"
            />
          </label>
          <label className="form-field">
            <span>类型过滤（可选）</span>
            <input
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              placeholder="note / source / playbook / skill / daily"
            />
          </label>
          <label className="form-field">
            <span>领域过滤（可选）</span>
            <input
              value={domainFilter}
              onChange={(event) => setDomainFilter(event.target.value)}
              placeholder="math / physics / general"
            />
          </label>
          <label className="form-field">
            <span>标签过滤（可选）</span>
            <input
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
              placeholder="例如：复盘"
            />
          </label>
        </div>
        <div className="action-row">
          <button type="button" onClick={() => void search()} disabled={loading}>
            搜索知识库
          </button>
          <button type="button" onClick={rebuildIndex} disabled={loading}>
            重建索引摘要
          </button>
        </div>
        {externalContextHint ? (
          <div className="result-box info">
            <strong>外部回看上下文</strong>
            <p>{externalContextHint}</p>
            <div className="result-box-actions">
              {presetNoteId ? (
                <button
                  type="button"
                  onClick={() => void loadDoc(presetNoteId)}
                  disabled={loading}
                >
                  打开目标笔记详情
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  void search({
                    query: presetQuery || presetNoteId || query,
                    typeFilter: "",
                    domainFilter: "",
                    tagFilter: ""
                  })
                }
                disabled={loading}
              >
                按上下文重跑检索
              </button>
              {presetSessionId ? (
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams({
                      sessionId: presetSessionId,
                      from: "kb_backlink"
                    });
                    if (presetNoteId) {
                      params.set("noteId", presetNoteId);
                    }
                    router.push(`/workspace?${params.toString()}`);
                  }}
                  disabled={loading}
                >
                  返回工作区会话
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="card-item">
          <strong>沉浸阅读模式</strong>
          <p className="muted">融合 Obsidian 双链结构与 NotebookLM 摘录卡片风格。</p>
          <div className="btn-row btn-row-top">
            <button type="button" onClick={() => setReadingMode("cards")} disabled={loading}>
              卡片视图
            </button>
            <button type="button" onClick={() => setReadingMode("plain")} disabled={loading}>
              原文视图
            </button>
          </div>
        </div>
        <label>反链图节点上限（10-300）</label>
        <input
          type="number"
          min={10}
          max={300}
          step={10}
          value={graphLimit}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value)) {
              setGraphLimit(Math.min(300, Math.max(10, value)));
            }
          }}
        />

        {tags.length > 0 ? (
          <div className="card-item">
            <strong>标签聚合（点击可快速过滤）</strong>
            <div className="btn-row btn-row-top">
              {tags.slice(0, 20).map((item) => (
                <button
                  type="button"
                  key={item.tag}
                  onClick={() => applyTag(item.tag)}
                  disabled={loading}
                  className="note-chip"
                >
                  {item.tag} ({item.count})
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="card-item">
          <strong>当前过滤器</strong>
          <p>
            {`q=${query || "无"} · type=${typeFilter || "无"} · domain=${domainFilter || "无"} · tag=${tagFilter || "无"}`}
          </p>
        </div>
      </div>

      {candidates.length > 0 ? (
        <CollapsiblePanel
          id="kb_candidates_panel"
          title={`候选结果（${candidates.length}）`}
          subtitle="按语义召回评分排序，支持快速打开详情"
          storageKey="kb_candidates_panel"
          className="anchor-target"
          defaultExpanded={false}
        >
          <div className="card-list kb-candidate-list">
            {candidates.map((candidate) => (
              <div className="card-item" key={candidate.docId}>
                <strong>{candidate.docId}</strong>
                <p>得分：{candidate.score.toFixed(2)}</p>
                <p>{candidate.snippet}</p>
                <p>召回原因：{candidate.reason.join(", ") || "未知"}</p>
                <button type="button" onClick={() => loadDoc(candidate.docId)} disabled={loading}>
                  查看详情
                </button>
              </div>
            ))}
          </div>
        </CollapsiblePanel>
      ) : null}

      <CollapsiblePanel
        id="kb_doc_panel"
        title="文档阅读与关系洞察"
        subtitle="Obsidian 风格双链阅读与 NotebookLM 摘录融合"
        storageKey="kb_doc_panel"
        className="kb-doc-panel anchor-target"
        defaultExpanded
      >
        {selectedDoc && readingMode === "cards" ? (
          <div className="obsidian-board">
          <article className="obsidian-focus-card">
            <header>
              <h4>{selectedDoc.title}</h4>
              <span>{selectedDoc.type} / {selectedDoc.domain}</span>
            </header>
            <p>{selectedDoc.content.slice(0, 240)}...</p>
            <div>
              {selectedDoc.tags.map((tag) => (
                <button
                  type="button"
                  key={`focus_tag_${tag}`}
                  className="note-chip"
                  onClick={() => applyTag(tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </article>

          <aside className="obsidian-rail">
            <MiniFoldCard title="知识脉络时间轴" subtitle="按更新时间与关联关系快速回看" defaultOpen>
              <div className="timeline-list">
                {timelineEntries.map((item) => (
                  <div className="timeline-item" key={item.id}>
                    <span>{item.label}</span>
                    <p>{item.detail}</p>
                  </div>
                ))}
              </div>
            </MiniFoldCard>

            <MiniFoldCard title="双链引用" subtitle="从引用文档直接回看上下文" defaultOpen>
              <p>{selectedDoc.backlinks.length} 篇文档引用了当前卡片</p>
              <div>
                {selectedDoc.backlinks.slice(0, 8).map((docId) => (
                  <button
                    type="button"
                    key={`back_${docId}`}
                    className="note-chip"
                    onClick={() => loadDoc(docId)}
                  >
                    {docId}
                  </button>
                ))}
              </div>
            </MiniFoldCard>

            <MiniFoldCard title="NotebookLM 摘录" subtitle="自动提炼高价值原文段落" defaultOpen={false}>
              {notebookQuotes.length === 0 ? (
                <p className="muted">暂无可提炼段落。</p>
              ) : (
                notebookQuotes.map((quote, index) => (
                  <blockquote key={`quote_${index}`}>{quote}</blockquote>
                ))
              )}
            </MiniFoldCard>

            <MiniFoldCard title="引用高亮跳转" subtitle="按 sourceRef 快速定位原文证据" defaultOpen={false}>
              <p className="muted">点击 sourceRef 后，下方片段会按关键词高亮显示。</p>
              <div className="btn-row btn-row-bottom">
                {selectedDoc.sourceRefs.length === 0 ? (
                  <span className="muted">当前文档没有 sourceRefs。</span>
                ) : (
                  selectedDoc.sourceRefs.map((item) => (
                    <button
                      type="button"
                      key={`src_${item}`}
                      className="note-chip"
                      onClick={() => setCitationFocus(item)}
                    >
                      {item}
                    </button>
                  ))
                )}
              </div>
              {citationSnippets.map((line, index) => (
                <blockquote key={`citation_${index}`}>
                  {renderHighlightedText(line, highlightKeywords)}
                </blockquote>
              ))}
            </MiniFoldCard>

            <MiniFoldCard title="关系小地图" subtitle="章节锚点与关系链路联动分析" defaultOpen={false}>
              {miniGraphEdges.length === 0 ? (
                <p className="muted">当前焦点节点附近暂无关系边。</p>
              ) : (
                <div className="mini-map-wrap">
                  <div className="mini-node-row">
                    {miniGraphNodeList.map((nodeId) => (
                      <button
                        type="button"
                        key={`mini_node_${nodeId}`}
                        className={`mini-node-chip ${relationFocusNode === nodeId ? "active" : ""}`}
                        onClick={() =>
                          setRelationFocusNode((prev) => (prev === nodeId ? "" : nodeId))
                        }
                      >
                        {nodeId}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="mini-node-clear"
                      onClick={() => {
                        setRelationFocusNode("");
                        setRelationDirection("all");
                        setRelationGroupBy("none");
                        setRelationLayoutMode("chapter");
                        setRelationTopN(8);
                        setSelectedChapterKey("");
                        setChapterSubgraphMode(chapterPanelConfig.defaultSubgraphMode);
                        setChapterTrendSpan(chapterPanelConfig.defaultTrendSpan);
                      }}
                    >
                      清除过滤
                    </button>
                  </div>

                  <div className="mini-chapter-panel">
                    <div className="mini-chapter-head">
                      <strong>章节树侧栏</strong>
                      <span>{chapterTreeGroups.length} 个章节锚点</span>
                    </div>
                    {chapterTreeGroups.length === 0 ? (
                      <p className="mini-chapter-empty">当前无可用章节锚点。</p>
                    ) : (
                      <div className="mini-chapter-list">
                        {chapterTreeGroups.map((chapter) => (
                          <button
                            type="button"
                            key={`chapter_${chapter.key}`}
                            className={`mini-chapter-chip ${
                              selectedChapterKey === chapter.key ? "active" : ""
                            }`}
                            onClick={() => setSelectedChapterKey(chapter.key)}
                          >
                            <span>{chapter.label}</span>
                            <em>
                              {chapter.nodes.length} 节点 · {chapter.edgeCount} 边
                            </em>
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      className="mini-chapter-clear"
                      onClick={() => {
                        setSelectedChapterKey("");
                        setChapterSubgraphMode(chapterPanelConfig.defaultSubgraphMode);
                      }}
                      disabled={!selectedChapterKey}
                    >
                      清除章节高亮
                    </button>

                    <div className="mini-chapter-config-panel">
                      <div className="mini-chapter-config-head">
                        <strong>章节参数面板</strong>
                        <span>模板：{formatChapterPanelPresetLabel(chapterPanelPreset)}</span>
                      </div>
                      <div className="mini-chapter-config-presets">
                        {(
                          [
                            { key: "insight", label: "深度洞察" },
                            { key: "balanced", label: "平衡默认" },
                            { key: "light", label: "轻量概览" }
                          ] as Array<{
                            key: Exclude<ChapterPanelPreset, "custom">;
                            label: string;
                          }>
                        ).map((item) => (
                          <button
                            type="button"
                            key={`chapter_preset_${item.key}`}
                            className={`mini-chapter-mode-chip ${
                              chapterPanelPreset === item.key ? "active" : ""
                            }`}
                            onClick={() => applyChapterPanelPreset(item.key)}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <div className="mini-chapter-config-grid">
                        <label>
                          关键节点上限：{chapterPanelConfig.topNodesLimit}
                          <input
                            type="range"
                            min={2}
                            max={8}
                            step={1}
                            value={chapterPanelConfig.topNodesLimit}
                            onChange={(event) => {
                              setChapterPanelPreset("custom");
                              setChapterPanelConfig((prev) =>
                                normalizeChapterPanelConfig({
                                  ...prev,
                                  topNodesLimit: Number(event.target.value)
                                })
                              );
                            }}
                          />
                        </label>
                        <label>
                          趋势行上限：{chapterPanelConfig.trendRowsLimit}
                          <input
                            type="range"
                            min={3}
                            max={8}
                            step={1}
                            value={chapterPanelConfig.trendRowsLimit}
                            onChange={(event) => {
                              setChapterPanelPreset("custom");
                              setChapterPanelConfig((prev) =>
                                normalizeChapterPanelConfig({
                                  ...prev,
                                  trendRowsLimit: Number(event.target.value)
                                })
                              );
                            }}
                          />
                        </label>
                        <label>
                          默认子图模式
                          <select
                            value={chapterPanelConfig.defaultSubgraphMode}
                            onChange={(event) => {
                              const nextMode = event.target.value as ChapterSubgraphMode;
                              setChapterPanelPreset("custom");
                              setChapterPanelConfig((prev) => ({
                                ...prev,
                                defaultSubgraphMode: nextMode
                              }));
                              setChapterSubgraphMode(nextMode);
                            }}
                          >
                            <option value="highlight">高亮模式</option>
                            <option value="focus">仅本章子图</option>
                          </select>
                        </label>
                        <label>
                          默认趋势窗口
                          <select
                            value={chapterPanelConfig.defaultTrendSpan}
                            onChange={(event) => {
                              const nextSpan = Number(event.target.value) === 14 ? 14 : 7;
                              setChapterPanelPreset("custom");
                              setChapterPanelConfig((prev) => ({
                                ...prev,
                                defaultTrendSpan: nextSpan
                              }));
                              setChapterTrendSpan(nextSpan);
                            }}
                          >
                            <option value={7}>7 次</option>
                            <option value={14}>14 次</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mini-chapter-mode-row">
                    {(
                      [
                        { key: "highlight", label: "高亮模式" },
                        { key: "focus", label: "仅本章子图" }
                      ] as Array<{ key: ChapterSubgraphMode; label: string }>
                    ).map((item) => (
                      <button
                        type="button"
                        key={`chapter_mode_${item.key}`}
                        className={`mini-chapter-mode-chip ${
                          chapterSubgraphMode === item.key ? "active" : ""
                        }`}
                        onClick={() => setChapterSubgraphMode(item.key)}
                        disabled={!selectedChapterKey && item.key === "focus"}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {selectedChapterStats ? (
                    <div className="mini-chapter-stats">
                      <strong>章节子图统计</strong>
                      <div className="mini-chapter-kpis">
                        <span>节点 {selectedChapterStats.nodeCount}</span>
                        <span>关联边 {selectedChapterStats.linkedEdgeCount}</span>
                        <span>章内边 {selectedChapterStats.internalEdgeCount}</span>
                        <span>跨章边 {selectedChapterStats.crossEdgeCount}</span>
                        <span>平均权重 {selectedChapterStats.avgWeight}</span>
                      </div>
                      {selectedChapterStats.topNodes.length > 0 ? (
                        <div className="mini-chapter-topnodes">
                          {selectedChapterStats.topNodes.map((item) => (
                            <button
                              type="button"
                              key={`chapter_top_${item.nodeId}`}
                              className="note-chip"
                              onClick={() => setRelationFocusNode(item.nodeId)}
                            >
                              {item.nodeId} · {item.count}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="mini-chapter-empty">当前章节暂无关键连接节点。</p>
                      )}

                      {chapterTrendRows.length > 0 ? (
                        <div className="mini-chapter-trend">
                          <div className="mini-chapter-trend-toolbar">
                            <strong>章节关系趋势（近 {chapterTrendSpan} 次迭代）</strong>
                            <div className="mini-chapter-trend-window">
                              {([7, 14] as ChapterTrendSpan[]).map((span) => (
                                <button
                                  type="button"
                                  key={`trend_span_${span}`}
                                  className={`mini-chapter-mode-chip ${
                                    chapterTrendSpan === span ? "active" : ""
                                  }`}
                                  onClick={() => setChapterTrendSpan(span)}
                                >
                                  {span} 次
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="mini-chapter-trend-list">
                            {chapterTrendRows.map((row) => {
                              const peak = Math.max(...row.points, 1);
                              return (
                                <div
                                  key={`chapter_trend_${row.key}`}
                                  className={`mini-chapter-trend-row ${
                                    row.isActive ? "active" : ""
                                  }`}
                                >
                                  <div className="mini-chapter-trend-head">
                                    <span>{row.label}</span>
                                    <em>
                                      {row.latest}（Δ{row.delta > 0 ? "+" : ""}
                                      {row.delta}）
                                    </em>
                                  </div>
                                  <div className="mini-chapter-trend-bars">
                                    {row.points.map((point, index) => (
                                      <span
                                        key={`trend_${row.key}_${index}`}
                                        style={{
                                          height: `${Math.max(18, Math.round((point / peak) * 44))}%`
                                        }}
                                      />
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mini-direction-row">
                    {(
                      [
                        { key: "all", label: "全部关系" },
                        { key: "in", label: "只看入边" },
                        { key: "out", label: "只看出边" }
                      ] as Array<{ key: RelationDirection; label: string }>
                    ).map((item) => (
                      <button
                        type="button"
                        key={`dir_${item.key}`}
                        className={`mini-direction-chip ${relationDirection === item.key ? "active" : ""}`}
                        onClick={() => setRelationDirection(item.key)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="mini-group-row">
                    {(
                      [
                        { key: "none", label: "不分组" },
                        { key: "domain", label: "按主题域" },
                        { key: "type", label: "按文档类型" }
                      ] as Array<{ key: RelationGroupBy; label: string }>
                    ).map((item) => (
                      <button
                        type="button"
                        key={`group_${item.key}`}
                        className={`mini-group-chip ${relationGroupBy === item.key ? "active" : ""}`}
                        onClick={() => setRelationGroupBy(item.key)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="mini-layout-row">
                    {(
                      [
                        { key: "chapter", label: "章节锚点布局" },
                        { key: "graph", label: "自由图布局" }
                      ] as Array<{ key: MiniLayoutMode; label: string }>
                    ).map((item) => (
                      <button
                        type="button"
                        key={`layout_${item.key}`}
                        className={`mini-layout-chip ${relationLayoutMode === item.key ? "active" : ""}`}
                        onClick={() => setRelationLayoutMode(item.key)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  <div className="mini-weight-row">
                    <label>权重阈值：{relationWeightMin}</label>
                    <input
                      type="range"
                      min={1}
                      max={miniEdgeWeightMax}
                      step={1}
                      value={relationWeightMin}
                      onChange={(event) =>
                        setRelationWeightMin(
                          Math.min(
                            miniEdgeWeightMax,
                            Math.max(1, Number(event.target.value) || 1)
                          )
                        )
                      }
                      disabled={miniEdgeWeightMax <= 1}
                    />
                  </div>

                  <div className="mini-topn-row">
                    <label>仅看 Top N：{relationTopN}</label>
                    <input
                      type="range"
                      min={1}
                      max={miniEdgeTopNMax}
                      step={1}
                      value={Math.min(relationTopN, miniEdgeTopNMax)}
                      onChange={(event) =>
                        setRelationTopN(
                          Math.min(
                            miniEdgeTopNMax,
                            Math.max(1, Number(event.target.value) || 1)
                          )
                        )
                      }
                      disabled={miniEdgeTopNMax <= 1}
                    />
                  </div>

                  <div className="mini-edge-list">
                    {focusedMiniGraphEdges.length === 0 ? (
                      <p className="muted">当前节点暂无相邻关系。</p>
                    ) : (
                      groupedMiniGraphEdges.map((group) => (
                        <div
                          className={`mini-edge-group ${relationGroupBy === "none" ? "flat" : ""}`}
                          key={`mini_group_${group.key}`}
                        >
                          {relationGroupBy === "none" ? null : (
                            <div className="mini-edge-group-head">
                              <strong>{group.label}</strong>
                              <em>{group.edges.length}</em>
                            </div>
                          )}
                          {group.edges.map((edge, index) => {
                            const edgeId = `${group.key}-${edge.source}->${edge.target}-${index}`;
                            const edgeActive =
                              hoveredRelationId === edgeId ||
                              (relationFocusNode !== "" &&
                                (edge.source === relationFocusNode ||
                                  edge.target === relationFocusNode));
                            const chapterMatched =
                              selectedChapterNodeSet.size === 0 ||
                              selectedChapterNodeSet.has(edge.source) ||
                              selectedChapterNodeSet.has(edge.target);
                            const chapterClass =
                              selectedChapterNodeSet.size === 0 ||
                              chapterSubgraphMode === "focus"
                                ? ""
                                : chapterMatched
                                  ? "chapter-highlight"
                                  : "dim";
                            return (
                              <div
                                className={`mini-edge-row ${edgeActive ? "active" : ""} ${chapterClass}`}
                                key={`mini_edge_${edgeId}`}
                                onMouseEnter={() => setHoveredRelationId(edgeId)}
                                onMouseLeave={() => setHoveredRelationId("")}
                              >
                                <button
                                  type="button"
                                  className="note-chip"
                                  onClick={() => loadDoc(edge.source)}
                                >
                                  {edge.source}
                                </button>
                                <span>→</span>
                                <button
                                  type="button"
                                  className="note-chip"
                                  onClick={() => loadDoc(edge.target)}
                                >
                                  {edge.target}
                                </button>
                                <span className="mini-edge-weight">
                                  w{Math.max(1, Math.round(edge.weight ?? 1))}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mini-map-footnote">
                    {relationGroupBy === "none"
                      ? "当前按边权重排序展示。"
                      : relationGroupBy === "domain"
                        ? "已按 source -> target 的主题域分组。"
                        : "已按 source -> target 的文档类型分组。"}
                    {" · "}
                    {relationLayoutMode === "chapter"
                      ? "当前启用章节锚点布局。"
                      : "当前启用自由图布局。"}
                    {selectedChapterKey
                      ? ` · 当前高亮章节：${selectedChapterKey}`
                      : " · 当前显示全量子图。"}
                    {selectedChapterKey
                      ? chapterSubgraphMode === "focus"
                        ? "（仅显示本章关系）"
                        : "（保留全图并高亮本章）"
                      : ""}
                  </div>

                  {miniFlowLayout ? (
                    <div className="mini-flow-map">
                      <strong>章节路径自动布局</strong>
                      <span className="mini-flow-highlight-state">
                        {selectedChapterKey
                          ? `已高亮：${selectedChapterKey}`
                          : "未启用章节高亮"}
                      </span>
                      <svg
                        viewBox={`0 0 ${miniFlowLayout.width} ${miniFlowLayout.height}`}
                        className="mini-flow-svg"
                        role="img"
                        aria-label="关系路径自动布局图"
                      >
                        <defs>
                          <marker
                            id="mini_flow_arrow"
                            markerWidth="8"
                            markerHeight="8"
                            refX="6"
                            refY="3.5"
                            orient="auto"
                          >
                            <polygon points="0 0, 7 3.5, 0 7" className="mini-flow-arrow" />
                          </marker>
                        </defs>
                        {miniFlowLayout.edges.map((edge, index) => {
                          const chapterMatched =
                            selectedChapterNodeSet.size === 0 ||
                            selectedChapterNodeSet.has(edge.source) ||
                            selectedChapterNodeSet.has(edge.target);
                          const chapterClass =
                            selectedChapterNodeSet.size === 0 ||
                            chapterSubgraphMode === "focus"
                              ? ""
                              : chapterMatched
                                ? "chapter-highlight"
                                : "dim";
                          return (
                            <path
                              key={`flow_edge_${edge.id}`}
                              d={edge.path}
                              className={`mini-flow-edge ${chapterClass}`}
                              markerEnd="url(#mini_flow_arrow)"
                              style={{ animationDelay: `${index * 0.08}s` }}
                            />
                          );
                        })}
                        {miniFlowLayout.nodes.map((node) => {
                          const chapterMatched =
                            selectedChapterNodeSet.size === 0 ||
                            selectedChapterNodeSet.has(node.id);
                          const chapterClass =
                            selectedChapterNodeSet.size === 0 ||
                            chapterSubgraphMode === "focus"
                              ? ""
                              : chapterMatched
                                ? "chapter-highlight"
                                : "dim";
                          return (
                            <g
                              key={`flow_node_${node.id}`}
                              className={`mini-flow-node ${node.isAnchor ? "anchor" : ""} ${chapterClass}`}
                              transform={`translate(${node.x}, ${node.y})`}
                              role="button"
                              tabIndex={0}
                              onClick={() => loadDoc(node.id)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  void loadDoc(node.id);
                                }
                              }}
                            >
                              <circle r={node.isAnchor ? 17 : 14} />
                              <text textAnchor="middle" y="4">
                                {node.shortLabel}
                              </text>
                              <title>{node.label}</title>
                            </g>
                          );
                        })}
                      </svg>
                      <p className="mini-map-footnote">
                        箭头动画表示关系方向，点击节点可直接跳转文档。
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
            </MiniFoldCard>

            {relatedCards.length > 0 ? (
              <MiniFoldCard title="关联卡片建议" subtitle="按关联强度给出跳转建议" defaultOpen={false}>
                {relatedCards.map((item) => (
                  <button
                    type="button"
                    key={`rel_${item.id}`}
                    onClick={() => loadDoc(item.id)}
                    className="note-chip note-chip-block"
                  >
                    {item.title} {item.score > 0 ? `(${item.score.toFixed(1)})` : ""}
                  </button>
                ))}
              </MiniFoldCard>
            ) : null}
          </aside>
          </div>
        ) : null}

        {selectedDoc && readingMode === "plain" ? (
          <div className="result-box">
          <strong>文档：{selectedDoc.title}</strong>
          {"\n"}
          id: {selectedDoc.id}
          {"\n"}
          type/domain: {selectedDoc.type} / {selectedDoc.domain}
          {"\n"}
          tags: {selectedDoc.tags.join(", ") || "无"}
          {"\n"}
          links: {selectedDoc.links.join(", ") || "无"}
          {"\n"}
          backlinks: {selectedDoc.backlinks.join(", ") || "无"}
          {"\n\n"}
          {selectedDoc.content
            .split("\n")
            .map((line, index) => (
              <span key={`plain_${index}`}>
                {renderHighlightedText(line, highlightKeywords)}
                {"\n"}
              </span>
            ))}
          </div>
        ) : null}
      </CollapsiblePanel>

      {selectedDoc && selectedDoc.backlinks.length > 0 ? (
        <div className="card-list">
          <div className="card-item">
            <strong>反向链接跳转</strong>
            <p>以下文档引用了当前文档，可直接点击查看详情。</p>
            <div>
              {selectedDoc.backlinks.map((docId) => (
                <button
                  type="button"
                  key={docId}
                  onClick={() => loadDoc(docId)}
                  disabled={loading}
                  className="note-chip"
                >
                  {docId}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <CollapsiblePanel
        id="kb_graph_panel"
        title="反链图谱概览"
        subtitle="节点关系摘要与热度分布"
        storageKey="kb_graph_panel"
        className="kb-graph-panel panel-surface anchor-target"
        defaultExpanded={false}
      >
        {graph ? (
          <div className="card-list">
            <div className="result-box">
              <strong>反链图摘要 {graph.focusDocId ? `(焦点：${graph.focusDocId})` : "(全局)"}</strong>
              {"\n"}
              节点数：{graph.nodes.length}，关系数：{graph.edges.length}
              {"\n\n"}
              {graph.edges.length === 0
                ? "暂无边关系。"
                : graph.edges
                    .slice(0, 20)
                    .map((edge) => `- ${edge.source} -> ${edge.target}`)
                    .join("\n")}
            </div>
            {graphHeat.length > 0 ? (
              <div className="card-item">
                <strong>关系热度榜（Top 8）</strong>
                <p className="muted">用于识别知识网络中的枢纽节点与薄弱链路。</p>
                {graphHeat.map((item) => {
                  const max = graphHeat[0]?.count || 1;
                  const ratio = Math.max(8, Math.round((item.count / max) * 100));
                  return (
                    <div className="heat-row" key={item.id}>
                      <span>{item.label}</span>
                      <div className="heat-track">
                        <div className="heat-fill" style={{ width: `${ratio}%` }} />
                      </div>
                      <em>{item.count}</em>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        ) : null}
      </CollapsiblePanel>

      <CollapsiblePanel
        id="kb_index_panel"
        title="索引重建摘要"
        subtitle="记录文档规模、类型分布与领域覆盖"
        storageKey="kb_index_panel"
        className="kb-index-panel panel-surface anchor-target"
        defaultExpanded={false}
      >
        {indexSummary ? (
          <div className="result-box">
            <strong>索引重建完成</strong>
            {"\n"}
            生成时间：{indexSummary.generatedAt}
            {"\n"}
            文档总数：{indexSummary.docCount}
            {"\n"}
            类型统计：{JSON.stringify(indexSummary.byType)}
            {"\n"}
            领域统计：{JSON.stringify(indexSummary.byDomain)}
          </div>
        ) : null}
      </CollapsiblePanel>

      {error ? (
        <div id="kb_error_panel" className="result-box danger anchor-target">
          {error}
        </div>
      ) : null}
    </div>
  );
}

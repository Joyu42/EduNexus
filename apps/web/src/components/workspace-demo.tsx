"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatErrorMessage, readApiErrorMessage, requestJson } from "@/lib/client/api";
import { pushGraphActivityEventToStorage } from "@/lib/client/graph-activity";
import {
  buildWorkspacePromptFromFocus,
  readWorkspaceFocusBatchFromStorage,
  readWorkspaceFocusFromStorage,
  type PathFocusPayload
} from "@/lib/client/path-focus-bridge";

type Citation = {
  sourceId: string;
  chunkRef: string;
  quote?: string;
};

type NextResponsePayload = {
  nextLevel: number;
  guidance: string;
  canUnlockFinal: boolean;
  citations?: Citation[];
};

type UnlockResponsePayload = {
  unlocked: boolean;
  finalAnswer?: string;
  reason?: string;
  citations?: Citation[];
};

type AgentRunResponsePayload = {
  intent: string;
  nextLevel: number;
  guidance: string;
  mode: "rule" | "langgraph_model";
  contextRefs: string[];
  trace: string[];
  citations?: Citation[];
};

type AgentStreamMeta = {
  mode: "rule" | "langgraph_model";
  intent: string;
  nextLevel: number;
  contextRefs: string[];
};

type StreamStageKey = "route" | "retrieve" | "generate" | "finalize";
type StreamStageStatus = "pending" | "running" | "done";
type StreamStageMap = Record<StreamStageKey, StreamStageStatus>;
type StreamTimelineItem = {
  id: number;
  trace: string;
  at: string;
};

type ReplaySpeedKey = "1x" | "1.5x" | "2x";
type ReplayState = {
  timelineSnapshot: StreamTimelineItem[];
  fallbackTraceSnapshot: string[];
  tokenChunks: string[];
  timelineCursor: number;
  tokenCursor: number;
};

type ReplayTraceFrame = {
  trace: string;
  at: string;
};

type ReplayProgress = {
  current: number;
  total: number;
  ratio: number;
};

type ReplayAnchorSteps = Record<StreamStageKey, number | null>;

type ReplayBookmark = {
  id: string;
  label: string;
  step: number;
  createdAt: string;
};

type ReplayPanelPreset = "quick" | "balanced" | "deep" | "custom";

type ReplayPanelConfig = {
  maxBookmarks: number;
  defaultSpeed: ReplaySpeedKey;
  autoExportSummary: boolean;
};

type ReplayScriptSnapshot = {
  sessionId: string;
  sessionTitle: string;
  exportedAt: string;
  totalSteps: number;
  anchorSteps: ReplayAnchorSteps;
  bookmarks: ReplayBookmark[];
};

type StreamMarkdownSnapshot = {
  sessionId: string;
  sessionTitle: string;
  mode: string;
  intent: string;
  nextLevel: number;
  traceLines: string[];
  guidance: string;
  refs: string[];
};

type Message = {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

type SaveNoteResponse = {
  noteId: string;
  path: string;
};

type SessionSummary = {
  id: string;
  title: string;
  lastLevel: number;
  updatedAt: string;
  createdAt: string;
  messageCount: number;
};

type SessionDetail = {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  lastLevel: number;
  messages: Message[];
};

const INITIAL_STREAM_STAGE: StreamStageMap = {
  route: "pending",
  retrieve: "pending",
  generate: "pending",
  finalize: "pending"
};

const RUNNING_STREAM_STAGE: StreamStageMap = {
  route: "running",
  retrieve: "pending",
  generate: "pending",
  finalize: "pending"
};

const STREAM_STAGE_META: Array<{ key: StreamStageKey; label: string }> = [
  { key: "route", label: "意图路由" },
  { key: "retrieve", label: "知识检索" },
  { key: "generate", label: "引导生成" },
  { key: "finalize", label: "会话回写" }
];

const REPLAY_INTERVAL_MS: Record<ReplaySpeedKey, number> = {
  "1x": 320,
  "1.5x": 220,
  "2x": 150
};

const DEFAULT_REPLAY_PANEL_CONFIG: ReplayPanelConfig = {
  maxBookmarks: 16,
  defaultSpeed: "1x",
  autoExportSummary: true
};

const REPLAY_PANEL_PRESETS: Record<
  Exclude<ReplayPanelPreset, "custom">,
  ReplayPanelConfig
> = {
  quick: {
    maxBookmarks: 10,
    defaultSpeed: "2x",
    autoExportSummary: false
  },
  balanced: DEFAULT_REPLAY_PANEL_CONFIG,
  deep: {
    maxBookmarks: 24,
    defaultSpeed: "1x",
    autoExportSummary: true
  }
};

const WORKSPACE_AUTO_APPLY_FOCUS_PROMPT_STORAGE_KEY =
  "edunexus_workspace_auto_apply_focus_prompt";

function buildStreamMarkdownContent(snapshot: StreamMarkdownSnapshot) {
  return [
    "---",
    `session_id: ${snapshot.sessionId || "unknown"}`,
    `session_title: ${snapshot.sessionTitle || "未命名会话"}`,
    `exported_at: ${new Date().toISOString()}`,
    `mode: ${snapshot.mode || "unknown"}`,
    `intent: ${snapshot.intent || "unknown"}`,
    `next_level: ${snapshot.nextLevel}`,
    "---",
    "",
    "# LangGraph 流式链路复盘",
    "",
    "## 节点轨迹",
    ...(snapshot.traceLines.length > 0 ? snapshot.traceLines : ["- 暂无轨迹"]),
    "",
    "## 实时引导文本",
    snapshot.guidance || "暂无内容",
    "",
    "## 上下文引用",
    ...(snapshot.refs.length > 0 ? snapshot.refs.map((item) => `- ${item}`) : ["- 无"])
  ].join("\n");
}

function downloadMarkdownFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatTime(value: string) {
  try {
    return new Date(value).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return value;
  }
}

function formatClock(timestamp = Date.now()) {
  try {
    return new Date(timestamp).toLocaleTimeString("zh-CN", { hour12: false });
  } catch {
    return String(timestamp);
  }
}

function buildFocusQueueKey(payload: Pick<PathFocusPayload, "nodeId" | "bridgePartnerLabel">) {
  return `${payload.nodeId}__${payload.bridgePartnerLabel ?? ""}`;
}

function deriveStreamStageMap(
  previous: StreamStageMap,
  traceText: string
): StreamStageMap {
  if (traceText.includes("route_intent")) {
    return {
      ...previous,
      route: "done",
      retrieve: previous.retrieve === "pending" ? "running" : previous.retrieve
    };
  }

  if (traceText.includes("retrieve_context")) {
    return {
      ...previous,
      route: "done",
      retrieve: "done",
      generate: previous.generate === "pending" ? "running" : previous.generate
    };
  }

  if (traceText.includes("generate_guidance")) {
    return {
      ...previous,
      route: "done",
      retrieve: "done",
      generate: "done",
      finalize: "running"
    };
  }

  return previous;
}

function streamStageStatusLabel(status: StreamStageStatus) {
  if (status === "done") return "已完成";
  if (status === "running") return "进行中";
  return "待执行";
}

function resolveReplayTraceFrames(replayState: ReplayState): ReplayTraceFrame[] {
  if (replayState.timelineSnapshot.length > 0) {
    return replayState.timelineSnapshot.map((item) => ({
      trace: item.trace,
      at: item.at
    }));
  }
  return replayState.fallbackTraceSnapshot.map((trace) => ({
    trace,
    at: formatClock()
  }));
}

function deriveStageFromTraceFrames(frames: ReplayTraceFrame[]) {
  return frames.reduce(
    (stage, item) => deriveStreamStageMap(stage, item.trace),
    RUNNING_STREAM_STAGE
  );
}

function buildReplayTokenChunks(text: string) {
  return text
    .split(/(?<=[，。！？；])/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildReplayProgress(replayState: ReplayState | null): ReplayProgress {
  if (!replayState) {
    return { current: 0, total: 0, ratio: 0 };
  }
  const traceFrames = resolveReplayTraceFrames(replayState);
  const total = traceFrames.length + replayState.tokenChunks.length;
  const current = Math.min(total, replayState.timelineCursor + replayState.tokenCursor);
  return {
    current,
    total,
    ratio: total > 0 ? (current / total) * 100 : 0
  };
}

function buildReplayProgressFromSnapshot(
  timeline: StreamTimelineItem[],
  fallbackTrace: string[],
  text: string
): ReplayProgress {
  const traceCount = timeline.length > 0 ? timeline.length : fallbackTrace.length;
  const tokenCount = buildReplayTokenChunks(text).length;
  const total = traceCount + tokenCount;
  return {
    current: total,
    total,
    ratio: total > 0 ? 100 : 0
  };
}

function buildReplayAnchorSteps(traceList: string[], tokenCount: number): ReplayAnchorSteps {
  const total = traceList.length + tokenCount;
  const indexOf = (pattern: string) => {
    const index = traceList.findIndex((item) => item.includes(pattern));
    return index >= 0 ? index + 1 : null;
  };
  return {
    route: indexOf("route_intent"),
    retrieve: indexOf("retrieve_context"),
    generate: indexOf("generate_guidance"),
    finalize: total > 0 ? total : null
  };
}

function deriveReplayBookmarkLabel(step: number, anchorSteps: ReplayAnchorSteps) {
  const stage = STREAM_STAGE_META.find((item) => {
    const anchor = anchorSteps[item.key];
    return anchor !== null && step <= anchor;
  });
  return stage ? `${stage.label} · Step ${step}` : `Step ${step}`;
}

function normalizeReplayPanelConfig(value?: Partial<ReplayPanelConfig>): ReplayPanelConfig {
  const merged = {
    ...DEFAULT_REPLAY_PANEL_CONFIG,
    ...(value ?? {})
  };
  const speed =
    merged.defaultSpeed === "1x" ||
    merged.defaultSpeed === "1.5x" ||
    merged.defaultSpeed === "2x"
      ? merged.defaultSpeed
      : DEFAULT_REPLAY_PANEL_CONFIG.defaultSpeed;
  return {
    maxBookmarks: Math.min(24, Math.max(8, Number(merged.maxBookmarks) || 16)),
    defaultSpeed: speed,
    autoExportSummary: Boolean(merged.autoExportSummary)
  };
}

function normalizeReplayPanelPreset(value: string): ReplayPanelPreset {
  if (value === "quick" || value === "deep" || value === "custom") {
    return value;
  }
  return "balanced";
}

function formatReplayPanelPresetLabel(preset: ReplayPanelPreset) {
  if (preset === "quick") return "极速回放";
  if (preset === "deep") return "深度复盘";
  if (preset === "custom") return "自定义";
  return "平衡默认";
}

function buildReplayScriptContent(snapshot: ReplayScriptSnapshot) {
  const orderedBookmarks = [...snapshot.bookmarks].sort((a, b) => a.step - b.step);
  const stageLabelMap: Record<StreamStageKey, string> = {
    route: "意图路由",
    retrieve: "知识检索",
    generate: "引导生成",
    finalize: "会话回写"
  };

  const anchorLines = (Object.keys(stageLabelMap) as StreamStageKey[]).map((key) => {
    const step = snapshot.anchorSteps[key];
    return `- ${stageLabelMap[key]}：${step === null ? "未命中" : `#${step}`}`;
  });

  const replayPlanLines =
    orderedBookmarks.length > 0
      ? orderedBookmarks.map(
          (bookmark, index) =>
            `${index + 1}. 跳转 #${bookmark.step}（${bookmark.label}），再按单步回放观察上下文变化。`
        )
      : ["1. 当前无书签，建议先从关键帧锚点补充书签后再导出。"];

  return [
    "---",
    `session_id: ${snapshot.sessionId || "unknown"}`,
    `session_title: ${snapshot.sessionTitle || "未命名会话"}`,
    `exported_at: ${snapshot.exportedAt}`,
    `bookmark_count: ${orderedBookmarks.length}`,
    `replay_total_steps: ${snapshot.totalSteps}`,
    "---",
    "",
    "# LangGraph 回放脚本",
    "",
    "## 关键帧锚点",
    ...anchorLines,
    "",
    "## 书签清单（按步骤排序）",
    ...(orderedBookmarks.length > 0
      ? orderedBookmarks.map(
          (bookmark) =>
            `- #${bookmark.step} · ${bookmark.label} · 创建于 ${formatTime(bookmark.createdAt)}`
        )
      : ["- 暂无书签"]),
    "",
    "## 建议回放顺序",
    ...replayPlanLines,
    "",
    "## 使用建议",
    "- 先从“知识检索”或“引导生成”阶段书签开始，优先定位策略拐点。",
    "- 对比同一步骤的 trace 与 guidance，验证模型路由是否稳定。"
  ].join("\n");
}

export function WorkspaceDemo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string>("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionQuery, setSessionQuery] = useState("");
  const [userInput, setUserInput] = useState("我先尝试列出等差数列前 n 项和公式。");
  const [reflection, setReflection] = useState("我发现自己总是跳过已知条件整理，后续会先写条件再代入公式。");
  const [currentLevel, setCurrentLevel] = useState(1);
  const [nextData, setNextData] = useState<NextResponsePayload | null>(null);
  const [unlockData, setUnlockData] = useState<UnlockResponsePayload | null>(null);
  const [agentData, setAgentData] = useState<AgentRunResponsePayload | null>(null);
  const [agentStreamMeta, setAgentStreamMeta] = useState<AgentStreamMeta | null>(null);
  const [agentStreamTrace, setAgentStreamTrace] = useState<string[]>([]);
  const [agentStreamTimeline, setAgentStreamTimeline] = useState<StreamTimelineItem[]>([]);
  const [agentStreamStage, setAgentStreamStage] =
    useState<StreamStageMap>(INITIAL_STREAM_STAGE);
  const [agentStreamText, setAgentStreamText] = useState("");
  const [isAgentStreaming, setIsAgentStreaming] = useState(false);
  const [isStreamReplaying, setIsStreamReplaying] = useState(false);
  const [isReplayPaused, setIsReplayPaused] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<ReplaySpeedKey>("1x");
  const [autoExportReplaySummary, setAutoExportReplaySummary] = useState(true);
  const [replayPanelConfig, setReplayPanelConfig] = useState<ReplayPanelConfig>(
    DEFAULT_REPLAY_PANEL_CONFIG
  );
  const [replayPanelPreset, setReplayPanelPreset] =
    useState<ReplayPanelPreset>("balanced");
  const [isReplayPanelConfigReady, setIsReplayPanelConfigReady] = useState(false);
  const [replayProgress, setReplayProgress] = useState<ReplayProgress>({
    current: 0,
    total: 0,
    ratio: 0
  });
  const [replayBookmarks, setReplayBookmarks] = useState<ReplayBookmark[]>([]);
  const [replayBookmarkDraft, setReplayBookmarkDraft] = useState("");
  const [editingReplayBookmarkId, setEditingReplayBookmarkId] = useState("");
  const [editingReplayBookmarkLabel, setEditingReplayBookmarkLabel] = useState("");
  const [bookmarkQuery, setBookmarkQuery] = useState("");
  const [bookmarkSort, setBookmarkSort] = useState<"desc" | "asc">("desc");
  const [selectedReplayBookmarkIds, setSelectedReplayBookmarkIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [streamText, setStreamText] = useState("");
  const [saveResult, setSaveResult] = useState<SaveNoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [graphFocus, setGraphFocus] = useState<PathFocusPayload | null>(null);
  const [graphFocusQueue, setGraphFocusQueue] = useState<PathFocusPayload[]>([]);
  const [activeGraphFocusQueueKey, setActiveGraphFocusQueueKey] = useState("");
  const [graphFocusHint, setGraphFocusHint] = useState("");
  const [autoApplyGraphFocusPrompt, setAutoApplyGraphFocusPrompt] = useState(false);
  const streamReplayTimerRef = useRef<number | null>(null);
  const replayStateRef = useRef<ReplayState | null>(null);
  const replayPausedRef = useRef(false);
  const replaySpeedRef = useRef<ReplaySpeedKey>("1x");
  const autoExportReplaySummaryRef = useRef(true);
  const hasAppliedGraphFocusRef = useRef(false);
  const appliedQuerySessionIdRef = useRef("");
  const querySessionId = useMemo(
    () => searchParams.get("sessionId")?.trim() ?? "",
    [searchParams]
  );
  const queryFrom = useMemo(
    () => searchParams.get("from")?.trim().toLowerCase() ?? "",
    [searchParams]
  );
  const queryNoteId = useMemo(
    () => searchParams.get("noteId")?.trim() ?? "",
    [searchParams]
  );
  const queryNodeLabel = useMemo(
    () => searchParams.get("nodeLabel")?.trim() ?? "",
    [searchParams]
  );
  const queryBatchCount = useMemo(
    () => Number(searchParams.get("batchCount") ?? "0"),
    [searchParams]
  );
  const queryReplayBatchId = useMemo(
    () => searchParams.get("replayBatchId")?.trim() ?? "",
    [searchParams]
  );
  const queryReplayMode = useMemo(
    () => searchParams.get("replayMode")?.trim() ?? "",
    [searchParams]
  );
  const hasGraphContext = queryFrom === "graph" || queryFrom === "graph_save";
  const hasMatchedQuerySession = Boolean(querySessionId) && sessionId === querySessionId;

  const canUnlock = useMemo(() => nextData?.canUnlockFinal ?? false, [nextData]);
  const activeGraphFocusQueueIndex = useMemo(() => {
    if (graphFocusQueue.length === 0) {
      return -1;
    }
    const activeKey =
      activeGraphFocusQueueKey || (graphFocus ? buildFocusQueueKey(graphFocus) : "");
    if (!activeKey) {
      return 0;
    }
    return graphFocusQueue.findIndex((item) => buildFocusQueueKey(item) === activeKey);
  }, [activeGraphFocusQueueKey, graphFocus, graphFocusQueue]);
  const graphFocusSummary = useMemo(() => {
    if (!graphFocus) {
      return null;
    }
    return {
      risk: `${Math.round(graphFocus.risk * 100)}%`,
      mastery: `${Math.round(graphFocus.mastery * 100)}%`,
      related:
        graphFocus.relatedNodes.length > 0
          ? graphFocus.relatedNodes.slice(0, 4).join("、")
          : "暂无",
      replayBatchId: graphFocus.replayBatchId ?? queryReplayBatchId,
      replaySlot:
        graphFocus.replayBatchIndex && graphFocus.replayBatchTotal
          ? `${graphFocus.replayBatchIndex}/${graphFocus.replayBatchTotal}`
          : "",
      replayMode:
        graphFocus.replayMode ??
        (queryReplayMode === "focus" || queryReplayMode === "all"
          ? queryReplayMode
          : "")
    };
  }, [graphFocus, queryReplayBatchId, queryReplayMode]);
  const citations = useMemo(() => {
    const merged = [
      ...(nextData?.citations ?? []),
      ...(unlockData?.citations ?? []),
      ...(agentData?.citations ?? [])
    ];
    const unique = new Map<string, Citation>();
    for (const item of merged) {
      unique.set(`${item.sourceId}#${item.chunkRef}`, item);
    }
    return Array.from(unique.values());
  }, [nextData, unlockData, agentData]);

  const replayAnchorSteps = useMemo<ReplayAnchorSteps>(() => {
    const replayState = replayStateRef.current;
    const traceList = replayState
      ? resolveReplayTraceFrames(replayState).map((item) => item.trace)
      : agentStreamTimeline.length > 0
        ? agentStreamTimeline.map((item) => item.trace)
        : agentStreamTrace;
    const tokenCount = replayState
      ? replayState.tokenChunks.length
      : buildReplayTokenChunks(agentStreamText).length;
    return buildReplayAnchorSteps(traceList, tokenCount);
  }, [agentStreamTimeline, agentStreamTrace, agentStreamText]);

  const visibleReplayBookmarks = useMemo(() => {
    const normalized = bookmarkQuery.trim().toLowerCase();
    return [...replayBookmarks]
      .sort((a, b) =>
        bookmarkSort === "asc" ? a.step - b.step : b.step - a.step
      )
      .filter((bookmark) => {
        if (!normalized) {
          return true;
        }
        return (
          bookmark.label.toLowerCase().includes(normalized) ||
          String(bookmark.step).includes(normalized)
        );
      });
  }, [bookmarkQuery, bookmarkSort, replayBookmarks]);

  const selectedReplayBookmarks = useMemo(
    () =>
      replayBookmarks.filter((bookmark) => selectedReplayBookmarkIds.includes(bookmark.id)),
    [replayBookmarks, selectedReplayBookmarkIds]
  );

  function clearReplayTimer() {
    if (streamReplayTimerRef.current !== null) {
      window.clearTimeout(streamReplayTimerRef.current);
      streamReplayTimerRef.current = null;
    }
  }

  function syncReplayProgress(replayState: ReplayState | null) {
    setReplayProgress(buildReplayProgress(replayState));
  }

  function resetReplayState() {
    clearReplayTimer();
    setIsStreamReplaying(false);
    setIsReplayPaused(false);
    replayPausedRef.current = false;
    replayStateRef.current = null;
    syncReplayProgress(null);
  }

  useEffect(() => {
    replayPausedRef.current = isReplayPaused;
  }, [isReplayPaused]);

  useEffect(() => {
    replaySpeedRef.current = replaySpeed;
  }, [replaySpeed]);

  useEffect(() => {
    autoExportReplaySummaryRef.current = autoExportReplaySummary;
  }, [autoExportReplaySummary]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(
        WORKSPACE_AUTO_APPLY_FOCUS_PROMPT_STORAGE_KEY
      );
      if (raw === "1") {
        setAutoApplyGraphFocusPrompt(true);
      } else if (raw === "0") {
        setAutoApplyGraphFocusPrompt(false);
      }
    } catch {
      // ignore preference read errors
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        WORKSPACE_AUTO_APPLY_FOCUS_PROMPT_STORAGE_KEY,
        autoApplyGraphFocusPrompt ? "1" : "0"
      );
    } catch {
      // ignore preference write errors
    }
  }, [autoApplyGraphFocusPrompt]);

  useEffect(() => {
    if (hasAppliedGraphFocusRef.current) {
      return;
    }
    const focus = readWorkspaceFocusFromStorage((key) => window.localStorage.getItem(key));
    const batchFocuses =
      Number.isFinite(queryBatchCount) && queryBatchCount > 1
        ? readWorkspaceFocusBatchFromStorage((key) => window.localStorage.getItem(key), 12)
        : [];
    if (!focus && batchFocuses.length === 0) {
      return;
    }
    const activeFocus =
      batchFocuses.length > 0
        ? batchFocuses.find((item) =>
            focus ? buildFocusQueueKey(item) === buildFocusQueueKey(focus) : false
          ) ?? batchFocuses[0]!
        : focus!;
    setGraphFocusQueue(batchFocuses);
    setActiveGraphFocusQueueKey(
      batchFocuses.length > 0 ? buildFocusQueueKey(activeFocus) : ""
    );
    setGraphFocus(activeFocus);
    setGraphFocusHint(
      `已接收图谱焦点：${activeFocus.nodeLabel}（风险 ${Math.round(
        activeFocus.risk * 100
      )}%），已预填工作区引导问题。${
        batchFocuses.length > 1 ? `（本次批量推送 ${batchFocuses.length} 条）` : ""
      }${
        activeFocus.replayBatchId
          ? `（回放批次 ${activeFocus.replayBatchId}${
              activeFocus.replayMode ? ` · 模式 ${activeFocus.replayMode}` : ""
            }）`
          : ""
      }`
    );
    setUserInput((prev) => {
      const trimmed = prev.trim();
      if (!trimmed || trimmed === "我先尝试列出等差数列前 n 项和公式。") {
        return buildWorkspacePromptFromFocus(activeFocus);
      }
      return `${buildWorkspacePromptFromFocus(activeFocus)}\n\n补充上下文：${trimmed}`;
    });
    setSessionTitle((prev) =>
      prev.trim() ? prev : `图谱焦点复盘：${activeFocus.nodeLabel}`
    );
    hasAppliedGraphFocusRef.current = true;
  }, [queryBatchCount]);

  useEffect(() => {
    try {
      const rawConfig = window.localStorage.getItem("edunexus_workspace_replay_panel_config");
      const rawPreset = window.localStorage.getItem("edunexus_workspace_replay_panel_preset");
      const nextConfig = rawConfig
        ? normalizeReplayPanelConfig(JSON.parse(rawConfig) as Partial<ReplayPanelConfig>)
        : DEFAULT_REPLAY_PANEL_CONFIG;
      setReplayPanelConfig(nextConfig);
      setReplayPanelPreset(rawPreset ? normalizeReplayPanelPreset(rawPreset) : "balanced");
      setReplaySpeed(nextConfig.defaultSpeed);
      setAutoExportReplaySummary(nextConfig.autoExportSummary);
    } catch {
      setReplayPanelConfig(DEFAULT_REPLAY_PANEL_CONFIG);
      setReplayPanelPreset("balanced");
      setReplaySpeed(DEFAULT_REPLAY_PANEL_CONFIG.defaultSpeed);
      setAutoExportReplaySummary(DEFAULT_REPLAY_PANEL_CONFIG.autoExportSummary);
    }
    setIsReplayPanelConfigReady(true);
  }, []);

  useEffect(() => {
    const handleConfigUpdated = () => {
      try {
        const rawConfig = window.localStorage.getItem("edunexus_workspace_replay_panel_config");
        const rawPreset = window.localStorage.getItem("edunexus_workspace_replay_panel_preset");
        const nextConfig = rawConfig
          ? normalizeReplayPanelConfig(JSON.parse(rawConfig) as Partial<ReplayPanelConfig>)
          : DEFAULT_REPLAY_PANEL_CONFIG;
        const nextPreset = normalizeReplayPanelPreset(rawPreset ?? "balanced");
        setReplayPanelConfig(nextConfig);
        setReplayPanelPreset(nextPreset);
        setReplaySpeed(nextConfig.defaultSpeed);
        replaySpeedRef.current = nextConfig.defaultSpeed;
        setAutoExportReplaySummary(nextConfig.autoExportSummary);
        autoExportReplaySummaryRef.current = nextConfig.autoExportSummary;
      } catch {
        setReplayPanelConfig(DEFAULT_REPLAY_PANEL_CONFIG);
        setReplayPanelPreset("balanced");
        setReplaySpeed(DEFAULT_REPLAY_PANEL_CONFIG.defaultSpeed);
        replaySpeedRef.current = DEFAULT_REPLAY_PANEL_CONFIG.defaultSpeed;
        setAutoExportReplaySummary(DEFAULT_REPLAY_PANEL_CONFIG.autoExportSummary);
        autoExportReplaySummaryRef.current =
          DEFAULT_REPLAY_PANEL_CONFIG.autoExportSummary;
      }
    };
    window.addEventListener("edunexus-config-updated", handleConfigUpdated);
    return () => {
      window.removeEventListener("edunexus-config-updated", handleConfigUpdated);
    };
  }, []);

  useEffect(() => {
    if (!isReplayPanelConfigReady) {
      return;
    }
    window.localStorage.setItem(
      "edunexus_workspace_replay_panel_config",
      JSON.stringify(replayPanelConfig)
    );
    window.localStorage.setItem(
      "edunexus_workspace_replay_panel_preset",
      replayPanelPreset
    );
  }, [isReplayPanelConfigReady, replayPanelConfig, replayPanelPreset]);

  useEffect(() => {
    if (replayStateRef.current) {
      return;
    }
    setReplayProgress(
      buildReplayProgressFromSnapshot(agentStreamTimeline, agentStreamTrace, agentStreamText)
    );
  }, [agentStreamTimeline, agentStreamTrace, agentStreamText]);

  useEffect(() => {
    if (!sessionId) {
      setReplayBookmarks([]);
      setReplayBookmarkDraft("");
      setEditingReplayBookmarkId("");
      setEditingReplayBookmarkLabel("");
      setBookmarkQuery("");
      setSelectedReplayBookmarkIds([]);
      return;
    }
    try {
      const raw = window.localStorage.getItem(`edunexus_replay_bookmarks_${sessionId}`);
      if (!raw) {
        setReplayBookmarks([]);
        return;
      }
      const parsed = JSON.parse(raw) as ReplayBookmark[];
      if (!Array.isArray(parsed)) {
        setReplayBookmarks([]);
        return;
      }
      setReplayBookmarks(
        parsed
          .filter(
            (item) =>
              item &&
              typeof item.id === "string" &&
              typeof item.label === "string" &&
              typeof item.step === "number"
          )
          .map((item) => ({
            id: item.id,
            label: item.label,
            step: item.step,
            createdAt:
              typeof item.createdAt === "string"
                ? item.createdAt
                : new Date().toISOString()
          }))
          .slice(0, replayPanelConfig.maxBookmarks)
      );
    } catch {
      setReplayBookmarks([]);
    }
  }, [replayPanelConfig.maxBookmarks, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }
    window.localStorage.setItem(
      `edunexus_replay_bookmarks_${sessionId}`,
      JSON.stringify(replayBookmarks.slice(0, replayPanelConfig.maxBookmarks))
    );
  }, [replayBookmarks, replayPanelConfig.maxBookmarks, sessionId]);

  useEffect(() => {
    if (selectedReplayBookmarkIds.length === 0) {
      return;
    }
    const valid = new Set(replayBookmarks.map((item) => item.id));
    setSelectedReplayBookmarkIds((prev) => prev.filter((id) => valid.has(id)));
  }, [replayBookmarks, selectedReplayBookmarkIds.length]);

  useEffect(() => {
    setReplayBookmarks((prev) => prev.slice(0, replayPanelConfig.maxBookmarks));
  }, [replayPanelConfig.maxBookmarks]);

  useEffect(() => {
    return () => {
      clearReplayTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetCurrentSessionView() {
    resetReplayState();
    setSessionId("");
    setSessionTitle("");
    setCurrentLevel(1);
    setMessages([]);
    setNextData(null);
    setUnlockData(null);
    setAgentData(null);
    setAgentStreamMeta(null);
    setAgentStreamTrace([]);
    setAgentStreamTimeline([]);
    setAgentStreamStage(INITIAL_STREAM_STAGE);
    setAgentStreamText("");
    setIsAgentStreaming(false);
    setStreamText("");
    setSaveResult(null);
  }

  async function loadSessions(query = sessionQuery) {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const url = params.toString() ? `/api/workspace/sessions?${params.toString()}` : "/api/workspace/sessions";
      const data = await requestJson<{ sessions: SessionSummary[] }>(url);
      setSessions(data.sessions ?? []);
    } catch (err) {
      setError(formatErrorMessage(err, "加载会话列表失败。"));
      console.error(err);
    }
  }

  async function loadSessionDetail(targetId: string) {
    setLoading(true);
    setError("");
    resetReplayState();
    try {
      const detail = await requestJson<SessionDetail>(`/api/workspace/session/${targetId}`);
      setSessionId(detail.id);
      setSessionTitle(detail.title);
      setCurrentLevel(detail.lastLevel);
      setMessages(detail.messages ?? []);
      setStreamText("");
      setSaveResult(null);
      setNextData(null);
      setUnlockData(null);
      setAgentData(null);
      setAgentStreamMeta(null);
      setAgentStreamTrace([]);
      setAgentStreamTimeline([]);
      setAgentStreamStage(INITIAL_STREAM_STAGE);
      setAgentStreamText("");
      setIsAgentStreaming(false);
    } catch (err) {
      setError(formatErrorMessage(err, "加载会话详情失败。"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions("");
    if (!querySessionId) {
      return;
    }
    if (appliedQuerySessionIdRef.current === querySessionId) {
      return;
    }
    appliedQuerySessionIdRef.current = querySessionId;
    void loadSessionDetail(querySessionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [querySessionId]);

  const switchGraphFocusFromQueue = useCallback((target: PathFocusPayload, index: number) => {
    setGraphFocus(target);
    setActiveGraphFocusQueueKey(buildFocusQueueKey(target));
    if (autoApplyGraphFocusPrompt) {
      setUserInput(buildWorkspacePromptFromFocus(target));
      setGraphFocusHint(
        `已切换批量关系链焦点：第 ${index + 1}/${graphFocusQueue.length} 条 · ${
          target.nodeLabel
        }，并自动应用提示词。${
          target.replayBatchId ? `（回放批次 ${target.replayBatchId}）` : ""
        }`
      );
      return;
    }
    setGraphFocusHint(
      `已切换批量关系链焦点：第 ${index + 1}/${graphFocusQueue.length} 条 · ${
        target.nodeLabel
      }，可手动点击应用提示词。${
        target.replayBatchId ? `（回放批次 ${target.replayBatchId}）` : ""
      }`
    );
  }, [autoApplyGraphFocusPrompt, graphFocusQueue.length]);

  const stepGraphFocusQueue = useCallback((offset: number) => {
    if (graphFocusQueue.length < 2) {
      return;
    }
    const baseIndex = activeGraphFocusQueueIndex >= 0 ? activeGraphFocusQueueIndex : 0;
    const nextIndex = (baseIndex + offset + graphFocusQueue.length) % graphFocusQueue.length;
    const next = graphFocusQueue[nextIndex];
    if (!next) {
      return;
    }
    switchGraphFocusFromQueue(next, nextIndex);
  }, [activeGraphFocusQueueIndex, graphFocusQueue, switchGraphFocusFromQueue]);

  useEffect(() => {
    if (graphFocusQueue.length < 2) {
      return;
    }
    const handleQueueShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (
        target?.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select"
      ) {
        return;
      }
      if (event.key === "[" || (event.altKey && event.key === "ArrowUp")) {
        event.preventDefault();
        stepGraphFocusQueue(-1);
      } else if (event.key === "]" || (event.altKey && event.key === "ArrowDown")) {
        event.preventDefault();
        stepGraphFocusQueue(1);
      }
    };
    window.addEventListener("keydown", handleQueueShortcut);
    return () => {
      window.removeEventListener("keydown", handleQueueShortcut);
    };
  }, [graphFocusQueue.length, stepGraphFocusQueue]);

  async function createSession() {
    setLoading(true);
    setError("");
    try {
      const data = await requestJson<{ session: { id: string } }>("/api/workspace/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "等差数列复盘",
          initialGoal: "学会拆解中间步骤并避免直接求答案"
        })
      });
      const createdId = data.session.id;
      await Promise.all([loadSessions(), loadSessionDetail(createdId)]);
    } catch (err) {
      setError(formatErrorMessage(err, "创建会话失败，请稍后重试。"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function renameCurrentSession() {
    if (!sessionId) {
      setError("请先创建或恢复会话。");
      return;
    }
    if (!sessionTitle.trim()) {
      setError("会话标题不能为空。");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await requestJson<{ id: string; title: string; updatedAt: string }>(`/api/workspace/session/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sessionTitle.trim()
        })
      });
      await Promise.all([loadSessions(), loadSessionDetail(sessionId)]);
    } catch (err) {
      setError(formatErrorMessage(err, "重命名会话失败。"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSessionById(targetId: string) {
    if (!confirm("确定删除该会话吗？删除后不可恢复。")) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      await requestJson<{ deleted: boolean; id: string }>(`/api/workspace/session/${targetId}`, {
        method: "DELETE"
      });
      await loadSessions();
      if (targetId === sessionId) {
        resetCurrentSessionView();
      }
    } catch (err) {
      setError(formatErrorMessage(err, "删除会话失败。"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function requestNext() {
    if (!sessionId) {
      setError("请先创建或恢复会话。");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await requestJson<NextResponsePayload>("/api/workspace/socratic/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userInput,
          currentLevel
        })
      });
      setNextData(data);
      setCurrentLevel(data.nextLevel);
      if (graphFocus) {
        pushGraphActivityEventToStorage(
          {
            source: "workspace",
            nodeId: graphFocus.nodeId,
            nodeLabel: graphFocus.nodeLabel,
            title: "工作区引导推进",
            detail: `会话 ${sessionId} 进入 Level ${data.nextLevel}`,
            riskScore: Math.max(0.2, Number((graphFocus.risk - data.nextLevel * 0.06).toFixed(2)))
          },
          {
            readItem: (key) => window.localStorage.getItem(key),
            writeItem: (key, value) => window.localStorage.setItem(key, value)
          },
          16
        );
      }
      await Promise.all([loadSessionDetail(sessionId), loadSessions()]);
    } catch (err) {
      setError(formatErrorMessage(err, "请求下一层提示失败。"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function unlockFinal() {
    if (!sessionId) {
      setError("请先创建或恢复会话。");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await requestJson<UnlockResponsePayload>("/api/workspace/socratic/unlock-final", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          reflection
        })
      });
      setUnlockData(data);
      await Promise.all([loadSessionDetail(sessionId), loadSessions()]);
    } catch (err) {
      setError(formatErrorMessage(err, "解锁最终答案失败。"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function runLangGraphAgent() {
    if (!sessionId) {
      setError("请先创建或恢复会话。");
      return;
    }

    setLoading(true);
    setError("");
    setAgentStreamMeta(null);
    setAgentStreamTrace([]);
    setAgentStreamTimeline([]);
    setAgentStreamStage(INITIAL_STREAM_STAGE);
    setAgentStreamText("");
    setIsAgentStreaming(false);
    resetReplayState();
    try {
      const data = await requestJson<AgentRunResponsePayload>("/api/workspace/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userInput,
          currentLevel
        })
      });
      setAgentData(data);
      setCurrentLevel(data.nextLevel);
      await Promise.all([loadSessionDetail(sessionId), loadSessions()]);
    } catch (err) {
      setError(formatErrorMessage(err, "运行 LangGraph Agent 失败。"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function runLangGraphAgentStream() {
    if (!sessionId) {
      setError("请先创建或恢复会话。");
      return;
    }

    resetReplayState();
    setLoading(true);
    setError("");
    setAgentStreamMeta(null);
    setAgentStreamTrace([]);
    setAgentStreamTimeline([]);
    setAgentStreamStage(RUNNING_STREAM_STAGE);
    setAgentStreamText("");
    setIsAgentStreaming(true);

    try {
      const res = await fetch("/api/workspace/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          userInput,
          currentLevel
        })
      });

      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res, "运行 LangGraph 流式工作流失败。"));
      }
      if (!res.body) {
        throw new Error("流式响应为空。");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let done = false;
      let accumulated = "";

      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          buffer += decoder.decode(result.value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const event of events) {
            if (!event.startsWith("data: ")) continue;
            const raw = event.slice(6);
            const payload = JSON.parse(raw) as {
              type: "meta" | "trace" | "token" | "done" | "error";
              value: unknown;
            };

            if (payload.type === "meta" && payload.value && typeof payload.value === "object") {
              const meta = payload.value as AgentStreamMeta;
              setAgentStreamMeta(meta);
              continue;
            }

            if (payload.type === "trace" && typeof payload.value === "string") {
              const traceValue = payload.value;
              setAgentStreamTrace((prev) => [...prev, traceValue]);
              setAgentStreamTimeline((prev) => [
                ...prev,
                { id: prev.length + 1, trace: traceValue, at: formatClock() }
              ]);
              setAgentStreamStage((prev) => deriveStreamStageMap(prev, traceValue));
              continue;
            }

            if (payload.type === "token" && typeof payload.value === "string") {
              accumulated += payload.value;
              setAgentStreamText(accumulated);
              continue;
            }

            if (payload.type === "done" && payload.value && typeof payload.value === "object") {
              const donePayload = payload.value as AgentRunResponsePayload;
              setAgentData({
                ...donePayload,
                citations: donePayload.contextRefs.map((docId) => ({
                  sourceId: docId,
                  chunkRef: "summary"
                }))
              });
              setCurrentLevel(donePayload.nextLevel);
              setAgentStreamStage({
                route: "done",
                retrieve: "done",
                generate: "done",
                finalize: "done"
              });
              setIsAgentStreaming(false);
              resetReplayState();
              continue;
            }

            if (payload.type === "error") {
              throw new Error(typeof payload.value === "string" ? payload.value : "LangGraph 流式执行失败。");
            }
          }
        }
      }

      await Promise.all([loadSessionDetail(sessionId), loadSessions()]);
    } catch (err) {
      setError(formatErrorMessage(err, "运行 LangGraph 流式工作流失败。"));
      console.error(err);
      setIsAgentStreaming(false);
      resetReplayState();
    } finally {
      setLoading(false);
      setIsAgentStreaming(false);
      resetReplayState();
    }
  }

  async function startStream() {
    if (!sessionId) {
      setError("请先创建或恢复会话。");
      return;
    }

    resetReplayState();
    setLoading(true);
    setError("");
    setStreamText("");
    try {
      const res = await fetch(
        `/api/workspace/session/${sessionId}/stream?prompt=${encodeURIComponent(userInput)}`
      );
      if (!res.ok) {
        throw new Error(await readApiErrorMessage(res, "拉取流式输出失败。"));
      }
      if (!res.body) {
        throw new Error("流式响应为空。");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let done = false;
      let accumulated = "";

      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          buffer += decoder.decode(result.value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const event of events) {
            if (!event.startsWith("data: ")) continue;
            const raw = event.slice(6);
            const payload = JSON.parse(raw) as { type: string; value?: string };
            if (payload.type === "token" || payload.type === "done") {
              const value = payload.value ?? "";
              accumulated += value;
              setStreamText(accumulated);
            }
          }
        }
      }
    } catch (err) {
      setError(formatErrorMessage(err, "拉取流式输出失败。"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function saveNote() {
    if (!sessionId) {
      setError("请先创建或恢复会话。");
      return;
    }

    setLoading(true);
    setError("");
    setSaveResult(null);
    try {
      const content = [
        ...messages.map((item) => `[${item.role}] ${item.content}`),
        streamText ? `[stream] ${streamText}` : ""
      ]
        .filter(Boolean)
        .join("\n\n");

      const data = await requestJson<SaveNoteResponse>("/api/workspace/note/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          title: sessionTitle || "工作区会话沉淀",
          content,
          tags: ["workspace", "socratic", "一期"],
          links: citations.map((item) => item.sourceId)
        })
      });
      setSaveResult(data);
    } catch (err) {
      setError(formatErrorMessage(err, "保存笔记失败。"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function getCurrentStreamSnapshot(): StreamMarkdownSnapshot {
    const traceLines =
      agentStreamTimeline.length > 0
        ? agentStreamTimeline.map((item) => `- [${item.at}] ${item.trace}`)
        : agentStreamTrace.map((item) => `- ${item}`);

    const refs =
      agentStreamMeta?.contextRefs && agentStreamMeta.contextRefs.length > 0
        ? agentStreamMeta.contextRefs
        : agentData?.contextRefs && agentData.contextRefs.length > 0
          ? agentData.contextRefs
          : [];

    return {
      sessionId,
      sessionTitle,
      mode: agentStreamMeta?.mode || agentData?.mode || "unknown",
      intent: agentStreamMeta?.intent || agentData?.intent || "unknown",
      nextLevel: agentStreamMeta?.nextLevel || agentData?.nextLevel || currentLevel,
      traceLines,
      guidance: agentStreamText || agentData?.guidance || "暂无内容",
      refs
    };
  }

  function exportStreamMarkdownWithFilename(filename: string) {
    const snapshot = getCurrentStreamSnapshot();
    const content = buildStreamMarkdownContent(snapshot);
    downloadMarkdownFile(content, filename);
  }

  function finalizeReplayRun() {
    clearReplayTimer();
    replayStateRef.current = null;
    setAgentStreamStage({
      route: "done",
      retrieve: "done",
      generate: "done",
      finalize: "done"
    });
    setIsStreamReplaying(false);
    setIsReplayPaused(false);
    replayPausedRef.current = false;
    setReplayProgress((prev) =>
      prev.total > 0
        ? {
            current: prev.total,
            total: prev.total,
            ratio: 100
          }
        : prev
    );
    if (autoExportReplaySummaryRef.current) {
      window.setTimeout(() => {
        exportStreamMarkdownWithFilename(
          `langgraph-stream-${sessionId || "session"}-replay.md`
        );
      }, 0);
    }
  }

  function applyReplayPosition(replayState: ReplayState, targetStep: number) {
    const traceFrames = resolveReplayTraceFrames(replayState);
    const traceCount = traceFrames.length;
    const total = traceCount + replayState.tokenChunks.length;
    const safeTarget = Math.max(0, Math.min(targetStep, total));
    const nextTimelineCursor = Math.min(safeTarget, traceCount);
    const nextTokenCursor = Math.max(0, safeTarget - traceCount);
    const visibleFrames = traceFrames.slice(0, nextTimelineCursor);

    setAgentStreamTimeline(
      visibleFrames.map((item, index) => ({
        id: index + 1,
        trace: item.trace,
        at: item.at
      }))
    );
    setAgentStreamTrace(visibleFrames.map((item) => item.trace));
    setAgentStreamText(replayState.tokenChunks.slice(0, nextTokenCursor).join(""));
    setAgentStreamStage(
      visibleFrames.length > 0
        ? deriveStageFromTraceFrames(visibleFrames)
        : RUNNING_STREAM_STAGE
    );

    replayState.timelineCursor = nextTimelineCursor;
    replayState.tokenCursor = nextTokenCursor;
    syncReplayProgress(replayState);
  }

  function processReplayStep() {
    const replayState = replayStateRef.current;
    if (!replayState) {
      return false;
    }
    const traceCount = resolveReplayTraceFrames(replayState).length;
    const total = traceCount + replayState.tokenChunks.length;
    const current = replayState.timelineCursor + replayState.tokenCursor;
    if (current >= total) {
      finalizeReplayRun();
      return false;
    }

    applyReplayPosition(replayState, current + 1);

    if (replayState.timelineCursor + replayState.tokenCursor >= total) {
      finalizeReplayRun();
      return false;
    }

    return true;
  }

  function scheduleReplayTick() {
    if (!replayStateRef.current || replayPausedRef.current) {
      return;
    }

    clearReplayTimer();
    streamReplayTimerRef.current = window.setTimeout(() => {
      if (replayPausedRef.current) {
        return;
      }
      const shouldContinue = processReplayStep();
      if (shouldContinue) {
        scheduleReplayTick();
      }
    }, REPLAY_INTERVAL_MS[replaySpeedRef.current]);
  }

  function toggleReplayPause() {
    if (!isStreamReplaying) {
      return;
    }
    setIsReplayPaused((prev) => {
      const next = !prev;
      replayPausedRef.current = next;
      if (next) {
        clearReplayTimer();
      } else {
        scheduleReplayTick();
      }
      return next;
    });
  }

  function handleReplaySpeedChange(next: ReplaySpeedKey) {
    setReplaySpeed(next);
    replaySpeedRef.current = next;
    setReplayPanelPreset("custom");
    setReplayPanelConfig((prev) => ({ ...prev, defaultSpeed: next }));
    if (isStreamReplaying && !isReplayPaused) {
      scheduleReplayTick();
    }
  }

  function initializeReplayStateIfNeeded(
    options: { position?: "start" | "end" } = {}
  ) {
    const position = options.position ?? "start";
    if (replayStateRef.current) {
      return true;
    }

    if (agentStreamTimeline.length === 0 && !agentStreamText.trim()) {
      return false;
    }

    replayStateRef.current = {
      timelineSnapshot: [...agentStreamTimeline],
      fallbackTraceSnapshot: [...agentStreamTrace],
      tokenChunks: buildReplayTokenChunks(agentStreamText),
      timelineCursor: 0,
      tokenCursor: 0
    };

    if (position === "end" && replayStateRef.current) {
      const traceCount = resolveReplayTraceFrames(replayStateRef.current).length;
      replayStateRef.current.timelineCursor = traceCount;
      replayStateRef.current.tokenCursor = replayStateRef.current.tokenChunks.length;
    } else {
      setAgentStreamTimeline([]);
      setAgentStreamTrace([]);
      setAgentStreamText("");
      setAgentStreamStage(RUNNING_STREAM_STAGE);
    }
    setIsStreamReplaying(true);
    syncReplayProgress(replayStateRef.current);
    return true;
  }

  function stepReplayOnce() {
    if (loading || isAgentStreaming) {
      return;
    }

    clearReplayTimer();
    setIsReplayPaused(true);
    replayPausedRef.current = true;
    setError("");

    if (!initializeReplayStateIfNeeded()) {
      setError("暂无可单步回放的链路，请先执行一次流式工作流。");
      return;
    }

    processReplayStep();
  }

  function stepReplayBackOnce() {
    if (loading || isAgentStreaming) {
      return;
    }

    clearReplayTimer();
    setIsReplayPaused(true);
    replayPausedRef.current = true;
    setError("");

    if (!initializeReplayStateIfNeeded({ position: "end" })) {
      setError("暂无可回退的链路，请先执行一次流式工作流。");
      return;
    }

    const replayState = replayStateRef.current;
    if (!replayState) {
      return;
    }

    const currentStep = replayState.timelineCursor + replayState.tokenCursor;
    if (currentStep <= 0) {
      return;
    }

    applyReplayPosition(replayState, currentStep - 1);
  }

  function seekReplayPosition(targetStep: number) {
    if (loading || isAgentStreaming) {
      return;
    }

    clearReplayTimer();
    setIsReplayPaused(true);
    replayPausedRef.current = true;
    setError("");

    if (!initializeReplayStateIfNeeded({ position: "end" })) {
      setError("暂无可定位的链路，请先执行一次流式工作流。");
      return;
    }

    const replayState = replayStateRef.current;
    if (!replayState) {
      return;
    }

    applyReplayPosition(replayState, targetStep);
  }

  function jumpToReplayAnchor(anchor: StreamStageKey) {
    const targetStep = replayAnchorSteps[anchor];
    if (targetStep === null) {
      setError("当前链路暂未覆盖该关键节点。");
      return;
    }
    seekReplayPosition(targetStep);
  }

  function saveReplayBookmark() {
    if (replayProgress.total <= 0) {
      setError("暂无可保存的回放进度，请先执行流式工作流。");
      return;
    }
    const step = replayProgress.current;
    const customLabel = replayBookmarkDraft.trim();
    const label = customLabel || deriveReplayBookmarkLabel(step, replayAnchorSteps);
    const bookmark: ReplayBookmark = {
      id: `bookmark_${Date.now()}_${step}`,
      label,
      step,
      createdAt: new Date().toISOString()
    };
    setReplayBookmarks((prev) =>
      [bookmark, ...prev.filter((item) => item.step !== step)].slice(
        0,
        replayPanelConfig.maxBookmarks
      )
    );
    setReplayBookmarkDraft("");
  }

  function removeReplayBookmark(bookmarkId: string) {
    if (editingReplayBookmarkId === bookmarkId) {
      setEditingReplayBookmarkId("");
      setEditingReplayBookmarkLabel("");
    }
    setSelectedReplayBookmarkIds((prev) => prev.filter((item) => item !== bookmarkId));
    setReplayBookmarks((prev) => prev.filter((item) => item.id !== bookmarkId));
  }

  function clearReplayBookmarks() {
    setEditingReplayBookmarkId("");
    setEditingReplayBookmarkLabel("");
    setSelectedReplayBookmarkIds([]);
    setReplayBookmarks([]);
  }

  function jumpToReplayBookmark(step: number) {
    if (replayProgress.total <= 0) {
      setError("当前回放总步数为空，请先执行一次链路回放。");
      return;
    }
    const safeStep = Math.max(0, Math.min(step, replayProgress.total));
    seekReplayPosition(safeStep);
  }

  function startReplayBookmarkEdit(bookmark: ReplayBookmark) {
    setEditingReplayBookmarkId(bookmark.id);
    setEditingReplayBookmarkLabel(bookmark.label);
  }

  function cancelReplayBookmarkEdit() {
    setEditingReplayBookmarkId("");
    setEditingReplayBookmarkLabel("");
  }

  function saveReplayBookmarkEdit(bookmarkId: string) {
    const nextLabel = editingReplayBookmarkLabel.trim();
    if (!nextLabel) {
      setError("书签名称不能为空。");
      return;
    }
    setReplayBookmarks((prev) =>
      prev.map((item) => (item.id === bookmarkId ? { ...item, label: nextLabel } : item))
    );
    setEditingReplayBookmarkId("");
    setEditingReplayBookmarkLabel("");
  }

  function exportReplayScript() {
    if (replayBookmarks.length === 0) {
      setError("暂无可导出的回放书签，请先保存至少一个书签。");
      return;
    }
    const content = buildReplayScriptContent({
      sessionId,
      sessionTitle,
      exportedAt: new Date().toISOString(),
      totalSteps: replayProgress.total,
      anchorSteps: replayAnchorSteps,
      bookmarks: replayBookmarks
    });
    downloadMarkdownFile(content, `langgraph-replay-script-${sessionId || "session"}.md`);
  }

  function toggleReplayBookmarkSelection(bookmarkId: string) {
    setSelectedReplayBookmarkIds((prev) =>
      prev.includes(bookmarkId)
        ? prev.filter((item) => item !== bookmarkId)
        : [...prev, bookmarkId]
    );
  }

  function selectAllVisibleReplayBookmarks() {
    const ids = visibleReplayBookmarks.map((item) => item.id);
    setSelectedReplayBookmarkIds((prev) =>
      Array.from(new Set([...prev, ...ids]))
    );
  }

  function clearReplayBookmarkSelection() {
    setSelectedReplayBookmarkIds([]);
  }

  function exportSelectedReplayScript() {
    if (selectedReplayBookmarks.length === 0) {
      setError("请先勾选至少一个书签，再导出选中回放脚本。");
      return;
    }
    const content = buildReplayScriptContent({
      sessionId,
      sessionTitle,
      exportedAt: new Date().toISOString(),
      totalSteps: replayProgress.total,
      anchorSteps: replayAnchorSteps,
      bookmarks: selectedReplayBookmarks
    });
    downloadMarkdownFile(
      content,
      `langgraph-replay-script-selected-${sessionId || "session"}.md`
    );
  }

  function applyReplayPanelPreset(preset: Exclude<ReplayPanelPreset, "custom">) {
    const nextConfig = REPLAY_PANEL_PRESETS[preset];
    setReplayPanelPreset(preset);
    setReplayPanelConfig(nextConfig);
    setReplaySpeed(nextConfig.defaultSpeed);
    setAutoExportReplaySummary(nextConfig.autoExportSummary);
    replaySpeedRef.current = nextConfig.defaultSpeed;
    autoExportReplaySummaryRef.current = nextConfig.autoExportSummary;
  }

  function replayStreamTimeline() {
    if (agentStreamTimeline.length === 0 && !agentStreamText.trim()) {
      setError("暂无可回放的流式链路，请先执行一次流式工作流。");
      return;
    }

    clearReplayTimer();
    setError("");
    setIsAgentStreaming(false);
    setIsStreamReplaying(true);
    setIsReplayPaused(false);
    replayPausedRef.current = false;
    initializeReplayStateIfNeeded();

    scheduleReplayTick();
  }

  function exportStreamMarkdown() {
    if (agentStreamTimeline.length === 0 && !agentStreamText.trim() && !agentData) {
      setError("暂无可导出的流式内容，请先执行流式工作流。");
      return;
    }
    exportStreamMarkdownWithFilename(`langgraph-stream-${sessionId || "session"}.md`);
  }

  function applyGraphFocusPrompt() {
    if (!graphFocus) {
      return;
    }
    setUserInput(buildWorkspacePromptFromFocus(graphFocus));
    setGraphFocusHint(`已重新应用图谱焦点提示词：${graphFocus.nodeLabel}`);
  }

  return (
    <div className="panel-grid panel-grid-tight">
      {hasGraphContext ? (
        <div className={`workspace-graph-context${hasMatchedQuerySession ? " ready" : ""}`}>
          <strong>
            {queryFrom === "graph_save" ? "图谱沉淀回看上下文已带入" : "图谱回看上下文已带入"}
          </strong>
          <p>
            {queryNodeLabel ? `节点：${queryNodeLabel}` : "节点：未指定"} · 会话：
            {querySessionId || "未指定"}
            {queryNoteId ? ` · 笔记：${queryNoteId}` : ""}
          </p>
          <p className="workspace-graph-context-guide">
            {hasMatchedQuerySession
              ? queryNoteId
                ? `已定位对应会话。可在本地知识库中搜索笔记 ID「${queryNoteId}」查看该次沉淀笔记。`
                : "已定位对应会话，可直接继续复盘。"
              : "如需精确回看，请点击“重新定位该会话”后继续复盘。"}
          </p>
          {querySessionId ? (
            <div className="workspace-graph-context-actions">
              <button
                type="button"
                onClick={() => void loadSessionDetail(querySessionId)}
                disabled={loading}
              >
                重新定位该会话
              </button>
              <button
                type="button"
                onClick={() => {
                  const keyword = querySessionId || queryNodeLabel || queryNoteId;
                  if (!keyword) {
                    return;
                  }
                  setSessionQuery(keyword);
                  void loadSessions(keyword);
                }}
                disabled={loading}
              >
                仅筛选该上下文会话
              </button>
              {queryNoteId ? (
                <button
                  type="button"
                  onClick={() => {
                    const noteAnchor = `[图谱沉淀锚点] 节点：${
                      queryNodeLabel || "未命名节点"
                    }；笔记ID：${queryNoteId}。请基于本次沉淀继续复盘，不直接给答案。`;
                    setUserInput((prev) => {
                      if (prev.includes(queryNoteId)) {
                        return prev;
                      }
                      const trimmed = prev.trim();
                      return trimmed ? `${noteAnchor}\n\n${trimmed}` : noteAnchor;
                    });
                    setGraphFocusHint(`已将沉淀锚点写入输入框：${queryNoteId}`);
                  }}
                  disabled={loading}
                >
                  写入沉淀锚点
                </button>
              ) : null}
              {queryNoteId ? (
                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams({
                      from: queryFrom || "workspace_graph_context",
                      noteId: queryNoteId,
                      q: queryNoteId,
                      auto: "1"
                    });
                    if (querySessionId) {
                      params.set("sessionId", querySessionId);
                    }
                    if (queryNodeLabel) {
                      params.set("nodeLabel", queryNodeLabel);
                    }
                    router.push(`/kb?${params.toString()}`);
                  }}
                  disabled={loading}
                >
                  在知识库查看该笔记
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="panel wide">
        <h3>会话历史与恢复</h3>
        <div className="demo-form">
          <label>历史搜索</label>
          <input
            value={sessionQuery}
            onChange={(event) => setSessionQuery(event.target.value)}
            placeholder="按标题、会话ID或消息内容搜索"
          />
          <button type="button" onClick={() => loadSessions(sessionQuery)} disabled={loading}>
            搜索会话
          </button>
          <button type="button" onClick={createSession} disabled={loading}>
            创建新学习会话
          </button>
          <button type="button" onClick={() => loadSessions()} disabled={loading}>
            刷新会话列表
          </button>
        </div>
        <div className="card-list card-list-top">
          {sessions.length === 0 ? (
            <div className="card-item muted">当前没有匹配会话，请先创建或调整搜索条件。</div>
          ) : (
            sessions.map((item) => (
              <div className="card-item" key={item.id}>
                <strong>{item.title}</strong>
                <p>会话 ID：{item.id}</p>
                <p>当前层级：Level {item.lastLevel} · 消息数：{item.messageCount}</p>
                <p>更新时间：{formatTime(item.updatedAt)}</p>
                <div className="btn-row">
                  <button type="button" onClick={() => loadSessionDetail(item.id)} disabled={loading}>
                    恢复该会话
                  </button>
                  <button type="button" onClick={() => deleteSessionById(item.id)} disabled={loading}>
                    删除会话
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="panel half">
        <h3>输入与控制</h3>
        {graphFocusHint ? <div className="result-box info">{graphFocusHint}</div> : null}
        {graphFocusSummary ? (
          <div className="workspace-focus-card">
            <strong>图谱焦点联动</strong>
            <p>
              节点：{graphFocus?.nodeLabel} · 风险：{graphFocusSummary.risk} · 掌握度：
              {graphFocusSummary.mastery}
            </p>
            {graphFocusSummary.replayBatchId ? (
              <p>
                回放批次：{graphFocusSummary.replayBatchId}
                {graphFocusSummary.replaySlot
                  ? `（${graphFocusSummary.replaySlot}）`
                  : ""}
                {graphFocusSummary.replayMode
                  ? ` · 模式 ${graphFocusSummary.replayMode}`
                  : ""}
              </p>
            ) : null}
            {graphFocusQueue.length > 1 ? (
              <div className="workspace-focus-queue">
                <div className="workspace-focus-queue-head">
                  <span>批量关系链队列（{graphFocusQueue.length}）</span>
                  <div className="workspace-focus-queue-nav">
                    <button type="button" onClick={() => stepGraphFocusQueue(-1)} disabled={loading}>
                      上一条
                    </button>
                    <span>
                      {Math.max(1, activeGraphFocusQueueIndex + 1)}/{graphFocusQueue.length}
                    </span>
                    <button type="button" onClick={() => stepGraphFocusQueue(1)} disabled={loading}>
                      下一条
                    </button>
                  </div>
                </div>
                <small className="workspace-focus-queue-tip">
                  快捷键：`[` / `]`，或 Alt + 上/下方向键
                </small>
                <label className="workspace-focus-auto-apply">
                  <input
                    type="checkbox"
                    checked={autoApplyGraphFocusPrompt}
                    onChange={(event) => setAutoApplyGraphFocusPrompt(event.target.checked)}
                  />
                  <span>切换队列时自动应用提示词</span>
                </label>
                <div className="workspace-focus-queue-list">
                  {graphFocusQueue.map((item, index) => {
                    const queueKey = buildFocusQueueKey(item);
                    const active =
                      activeGraphFocusQueueKey === queueKey ||
                      (graphFocus ? buildFocusQueueKey(graphFocus) === queueKey : false);
                    return (
                      <button
                        type="button"
                        key={`workspace_focus_queue_${queueKey}_${index}`}
                        className={active ? "active" : ""}
                        onClick={() => switchGraphFocusFromQueue(item, index)}
                        disabled={loading}
                      >
                        <span>
                          {index + 1}. {item.nodeLabel}
                          {item.bridgePartnerLabel ? ` ↔ ${item.bridgePartnerLabel}` : ""}
                        </span>
                        <em>风险 {Math.round(item.risk * 100)}%</em>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <p>关联节点：{graphFocusSummary.related}</p>
            <button type="button" onClick={applyGraphFocusPrompt} disabled={loading}>
              重新应用图谱焦点提示词
            </button>
          </div>
        ) : null}
        <div className="demo-form">
          <label>当前会话 ID</label>
          <input value={sessionId} readOnly placeholder="请先创建或恢复会话" />

          <label>会话标题（可重命名）</label>
          <input
            value={sessionTitle}
            onChange={(event) => setSessionTitle(event.target.value)}
            placeholder="输入会话标题"
          />
          <button type="button" onClick={renameCurrentSession} disabled={loading || !sessionId}>
            重命名当前会话
          </button>

          <label>我的当前思路</label>
          <textarea
            rows={4}
            value={userInput}
            onChange={(event) => setUserInput(event.target.value)}
          />

          <button type="button" onClick={requestNext} disabled={loading || !sessionId}>
            请求下一层引导（当前 Level {currentLevel}）
          </button>

          <label>反思内容（用于最终答案门控）</label>
          <textarea
            rows={3}
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
          />

          <button type="button" onClick={unlockFinal} disabled={loading || !canUnlock || !sessionId}>
            尝试解锁最终答案
          </button>
          <button type="button" onClick={runLangGraphAgent} disabled={loading || !sessionId}>
            运行 LangGraph 学习工作流
          </button>
          <button type="button" onClick={runLangGraphAgentStream} disabled={loading || !sessionId}>
            流式运行 LangGraph
          </button>
          <button type="button" onClick={startStream} disabled={loading || !sessionId}>
            触发流式引导输出
          </button>
          <button type="button" onClick={saveNote} disabled={loading || messages.length === 0}>
            沉淀为本地笔记
          </button>
        </div>
      </div>

      <div className="panel half">
        <h3>会话记录</h3>
        <div className="card-list">
          {messages.length === 0 ? (
            <div className="card-item muted">当前暂无会话记录。</div>
          ) : (
            messages.map((item, index) => (
              <div className="card-item" key={`${item.role}_${index}_${item.createdAt}`}>
                <strong>
                  {item.role === "assistant" ? "AI 引导" : item.role === "user" ? "我的输入" : "系统提示"}
                </strong>
                <p>{item.content}</p>
                <p className="muted">{formatTime(item.createdAt)}</p>
              </div>
            ))
          )}
        </div>

        {streamText ? (
          <div className="result-box result-box-top">
            <strong>流式输出</strong>
            {"\n"}
            {streamText}
          </div>
        ) : null}

        {agentStreamMeta || agentStreamTrace.length > 0 || agentStreamText ? (
          <div className="result-box result-box-top">
            <div className="stream-panel">
              <div className="stream-head">
                <strong>LangGraph 流式面板</strong>
                <span className="tag">
                  {agentStreamMeta
                    ? `${agentStreamMeta.mode} / ${agentStreamMeta.intent}`
                    : "等待元信息"}
                </span>
              </div>

              <div className="stream-tools">
                <button
                  type="button"
                  onClick={replayStreamTimeline}
                  disabled={loading || isAgentStreaming || isStreamReplaying}
                >
                  {isStreamReplaying ? "回放中..." : "回放链路"}
                </button>
                <button
                  type="button"
                  onClick={toggleReplayPause}
                  disabled={loading || !isStreamReplaying}
                >
                  {isReplayPaused ? "继续回放" : "暂停回放"}
                </button>
                <button
                  type="button"
                  onClick={stepReplayOnce}
                  disabled={loading || isAgentStreaming || (isStreamReplaying && !isReplayPaused)}
                >
                  单步下一帧
                </button>
                <button
                  type="button"
                  onClick={stepReplayBackOnce}
                  disabled={loading || isAgentStreaming || (isStreamReplaying && !isReplayPaused)}
                >
                  回退一帧
                </button>
                <div className="stream-speed-switch">
                  {(["1x", "1.5x", "2x"] as ReplaySpeedKey[]).map((speed) => (
                    <button
                      type="button"
                      key={speed}
                      className={`stream-speed-chip ${replaySpeed === speed ? "active" : ""}`}
                      onClick={() => handleReplaySpeedChange(speed)}
                      disabled={loading || isAgentStreaming}
                    >
                      {speed}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={exportStreamMarkdown}
                  disabled={loading || isAgentStreaming || isStreamReplaying}
                >
                  导出链路 Markdown
                </button>
                <label className="stream-auto-export">
                  <input
                    type="checkbox"
                    checked={autoExportReplaySummary}
                    onChange={(event) => {
                      setAutoExportReplaySummary(event.target.checked);
                      setReplayPanelPreset("custom");
                      setReplayPanelConfig((prev) => ({
                        ...prev,
                        autoExportSummary: event.target.checked
                      }));
                    }}
                    disabled={loading || isAgentStreaming}
                  />
                  回放完成自动导出摘要
                </label>
              </div>

              <div className="stream-config-panel">
                <div className="stream-config-head">
                  <strong>回放参数面板</strong>
                  <span>模板：{formatReplayPanelPresetLabel(replayPanelPreset)}</span>
                </div>
                <div className="stream-config-presets">
                  {(
                    [
                      { key: "quick", label: "极速回放" },
                      { key: "balanced", label: "平衡默认" },
                      { key: "deep", label: "深度复盘" }
                    ] as Array<{ key: Exclude<ReplayPanelPreset, "custom">; label: string }>
                  ).map((item) => (
                    <button
                      type="button"
                      key={`stream_preset_${item.key}`}
                      className={`stream-bookmark-sort-chip ${
                        replayPanelPreset === item.key ? "active" : ""
                      }`}
                      onClick={() => applyReplayPanelPreset(item.key)}
                      disabled={loading || isAgentStreaming}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="stream-config-grid">
                  <label>
                    书签上限：{replayPanelConfig.maxBookmarks}
                    <input
                      type="range"
                      min={8}
                      max={24}
                      step={1}
                      value={replayPanelConfig.maxBookmarks}
                      onChange={(event) => {
                        setReplayPanelPreset("custom");
                        setReplayPanelConfig((prev) =>
                          normalizeReplayPanelConfig({
                            ...prev,
                            maxBookmarks: Number(event.target.value)
                          })
                        );
                      }}
                      disabled={loading || isAgentStreaming}
                    />
                  </label>
                  <label>
                    默认倍速
                    <select
                      value={replayPanelConfig.defaultSpeed}
                      onChange={(event) => {
                        const nextSpeed = event.target.value as ReplaySpeedKey;
                        setReplayPanelPreset("custom");
                        setReplayPanelConfig((prev) => ({
                          ...prev,
                          defaultSpeed: nextSpeed
                        }));
                        setReplaySpeed(nextSpeed);
                        replaySpeedRef.current = nextSpeed;
                      }}
                      disabled={loading || isAgentStreaming}
                    >
                      <option value="1x">1x</option>
                      <option value="1.5x">1.5x</option>
                      <option value="2x">2x</option>
                    </select>
                  </label>
                  <label className="stream-config-check">
                    <input
                      type="checkbox"
                      checked={replayPanelConfig.autoExportSummary}
                      onChange={(event) => {
                        setReplayPanelPreset("custom");
                        setReplayPanelConfig((prev) => ({
                          ...prev,
                          autoExportSummary: event.target.checked
                        }));
                        setAutoExportReplaySummary(event.target.checked);
                        autoExportReplaySummaryRef.current = event.target.checked;
                      }}
                      disabled={loading || isAgentStreaming}
                    />
                    默认启用自动导出摘要
                  </label>
                </div>
              </div>

              <div className="stream-progress">
                <div className="stream-progress-head">
                  <span>回放进度</span>
                  <em>
                    {replayProgress.current}/{replayProgress.total || 0}
                  </em>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, replayProgress.total)}
                  step={1}
                  value={Math.min(replayProgress.current, Math.max(1, replayProgress.total))}
                  onChange={(event) => seekReplayPosition(Number(event.target.value) || 0)}
                  disabled={loading || isAgentStreaming || replayProgress.total <= 0}
                />
                <div className="stream-progress-track">
                  <span style={{ width: `${replayProgress.ratio}%` }} />
                </div>
              </div>

              <div className="stream-anchor-row">
                {STREAM_STAGE_META.map((item) => {
                  const targetStep = replayAnchorSteps[item.key];
                  const isActive =
                    targetStep !== null && replayProgress.current >= targetStep;
                  return (
                    <button
                      type="button"
                      key={`anchor_${item.key}`}
                      className={`stream-anchor-chip ${isActive ? "active" : ""}`}
                      onClick={() => jumpToReplayAnchor(item.key)}
                      disabled={
                        loading ||
                        isAgentStreaming ||
                        replayProgress.total <= 0 ||
                        targetStep === null
                      }
                    >
                      {item.label}
                      <em>{targetStep === null ? "--" : `#${targetStep}`}</em>
                    </button>
                  );
                })}
              </div>

              <div className="stream-bookmark-tools">
                <input
                  value={replayBookmarkDraft}
                  onChange={(event) => setReplayBookmarkDraft(event.target.value)}
                  className="stream-bookmark-input"
                  placeholder="书签命名（可选）：如“检索完成，准备生成”"
                  disabled={loading || isAgentStreaming || replayProgress.total <= 0}
                />
                <button
                  type="button"
                  onClick={saveReplayBookmark}
                  disabled={loading || isAgentStreaming || replayProgress.total <= 0}
                >
                  保存当前为书签
                </button>
                <button
                  type="button"
                  onClick={clearReplayBookmarks}
                  disabled={loading || replayBookmarks.length === 0}
                >
                  清空书签
                </button>
                <button
                  type="button"
                  onClick={exportReplayScript}
                  disabled={loading || replayBookmarks.length === 0}
                >
                  导出回放脚本
                </button>
                <button
                  type="button"
                  onClick={exportSelectedReplayScript}
                  disabled={loading || selectedReplayBookmarks.length === 0}
                >
                  导出选中书签
                </button>
              </div>

              {replayBookmarks.length > 0 ? (
                <div className="stream-bookmark-filter">
                  <input
                    value={bookmarkQuery}
                    onChange={(event) => setBookmarkQuery(event.target.value)}
                    className="stream-bookmark-input"
                    placeholder="筛选书签（名称或步骤）"
                    disabled={loading}
                  />
                  <div className="stream-bookmark-sort">
                    <button
                      type="button"
                      className={`stream-bookmark-sort-chip ${
                        bookmarkSort === "desc" ? "active" : ""
                      }`}
                      onClick={() => setBookmarkSort("desc")}
                      disabled={loading}
                    >
                      步骤降序
                    </button>
                    <button
                      type="button"
                      className={`stream-bookmark-sort-chip ${
                        bookmarkSort === "asc" ? "active" : ""
                      }`}
                      onClick={() => setBookmarkSort("asc")}
                      disabled={loading}
                    >
                      步骤升序
                    </button>
                  </div>
                  <span className="stream-bookmark-count">
                    显示 {visibleReplayBookmarks.length}/{replayBookmarks.length}
                  </span>
                  <div className="stream-bookmark-selection-tools">
                    <button
                      type="button"
                      className="stream-bookmark-sort-chip"
                      onClick={selectAllVisibleReplayBookmarks}
                      disabled={loading || visibleReplayBookmarks.length === 0}
                    >
                      勾选当前筛选
                    </button>
                    <button
                      type="button"
                      className="stream-bookmark-sort-chip"
                      onClick={clearReplayBookmarkSelection}
                      disabled={loading || selectedReplayBookmarkIds.length === 0}
                    >
                      清除勾选
                    </button>
                    <span className="stream-bookmark-count">
                      已勾选 {selectedReplayBookmarkIds.length}
                    </span>
                  </div>
                </div>
              ) : null}

              {replayBookmarks.length > 0 ? (
                <div className="stream-bookmark-list">
                  {visibleReplayBookmarks.map((bookmark) => (
                    <div className="stream-bookmark-item" key={bookmark.id}>
                      <button
                        type="button"
                        className={`stream-bookmark-check ${
                          selectedReplayBookmarkIds.includes(bookmark.id) ? "active" : ""
                        }`}
                        onClick={() => toggleReplayBookmarkSelection(bookmark.id)}
                        disabled={loading}
                        aria-label="选择书签用于批量导出"
                      >
                        {selectedReplayBookmarkIds.includes(bookmark.id) ? "✓" : ""}
                      </button>
                      {editingReplayBookmarkId === bookmark.id ? (
                        <div className="stream-bookmark-edit">
                          <input
                            value={editingReplayBookmarkLabel}
                            onChange={(event) =>
                              setEditingReplayBookmarkLabel(event.target.value)
                            }
                            className="stream-bookmark-input"
                            placeholder="输入书签名称"
                            disabled={loading}
                          />
                          <div className="stream-bookmark-edit-tools">
                            <button
                              type="button"
                              className="stream-bookmark-save"
                              onClick={() => saveReplayBookmarkEdit(bookmark.id)}
                              disabled={loading}
                            >
                              保存
                            </button>
                            <button
                              type="button"
                              className="stream-bookmark-cancel"
                              onClick={cancelReplayBookmarkEdit}
                              disabled={loading}
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="stream-bookmark-jump"
                            onClick={() => jumpToReplayBookmark(bookmark.step)}
                            disabled={loading || isAgentStreaming}
                          >
                            <span>{bookmark.label}</span>
                            <em>
                              #{bookmark.step} · {formatTime(bookmark.createdAt)}
                            </em>
                          </button>
                          <button
                            type="button"
                            className="stream-bookmark-edit-btn"
                            onClick={() => startReplayBookmarkEdit(bookmark)}
                            disabled={loading}
                          >
                            重命名
                          </button>
                          <button
                            type="button"
                            className="stream-bookmark-delete"
                            onClick={() => removeReplayBookmark(bookmark.id)}
                            disabled={loading}
                          >
                            删除
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="stream-bookmark-empty">当前没有回放书签。</p>
              )}

              <div className="stream-stage-grid">
                {STREAM_STAGE_META.map((item) => (
                  <div
                    key={item.key}
                    className={`stream-stage stream-stage-${agentStreamStage[item.key]}`}
                  >
                    <span>{item.label}</span>
                    <em>{streamStageStatusLabel(agentStreamStage[item.key])}</em>
                  </div>
                ))}
              </div>

              <p className="stream-meta">
                nextLevel: {agentStreamMeta?.nextLevel ?? "等待中"} · contextRefs：
                {agentStreamMeta?.contextRefs.join("；") || "无"}
              </p>

              <div className="stream-columns">
                <div className="stream-column">
                  <strong>节点时间线</strong>
                  {agentStreamTimeline.length === 0 ? (
                    <p className="muted">等待节点轨迹...</p>
                  ) : (
                    <div className="stream-timeline">
                      {agentStreamTimeline.map((item) => (
                        <div className="stream-timeline-item" key={`timeline_${item.id}`}>
                          <span>{item.at}</span>
                          <p>{item.trace}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="stream-column">
                  <strong>实时引导文本</strong>
                  <div
                    className={`stream-guidance ${
                      isAgentStreaming || isStreamReplaying ? "typing" : ""
                    }`}
                  >
                    {agentStreamText || "（等待 token 输出）"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {saveResult ? (
          <div className="result-box result-box-top">
            <strong>沉淀成功</strong>
            {"\n"}
            noteId: {saveResult.noteId}
            {"\n"}
            path: {saveResult.path}
          </div>
        ) : null}
      </div>

      <div className="panel wide">
        <h3>证据与策略状态</h3>
        <div className="card-list">
          <div className="card-item">
            <strong>当前策略门控</strong>
            <p>可解锁最终答案：{canUnlock ? "是" : "否"}</p>
            <p>当前引导层级：Level {currentLevel}</p>
          </div>
          <div className="card-item">
            <strong>Citation 列表</strong>
            <p>
              {citations.length === 0
                ? "暂无来源引用。"
                : citations.map((item) => `${item.sourceId}#${item.chunkRef}`).join("；")}
            </p>
          </div>
          {nextData ? (
            <div className="card-item">
              <strong>最近一次引导摘要</strong>
              <p>{nextData.guidance}</p>
            </div>
          ) : null}
          {agentData ? (
            <div className="card-item">
              <strong>LangGraph 工作流输出</strong>
              <p>模式：{agentData.mode === "langgraph_model" ? "ModelScope + LangGraph" : "规则兜底"}</p>
              <p>意图：{agentData.intent}</p>
              <p>建议：{agentData.guidance}</p>
              <p>上下文：{agentData.contextRefs.join("；") || "无"}</p>
              <p>轨迹：{agentData.trace.join(" -> ")}</p>
            </div>
          ) : null}
          {unlockData ? (
            <div className="card-item">
              <strong>最终答案门控结果</strong>
              <p>{unlockData.unlocked ? "已解锁。" : `未解锁：${unlockData.reason ?? "策略未通过。"} `}</p>
            </div>
          ) : null}
        </div>
      </div>

      {error ? <div className="result-box danger">{error}</div> : null}
    </div>
  );
}

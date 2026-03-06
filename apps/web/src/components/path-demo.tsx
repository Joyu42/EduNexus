"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatErrorMessage, requestJson } from "@/lib/client/api";
import { CollapsiblePanel } from "@/components/collapsible-panel";
import { SectionAnchorNav } from "@/components/section-anchor-nav";
import { pushGraphActivityEventToStorage } from "@/lib/client/graph-activity";
import {
  buildPathGoalFromFocus,
  readPathFocusBatchFromStorage,
  readPathFocusFromStorage,
  writePathFocusBatchToStorage,
  writePathFocusToStorage,
  writeWorkspaceFocusBatchToStorage,
  writeWorkspaceFocusToStorage,
  type PathFocusPayload
} from "@/lib/client/path-focus-bridge";
import {
  readReplayPushHistoryFromStorage,
  resolveReplayPushSourceLabel,
  resolveReplayPushTargetLabel,
  sortReplayPushHistory,
  type ReplayPushHistoryEntry
} from "@/lib/client/replay-push-history";

type LearningTask = {
  taskId: string;
  title: string;
  priority: number;
  reason?: string;
  dueDate?: string;
};

type PathPayload = {
  planId: string;
  tasks: LearningTask[];
};

type PathFocusFeedbackPayload = {
  planId: string | null;
  taskId: string;
  nodeId: string;
  mastery: number;
  risk: number;
  updatedRelatedCount: number;
};

type SaveNoteResponse = {
  noteId: string;
  path: string;
};

type CreateWorkspaceSessionResponse = {
  session: {
    id: string;
  };
};

type WorkspaceSessionSummary = {
  id: string;
  title: string;
  updatedAt: string;
};

type BridgeSaveMode = "create_new" | "append_existing";

type BridgeChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

function formatDueDate(value?: string) {
  if (!value) {
    return "未指定日期";
  }
  try {
    return new Date(value).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
  } catch {
    return value;
  }
}

function normalizeFocusSource(value: string | null | undefined): PathFocusPayload["focusSource"] {
  if (
    value === "graph" ||
    value === "graph_bridge" ||
    value === "dashboard" ||
    value === "workspace" ||
    value === "unknown"
  ) {
    return value;
  }
  return undefined;
}

function formatFocusSourceLabel(source: PathFocusPayload["focusSource"]) {
  if (source === "graph_bridge") return "图谱关系链建议";
  if (source === "graph") return "图谱焦点节点";
  if (source === "dashboard") return "Dashboard 闭环事件";
  if (source === "workspace") return "工作区联动";
  return "未标注";
}

function buildFocusQueueKey(payload: Pick<PathFocusPayload, "nodeId" | "bridgePartnerLabel">) {
  return `${payload.nodeId}__${payload.bridgePartnerLabel ?? ""}`;
}

function buildFocusHintText(payload: PathFocusPayload, batchCount: number) {
  const bridgeHint = payload.bridgePartnerLabel ? `，桥接节点：${payload.bridgePartnerLabel}` : "";
  const replayHint = payload.replayBatchId
    ? ` · 回放批次 ${payload.replayBatchId}${
        payload.replayBatchIndex && payload.replayBatchTotal
          ? `（${payload.replayBatchIndex}/${payload.replayBatchTotal}）`
          : ""
      }${payload.replayMode ? ` · 模式 ${payload.replayMode}` : ""}`
    : "";
  return `已接收图谱焦点：${payload.nodeLabel}（风险 ${Math.round(
    payload.risk * 100
  )}%） · 来源：${formatFocusSourceLabel(payload.focusSource)}${bridgeHint}${replayHint}${
    batchCount > 1 ? ` · 批量推送 ${batchCount} 条` : ""
  }`;
}

function buildFallbackBridgeTemplate(nodeLabel: string, partnerLabel: string) {
  return `桥接任务模板：先对照「${nodeLabel}」与「${partnerLabel}」的核心条件，再完成同构题、反例题与迁移题各 1 题。`;
}

function buildBridgeChecklistTemplate(
  nodeLabel: string,
  partnerLabel: string
): BridgeChecklistItem[] {
  return [
    {
      id: "bridge_map",
      label: `完成「${nodeLabel}」与「${partnerLabel}」条件映射`,
      done: false
    },
    {
      id: "bridge_iso",
      label: "完成 1 题同构迁移训练",
      done: false
    },
    {
      id: "bridge_counter",
      label: "完成 1 题反例辨析并写出错因",
      done: false
    },
    {
      id: "bridge_apply",
      label: "完成 1 题综合应用并复盘可迁移策略",
      done: false
    }
  ];
}

function buildBridgeChecklistMarkdown(input: {
  focus: PathFocusPayload;
  checklist: BridgeChecklistItem[];
  goal: string;
  generatedAt: string;
}) {
  const source = normalizeFocusSource(input.focus.focusSource);
  const sourceLabel = formatFocusSourceLabel(source);
  const done = input.checklist.filter((item) => item.done).length;
  const title = `${input.focus.nodeLabel} x ${input.focus.bridgePartnerLabel ?? "桥接节点"} 执行清单`;
  const related =
    input.focus.relatedNodes.length > 0
      ? input.focus.relatedNodes.map((item) => `- ${item}`).join("\n")
      : "- 暂无";
  const checklist = input.checklist
    .map((item, index) => `${index + 1}. [${item.done ? "x" : " "}] ${item.label}`)
    .join("\n");
  return [
    "---",
    `title: ${title}`,
    `source: ${sourceLabel}`,
    `node_id: ${input.focus.nodeId}`,
    `node_label: ${input.focus.nodeLabel}`,
    `bridge_partner: ${input.focus.bridgePartnerLabel ?? "unknown"}`,
    `risk: ${Math.round(input.focus.risk * 100)}%`,
    `mastery: ${Math.round(input.focus.mastery * 100)}%`,
    `generated_at: ${input.generatedAt}`,
    "---",
    "",
    "# 路径桥接执行清单",
    "",
    `目标：${input.goal}`,
    "",
    "## 关联节点",
    related,
    "",
    `## 执行进度（${done}/${input.checklist.length}）`,
    checklist,
    "",
    "## 复盘记录",
    "- [ ] 本轮最关键的迁移策略",
    "- [ ] 本轮最典型的错误类型",
    "- [ ] 下一轮计划"
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

function resolveSessionRecommendScore(
  session: WorkspaceSessionSummary,
  focus: PathFocusPayload | null
) {
  if (!focus) {
    return 0;
  }
  const title = (session.title || "").toLowerCase();
  let score = 0;
  const terms = [
    focus.nodeLabel,
    focus.bridgePartnerLabel ?? "",
    focus.domain,
    ...focus.relatedNodes.slice(0, 3)
  ]
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  for (const term of terms) {
    if (title.includes(term)) {
      score += 2;
    }
  }
  if (title.includes("桥接") || title.includes("复盘")) {
    score += 1;
  }
  const updatedAt = Date.parse(session.updatedAt || "");
  if (Number.isFinite(updatedAt)) {
    const hourGap = Math.max(1, (Date.now() - updatedAt) / (1000 * 60 * 60));
    score += Math.max(0, 2 - hourGap / 48);
  }
  return Number(score.toFixed(2));
}

export function PathDemo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [goal, setGoal] = useState("两周内完成等差数列与函数基础复盘");
  const [focusPayload, setFocusPayload] = useState<PathFocusPayload | null>(null);
  const [focusQueue, setFocusQueue] = useState<PathFocusPayload[]>([]);
  const [activeFocusQueueKey, setActiveFocusQueueKey] = useState("");
  const [incomingBatchCount, setIncomingBatchCount] = useState(0);
  const [focusHint, setFocusHint] = useState("");
  const [completedFocusTaskIds, setCompletedFocusTaskIds] = useState<string[]>([]);
  const [bridgeChecklist, setBridgeChecklist] = useState<BridgeChecklistItem[]>([]);
  const [bridgeExportHint, setBridgeExportHint] = useState("");
  const [savingBridgeNote, setSavingBridgeNote] = useState(false);
  const [bridgeWorkspaceSessionId, setBridgeWorkspaceSessionId] = useState("");
  const [bridgeSaveMode, setBridgeSaveMode] = useState<BridgeSaveMode>("create_new");
  const [bridgeTargetSessionId, setBridgeTargetSessionId] = useState("");
  const [workspaceSessions, setWorkspaceSessions] = useState<WorkspaceSessionSummary[]>([]);
  const [replayPushHistoryEntries, setReplayPushHistoryEntries] = useState<
    ReplayPushHistoryEntry[]
  >([]);
  const [replayHistoryKeyword, setReplayHistoryKeyword] = useState("");
  const [replayHistoryTargetFilter, setReplayHistoryTargetFilter] = useState<
    "all" | "path" | "workspace"
  >("all");
  const [replayHistorySourceFilter, setReplayHistorySourceFilter] = useState<
    "all" | "single_frame" | "batch_queue" | "history_repush"
  >("all");
  const [replayHistoryRiskOnly, setReplayHistoryRiskOnly] = useState(false);
  const [submittingTaskId, setSubmittingTaskId] = useState("");
  const [data, setData] = useState<PathPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const prefilledRef = useRef(false);

  useEffect(() => {
    try {
      setCompactMode(window.localStorage.getItem("edunexus_path_compact_ui") === "1");
    } catch {
      setCompactMode(false);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("edunexus_path_compact_ui", compactMode ? "1" : "0");
    } catch {
      // ignore persistence failures
    }
  }, [compactMode]);

  function resetPathLayout() {
    try {
      window.localStorage.removeItem("edunexus_path_compact_ui");
      window.localStorage.removeItem("edunexus_anchor_nav_path_demo");
      window.localStorage.removeItem("edunexus_collapsible_path_focus_panel");
      window.localStorage.removeItem("edunexus_collapsible_path_plan_panel");
    } catch {
      // ignore persistence failures
    }
    window.location.reload();
  }

  function applyPathPanelPreset(preset: "expand" | "focus") {
    try {
      if (preset === "expand") {
        window.localStorage.setItem("edunexus_collapsible_path_focus_panel", "1");
        window.localStorage.setItem("edunexus_collapsible_path_plan_panel", "1");
      } else {
        window.localStorage.setItem("edunexus_collapsible_path_focus_panel", "0");
        window.localStorage.setItem("edunexus_collapsible_path_plan_panel", "1");
      }
    } catch {
      // ignore persistence failures
    }
    window.location.reload();
  }

  function scrollToPathSection(sectionId: string) {
    if (sectionId === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function resetReplayHistoryFilters() {
    setReplayHistoryKeyword("");
    setReplayHistoryTargetFilter("all");
    setReplayHistorySourceFilter("all");
    setReplayHistoryRiskOnly(false);
  }

  useEffect(() => {
    if (prefilledRef.current) {
      return;
    }
    const focusNode = searchParams.get("focusNode");
    const focusLabel = searchParams.get("focusLabel");
    const sourceFromQuery = normalizeFocusSource(searchParams.get("from"));
    const bridgePartnerFromQuery = searchParams.get("bridgePartner");
    const batchCount = Number(searchParams.get("batchCount") ?? "0");
    const replayBatchIdFromQuery = searchParams.get("replayBatchId")?.trim() ?? "";
    const replayModeRaw = searchParams.get("replayMode")?.trim();
    const replayModeFromQuery: PathFocusPayload["replayMode"] =
      replayModeRaw === "focus" || replayModeRaw === "all" ? replayModeRaw : undefined;
    if (!focusNode && !focusLabel) {
      return;
    }
    const stored = readPathFocusFromStorage((key) => window.localStorage.getItem(key));
    const fromStorage =
      stored && (!focusNode || stored.nodeId === focusNode) ? stored : null;
    const fallbackPayload =
      !fromStorage && (focusNode || focusLabel)
        ? {
            nodeId: focusNode ?? "focus_node",
            nodeLabel: focusLabel ?? focusNode ?? "图谱焦点节点",
            domain: "general",
            mastery: 0.45,
            risk: 0.55,
            relatedNodes: [],
            at: new Date().toISOString(),
            focusSource: sourceFromQuery ?? "unknown",
            bridgePartnerLabel: bridgePartnerFromQuery ?? undefined,
            replayBatchId: replayBatchIdFromQuery || undefined,
            replayMode:
              replayModeFromQuery === "focus" || replayModeFromQuery === "all"
                ? replayModeFromQuery
                : undefined,
            bridgeTaskTemplate:
              sourceFromQuery === "graph_bridge" &&
              (bridgePartnerFromQuery ?? "").trim().length > 0
                ? buildFallbackBridgeTemplate(
                    focusLabel ?? focusNode ?? "图谱焦点节点",
                    bridgePartnerFromQuery ?? ""
                  )
                : undefined
          }
        : null;
    const payload = fromStorage ?? fallbackPayload;
    if (!payload) {
      return;
    }
    const mergedPayload: PathFocusPayload = {
      ...payload,
      focusSource: payload.focusSource ?? sourceFromQuery ?? "unknown",
      bridgePartnerLabel: payload.bridgePartnerLabel ?? bridgePartnerFromQuery ?? undefined,
      replayBatchId:
        payload.replayBatchId ?? (replayBatchIdFromQuery || undefined),
      replayMode: payload.replayMode ?? replayModeFromQuery,
      bridgeTaskTemplate:
        payload.bridgeTaskTemplate ??
        (payload.focusSource === "graph_bridge" || sourceFromQuery === "graph_bridge"
          ? (() => {
              const partner = payload.bridgePartnerLabel ?? bridgePartnerFromQuery ?? "";
              if (!partner.trim()) {
                return undefined;
              }
              return buildFallbackBridgeTemplate(payload.nodeLabel, partner);
            })()
          : undefined)
    };
    const safeBatchCount = Number.isFinite(batchCount) && batchCount > 1 ? batchCount : 0;
    const batchFocuses =
      safeBatchCount > 0
        ? readPathFocusBatchFromStorage((key) => window.localStorage.getItem(key), 12)
        : [];
    const activePayload =
      batchFocuses.length > 0
        ? batchFocuses.find(
            (item) => buildFocusQueueKey(item) === buildFocusQueueKey(mergedPayload)
          ) ?? batchFocuses[0]!
        : mergedPayload;
    setIncomingBatchCount(safeBatchCount);
    setFocusQueue(batchFocuses);
    setActiveFocusQueueKey(
      batchFocuses.length > 0 ? buildFocusQueueKey(activePayload) : ""
    );
    setFocusPayload(activePayload);
    setGoal(buildPathGoalFromFocus(activePayload));
    setFocusHint(buildFocusHintText(activePayload, batchFocuses.length || safeBatchCount));
    prefilledRef.current = true;
  }, [searchParams]);

  const focusSummary = useMemo(() => {
    if (!focusPayload) {
      return null;
    }
    return {
      riskText: `${Math.round(focusPayload.risk * 100)}%`,
      masteryText: `${Math.round(focusPayload.mastery * 100)}%`,
      sourceText: formatFocusSourceLabel(focusPayload.focusSource),
      relatedText:
        focusPayload.relatedNodes.length > 0
          ? focusPayload.relatedNodes.slice(0, 4).join("、")
          : "暂无",
      bridgeText: focusPayload.bridgePartnerLabel ?? "",
      bridgeTaskTemplate: focusPayload.bridgeTaskTemplate?.trim() ?? "",
      replayBatchId: focusPayload.replayBatchId ?? "",
      replaySlot:
        focusPayload.replayBatchIndex && focusPayload.replayBatchTotal
          ? `${focusPayload.replayBatchIndex}/${focusPayload.replayBatchTotal}`
          : "",
      replayMode: focusPayload.replayMode ?? ""
    };
  }, [focusPayload]);

  const sortedReplayPushHistory = useMemo(
    () => sortReplayPushHistory(replayPushHistoryEntries, "latest"),
    [replayPushHistoryEntries]
  );
  const normalizedReplayHistoryKeyword = useMemo(
    () => replayHistoryKeyword.trim().toLowerCase(),
    [replayHistoryKeyword]
  );
  const filteredReplayPushHistory = useMemo(
    () =>
      sortedReplayPushHistory.filter((entry) => {
        if (replayHistoryTargetFilter !== "all" && entry.target !== replayHistoryTargetFilter) {
          return false;
        }
        if (replayHistorySourceFilter !== "all" && entry.source !== replayHistorySourceFilter) {
          return false;
        }
        if (replayHistoryRiskOnly) {
          const hasHighRisk = entry.queue.some((item) => item.risk >= 0.65);
          if (!hasHighRisk) {
            return false;
          }
        }
        if (!normalizedReplayHistoryKeyword) {
          return true;
        }
        const sourceLabel = resolveReplayPushSourceLabel(entry.source);
        const targetLabel = resolveReplayPushTargetLabel(entry.target);
        const searchText = [
          entry.batchId,
          sourceLabel,
          targetLabel,
          entry.primaryNodeLabel,
          entry.bridgePartnerLabel ?? "",
          entry.mode ?? "",
          entry.at
        ]
          .join(" ")
          .toLowerCase();
        return searchText.includes(normalizedReplayHistoryKeyword);
      }),
    [
      normalizedReplayHistoryKeyword,
      replayHistoryRiskOnly,
      replayHistorySourceFilter,
      replayHistoryTargetFilter,
      sortedReplayPushHistory
    ]
  );
  const replayPushHistoryPreview = useMemo(
    () => filteredReplayPushHistory.slice(0, 8),
    [filteredReplayPushHistory]
  );
  const replayHistoryHighRiskCount = useMemo(
    () => filteredReplayPushHistory.filter((entry) => entry.queue.some((item) => item.risk >= 0.65)).length,
    [filteredReplayPushHistory]
  );

  const loadReplayPushHistory = useCallback(() => {
    setReplayPushHistoryEntries(
      readReplayPushHistoryFromStorage((key) => window.localStorage.getItem(key), 12)
    );
  }, []);

  useEffect(() => {
    loadReplayPushHistory();
    window.addEventListener("focus", loadReplayPushHistory);
    return () => window.removeEventListener("focus", loadReplayPushHistory);
  }, [loadReplayPushHistory]);

  const activeFocusQueueIndex = useMemo(() => {
    if (focusQueue.length === 0) {
      return -1;
    }
    const activeKey =
      activeFocusQueueKey || (focusPayload ? buildFocusQueueKey(focusPayload) : "");
    if (!activeKey) {
      return 0;
    }
    return focusQueue.findIndex((item) => buildFocusQueueKey(item) === activeKey);
  }, [activeFocusQueueKey, focusPayload, focusQueue]);

  const focusTasks = useMemo(() => {
    if (!data || !focusPayload) {
      return [];
    }
    const terms = [
      focusPayload.nodeLabel,
      ...focusPayload.relatedNodes.slice(0, 4)
    ]
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    if (terms.length === 0) {
      return [];
    }
    return data.tasks.filter((task) => {
      const text = `${task.title} ${task.reason ?? ""}`.toLowerCase();
      return terms.some((term) => text.includes(term));
    });
  }, [data, focusPayload]);

  const focusTaskIdSet = useMemo(
    () => new Set(focusTasks.map((task) => task.taskId)),
    [focusTasks]
  );
  const taskDayMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const [index, task] of (data?.tasks ?? []).entries()) {
      map.set(task.taskId, index + 1);
    }
    return map;
  }, [data?.tasks]);
  const regularTasks = useMemo(
    () => (data?.tasks ?? []).filter((task) => !focusTaskIdSet.has(task.taskId)),
    [data?.tasks, focusTaskIdSet]
  );
  const focusFeedbackStats = useMemo(() => {
    if (!focusPayload) {
      return null;
    }
    const total = focusTasks.length;
    const done = completedFocusTaskIds.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      done,
      total,
      completionRate
    };
  }, [completedFocusTaskIds.length, focusPayload, focusTasks.length]);
  const bridgeChecklistStorageKey = useMemo(() => {
    if (!focusPayload) {
      return "";
    }
    if (focusPayload.focusSource !== "graph_bridge" || !focusPayload.bridgePartnerLabel) {
      return "";
    }
    return `edunexus_path_bridge_checklist_${focusPayload.nodeId}_${focusPayload.bridgePartnerLabel}`;
  }, [focusPayload]);
  const bridgeChecklistProgress = useMemo(() => {
    const total = bridgeChecklist.length;
    const done = bridgeChecklist.filter((item) => item.done).length;
    return {
      total,
      done,
      rate: total > 0 ? Math.round((done / total) * 100) : 0
    };
  }, [bridgeChecklist]);
  const recommendedWorkspaceSessions = useMemo(
    () =>
      workspaceSessions
        .map((session) => ({
          ...session,
          recommendScore: resolveSessionRecommendScore(session, focusPayload)
        }))
        .sort((a, b) => b.recommendScore - a.recommendScore)
        .slice(0, 5),
    [focusPayload, workspaceSessions]
  );
  const pathQueueSize =
    focusQueue.length > 0 ? focusQueue.length : focusPayload ? 1 : incomingBatchCount;
  const pathTaskCount = data?.tasks.length ?? 0;
  const pathFocusDone = focusFeedbackStats?.done ?? 0;
  const pathFocusTotal = focusFeedbackStats?.total ?? 0;

  useEffect(() => {
    if (!focusPayload) {
      setBridgeChecklist([]);
      return;
    }
    if (focusPayload.focusSource !== "graph_bridge" || !focusPayload.bridgePartnerLabel) {
      setBridgeChecklist([]);
      return;
    }
    const template = buildBridgeChecklistTemplate(
      focusPayload.nodeLabel,
      focusPayload.bridgePartnerLabel
    );
    if (!bridgeChecklistStorageKey) {
      setBridgeChecklist(template);
      return;
    }
    try {
      const raw = window.localStorage.getItem(bridgeChecklistStorageKey);
      if (!raw) {
        setBridgeChecklist(template);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        setBridgeChecklist(template);
        return;
      }
      const statusMap = new Map<string, boolean>();
      for (const item of parsed) {
        if (!item || typeof item !== "object") {
          continue;
        }
        const value = item as { id?: unknown; done?: unknown };
        if (typeof value.id === "string" && typeof value.done === "boolean") {
          statusMap.set(value.id, value.done);
        }
      }
      setBridgeChecklist(
        template.map((item) => ({
          ...item,
          done: statusMap.get(item.id) ?? false
        }))
      );
    } catch {
      setBridgeChecklist(template);
    }
  }, [bridgeChecklistStorageKey, focusPayload]);

  useEffect(() => {
    if (!bridgeChecklistStorageKey || bridgeChecklist.length === 0) {
      return;
    }
    try {
      window.localStorage.setItem(
        bridgeChecklistStorageKey,
        JSON.stringify(bridgeChecklist.map((item) => ({ id: item.id, done: item.done })))
      );
    } catch {
      // ignore storage write failures
    }
  }, [bridgeChecklist, bridgeChecklistStorageKey]);

  useEffect(() => {
    setBridgeExportHint("");
    setBridgeWorkspaceSessionId("");
    setBridgeSaveMode("create_new");
    setBridgeTargetSessionId("");
  }, [bridgeChecklistStorageKey]);

  useEffect(() => {
    if (bridgeChecklist.length === 0) {
      setWorkspaceSessions([]);
      return;
    }
    const loadSessions = async () => {
      try {
        const data = await requestJson<{ sessions: WorkspaceSessionSummary[] }>(
          "/api/workspace/sessions"
        );
        const sessions = (data.sessions ?? []).slice(0, 20);
        setWorkspaceSessions(sessions);
        setBridgeTargetSessionId((prev) => prev || sessions[0]?.id || "");
      } catch {
        setWorkspaceSessions([]);
      }
    };
    void loadSessions();
  }, [bridgeChecklist.length]);

  useEffect(() => {
    if (bridgeSaveMode !== "append_existing") {
      return;
    }
    if (recommendedWorkspaceSessions.length === 0) {
      return;
    }
    const suggested = recommendedWorkspaceSessions[0]!;
    if (!bridgeTargetSessionId) {
      setBridgeTargetSessionId(suggested.id);
      return;
    }
    const exists = workspaceSessions.some((item) => item.id === bridgeTargetSessionId);
    if (!exists) {
      setBridgeTargetSessionId(suggested.id);
    }
  }, [
    bridgeSaveMode,
    bridgeTargetSessionId,
    recommendedWorkspaceSessions,
    workspaceSessions
  ]);

  function applyBridgeTemplateGoal() {
    if (!focusSummary?.bridgeTaskTemplate) {
      return;
    }
    setGoal(focusSummary.bridgeTaskTemplate);
    setFocusHint("已将关系链桥接模板应用到学习目标。");
  }

  const selectFocusFromQueue = useCallback((payload: PathFocusPayload) => {
    setFocusPayload(payload);
    setActiveFocusQueueKey(buildFocusQueueKey(payload));
    setGoal(buildPathGoalFromFocus(payload));
    setFocusHint(buildFocusHintText(payload, focusQueue.length || incomingBatchCount));
    setBridgeExportHint("");
  }, [focusQueue.length, incomingBatchCount]);

  const applyReplayHistoryToPath = useCallback((entry: ReplayPushHistoryEntry) => {
    if (entry.queue.length === 0) {
      setError("该回放批次无可用关系链，无法载入。");
      return;
    }
    const queue = entry.queue.map((item, index) => ({
      ...item,
      replayBatchId: item.replayBatchId ?? entry.batchId,
      replayBatchIndex: index + 1,
      replayBatchTotal: entry.queue.length,
      replayMode: item.replayMode ?? entry.mode
    }));
    const primary = queue[0]!;
    writePathFocusBatchToStorage(queue, (key, value) => window.localStorage.setItem(key, value));
    writePathFocusToStorage(primary, (key, value) => window.localStorage.setItem(key, value));
    setIncomingBatchCount(queue.length);
    setFocusQueue(queue);
    setActiveFocusQueueKey(buildFocusQueueKey(primary));
    setFocusPayload(primary);
    setGoal(buildPathGoalFromFocus(primary));
    setBridgeExportHint("");
    setFocusHint(
      `已从回放历史载入路径批次：${entry.batchId} · ${queue.length} 条（原目标：${resolveReplayPushTargetLabel(
        entry.target
      )}）`
    );
  }, []);

  const openReplayBatchInGraph = useCallback(
    (entry: ReplayPushHistoryEntry) => {
      const params = new URLSearchParams({
        replayBatchId: entry.batchId,
        from: "path"
      });
      router.push(`/graph?${params.toString()}`);
    },
    [router]
  );

  const stepFocusQueue = useCallback((offset: number) => {
    if (focusQueue.length < 2) {
      return;
    }
    const baseIndex = activeFocusQueueIndex >= 0 ? activeFocusQueueIndex : 0;
    const nextIndex = (baseIndex + offset + focusQueue.length) % focusQueue.length;
    const next = focusQueue[nextIndex];
    if (!next) {
      return;
    }
    selectFocusFromQueue(next);
  }, [activeFocusQueueIndex, focusQueue, selectFocusFromQueue]);

  useEffect(() => {
    if (focusQueue.length < 2) {
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
      if (event.key === "[" || event.key === "ArrowLeft") {
        event.preventDefault();
        stepFocusQueue(-1);
      } else if (event.key === "]" || event.key === "ArrowRight") {
        event.preventDefault();
        stepFocusQueue(1);
      }
    };
    window.addEventListener("keydown", handleQueueShortcut);
    return () => {
      window.removeEventListener("keydown", handleQueueShortcut);
    };
  }, [focusQueue.length, stepFocusQueue]);

  function toggleBridgeChecklistItem(itemId: string) {
    setBridgeChecklist((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, done: !item.done } : item))
    );
  }

  function markAllBridgeChecklistDone() {
    setBridgeChecklist((prev) => prev.map((item) => ({ ...item, done: true })));
  }

  function exportBridgeChecklistMarkdown() {
    if (!focusPayload || bridgeChecklist.length === 0) {
      return;
    }
    const generatedAt = new Date().toISOString();
    const markdown = buildBridgeChecklistMarkdown({
      focus: focusPayload,
      checklist: bridgeChecklist,
      goal,
      generatedAt
    });
    const stamp = generatedAt
      .replace(/[-:]/g, "")
      .replace("T", "_")
      .slice(0, 13);
    const fileName = `path-bridge-${focusPayload.nodeId}-${stamp}.md`;
    downloadMarkdownFile(markdown, fileName);
    setBridgeExportHint(`已导出桥接清单：${fileName}`);
  }

  async function saveBridgeChecklistToWorkspaceSession() {
    if (!focusPayload || bridgeChecklist.length === 0) {
      return;
    }
    setSavingBridgeNote(true);
    setBridgeExportHint("");
    try {
      const content = buildBridgeChecklistMarkdown({
        focus: focusPayload,
        checklist: bridgeChecklist,
        goal,
        generatedAt: new Date().toISOString()
      });
      let sessionId = "";
      if (bridgeSaveMode === "append_existing") {
        sessionId = bridgeTargetSessionId.trim();
        if (!sessionId) {
          setError("请选择一个已有工作区会话用于追加沉淀。");
          return;
        }
      } else {
        const sessionPayload = await requestJson<CreateWorkspaceSessionResponse>(
          "/api/workspace/session",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: `桥接清单-${focusPayload.nodeLabel}`,
              initialGoal: goal
            })
          }
        );
        sessionId = sessionPayload.session.id;
      }
      const response = await requestJson<SaveNoteResponse>("/api/workspace/note/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          title: `路径桥接清单-${focusPayload.nodeLabel}`,
          content,
          tags: [
            "path_bridge",
            "path_checklist",
            focusPayload.domain || "general"
          ],
          links: focusPayload.relatedNodes.slice(0, 6)
        })
      });
      setBridgeWorkspaceSessionId(sessionId);
      setBridgeExportHint(
        `${bridgeSaveMode === "append_existing" ? "已追加会话沉淀" : "已写入会话沉淀"}：${
          response.noteId
        }（session: ${sessionId}）`
      );
      pushGraphActivityEventToStorage(
        {
          source: "workspace",
          nodeId: focusPayload.nodeId,
          nodeLabel: focusPayload.nodeLabel,
          title: "桥接清单沉淀完成",
          detail: `会话 ${sessionId} 已保存桥接清单 ${response.noteId}`,
          riskScore: focusPayload.risk
        },
        {
          readItem: (key) => window.localStorage.getItem(key),
          writeItem: (key, value) => window.localStorage.setItem(key, value)
        },
        16
      );
    } catch (err) {
      setBridgeExportHint("");
      setError(formatErrorMessage(err, "写入会话沉淀失败。"));
    } finally {
      setSavingBridgeNote(false);
    }
  }

  function jumpToWorkspaceFromBridgeChecklist() {
    if (!focusPayload) {
      return;
    }
    writeWorkspaceFocusToStorage(focusPayload, (key, value) =>
      window.localStorage.setItem(key, value)
    );
    if (focusQueue.length > 1) {
      writeWorkspaceFocusBatchToStorage(focusQueue, (key, value) =>
        window.localStorage.setItem(key, value)
      );
    }
    if (bridgeWorkspaceSessionId) {
      const params = new URLSearchParams({
        sessionId: bridgeWorkspaceSessionId,
        ...(focusQueue.length > 1 ? { batchCount: String(focusQueue.length) } : {})
      });
      router.push(`/workspace?${params.toString()}`);
      return;
    }
    if (focusQueue.length > 1) {
      const params = new URLSearchParams({
        batchCount: String(focusQueue.length)
      });
      router.push(`/workspace?${params.toString()}`);
      return;
    }
    router.push("/workspace");
  }

  async function generatePath() {
    setLoading(true);
    setError("");
    try {
      const data = await requestJson<PathPayload>("/api/path/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goalType: "exam",
          goal,
          days: 7,
          focusNodeId: focusPayload?.nodeId,
          focusNodeLabel: focusPayload?.nodeLabel,
          focusNodeRisk: focusPayload?.risk,
          relatedNodes: focusPayload?.relatedNodes ?? []
        })
      });
      setData(data);
      setCompletedFocusTaskIds([]);
    } catch (err) {
      setError(formatErrorMessage(err, "生成路径失败。"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function replan() {
    if (!data) {
      setError("请先生成路径。");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const updated = await requestJson<PathPayload>("/api/path/replan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: data.planId,
          reason: "本周可学习时长减少，需要压缩任务",
          availableHoursPerDay: 1.2
        })
      });
      setData(updated);
      setCompletedFocusTaskIds([]);
    } catch (err) {
      setError(formatErrorMessage(err, "重排失败。"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function markFocusTaskDone(task: LearningTask) {
    if (!data || !focusPayload || completedFocusTaskIds.includes(task.taskId)) {
      return;
    }
    setSubmittingTaskId(task.taskId);
    setError("");
    try {
      const result = await requestJson<PathFocusFeedbackPayload>(
        "/api/path/focus/feedback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId: data.planId,
            taskId: task.taskId,
            nodeId: focusPayload.nodeId,
            nodeLabel: focusPayload.nodeLabel,
            relatedNodes: focusPayload.relatedNodes,
            quality: "solid"
          })
        }
      );
      setCompletedFocusTaskIds((prev) =>
        prev.includes(task.taskId) ? prev : [...prev, task.taskId]
      );
      setFocusPayload((prev) =>
        prev
          ? {
              ...prev,
              mastery: result.mastery,
              risk: result.risk,
              at: new Date().toISOString()
            }
          : prev
      );
      if (focusPayload) {
        const currentKey = buildFocusQueueKey(focusPayload);
        setFocusQueue((prev) =>
          prev.map((item) =>
            buildFocusQueueKey(item) === currentKey
              ? {
                  ...item,
                  mastery: result.mastery,
                  risk: result.risk,
                  at: new Date().toISOString()
                }
              : item
          )
        );
      }
      setFocusHint(
        `已回写图谱掌握度：${focusPayload.nodeLabel} -> ${Math.round(result.mastery * 100)}%（关联更新 ${result.updatedRelatedCount} 个）`
      );
      pushGraphActivityEventToStorage(
        {
          source: "path_feedback",
          nodeId: focusPayload.nodeId,
          nodeLabel: focusPayload.nodeLabel,
          title: "路径焦点任务完成",
          detail: `任务 ${task.taskId} 回写后掌握度 ${Math.round(
            result.mastery * 100
          )}%`,
          riskScore: result.risk
        },
        {
          readItem: (key) => window.localStorage.getItem(key),
          writeItem: (key, value) => window.localStorage.setItem(key, value)
        },
        16
      );
    } catch (err) {
      setError(formatErrorMessage(err, "回写图谱反馈失败。"));
      console.error(err);
    } finally {
      setSubmittingTaskId("");
    }
  }

  return (
    <div className={`demo-form demo-form-path${compactMode ? " is-compact" : ""}`}>
      <div className="demo-toolbar">
        <span>路径执行工作台</span>
        <div className="demo-toolbar-actions">
          <button
            type="button"
            className={`demo-compact-toggle demo-btn-primary${compactMode ? " active" : ""}`}
            onClick={() => setCompactMode((prev) => !prev)}
          >
            {compactMode ? "紧凑模式" : "舒展模式"}
          </button>
          <button type="button" className="demo-panel-toggle demo-btn-secondary" onClick={() => applyPathPanelPreset("expand")}>
            展开分区
          </button>
          <button type="button" className="demo-panel-toggle demo-btn-secondary" onClick={() => applyPathPanelPreset("focus")}>
            专注执行
          </button>
          <button type="button" className="demo-reset-toggle demo-btn-neutral" onClick={resetPathLayout}>
            重置分区
          </button>
        </div>
      </div>
      <div className="demo-context-links">
        <button type="button" className="demo-link-chip" onClick={() => router.push("/graph?from=path")}>
          查看图谱总览
        </button>
        <button type="button" className="demo-link-chip" onClick={() => router.push("/workspace?from=path")}>
          进入学习工作区
        </button>
        <button type="button" className="demo-link-chip" onClick={() => router.push("/kb?from=path")}>
          打开知识库检索
        </button>
      </div>
      <div className="path-quick-actions">
        <button type="button" onClick={() => scrollToPathSection("path_focus_panel")}>
          聚焦焦点联动
        </button>
        <button type="button" onClick={() => scrollToPathSection("path_goal_panel")}>
          目标与生成
        </button>
        <button type="button" onClick={() => scrollToPathSection("path_plan_panel")}>
          计划与回写
        </button>
        <button type="button" onClick={() => scrollToPathSection("path_error_panel")}>
          状态反馈
        </button>
        <button type="button" onClick={() => scrollToPathSection("top")}>
          回到顶部
        </button>
      </div>
      <SectionAnchorNav
        title="路径分区导航"
        storageKey="path_demo"
        items={[
          { id: "path_focus_panel", label: "焦点联动" },
          { id: "path_goal_panel", label: "目标设定" },
          { id: "path_plan_panel", label: "执行回写" },
          { id: "path_error_panel", label: "状态反馈" }
        ]}
      />
      <div className="demo-metric-strip">
        <div className="demo-metric-chip">
          <span>焦点队列</span>
          <strong>{pathQueueSize}</strong>
        </div>
        <div className="demo-metric-chip">
          <span>计划任务</span>
          <strong>{pathTaskCount}</strong>
        </div>
        <div className="demo-metric-chip">
          <span>焦点回写</span>
          <strong>
            {pathFocusDone}/{pathFocusTotal}
          </strong>
        </div>
        <div className="demo-metric-chip">
          <span>当前状态</span>
          <strong>{loading ? "执行中" : "就绪"}</strong>
        </div>
      </div>
      {focusHint ? <div className="result-box info">{focusHint}</div> : null}
      {focusSummary ? (
        <CollapsiblePanel
          id="path_focus_panel"
          title="图谱联动焦点"
          subtitle="关系链来源、批次队列与桥接执行清单"
          storageKey="path_focus_panel"
          className="path-focus-summary panel-surface anchor-target"
          defaultExpanded
        >
          <p>
            节点：{focusPayload?.nodeLabel} · 域：{focusPayload?.domain} · 风险：
            {focusSummary.riskText} · 掌握度：{focusSummary.masteryText}
          </p>
          <p>
            来源：{focusSummary.sourceText}
            {focusSummary.bridgeText ? ` · 桥接节点：${focusSummary.bridgeText}` : ""}
            {focusSummary.replayBatchId
              ? ` · 回放批次：${focusSummary.replayBatchId}${
                  focusSummary.replaySlot ? `（${focusSummary.replaySlot}）` : ""
                }${focusSummary.replayMode ? ` · 模式 ${focusSummary.replayMode}` : ""}`
              : ""}
          </p>
          {focusQueue.length > 1 ? (
            <div className="path-focus-queue">
              <div className="path-focus-queue-head">
                <strong>批量关系链队列（{focusQueue.length}）</strong>
                <div className="path-focus-queue-nav">
                  <button type="button" onClick={() => stepFocusQueue(-1)}>
                    上一条
                  </button>
                  <span>
                    {Math.max(1, activeFocusQueueIndex + 1)}/{focusQueue.length}
                  </span>
                  <button type="button" onClick={() => stepFocusQueue(1)}>
                    下一条
                  </button>
                </div>
              </div>
              <div className="path-focus-queue-list">
                {focusQueue.map((item, index) => {
                  const queueKey = buildFocusQueueKey(item);
                  const active =
                    activeFocusQueueKey === queueKey ||
                    (focusPayload ? buildFocusQueueKey(focusPayload) === queueKey : false);
                  return (
                    <button
                      type="button"
                      key={`focus_queue_${queueKey}_${index}`}
                      className={active ? "active" : ""}
                      onClick={() => selectFocusFromQueue(item)}
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
          <div className="path-replay-history">
            <header>
              <strong>回放批次历史入口</strong>
              <span>支持一键载入为当前路径焦点队列</span>
            </header>
            <div className="path-replay-history-filter">
              <label className="path-replay-history-search">
                <span>关键词筛选</span>
                <input
                  value={replayHistoryKeyword}
                  onChange={(event) => setReplayHistoryKeyword(event.target.value)}
                  placeholder="批次 / 节点 / 来源 / 模式"
                  aria-label="筛选路径回放批次"
                />
              </label>
              <label>
                <span>目标</span>
                <select
                  value={replayHistoryTargetFilter}
                  onChange={(event) =>
                    setReplayHistoryTargetFilter(
                      event.target.value as "all" | "path" | "workspace"
                    )
                  }
                >
                  <option value="all">全部目标</option>
                  <option value="path">路径</option>
                  <option value="workspace">工作区</option>
                </select>
              </label>
              <label>
                <span>来源</span>
                <select
                  value={replayHistorySourceFilter}
                  onChange={(event) =>
                    setReplayHistorySourceFilter(
                      event.target.value as
                        | "all"
                        | "single_frame"
                        | "batch_queue"
                        | "history_repush"
                    )
                  }
                >
                  <option value="all">全部来源</option>
                  <option value="single_frame">当前帧推送</option>
                  <option value="batch_queue">批量队列推送</option>
                  <option value="history_repush">历史复推</option>
                </select>
              </label>
              <label className="path-replay-history-risk-toggle">
                <input
                  type="checkbox"
                  checked={replayHistoryRiskOnly}
                  onChange={(event) => setReplayHistoryRiskOnly(event.target.checked)}
                />
                <span>仅高风险批次</span>
              </label>
              <span>
                命中 {filteredReplayPushHistory.length}/{sortedReplayPushHistory.length} · 高风险{" "}
                {replayHistoryHighRiskCount}
              </span>
              <button type="button" onClick={resetReplayHistoryFilters}>
                清空筛选
              </button>
            </div>
            {replayPushHistoryPreview.length > 0 ? (
              <div className="path-replay-history-list">
                {replayPushHistoryPreview.map((entry) => (
                  <article key={entry.id} className="path-replay-history-item">
                    <p>
                      <strong>{entry.batchId}</strong> · {entry.count} 条 · 原目标{" "}
                      {resolveReplayPushTargetLabel(entry.target)}
                    </p>
                    <span>
                      {resolveReplayPushSourceLabel(entry.source)}
                      {entry.mode ? ` · 模式 ${entry.mode}` : ""}
                    </span>
                    <div className="path-replay-history-actions">
                      <button type="button" onClick={() => applyReplayHistoryToPath(entry)}>
                        载入到路径
                      </button>
                      <button type="button" onClick={() => openReplayBatchInGraph(entry)}>
                        回图谱定位
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">
                {sortedReplayPushHistory.length > 0
                  ? "当前筛选下没有可用批次，建议放宽筛选条件。"
                  : "暂无回放批次历史，可先在图谱页执行批量推送。"}
              </p>
            )}
          </div>
          <p>关联节点：{focusSummary.relatedText}</p>
          {focusSummary.bridgeTaskTemplate ? (
            <div className="path-bridge-template">
              <strong>桥接任务模板</strong>
              <p>{focusSummary.bridgeTaskTemplate}</p>
              <button type="button" onClick={applyBridgeTemplateGoal}>
                一键应用到目标
              </button>
            </div>
          ) : null}
          {focusFeedbackStats ? (
            <div className="path-focus-feedback-stats">
              <span>
                回写统计：{focusFeedbackStats.done}/{focusFeedbackStats.total}
              </span>
              <em>完成率 {focusFeedbackStats.completionRate}%</em>
            </div>
          ) : null}
          {bridgeChecklist.length > 0 ? (
            <div className="path-bridge-checklist">
              <header>
                <strong>桥接执行检查清单</strong>
                <span>
                  {bridgeChecklistProgress.done}/{bridgeChecklistProgress.total} ·{" "}
                  {bridgeChecklistProgress.rate}%
                </span>
              </header>
              {bridgeChecklist.map((item) => (
                <label
                  key={item.id}
                  className={`path-bridge-checklist-item${item.done ? " done" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggleBridgeChecklistItem(item.id)}
                  />
                  {item.label}
                </label>
              ))}
              <div className="path-bridge-save-mode">
                <label>
                  会话沉淀方式
                  <select
                    value={bridgeSaveMode}
                    onChange={(event) => setBridgeSaveMode(event.target.value as BridgeSaveMode)}
                  >
                    <option value="create_new">新建会话并沉淀</option>
                    <option value="append_existing">追加到已有会话</option>
                  </select>
                </label>
                {bridgeSaveMode === "append_existing" ? (
                  <label>
                    目标会话
                    <select
                      value={bridgeTargetSessionId}
                      onChange={(event) => setBridgeTargetSessionId(event.target.value)}
                    >
                      <option value="">请选择会话</option>
                      {workspaceSessions.map((session) => {
                        const recommended = recommendedWorkspaceSessions.some(
                          (item) => item.id === session.id
                        );
                        return (
                          <option key={`bridge_session_${session.id}`} value={session.id}>
                            {recommended ? "推荐 · " : ""}
                            {session.title}（{session.id}）
                          </option>
                        );
                      })}
                    </select>
                    {recommendedWorkspaceSessions[0] ? (
                      <small>
                        推荐会话：{recommendedWorkspaceSessions[0].title}（匹配度{" "}
                        {recommendedWorkspaceSessions[0].recommendScore.toFixed(2)}）
                      </small>
                    ) : (
                      <small>暂无可推荐会话，可先在工作区创建会话。</small>
                    )}
                  </label>
                ) : null}
              </div>
              {bridgeSaveMode === "append_existing" &&
              recommendedWorkspaceSessions.length > 1 ? (
                <div className="path-bridge-recommend-list">
                  {recommendedWorkspaceSessions.slice(0, 3).map((session) => (
                    <button
                      type="button"
                      key={`bridge_recommend_${session.id}`}
                      className={bridgeTargetSessionId === session.id ? "active" : ""}
                      onClick={() => setBridgeTargetSessionId(session.id)}
                    >
                      {session.title}
                      <em>匹配度 {session.recommendScore.toFixed(2)}</em>
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="path-bridge-checklist-actions">
                {bridgeChecklistProgress.done < bridgeChecklistProgress.total ? (
                  <button type="button" onClick={markAllBridgeChecklistDone}>
                    标记清单已完成
                  </button>
                ) : null}
                <button type="button" onClick={exportBridgeChecklistMarkdown}>
                  导出 Markdown
                </button>
                <button
                  type="button"
                  onClick={() => void saveBridgeChecklistToWorkspaceSession()}
                  disabled={
                    savingBridgeNote ||
                    (bridgeSaveMode === "append_existing" && !bridgeTargetSessionId)
                  }
                >
                  {savingBridgeNote ? "写入中..." : "写入会话沉淀"}
                </button>
                {bridgeWorkspaceSessionId ? (
                  <button type="button" onClick={jumpToWorkspaceFromBridgeChecklist}>
                    进入工作区继续
                  </button>
                ) : null}
              </div>
              {bridgeExportHint ? (
                <span className="path-bridge-checklist-hint">{bridgeExportHint}</span>
              ) : null}
            </div>
          ) : null}
        </CollapsiblePanel>
      ) : null}
      <div id="path_goal_panel" className="path-goal-panel panel-surface anchor-target">
        <div className="section-head">
          <strong>目标设定与计划生成</strong>
          <span>先定义学习目标，再生成或重排路径</span>
        </div>
        <label className="form-field">
          <span>学习目标</span>
          <input value={goal} onChange={(event) => setGoal(event.target.value)} />
        </label>
        <div className="action-row">
          <button type="button" className="demo-btn-primary" onClick={generatePath} disabled={loading}>
            {focusPayload ? "生成 7 日定向计划" : "生成 7 日计划"}
          </button>
          <button type="button" className="demo-btn-secondary" onClick={replan} disabled={loading || !data}>
            依据新情况重排计划
          </button>
        </div>
      </div>

      {data ? (
        <CollapsiblePanel
          id="path_plan_panel"
          title="计划任务与执行回写"
          subtitle="按日执行并实时更新图谱掌握度"
          storageKey="path_plan_panel"
          className="anchor-target"
          defaultExpanded
        >
          <div className="card-list path-plan-panel">
            <div className="result-box">
              <strong>计划 ID：</strong> {data.planId}
              {"\n"}
              任务数：{data.tasks.length}
              {"\n"}
              最高优先级：{Math.max(...data.tasks.map((item) => item.priority))}
            </div>
            {focusTasks.length > 0 ? (
              <div className="path-focus-task-group">
                <header>
                  <strong>图谱焦点任务</strong>
                  <span>
                    已完成 {completedFocusTaskIds.length}/{focusTasks.length}
                  </span>
                </header>
                {focusTasks.map((task, index) => {
                  const isDone = completedFocusTaskIds.includes(task.taskId);
                  const day = taskDayMap.get(task.taskId) ?? index + 1;
                  return (
                    <div className={`path-focus-task-row${isDone ? " done" : ""}`} key={task.taskId}>
                      <div>
                        <strong>
                          Day {day} · {task.title}
                        </strong>
                        <p>优先级：{task.priority} · 建议日期：{formatDueDate(task.dueDate)}</p>
                        <p>{task.reason ? `安排原因：${task.reason}` : "该任务暂无具体原因说明。"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => markFocusTaskDone(task)}
                        disabled={isDone || submittingTaskId === task.taskId}
                      >
                        {isDone
                          ? "已反馈"
                          : submittingTaskId === task.taskId
                            ? "写入中..."
                            : "完成并回写掌握度"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
            {regularTasks.map((task, index) => {
              const day = taskDayMap.get(task.taskId) ?? index + 1;
              return (
                <div className="card-item" key={task.taskId}>
                  <strong>
                    Day {day} · {task.title}
                  </strong>
                  <p>优先级：{task.priority} · 建议日期：{formatDueDate(task.dueDate)}</p>
                  <p>{task.reason ? `安排原因：${task.reason}` : "该任务暂无具体原因说明。"}</p>
                </div>
              );
            })}
          </div>
        </CollapsiblePanel>
      ) : null}

      {error ? (
        <div id="path_error_panel" className="result-box danger anchor-target">
          {error}
        </div>
      ) : null}
    </div>
  );
}

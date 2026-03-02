"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatErrorMessage, requestJson } from "@/lib/client/api";
import { pushGraphActivityEventToStorage } from "@/lib/client/graph-activity";
import {
  buildPathGoalFromFocus,
  readPathFocusFromStorage,
  writeWorkspaceFocusToStorage,
  type PathFocusPayload
} from "@/lib/client/path-focus-bridge";

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

export function PathDemo() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [goal, setGoal] = useState("两周内完成等差数列与函数基础复盘");
  const [focusPayload, setFocusPayload] = useState<PathFocusPayload | null>(null);
  const [focusHint, setFocusHint] = useState("");
  const [completedFocusTaskIds, setCompletedFocusTaskIds] = useState<string[]>([]);
  const [bridgeChecklist, setBridgeChecklist] = useState<BridgeChecklistItem[]>([]);
  const [bridgeExportHint, setBridgeExportHint] = useState("");
  const [savingBridgeNote, setSavingBridgeNote] = useState(false);
  const [bridgeWorkspaceSessionId, setBridgeWorkspaceSessionId] = useState("");
  const [submittingTaskId, setSubmittingTaskId] = useState("");
  const [data, setData] = useState<PathPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const prefilledRef = useRef(false);

  useEffect(() => {
    if (prefilledRef.current) {
      return;
    }
    const focusNode = searchParams.get("focusNode");
    const focusLabel = searchParams.get("focusLabel");
    const sourceFromQuery = normalizeFocusSource(searchParams.get("from"));
    const bridgePartnerFromQuery = searchParams.get("bridgePartner");
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
    setFocusPayload(mergedPayload);
    setGoal(buildPathGoalFromFocus(mergedPayload));
    const bridgeHint = mergedPayload.bridgePartnerLabel
      ? `，桥接节点：${mergedPayload.bridgePartnerLabel}`
      : "";
    setFocusHint(
      `已接收图谱焦点：${mergedPayload.nodeLabel}（风险 ${Math.round(
        mergedPayload.risk * 100
      )}%） · 来源：${formatFocusSourceLabel(mergedPayload.focusSource)}${bridgeHint}`
    );
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
      bridgeTaskTemplate: focusPayload.bridgeTaskTemplate?.trim() ?? ""
    };
  }, [focusPayload]);

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
  }, [bridgeChecklistStorageKey]);

  function applyBridgeTemplateGoal() {
    if (!focusSummary?.bridgeTaskTemplate) {
      return;
    }
    setGoal(focusSummary.bridgeTaskTemplate);
    setFocusHint("已将关系链桥接模板应用到学习目标。");
  }

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
      const sessionId = sessionPayload.session.id;
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
      setBridgeExportHint(`已写入会话沉淀：${response.noteId}（session: ${sessionId}）`);
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
    if (bridgeWorkspaceSessionId) {
      const params = new URLSearchParams({ sessionId: bridgeWorkspaceSessionId });
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
    <div className="demo-form">
      {focusHint ? <div className="result-box info">{focusHint}</div> : null}
      {focusSummary ? (
        <div className="path-focus-summary">
          <strong>图谱联动焦点</strong>
          <p>
            节点：{focusPayload?.nodeLabel} · 域：{focusPayload?.domain} · 风险：
            {focusSummary.riskText} · 掌握度：{focusSummary.masteryText}
          </p>
          <p>
            来源：{focusSummary.sourceText}
            {focusSummary.bridgeText ? ` · 桥接节点：${focusSummary.bridgeText}` : ""}
          </p>
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
                  disabled={savingBridgeNote}
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
        </div>
      ) : null}
      <label>学习目标</label>
      <input value={goal} onChange={(event) => setGoal(event.target.value)} />
      <button type="button" onClick={generatePath} disabled={loading}>
        {focusPayload ? "生成 7 日定向计划" : "生成 7 日计划"}
      </button>
      <button type="button" onClick={replan} disabled={loading || !data}>
        依据新情况重排计划
      </button>

      {data ? (
        <div className="card-list">
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
                      {isDone ? "已反馈" : submittingTaskId === task.taskId ? "写入中..." : "完成并回写掌握度"}
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
      ) : null}

      {error ? <div className="result-box danger">{error}</div> : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatErrorMessage, requestJson } from "@/lib/client/api";
import { CollapsiblePanel } from "@/components/collapsible-panel";
import { SectionAnchorNav } from "@/components/section-anchor-nav";

type LessonPlan = {
  title: string;
  objectives: string[];
  outline: string[];
  classAdjustment: string;
  homework: string[];
  reviewChecklist: string[];
  modelHint?: string;
  source: string;
};

type WeaknessTemplate = {
  id: string;
  label: string;
  content: string;
  description: string;
  scope: string;
};

type WeaknessTemplatePayload = {
  subject: string;
  templates: WeaknessTemplate[];
};

type TeacherWorkbenchView = "input" | "template" | "result";

const TEACHER_WORKBENCH_VIEW_STORAGE_KEY = "edunexus_teacher_workbench_view";
const TEACHER_FOCUS_ONLY_STORAGE_KEY = "edunexus_teacher_focus_only_mode";

const FALLBACK_TEMPLATES: WeaknessTemplate[] = [
  {
    id: "fallback-condition",
    label: "条件识别偏弱",
    content: "条件识别能力弱，易直接套公式",
    description: "常见于概念初学阶段，容易遗漏前提条件。",
    scope: "通用"
  },
  {
    id: "fallback-step",
    label: "步骤书写跳跃",
    content: "步骤书写不完整，跳步严重",
    description: "结果正确但过程不可复查，影响迁移能力。",
    scope: "通用"
  },
  {
    id: "fallback-calc",
    label: "计算准确率偏低",
    content: "计算正确率偏低，粗心错误频发",
    description: "对中间变量缺少检验，常出现符号错误。",
    scope: "通用"
  },
  {
    id: "fallback-transfer",
    label: "迁移能力不足",
    content: "知识点迁移弱，跨题型应用困难",
    description: "跨章节或综合题中策略切换慢。",
    scope: "通用"
  }
];

export function TeacherPlanDemo() {
  const router = useRouter();
  const [subject, setSubject] = useState("高中数学");
  const [topic, setTopic] = useState("等差数列求和");
  const [grade, setGrade] = useState("高一");
  const [difficulty, setDifficulty] = useState<"基础" | "中等" | "提升">("中等");
  const [classWeakness, setClassWeakness] = useState("条件识别能力弱，易直接套公式");
  const [templates, setTemplates] = useState<WeaknessTemplate[]>(FALLBACK_TEMPLATES);
  const [templateSubject, setTemplateSubject] = useState("通用");
  const [templateLoading, setTemplateLoading] = useState(false);
  const [result, setResult] = useState<LessonPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [compactMode, setCompactMode] = useState(false);
  const [teacherWorkbenchView, setTeacherWorkbenchView] =
    useState<TeacherWorkbenchView>("input");
  const [teacherFocusOnlyMode, setTeacherFocusOnlyMode] = useState(false);

  useEffect(() => {
    try {
      setCompactMode(window.localStorage.getItem("edunexus_teacher_compact_ui") === "1");
      const persistedView = window.localStorage.getItem(
        TEACHER_WORKBENCH_VIEW_STORAGE_KEY
      );
      if (persistedView === "template" || persistedView === "result") {
        setTeacherWorkbenchView(persistedView);
      } else {
        setTeacherWorkbenchView("input");
      }
      setTeacherFocusOnlyMode(
        window.localStorage.getItem(TEACHER_FOCUS_ONLY_STORAGE_KEY) === "1"
      );
    } catch {
      setCompactMode(false);
      setTeacherWorkbenchView("input");
      setTeacherFocusOnlyMode(false);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("edunexus_teacher_compact_ui", compactMode ? "1" : "0");
    } catch {
      // ignore persistence failures
    }
  }, [compactMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        TEACHER_WORKBENCH_VIEW_STORAGE_KEY,
        teacherWorkbenchView
      );
    } catch {
      // ignore persistence failures
    }
  }, [teacherWorkbenchView]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        TEACHER_FOCUS_ONLY_STORAGE_KEY,
        teacherFocusOnlyMode ? "1" : "0"
      );
    } catch {
      // ignore persistence failures
    }
  }, [teacherFocusOnlyMode]);

  useEffect(() => {
    if (teacherWorkbenchView !== "result" || result) {
      return;
    }
    setTeacherWorkbenchView("input");
  }, [result, teacherWorkbenchView]);

  function resetTeacherLayout() {
    try {
      window.localStorage.removeItem("edunexus_teacher_compact_ui");
      window.localStorage.removeItem("edunexus_anchor_nav_teacher_demo");
      window.localStorage.removeItem("edunexus_collapsible_teacher_template_panel");
      window.localStorage.removeItem("edunexus_collapsible_teacher_result_panel");
    } catch {
      // ignore persistence failures
    }
    window.location.reload();
  }

  function applyTeacherPanelPreset(preset: "expand" | "focus") {
    try {
      if (preset === "expand") {
        window.localStorage.setItem("edunexus_collapsible_teacher_template_panel", "1");
        window.localStorage.setItem("edunexus_collapsible_teacher_result_panel", "1");
      } else {
        window.localStorage.setItem("edunexus_collapsible_teacher_template_panel", "0");
        window.localStorage.setItem("edunexus_collapsible_teacher_result_panel", "1");
      }
    } catch {
      // ignore persistence failures
    }
    window.location.reload();
  }

  async function loadTemplates(targetSubject = subject) {
    setTemplateLoading(true);
    try {
      const data = await requestJson<WeaknessTemplatePayload>(
        `/api/teacher/lesson-plan/templates?subject=${encodeURIComponent(targetSubject)}`
      );
      if (data.templates.length > 0) {
        setTemplates(data.templates);
      }
      setTemplateSubject(data.subject || "通用");
      setError("");
    } catch (err) {
      setTemplates(FALLBACK_TEMPLATES);
      setTemplateSubject("通用");
      setError(formatErrorMessage(err, "加载薄弱点模板失败，已切换到内置模板。"));
      console.error(err);
    } finally {
      setTemplateLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTemplates(subject);
    }, 220);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const data = await requestJson<LessonPlan>("/api/teacher/lesson-plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          topic,
          grade,
          difficulty,
          classWeakness
        })
      });
      setResult(data);
      setTeacherWorkbenchView("result");
    } catch (err) {
      setError(formatErrorMessage(err, "生成备课草案失败。"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function exportMarkdown() {
    if (!result) {
      setError("请先生成备课草案。");
      return;
    }

    const markdown = [
      "---",
      `subject: ${subject}`,
      `topic: ${topic}`,
      `grade: ${grade}`,
      `difficulty: ${difficulty}`,
      `class_weakness: ${classWeakness || "未填写"}`,
      `generated_at: ${new Date().toISOString()}`,
      "---",
      "",
      `# ${result.title}`,
      "",
      "## 教学目标",
      ...result.objectives.map((item) => `- ${item}`),
      "",
      "## 课堂流程",
      ...result.outline.map((item) => `- ${item}`),
      "",
      "## 班级调节建议",
      result.classAdjustment,
      "",
      "## 作业建议",
      ...result.homework.map((item) => `- ${item}`),
      "",
      "## 复核清单",
      ...result.reviewChecklist.map((item) => `- ${item}`),
      "",
      `> 生成来源：${result.source}`,
      result.modelHint ? `\n## 模型补充建议\n${result.modelHint}` : ""
    ].join("\n");

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.title.replace(/[\\/:*?"<>|]/g, "_")}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const teacherObjectiveCount = result?.objectives.length ?? 0;
  const teacherOutlineCount = result?.outline.length ?? 0;
  const teacherViewMainSectionId =
    teacherWorkbenchView === "template"
      ? "teacher_template_panel"
      : teacherWorkbenchView === "result"
        ? "teacher_result_panel"
        : "teacher_input_panel";

  function scrollToTeacherSection(sectionId: string) {
    const section = document.getElementById(sectionId);
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (teacherWorkbenchView === "result" && !result) {
        scrollToTeacherSection("teacher_input_panel");
        return;
      }
      scrollToTeacherSection(teacherViewMainSectionId);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [result, teacherViewMainSectionId, teacherWorkbenchView]);

  return (
    <div
      className={`demo-form demo-form-teacher teacher-layout${compactMode ? " is-compact" : ""}`}
      data-view={teacherWorkbenchView}
      data-focus-only={teacherFocusOnlyMode ? "true" : "false"}
      data-result-ready={result ? "true" : "false"}
    >
      <div className="demo-toolbar">
        <span>教师备课工作台</span>
        <div className="demo-toolbar-actions">
          <button
            type="button"
            className={`demo-compact-toggle demo-btn-primary${compactMode ? " active" : ""}`}
            onClick={() => setCompactMode((prev) => !prev)}
          >
            {compactMode ? "紧凑模式" : "舒展模式"}
          </button>
          <button
            type="button"
            className="demo-panel-toggle demo-btn-secondary"
            onClick={() => applyTeacherPanelPreset("expand")}
          >
            展开分区
          </button>
          <button
            type="button"
            className="demo-panel-toggle demo-btn-secondary"
            onClick={() => applyTeacherPanelPreset("focus")}
          >
            专注生成
          </button>
          <button type="button" className="demo-reset-toggle demo-btn-neutral" onClick={resetTeacherLayout}>
            重置分区
          </button>
        </div>
      </div>
      <div className="demo-context-links">
        <button type="button" className="demo-link-chip" onClick={() => router.push("/graph?from=teacher")}>
          查看图谱总览
        </button>
        <button type="button" className="demo-link-chip" onClick={() => router.push("/workspace?from=teacher")}>
          进入学习工作区
        </button>
        <button type="button" className="demo-link-chip" onClick={() => router.push("/kb?from=teacher")}>
          打开知识库检索
        </button>
      </div>
      <div className="teacher-view-tools">
        <div className="teacher-view-switcher">
          <button
            type="button"
            className={teacherWorkbenchView === "input" ? "active" : ""}
            onClick={() => setTeacherWorkbenchView("input")}
          >
            输入配置
            <em>主题与班级信息</em>
          </button>
          <button
            type="button"
            className={teacherWorkbenchView === "template" ? "active" : ""}
            onClick={() => setTeacherWorkbenchView("template")}
          >
            模板套用
            <em>{templates.length} 个模板</em>
          </button>
          <button
            type="button"
            className={teacherWorkbenchView === "result" ? "active" : ""}
            onClick={() => setTeacherWorkbenchView("result")}
            disabled={!result}
          >
            教案结果
            <em>{result ? `${teacherObjectiveCount + teacherOutlineCount} 条内容` : "待生成"}</em>
          </button>
          <button
            type="button"
            className={`teacher-focus-toggle${teacherFocusOnlyMode ? " active" : ""}`}
            onClick={() => setTeacherFocusOnlyMode((prev) => !prev)}
          >
            <strong>仅看当前视图：{teacherFocusOnlyMode ? "开启" : "关闭"}</strong>
            <em>
              {teacherFocusOnlyMode
                ? "已隐藏其它分区，滚动距离更短。"
                : "开启后仅保留当前视图对应分区。"}
            </em>
          </button>
        </div>
        <div className="teacher-quick-actions">
          <button type="button" className="active" onClick={() => scrollToTeacherSection(teacherViewMainSectionId)}>
            聚焦当前视图
          </button>
          <button type="button" onClick={() => scrollToTeacherSection("teacher_input_panel")}>
            输入配置
          </button>
          <button type="button" onClick={() => scrollToTeacherSection("teacher_template_panel")}>
            模板套用
          </button>
          <button
            type="button"
            onClick={() => scrollToTeacherSection("teacher_result_panel")}
            disabled={!result}
          >
            教案结果
          </button>
          <button type="button" onClick={() => scrollToTeacherSection("teacher_error_panel")}>
            状态反馈
          </button>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            回到顶部
          </button>
        </div>
      </div>
      <SectionAnchorNav
        title="备课分区导航"
        storageKey="teacher_demo"
        items={[
          { id: "teacher_input_panel", label: "输入配置" },
          { id: "teacher_template_panel", label: "模板套用" },
          { id: "teacher_result_panel", label: "教案结果" },
          { id: "teacher_error_panel", label: "状态反馈" }
        ]}
      />
      <div className="demo-metric-strip">
        <div className="demo-metric-chip">
          <span>模板数量</span>
          <strong>{templates.length}</strong>
        </div>
        <div className="demo-metric-chip">
          <span>教学目标</span>
          <strong>{teacherObjectiveCount}</strong>
        </div>
        <div className="demo-metric-chip">
          <span>课堂流程</span>
          <strong>{teacherOutlineCount}</strong>
        </div>
        <div className="demo-metric-chip">
          <span>当前状态</span>
          <strong>{loading ? "生成中" : result ? "已生成" : "待生成"}</strong>
        </div>
      </div>
      <div id="teacher_input_panel" className="teacher-input-panel panel-surface anchor-target">
        <div className="section-head">
          <strong>教学输入配置</strong>
          <span>学科、主题、年级与难度决定生成策略</span>
        </div>
        <div className="teacher-input-grid">
          <label className="form-field">
            <span>学科</span>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} />
          </label>

          <label className="form-field">
            <span>主题</span>
            <input value={topic} onChange={(event) => setTopic(event.target.value)} />
          </label>

          <label className="form-field">
            <span>学段/年级</span>
            <input value={grade} onChange={(event) => setGrade(event.target.value)} />
          </label>

          <label className="form-field">
            <span>难度</span>
            <select
              value={difficulty}
              onChange={(event) =>
                setDifficulty(event.target.value as "基础" | "中等" | "提升")
              }
            >
              <option value="基础">基础</option>
              <option value="中等">中等</option>
              <option value="提升">提升</option>
            </select>
          </label>

          <label className="form-field form-field-wide">
            <span>班级薄弱点（可选）</span>
            <textarea
              rows={3}
              value={classWeakness}
              onChange={(event) => setClassWeakness(event.target.value)}
            />
          </label>
        </div>
      </div>
      <CollapsiblePanel
        id="teacher_template_panel"
        title={`薄弱点模板（当前：${templateSubject}）`}
        subtitle="自动根据学科匹配，可刷新并一键套用"
        storageKey="teacher_template_panel"
        className="card-item teacher-template-panel anchor-target"
        defaultExpanded={false}
      >
        <button type="button" onClick={() => void loadTemplates(subject)} disabled={templateLoading}>
          {templateLoading ? "模板加载中..." : "刷新模板"}
        </button>
        <div className="btn-row btn-row-top">
          {templates.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setClassWeakness(item.content)}
              disabled={loading || templateLoading}
              className="note-chip"
              title={item.description}
            >
              使用模板：{item.label}
            </button>
          ))}
        </div>
      </CollapsiblePanel>
      <div className="teacher-meta-tags">
        <span className="tag">导出附带元数据</span>
        <span className="tag">学科模板可扩展</span>
      </div>

      <div className="action-row">
        <button type="button" className="demo-btn-primary" onClick={generate} disabled={loading}>
          生成备课草案
        </button>
        <button type="button" className="demo-btn-secondary" onClick={exportMarkdown} disabled={loading || !result}>
          导出 Markdown 教案
        </button>
      </div>

      {result ? (
        <CollapsiblePanel
          id="teacher_result_panel"
          title="教案结果总览"
          subtitle="教学目标、课堂流程、作业建议与复核清单"
          storageKey="teacher_result_panel"
          className="teacher-result-panel anchor-target"
          defaultExpanded
        >
          <div className="card-list">
            <div className="result-box">
              <strong>{result.title}</strong>
              {"\n"}
              来源：{result.source}
              {result.modelHint ? `\n模型补充建议：${result.modelHint}` : ""}
            </div>
            <div className="card-item">
              <strong>教学目标</strong>
              <ul>
                {result.objectives.map((item, index) => (
                  <li key={`obj_${index}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="card-item">
              <strong>课堂流程</strong>
              <ul>
                {result.outline.map((item, index) => (
                  <li key={`outline_${index}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="card-item">
              <strong>班级调节建议</strong>
              <p>{result.classAdjustment}</p>
            </div>
            <div className="card-item">
              <strong>作业建议</strong>
              <ul>
                {result.homework.map((item, index) => (
                  <li key={`work_${index}`}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="card-item">
              <strong>复核清单</strong>
              <ul>
                {result.reviewChecklist.map((item, index) => (
                  <li key={`check_${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </CollapsiblePanel>
      ) : null}

      {error ? (
        <div id="teacher_error_panel" className="result-box danger anchor-target">
          {error}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { formatErrorMessage, requestJson } from "@/lib/client/api";

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

  return (
    <div className="demo-form">
      <label>学科</label>
      <input value={subject} onChange={(event) => setSubject(event.target.value)} />

      <label>主题</label>
      <input value={topic} onChange={(event) => setTopic(event.target.value)} />

      <label>学段/年级</label>
      <input value={grade} onChange={(event) => setGrade(event.target.value)} />

      <label>难度</label>
      <select
        value={difficulty}
        onChange={(event) => setDifficulty(event.target.value as "基础" | "中等" | "提升")}
      >
        <option value="基础">基础</option>
        <option value="中等">中等</option>
        <option value="提升">提升</option>
      </select>

      <label>班级薄弱点（可选）</label>
      <textarea
        rows={3}
        value={classWeakness}
        onChange={(event) => setClassWeakness(event.target.value)}
      />
      <div className="card-item">
        <strong>薄弱点模板（当前：{templateSubject}）</strong>
        <p className="muted">自动根据学科匹配，可点击“刷新模板”手动重载。</p>
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
      </div>
      <div>
        <span className="tag">导出附带元数据</span>
        <span className="tag">学科模板可扩展</span>
      </div>

      <button type="button" onClick={generate} disabled={loading}>
        生成备课草案
      </button>
      <button type="button" onClick={exportMarkdown} disabled={loading || !result}>
        导出 Markdown 教案
      </button>

      {result ? (
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
      ) : null}

      {error ? <div className="result-box danger">{error}</div> : null}
    </div>
  );
}

import { Suspense } from "react";
import { WorkspaceDemo } from "@/components/workspace-demo";
import { PageHeader } from "@/components/page-header";
import { PageQuickNav } from "@/components/page-quick-nav";

const WORKSPACE_QUICK_NAV_ITEMS = [
  { href: "/graph", label: "知识图谱", hint: "查看关系链批次来源" },
  { href: "/path", label: "学习路径", hint: "回到计划任务与重排" },
  { href: "/kb", label: "本地知识库", hint: "检索沉淀笔记" },
  { href: "#workspace_sessions", label: "当前页面分区", hint: "下滑后由分区锚点接管" }
] as const;

export default function WorkspacePage() {
  return (
    <section className="ecosystem-page">
      <PageHeader
        title="学习工作区"
        description="以过程引导替代直接答案。每次会话都可检索、回放、沉淀并回流到图谱。"
        tags={["Socratic 分层", "LangGraph 流式", "会话回放", "本地沉淀"]}
      />
      <div className="panel-grid">
        <PageQuickNav title="工作区快速导航" items={[...WORKSPACE_QUICK_NAV_ITEMS]} />
      </div>

      <div className="panel-grid">
        <article className="panel wide">
          <h3>学习会话</h3>
          <Suspense fallback={<div className="result-box">正在加载学习工作区...</div>}>
            <WorkspaceDemo />
          </Suspense>
        </article>
      </div>
    </section>
  );
}

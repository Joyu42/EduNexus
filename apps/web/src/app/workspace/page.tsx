import { Suspense } from "react";
import { WorkspaceDemo } from "@/components/workspace-demo";
import { PageHeader } from "@/components/page-header";

export default function WorkspacePage() {
  return (
    <section>
      <PageHeader
        title="学习工作区"
        description="以过程引导替代直接答案。每次会话都可检索、回放、沉淀并回流到图谱。"
        tags={["Socratic 分层", "LangGraph 流式", "会话回放", "本地沉淀"]}
      />

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


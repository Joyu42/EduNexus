import { Suspense } from "react";
import { KbDemo } from "@/components/kb-demo";
import { PageHeader } from "@/components/page-header";

export default function KbPage() {
  return (
    <section>
      <PageHeader
        title="本地知识库"
        description="以 Markdown 双链为核心组织个人知识资产，支持检索、关系导航与上下文引用。"
        tags={["Local-first", "双链关系", "轻量检索", "时间脉络"]}
      />

      <div className="panel-grid">
        <article className="panel wide">
          <h3>知识检索与文档阅读</h3>
          <Suspense fallback={<div className="result-box">正在加载知识库...</div>}>
            <KbDemo />
          </Suspense>
        </article>
      </div>
    </section>
  );
}


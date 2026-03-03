import { Suspense } from "react";
import { PathDemo } from "@/components/path-demo";
import { PageHeader } from "@/components/page-header";

export default function PathPage() {
  return (
    <section>
      <PageHeader
        title="学习路径"
        description="把目标、风险与掌握度统一成可执行任务序列，并在执行后持续回写图谱。"
        tags={["7 日计划", "动态重排", "图谱回写", "批次队列"]}
      />

      <div className="panel-grid">
        <article className="panel wide">
          <h3>路径规划与执行</h3>
          <Suspense fallback={<p className="muted">正在加载路径模块...</p>}>
            <PathDemo />
          </Suspense>
        </article>
      </div>
    </section>
  );
}


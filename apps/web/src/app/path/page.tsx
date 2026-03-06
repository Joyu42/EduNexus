import { Suspense } from "react";
import { PathDemo } from "@/components/path-demo";
import { PageHeader } from "@/components/page-header";
import { PageQuickNav } from "@/components/page-quick-nav";

const PATH_QUICK_NAV_ITEMS = [
  { href: "/graph", label: "知识图谱", hint: "查看风险链路与来源" },
  { href: "/workspace", label: "学习工作区", hint: "继续引导与沉淀" },
  { href: "/kb", label: "本地知识库", hint: "检索历史笔记与证据" },
  { href: "#path_focus_panel", label: "当前页面分区", hint: "下滑后由分区锚点接管" }
] as const;

export default function PathPage() {
  return (
    <section className="ecosystem-page">
      <PageHeader
        title="学习路径"
        description="把目标、风险与掌握度统一成可执行任务序列，并在执行后持续回写图谱。"
        tags={["7 日计划", "动态重排", "图谱回写", "批次队列"]}
      />
      <div className="panel-grid">
        <PageQuickNav title="路径页快速导航" items={[...PATH_QUICK_NAV_ITEMS]} />
      </div>

      <div className="panel-grid">
        <article className="panel wide feature-page-panel path-page-main">
          <h3>路径规划与执行</h3>
          <Suspense fallback={<p className="muted">正在加载路径模块...</p>}>
            <PathDemo />
          </Suspense>
        </article>
      </div>
    </section>
  );
}

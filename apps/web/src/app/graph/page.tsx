import { GraphDemo } from "@/components/graph-demo";
import { PageHeader } from "@/components/page-header";

export default function GraphPage() {
  return (
    <section className="graph-page">
      <PageHeader
        title="知识图谱"
        description="把学习行为和知识关系放进同一画布，实时定位风险链路并一键联动到路径与工作区。"
        tags={["风险热力", "关系链回放", "批次复推", "跨页定位"]}
      />

      <div className="panel-grid graph-panel-grid">
        <article className="panel wide graph-main-panel">
          <h3>图谱工作台</h3>
          <GraphDemo />
        </article>
      </div>
    </section>
  );
}


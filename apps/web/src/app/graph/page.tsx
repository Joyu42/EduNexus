import { GraphDemo } from "@/components/graph-demo";
import { GalaxyHero } from "@/components/galaxy-ui";

export default function GraphPage() {
  return (
    <section className="graph-page">
      <header className="page-head">
        <h2>知识图谱</h2>
        <p>
          一期先落地“可解释、可回写、可调度”的知识网络：节点来自 Vault，关系来自链接与共现，风险与掌握度持续回写。
        </p>
      </header>

      <div className="panel-grid graph-panel-grid">
        <GalaxyHero
          badge="Graph Engine · 可视化一期"
          title="把 Obsidian 的知识沉淀，转成 NotebookLM 风格的可导航网络"
          description="这一版强调“先看关系再做题”：你先看到高风险枢纽和知识孤岛，再进入 Socratic 学习流，避免一拍就给答案。"
          quote="“学习不是检索答案，而是重建一张可以迁移的认知地图。”"
          chips={["风险热力", "关系密度", "焦点邻域", "域内过滤"]}
          metrics={[
            { label: "节点来源", value: "Vault Notes", hint: "frontmatter + tags + links" },
            { label: "推理路径", value: "Explainable", hint: "每个风险都可追踪来源" },
            { label: "更新策略", value: "Session Driven", hint: "学习会话后自动回写" }
          ]}
        />

        <article className="panel graph-main-panel">
          <h3>图谱工作台</h3>
          <GraphDemo />
        </article>

        <article className="panel graph-side-panel">
          <h3>一期落地清单</h3>
          <div className="graph-roadmap-list">
            <div className="graph-roadmap-item done">
              <strong>01. Vault 到 Graph 数据链路</strong>
              <p>读取本地知识库并构建 nodes/edges，支持 API 拉取。</p>
            </div>
            <div className="graph-roadmap-item done">
              <strong>02. 风险+掌握度双信号</strong>
              <p>将 mastery 与 risk 暴露为可视化颜色与优先级依据。</p>
            </div>
            <div className="graph-roadmap-item done">
              <strong>03. 交互图谱画布</strong>
              <p>支持域筛选、节点检索、焦点邻域联动和高风险面板。</p>
            </div>
            <div className="graph-roadmap-item done">
              <strong>04. 与学习路径联动</strong>
              <p>将高风险节点直接推送到 Path/Workspace 进行闭环学习。</p>
            </div>
            <div className="graph-roadmap-item done">
              <strong>05. 历史演化时间轴</strong>
              <p>展示图谱结构变化，支持回看“何时补齐知识孤岛”。</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

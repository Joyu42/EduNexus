import { KbDemo } from "@/components/kb-demo";
import { GalaxyHero } from "@/components/galaxy-ui";

export default function KbPage() {
  return (
    <section>
      <header className="page-head">
        <h2>本地知识库（KB-Lite）</h2>
        <p>
          该模块采用 Local-first 设计：优先使用 Markdown 结构化文档、双链关系与轻量检索，支持标签聚合、反链图摘要，以及 Obsidian + NotebookLM 风格的卡片阅读、时间轴与引用高亮。
        </p>
      </header>

      <div className="panel-grid">
        <GalaxyHero
          badge="Obsidian + NotebookLM 风格融合"
          title="知识卡片不止“查得到”，还要“读得进”"
          description="你可以在同一界面查看双链关系、引用摘录、时间轴脉络和关系小地图，让知识沉淀从“文档堆积”升级为“知识网络”。"
          quote="“知识库不是仓库，而是可漫游、可对话、可演化的学习空间。”"
          chips={["双链卡片阅读", "引用高亮跳转", "知识脉络时间轴", "关系小地图"]}
          metrics={[
            { label: "索引方式", value: "Local-first", hint: "Markdown 结构化" },
            { label: "检索风格", value: "轻量召回", hint: "无需重型 RAG" },
            { label: "知识表达", value: "双链网络", hint: "可追溯演化" }
          ]}
        />

        <article className="panel wide">
          <h3>检索与文档详情</h3>
          <KbDemo />
        </article>
        <article className="panel half">
          <h3>当前能力边界</h3>
          <ul>
            <li>支持关键词搜索（标题/标签/内容/链接）。</li>
            <li>支持按 docId 拉取完整文档详情。</li>
            <li>支持重建索引摘要（summary/tags/backlinks）。</li>
            <li>暂不引入向量数据库，保持轻量与可维护。</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

import { WorkspaceDemo } from "@/components/workspace-demo";
import { GalaxyHero } from "@/components/galaxy-ui";

export default function WorkspacePage() {
  return (
    <section>
      <header className="page-head">
        <h2>学习工作区</h2>
        <p>
          一期核心页面。默认采用 Socratic 分层引导，不直接给最终答案。当前已支持图谱焦点节点一键带入、会话搜索、恢复、重命名、删除、LangGraph 工作流（含 SSE 节点轨迹）、流式引导与笔记沉淀。
        </p>
      </header>

      <div className="panel-grid">
        <GalaxyHero
          badge="LangGraph 实时编排已接入"
          title="从“提示”升级到“可观察工作流”"
          description="现在你可以直接看到意图路由、检索命中、引导生成三段链路，并通过 SSE 实时观察节点轨迹与文本生成过程。"
          quote="“让学习过程可见、可追溯、可复盘——比直接答案更重要。”"
          chips={["SSE 节点轨迹", "Rule / Model 双模式", "会话自动沉淀", "Citation 证据绑定"]}
          metrics={[
            { label: "引导策略", value: "Socratic", hint: "四层门控" },
            { label: "流式协议", value: "SSE", hint: "trace + token" },
            { label: "沉淀方式", value: "Local Vault", hint: "Markdown-first" }
          ]}
        />

        <article className="panel wide">
          <h3>引导式学习演示</h3>
          <WorkspaceDemo />
        </article>
        <article className="panel half">
          <h3>当前策略</h3>
          <div>
            <span className="tag">Level 1 概念提醒</span>
            <span className="tag">Level 2 思路骨架</span>
            <span className="tag">Level 3 步骤纠偏</span>
            <span className="tag">Level 4 最终答案（门控）</span>
          </div>
          <ul>
            <li>未提交思路时，不开放下一层提示。</li>
            <li>最终答案解锁需要提交反思内容。</li>
            <li>知识类回答尽可能绑定 citation。</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

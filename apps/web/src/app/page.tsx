import { GalaxyHero, GalaxySpotlight } from "@/components/galaxy-ui";

export default function HomePage() {
  return (
    <section>
      <header className="page-head">
        <h2>AI 教育生态 · 一期实现启动</h2>
        <p>
          当前版本聚焦四条主链路：学习工作区、知识图谱、学习路径、生态看板。
          全部围绕“引导学习而非直接给答案”展开。
        </p>
      </header>

      <div className="panel-grid">
        <GalaxyHero
          badge="一期主线 · Web-Only"
          title="EduNexus 生态驾驶舱"
          description="统一学习工作区、知识库、教学工具和生态看板：先打穿“学习引导 + 本地沉淀 + 可解释决策”闭环，再扩展成人学习与职业能力场景。"
          quote="“先建构知识，再产出答案；先沉淀过程，再追求速度。”"
          chips={["LangGraph 可观察流", "KB-Lite 本地沉淀", "Socratic 分层引导", "Vercel 一键部署就绪"]}
          metrics={[
            { label: "当前阶段", value: "Phase 1", hint: "MVP 打磨期" },
            { label: "核心页面", value: "7 个", hint: "全链路 Web 页面" },
            { label: "接口覆盖", value: "20+", hint: "OpenAPI 已同步" }
          ]}
        />

        <article className="panel kpi">
          <h3>一期目标</h3>
          <strong>4 周</strong>
          <p>完成 MVP 核心链路开发与部署准备。</p>
        </article>
        <article className="panel kpi">
          <h3>核心页面</h3>
          <strong>4 个</strong>
          <p>workspace / graph / path / dashboard。</p>
        </article>
        <article className="panel kpi">
          <h3>关键接口</h3>
          <strong>10+</strong>
          <p>已落 OpenAPI，按 Sprint 逐步实现。</p>
        </article>
        <article className="panel kpi">
          <h3>本地知识库</h3>
          <strong>Vault</strong>
          <p>Markdown-first，轻检索优先，避免重型 RAG。</p>
        </article>

        <article className="panel half">
          <h3>近期开发重点</h3>
          <ul>
            <li>学习引导 API：分层提示 + 最终答案门控</li>
            <li>本地知识库读写：笔记沉淀 + 轻量搜索</li>
            <li>图谱与路径联动：学习行为驱动节点变化</li>
            <li>教师工作台最小版：备课草案生成</li>
            <li>ModelScope 服务端封装：流式与非流式双通道</li>
          </ul>
        </article>

        <article className="panel half">
          <h3>已明确不做</h3>
          <ul>
            <li className="danger">不做拍照搜题主流程</li>
            <li className="danger">不做原生 App 多端并行</li>
            <li>不做复杂 RAG 基础设施先行</li>
            <li>不做黑盒不可解释的评估机制</li>
          </ul>
        </article>

        <article className="panel wide">
          <h3>战略聚焦场景（2026）</h3>
          <div className="spotlight-list">
            <GalaxySpotlight
              title="AI 错题诊断 + 动态知识图谱"
              description="以错因溯源、学习路径自适应和遗忘曲线复习构建主产品价值，直接承接教育数字化与因材施教政策导向。"
              status="优先级 S"
            />
            <GalaxySpotlight
              title="成人/大学生能力升级"
              description="聚焦编程、考研、职考与 AI 协作能力，避开拍照搜题红海，强化“会学会用”的过程化训练。"
              status="优先级 A"
            />
            <GalaxySpotlight
              title="教师减负与课堂反馈"
              description="通过备课草案、课堂活动建议和班级薄弱点可视化，形成 B 端可落地的教学效率工具链。"
              status="优先级 A-"
            />
          </div>
        </article>
      </div>
    </section>
  );
}

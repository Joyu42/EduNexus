import { Suspense } from "react";
import { PathDemo } from "@/components/path-demo";
import { GalaxyHero } from "@/components/galaxy-ui";

export default function PathPage() {
  return (
    <section>
      <header className="page-head">
        <h2>学习路径</h2>
        <p>
          路径模块将学习目标与图谱薄弱点结合，生成 7 日任务序列。支持从知识图谱一键推送焦点节点，完成焦点任务后可回写掌握度。
        </p>
      </header>

      <div className="panel-grid">
        <GalaxyHero
          badge="Path Planner · 7 日任务引擎"
          title="让学习路径可执行、可重排、可解释"
          description="路径模块将目标权重、知识薄弱点和可用时间约束融合，输出具体任务序列，并为每一步提供“为什么这么安排”。"
          quote="“好路径不是排满日程，而是让每一步都能拉动真实掌握度。”"
          chips={["目标优先级计算", "薄弱点前置", "重排机制", "解释性理由输出"]}
          metrics={[
            { label: "生成周期", value: "7 日", hint: "短周期闭环" },
            { label: "重排触发", value: "实时", hint: "按学习时长与反馈" },
            { label: "输出格式", value: "任务 + 原因", hint: "便于复盘" }
          ]}
        />

        <article className="panel wide">
          <h3>路径生成演示</h3>
          <Suspense fallback={<p className="muted">正在加载路径交互面板...</p>}>
            <PathDemo />
          </Suspense>
        </article>
        <article className="panel half">
          <h3>一期调度逻辑</h3>
          <ul>
            <li>目标优先级：考试目标 &gt; 项目目标 &gt; 证书目标。</li>
            <li>薄弱节点优先排入前 3 天。</li>
            <li>每项任务都返回建议原因，便于可解释展示。</li>
          </ul>
        </article>
        <article className="panel half">
          <h3>后续增强方向</h3>
          <ul>
            <li>接入图谱掌握度变化，动态更新任务难度曲线。</li>
            <li>引入“任务完成质量”作为重排因子，而非仅时长。</li>
            <li>支持考研 / 编程 / 职考等成人学习模板。</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

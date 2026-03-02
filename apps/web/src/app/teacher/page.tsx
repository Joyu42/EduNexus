import { TeacherPlanDemo } from "@/components/teacher-plan-demo";
import { GalaxyHero } from "@/components/galaxy-ui";

export default function TeacherPage() {
  return (
    <section>
      <header className="page-head">
        <h2>教师工作台（一期最小版）</h2>
        <p>
          当前实现聚焦“备课草案生成”场景，支持按学科匹配薄弱点模板与 Markdown 教案导出，后续会接入班级图谱热力联动。
        </p>
      </header>

      <div className="panel-grid">
        <GalaxyHero
          badge="Teacher Copilot · 一期最小闭环"
          title="把教师时间花在教学设计，而不是机械整理"
          description="当前版本聚焦备课草案生成：根据学科、年级和班级薄弱点输出结构化教案，并支持 Markdown 导出进入知识库持续沉淀。"
          quote="“AI 做重复劳动，人做教学判断。”"
          chips={["学科模板匹配", "班级薄弱点驱动", "教案结构化输出", "Markdown 导出沉淀"]}
          metrics={[
            { label: "输入维度", value: "5 项", hint: "学科/主题/年级/难度/薄弱点" },
            { label: "输出模块", value: "6 段", hint: "目标、流程、作业等" },
            { label: "可扩展性", value: "模板可插拔", hint: "后续对接真实班级数据" }
          ]}
        />

        <article className="panel wide">
          <h3>备课草案生成器</h3>
          <TeacherPlanDemo />
        </article>
        <article className="panel half">
          <h3>下一步计划</h3>
          <ul>
            <li>接入班级薄弱点数据，自动调整题目梯度。</li>
            <li>增加主观题批改基础版接口。</li>
            <li>支持导出为教案模板与课堂活动卡片。</li>
          </ul>
        </article>
        <article className="panel half">
          <h3>一期不做（避免跑偏）</h3>
          <ul>
            <li>不做复杂课堂摄像头行为分析。</li>
            <li>不做全自动批改一刀切结论。</li>
            <li>先聚焦“备课建议 + 教学反思”双环节闭环。</li>
          </ul>
        </article>
      </div>
    </section>
  );
}

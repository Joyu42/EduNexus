import { TeacherPlanDemo } from "@/components/teacher-plan-demo";
import { PageHeader } from "@/components/page-header";

export default function TeacherPage() {
  return (
    <section>
      <PageHeader
        title="教师工作台"
        description="围绕教学准备与课堂改进生成结构化方案，减少重复整理时间。"
        tags={["备课生成", "结构化教案", "班级薄弱点", "可沉淀输出"]}
      />

      <div className="panel-grid">
        <article className="panel wide">
          <h3>教学方案生成</h3>
          <TeacherPlanDemo />
        </article>
      </div>
    </section>
  );
}


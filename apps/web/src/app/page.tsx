import Link from "next/link";
import { PageHeader } from "@/components/page-header";

const entries = [
  {
    href: "/workspace",
    title: "学习工作区",
    description: "用分层引导完成推理过程，沉淀可复盘会话。"
  },
  {
    href: "/graph",
    title: "知识图谱",
    description: "定位高风险关系链，并把批次直接推送到学习执行面。"
  },
  {
    href: "/path",
    title: "学习路径",
    description: "基于图谱焦点生成可执行任务序列，并持续回写掌握度。"
  },
  {
    href: "/kb",
    title: "本地知识库",
    description: "用双链与检索组织长期知识资产，形成个人学习语境。"
  },
  {
    href: "/dashboard",
    title: "生态看板",
    description: "统一追踪学习增益、提示依赖和风险干预结果。"
  },
  {
    href: "/teacher",
    title: "教师工作台",
    description: "围绕备课与课堂改进输出结构化教学方案。"
  }
];

export default function HomePage() {
  return (
    <section>
      <PageHeader
        title="AI 教育生态平台"
        description="统一学习引导、知识沉淀、图谱分析与路径干预。全部能力围绕“先学会，再答题”构建。"
        tags={["Web-Only", "LangGraph", "ModelScope", "Local-first KB"]}
        actions={
          <div className="page-head-cta">
            <Link href="/workspace">开始学习</Link>
            <Link href="/graph">查看图谱</Link>
          </div>
        }
      />

      <div className="panel-grid">
        {entries.map((item) => (
          <article className="panel half" key={item.href}>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <Link href={item.href} className="panel-link-btn">
              进入 {item.title}
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}


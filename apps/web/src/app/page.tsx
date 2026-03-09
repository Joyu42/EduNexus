import Link from "next/link";
import { GalaxyHero, GalaxySpotlight } from "@/components/galaxy-ui";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Network,
  Route,
  BarChart3,
  Database,
  GraduationCap,
  Settings,
  ArrowRight,
  Target,
  Lightbulb
} from "lucide-react";

const coreEntries = [
  {
    href: "/workspace",
    title: "学习工作区",
    description: "用分层引导完成推理过程，沉淀可复盘会话。",
    tag: "先思考后答案",
    icon: BookOpen
  },
  {
    href: "/graph",
    title: "🌌 知识星图",
    description: "定位高风险关系链，并把批次直接推送到学习执行面。",
    tag: "风险链路联动",
    icon: Network
  },
  {
    href: "/path",
    title: "🎮 成长地图",
    description: "基于图谱焦点生成可执行任务序列，并持续回写掌握度。",
    tag: "目标到执行闭环",
    icon: Route
  }
];

const supportEntries = [
  {
    href: "/dashboard",
    title: "生态看板",
    description: "统一追踪学习增益、提示依赖和风险干预结果。",
    tag: "趋势与干预",
    icon: BarChart3
  },
  {
    href: "/kb",
    title: "📚 知识宝库",
    description: "用双链与检索组织长期知识资产，形成个人学习语境。",
    tag: "轻量沉淀复用",
    icon: Database
  },
  {
    href: "/teacher",
    title: "教师工作台",
    description: "围绕备课与课堂改进输出结构化教学方案。",
    tag: "教学协同",
    icon: GraduationCap
  },
  {
    href: "/settings",
    title: "配置中心",
    description: "统一管理策略模板、导入审计与系统参数。",
    tag: "可控可回滚",
    icon: Settings
  }
];

export default function HomePage() {
  return (
    <section className="page-container space-y-12 animate-in">
      <PageHeader
        title="AI 教育生态平台"
        description="统一学习引导、知识沉淀、图谱分析与路径干预。全部能力围绕「先学会，再答题」构建。"
        tags={["纯 Web", "LangGraph", "ModelScope", "本地优先知识库"]}
        actions={
          <>
            <Button size="lg" className="btn-primary" asChild>
              <Link href="/workspace">
                开始学习
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/graph">查看知识星图</Link>
            </Button>
          </>
        }
      />

      <div className="panel-grid">
        <GalaxyHero
          badge="学习生态主入口"
          title="从「会做题」升级为「会学习、会迁移、会复盘」"
          description="工作区负责引导，星图负责定位，地图负责执行，宝库负责沉淀。每次学习都会进入可检索、可回放、可复用的长期资产。"
          quote="同一套界面里完成「问题理解 -> 结构化思考 -> 证据沉淀 -> 路径回写」，避免碎片化跳转。"
          chips={["LangGraph 工作流", "ModelScope 模型接入", "本地优先沉淀", "Web 全链路"]}
          metrics={[
            { label: "核心工作台", value: "3", hint: "工作区 / 星图 / 地图" },
            { label: "生态模块", value: "8", hint: "覆盖学习与教学协同" },
            { label: "上线形态", value: "Web", hint: "可直接部署到 Vercel" }
          ]}
          actions={
            <>
              <Button size="lg" className="btn-primary" asChild>
                <Link href="/workspace">进入学习工作区</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/path">查看成长地图</Link>
              </Button>
            </>
          }
        />
      </div>

      <div className="panel-grid">
        <div className="col-span-12 md:col-span-6">
          <GalaxySpotlight
            title="产品原则"
            description="不做拍照即答案；坚持过程引导、错因解释、关系迁移和知识沉淀，帮助用户建立长期学习能力。"
            status="已启用"
            icon={<Target className="w-5 h-5" />}
          />
        </div>
        <div className="col-span-12 md:col-span-6">
          <GalaxySpotlight
            title="工程状态"
            description="全站统一使用可复用导航、筛选、锚点与回放机制，减少页面学习成本。"
            status="持续优化"
            icon={<Lightbulb className="w-5 h-5" />}
          />
        </div>
      </div>

      {/* 核心学习链路 */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">核心学习链路</h2>
          <p className="text-muted-foreground">按学习闭环顺序组织，建议从左到右逐步使用</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {coreEntries.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.href} className="card-hover group">
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <Badge variant="outline" className="feature-chip">
                      {item.tag}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{item.title}</CardTitle>
                  <CardDescription className="leading-relaxed">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between group-hover:bg-primary/10" asChild>
                    <Link href={item.href}>
                      进入 {item.title}
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* 生态支撑模块 */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">生态支撑模块</h2>
          <p className="text-muted-foreground">围绕教学、治理与知识管理提供配套能力</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {supportEntries.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.href} className="card-hover group">
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2 rounded-lg bg-secondary/50 text-secondary-foreground">
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {item.tag}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <CardDescription className="text-sm line-clamp-2">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs group-hover:bg-secondary/70"
                    asChild
                  >
                    <Link href={item.href}>
                      查看详情
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

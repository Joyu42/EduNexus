"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { GalaxyHero, GalaxySpotlight } from "@/components/galaxy-ui";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Network,
  Database,
  ArrowRight,
  Target,
  Lightbulb,
  Sparkles,
  Zap,
  TrendingUp,
  Library
} from "lucide-react";
import { useSession } from "next-auth/react";

const coreModules = [
  {
    href: "/workspace",
    title: "学习工作区",
    description: "用分层引导完成推理过程，沉淀可复盘会话。",
    tag: "先思考后答案",
    icon: BookOpen
  },
  {
    href: "/kb",
    title: "知识宝库",
    description: "用双链与检索组织长期知识资产，形成个人学习语境。",
    tag: "轻量沉淀复用",
    icon: Database
  },
  {
    href: "/graph",
    title: "知识星图",
    description: "定位高风险关系链，并把批次直接推送到学习执行面。",
    tag: "风险链路联动",
    icon: Network
  },
  {
    href: "/analytics",
    title: "学习分析",
    description: "基于真实学习记录，多维度分析学习效果与进度。",
    tag: "数据驱动",
    icon: TrendingUp
  },
  {
    href: "/resources",
    title: "资源中心",
    description: "发现和管理公共学习资源，支持多类型学习材料。",
    tag: "公共资源集市",
    icon: Library
  }
];

// 动画配置
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1] as const
    }
  }
};

export default function HomePage() {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <motion.section
      className="page-container space-y-12"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants}>
        <PageHeader
          title="AI 教育生态平台"
          description="统一学习引导、知识沉淀、图谱分析与资源管理。全部能力围绕「先学会，再答题」构建。"
          tags={["纯 Web", "LangGraph", "ModelScope", "本地优先知识库"]}
          actions={
            <>
              {isAuthenticated ? (
                <>
                  <Link href="/workspace">
                    <Button size="lg" className="btn-primary group">
                      <Sparkles className="mr-2 h-4 w-4 group-hover:animate-pulse" />
                      开始学习
                      <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link href="/graph">
                    <Button size="lg" variant="outline" className="group">
                      <Network className="mr-2 h-4 w-4" />
                      查看知识星图
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button size="lg" className="btn-primary group">
                      <Sparkles className="mr-2 h-4 w-4 group-hover:animate-pulse" />
                      登录账号
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="lg" variant="outline" className="group">
                      <Network className="mr-2 h-4 w-4" />
                      创建账户
                    </Button>
                  </Link>
                </>
              )}
            </>
          }
        />
      </motion.div>

      <motion.div className="panel-grid" variants={itemVariants}>
        <GalaxyHero
          badge="学习生态主入口"
          title="从「会做题」升级为「会学习、会迁移、会复盘」"
          description="工作区负责引导，星图负责定位与执行，宝库负责沉淀。每次学习都会进入可检索、可回放、可复用的长期资产。"
          quote="同一套界面里完成「问题理解 -> 结构化思考 -> 证据沉淀 -> 知识应用」，避免碎片化跳转。"
            chips={["LangGraph 工作流", "ModelScope 模型接入", "本地优先沉淀", "Web 全链路"]}
            metrics={[
              { label: "核心工作台", value: "3", hint: "工作区 / 星图 / 分析" },
              { label: "生态支撑", value: "2", hint: "知识库 / 资源中心" },
              { label: "上线形态", value: "Web", hint: "可直接部署到 Vercel" }
            ]}
          actions={
            <>
              <Link href="/workspace">
                <Button size="lg" className="btn-primary group">
                  <Zap className="mr-2 h-4 w-4 group-hover:animate-pulse" />
                  进入学习工作区
                </Button>
              </Link>
            </>
          }
        />
      </motion.div>

      <motion.div className="panel-grid" variants={itemVariants}>
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
      </motion.div>

      {/* 核心学习链路 */}
      <motion.div className="space-y-6" variants={itemVariants}>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">核心学习链路</h2>
              <p className="text-muted-foreground">按学习闭环顺序组织，涵盖全流程学习与管理</p>
            </div>
          </div>
        </div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
        >
          {coreModules.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div key={item.href} variants={itemVariants}>
                <Card className="card-hover group h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-3">
                      <motion.div
                        className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <Icon className="w-6 h-6" />
                      </motion.div>
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
                    <Link href={item.href}>
                      <Button variant="ghost" className="w-full justify-between group-hover:bg-primary/10">
                        进入 {item.title}
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>
    </motion.section>
  );
}

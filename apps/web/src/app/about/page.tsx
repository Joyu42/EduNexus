"use client";

import { Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-yellow-50/30">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500">
              <Info className="h-6 w-6 text-white" />
            </div>
            关于
          </h1>
          <p className="text-muted-foreground mt-2">
            应用版本信息和帮助文档
          </p>
        </div>

        <Card className="p-8 space-y-6">
          <div>
            <h2 className="text-2xl font-bold">EduNexus</h2>
            <p className="text-sm text-muted-foreground mt-1">版本 1.0.0</p>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              EduNexus 是一个智能教育管理平台，致力于为学习者提供高效、个性化的学习体验。
            </p>
            <p className="text-muted-foreground leading-relaxed">
              平台融合了知识图谱、个性化学习路径、AI 辅助等功能，帮助用户更好地管理知识、提升学习效率。
            </p>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="font-semibold">核心功能</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                <span>知识星图 - 可视化知识关联与学习进度</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                <span>知识宝库 - 结构化知识管理与协作</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                <span>学习工作区 - AI 辅助学习与练习</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                <span>成长地图 - 个性化学习路径规划</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-500">•</span>
                <span>目标管理 - SMART 目标设定与追踪</span>
              </li>
            </ul>
          </div>

          <Separator />

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>© 2024 EduNexus. All rights reserved.</p>
            <p>Made with ❤️ for learners everywhere.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

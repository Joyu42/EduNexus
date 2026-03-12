"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Circle,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import type { ProgressStats } from "@/lib/graph/progress-tracker";

interface ProgressLegendProps {
  stats: ProgressStats;
}

const STATUS_CONFIG = [
  {
    key: "unlearned",
    label: "未学习",
    color: "bg-gray-500",
    icon: AlertCircle,
    description: "尚未开始学习的知识点",
  },
  {
    key: "learning",
    label: "学习中",
    color: "bg-yellow-500",
    icon: Clock,
    description: "正在学习的知识点",
  },
  {
    key: "mastered",
    label: "已掌握",
    color: "bg-green-500",
    icon: CheckCircle2,
    description: "已经掌握的知识点",
  },
  {
    key: "review",
    label: "需复习",
    color: "bg-orange-500",
    icon: TrendingUp,
    description: "需要复习巩固的知识点",
  },
] as const;

export function ProgressLegend({ stats }: ProgressLegendProps) {
  return (
    <div className="absolute bottom-4 right-4 w-80 max-md:bottom-2 max-md:right-2 max-md:w-72 z-20 pointer-events-auto">
      <Card className="shadow-2xl border-2 border-primary/20 bg-card/95 backdrop-blur-sm pointer-events-auto">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Circle className="h-5 w-5 text-primary" />
            学习进度
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 整体进度 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">完成率</span>
              <span className="font-semibold">
                {(stats.completionRate * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={stats.completionRate * 100} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>已掌握 {stats.mastered} 个</span>
              <span>共 {stats.total} 个知识点</span>
            </div>
          </div>

          {/* 平均掌握度 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">平均掌握度</span>
              <span className="font-semibold">
                {(stats.averageMastery * 100).toFixed(1)}%
              </span>
            </div>
            <Progress value={stats.averageMastery * 100} className="h-2" />
          </div>

          {/* 状态图例 */}
          <div className="space-y-2">
            <div className="text-sm font-semibold">节点状态</div>
            <div className="space-y-2">
              {STATUS_CONFIG.map((status) => {
                const Icon = status.icon;
                const count = stats[status.key as keyof ProgressStats] as number;
                const percentage =
                  stats.total > 0 ? (count / stats.total) * 100 : 0;

                return (
                  <div
                    key={status.key}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`w-3 h-3 rounded-full ${status.color}`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{status.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {status.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{count}</div>
                      <div className="text-xs text-muted-foreground">
                        {percentage.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 节点大小说明 */}
          <div className="space-y-2 pt-2 border-t">
            <div className="text-sm font-semibold">节点大小</div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>节点大小 = 重要程度 + 连接数</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-green-500" />
                <span>绿色进度环 = 掌握程度</span>
              </div>
            </div>
          </div>

          {/* 连接线说明 */}
          <div className="space-y-2 pt-2 border-t">
            <div className="text-sm font-semibold">连接线类型</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-red-400" />
                <span className="text-muted-foreground">前置关系</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-blue-400" />
                <span className="text-muted-foreground">相关关系</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-green-400" />
                <span className="text-muted-foreground">包含关系</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-yellow-400" />
                <span className="text-muted-foreground">应用关系</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

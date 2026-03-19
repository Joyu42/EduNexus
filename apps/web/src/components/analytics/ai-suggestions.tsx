"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  TrendingUp,
  AlertCircle,
  Target,
  BookOpen,
  Clock,
  Sparkles,
} from "lucide-react";
import type { LearningInsights } from "@/lib/analytics/report-generator";

interface AISuggestionsProps {
  reportType: "weekly" | "monthly";
}

export function AISuggestions({ reportType }: AISuggestionsProps) {
  const [insights, setInsights] = useState<LearningInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    // 实际应用中从 API 获取 AI 生成的建议
    const mockInsights: LearningInsights = {
      studyPattern: {
        preferredTimeSlots: ["上午 9-11点", "晚上 8-10点"],
        avgSessionLength: 45,
        consistency: 78,
      },
      strengths: [
        "学习时长充足，保持了良好的学习习惯",
        "练习正确率高，知识掌握扎实",
        "文档整理规范，便于后续复习",
      ],
      weaknesses: [
        "知识点覆盖面较窄，建议拓展学习领域",
        "部分知识点掌握度偏低，需要重点复习",
        "学习时间分布不够均匀，周末学习较少",
      ],
      recommendations: [
        "建议每周安排2-3次深度学习时间，每次1-2小时",
        "可以尝试使用费曼学习法，通过教授他人来巩固知识",
        "定期回顾错题和薄弱知识点，建立知识体系",
        "参与社区讨论，与其他学习者交流经验",
      ],
      nextSteps: [
        "本周重点：复习算法设计相关知识点",
        "完成至少3个实践项目，应用所学知识",
        "每天保持至少30分钟的学习时间",
        "整理本月学习笔记，建立知识图谱",
      ],
    };

    setTimeout(() => {
      setInsights(mockInsights);
      setLoading(false);
    }, 800);
  }, [reportType]);

  const handleRegenerate = async () => {
    setGenerating(true);
    // 模拟 AI 重新生成建议
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setGenerating(false);
  };

  if (loading || !insights) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span>AI 正在分析你的学习数据...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI 分析标题 */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI 学习分析与建议
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={generating}
            >
              {generating ? "生成中..." : "重新生成"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            基于你的学习数据，AI 为你提供个性化的学习建议
          </p>
        </CardHeader>
      </Card>

      {/* 学习模式分析 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5" />
            学习模式分析
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">偏好时段</div>
              <div className="font-medium">
                {insights.studyPattern.preferredTimeSlots.join("、")}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">平均时长</div>
              <div className="font-medium">
                {insights.studyPattern.avgSessionLength} 分钟/次
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">学习一致性</div>
              <div className="flex items-center gap-2">
                <div className="font-medium">
                  {insights.studyPattern.consistency}%
                </div>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${insights.studyPattern.consistency}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 优势和薄弱点 */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
              你的优势
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {insights.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              需要改进
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {insights.weaknesses.map((weakness, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-orange-600 mt-1">!</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 学习建议 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            个性化学习建议
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {insights.recommendations.map((recommendation, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                  {index + 1}
                </div>
                <p className="text-sm flex-1">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 下一步行动 */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            下一步行动计划
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {insights.nextSteps.map((step, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
              >
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm flex-1">{step}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 推荐资源 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BookOpen className="w-5 h-5" />
            推荐学习资源
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
              <BookOpen className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-sm">算法设计与分析</div>
                <div className="text-xs text-muted-foreground mt-1">
                  针对你的薄弱知识点，推荐系统学习算法基础
                </div>
                <Badge variant="secondary" className="mt-2">
                  基础课程
                </Badge>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
              <BookOpen className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-sm">实战项目练习</div>
                <div className="text-xs text-muted-foreground mt-1">
                  通过实际项目巩固 React 和 TypeScript 知识
                </div>
                <Badge variant="secondary" className="mt-2">
                  实践项目
                </Badge>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg border border-border">
              <BookOpen className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-medium text-sm">学习方法论</div>
                <div className="text-xs text-muted-foreground mt-1">
                  提升学习效率的方法和技巧
                </div>
                <Badge variant="secondary" className="mt-2">
                  方法指导
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
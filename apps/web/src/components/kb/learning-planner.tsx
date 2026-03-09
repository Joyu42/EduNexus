/**
 * 学习计划生成器
 * 基于知识库内容生成个性化学习计划
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Loader2,
  Target,
  Clock,
  CheckCircle2,
  BookOpen,
  Code,
  RefreshCw,
  Download,
} from "lucide-react";
import type { LearningPlan } from "@/lib/ai/learning-planner";
import type { KBDocument } from "@/lib/client/kb-storage";

interface LearningPlannerProps {
  documents: KBDocument[];
}

export function LearningPlanner({ documents }: LearningPlannerProps) {
  const [plan, setPlan] = useState<LearningPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userGoal, setUserGoal] = useState("");

  const handleGeneratePlan = async () => {
    if (documents.length === 0) {
      setError("知识库中没有文档");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/kb/learning-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          documents: documents.map((doc) => ({
            id: doc.id,
            title: doc.title,
            content: doc.content.slice(0, 500),
            tags: doc.tags,
          })),
          userGoal: userGoal || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPlan(data.data);
      } else {
        setError(data.error || "生成学习计划失败");
      }
    } catch (err) {
      console.error("生成学习计划失败:", err);
      setError("生成学习计划失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPlan = () => {
    if (!plan) return;

    let markdown = `# ${plan.title}\n\n${plan.description}\n\n`;
    markdown += `**总学习时间**: ${plan.totalDuration} 小时\n\n`;

    plan.phases.forEach((phase, index) => {
      markdown += `## 阶段 ${index + 1}: ${phase.title}\n\n`;
      markdown += `${phase.description}\n\n`;
      markdown += `**时长**: ${phase.duration} 小时\n\n`;
      markdown += `**主题**: ${phase.topics.join(", ")}\n\n`;
      markdown += `### 学习任务\n\n`;
      phase.tasks.forEach((task, taskIndex) => {
        markdown += `${taskIndex + 1}. [${task.priority.toUpperCase()}] ${task.title} (${task.estimatedTime}分钟)\n`;
      });
      markdown += `\n`;
    });

    markdown += `## 建议\n\n`;
    plan.recommendations.forEach((rec, index) => {
      markdown += `${index + 1}. ${rec}\n`;
    });

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `学习计划_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "read":
        return <BookOpen className="w-3 h-3" />;
      case "practice":
        return <Code className="w-3 h-3" />;
      case "review":
        return <RefreshCw className="w-3 h-3" />;
      case "project":
        return <Target className="w-3 h-3" />;
      default:
        return <CheckCircle2 className="w-3 h-3" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (documents.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>知识库中没有文档</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-green-600" />
          AI 学习计划
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!plan && !isLoading && (
          <>
            <div className="space-y-2">
              <Label htmlFor="goal" className="text-sm">
                学习目标（可选）
              </Label>
              <Input
                id="goal"
                placeholder="例如：掌握 React 基础知识"
                value={userGoal}
                onChange={(e) => setUserGoal(e.target.value)}
                className="text-sm"
              />
            </div>
            <Button
              onClick={handleGeneratePlan}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              disabled={isLoading}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              生成学习计划
            </Button>
            <div className="text-xs text-muted-foreground">
              💡 基于 {documents.length} 个文档生成个性化学习计划
            </div>
          </>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            <span className="ml-2 text-sm text-muted-foreground">
              正在生成学习计划...
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {plan && (
          <>
            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportPlan}
                className="flex-1"
              >
                <Download className="w-3 h-3 mr-1" />
                导出
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGeneratePlan}
                className="flex-1"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                重新生成
              </Button>
            </div>

            <Separator />

            {/* 计划标题和描述 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {plan.title}
              </h3>
              <p className="text-sm text-gray-700">{plan.description}</p>
            </div>

            {/* 总时长 */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">
                总学习时间：{plan.totalDuration} 小时
              </span>
            </div>

            <Separator />

            {/* 学习阶段 */}
            <div className="space-y-4">
              {plan.phases.map((phase, index) => (
                <div
                  key={phase.id}
                  className="p-4 rounded-lg border border-gray-200 bg-gradient-to-br from-green-50 to-emerald-50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">
                        阶段 {index + 1}: {phase.title}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1">
                        {phase.description}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-700 border-green-200"
                    >
                      {phase.duration}h
                    </Badge>
                  </div>

                  {/* 主题 */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {phase.topics.map((topic, topicIndex) => (
                      <Badge
                        key={topicIndex}
                        variant="outline"
                        className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>

                  {/* 任务列表 */}
                  <div className="space-y-2">
                    {phase.tasks.map((task, taskIndex) => (
                      <div
                        key={task.id}
                        className="flex items-start gap-2 p-2 rounded bg-white border border-gray-200"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {getTaskIcon(task.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-gray-900">
                            {task.title}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={`text-xs ${getPriorityColor(task.priority)}`}
                            >
                              {task.priority}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {task.estimatedTime} 分钟
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* 建议 */}
            {plan.recommendations.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-gray-900">
                    学习建议
                  </span>
                </div>
                <ul className="space-y-2">
                  {plan.recommendations.map((rec, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-700 flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

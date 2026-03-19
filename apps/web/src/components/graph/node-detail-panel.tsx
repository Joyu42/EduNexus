"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  FileText,
  Target,
  Clock,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Edit,
  Trash2,
} from "lucide-react";
import type { NodeDetail, GraphNode } from "@/lib/graph/types";

const STATUS_CONFIG = {
  unlearned: { label: "未学习", color: "bg-gray-500", icon: AlertCircle },
  learning: { label: "学习中", color: "bg-yellow-500", icon: Clock },
  mastered: { label: "已掌握", color: "bg-green-500", icon: CheckCircle2 },
  review: { label: "需复习", color: "bg-orange-500", icon: TrendingUp },
};

interface NodeDetailPanelProps {
  detail: NodeDetail | null;
  onClose: () => void;
  onEdit?: (node: GraphNode) => void;
  onDelete?: (node: GraphNode) => void;
  onNavigate?: (nodeId: string) => void;
}

export function NodeDetailPanel({
  detail,
  onClose,
  onEdit,
  onDelete,
  onNavigate,
}: NodeDetailPanelProps) {
  if (!detail) return null;

  const { node, prerequisites, nextSteps, relatedNotes, relatedPractices, learningProgress } = detail;
  const statusConfig = STATUS_CONFIG[node.status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="w-96 border-l bg-card/95 backdrop-blur-sm overflow-hidden flex flex-col absolute right-0 top-0 bottom-0 z-30 pointer-events-auto">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* 头部 */}
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${statusConfig.color}`} />
                <Badge variant="secondary">{statusConfig.label}</Badge>
              </div>
              <h2 className="text-2xl font-semibold">{node.name}</h2>
              <p className="text-sm text-muted-foreground">
                创建于 {node.createdAt.toLocaleDateString("zh-CN")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <Separator />

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardHeader className="p-4">
                <CardDescription className="text-xs flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  掌握程度
                </CardDescription>
                <CardTitle className="text-2xl">
                  {(node.mastery * 100).toFixed(0)}%
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-4">
                <CardDescription className="text-xs flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  重要程度
                </CardDescription>
                <CardTitle className="text-2xl">
                  {(node.importance * 100).toFixed(0)}%
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-4">
                <CardDescription className="text-xs flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  笔记数量
                </CardDescription>
                <CardTitle className="text-2xl">{node.noteCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="p-4">
                <CardDescription className="text-xs flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  练习进度
                </CardDescription>
                <CardTitle className="text-2xl">
                  {node.practiceCount > 0
                    ? `${node.practiceCompleted}/${node.practiceCount}`
                    : "0"}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* 学习进度 */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              学习进度
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">练习完成度</span>
                  <span className="font-medium">
                    {node.practiceCount > 0
                      ? ((node.practiceCompleted / node.practiceCount) * 100).toFixed(0)
                      : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    node.practiceCount > 0
                      ? (node.practiceCompleted / node.practiceCount) * 100
                      : 0
                  }
                  className="h-2"
                />
              </div>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">学习时长</span>
                  <span className="font-medium">
                    {learningProgress.totalTime} 分钟
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">复习次数</span>
                  <span className="font-medium">
                    {learningProgress.reviewCount} 次
                  </span>
                </div>
                {learningProgress.lastStudied && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">最后学习</span>
                    <span className="font-medium">
                      {learningProgress.lastStudied.toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* 前置知识 */}
          {prerequisites.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ArrowRight className="h-4 w-4 rotate-180" />
                前置知识
              </h3>
              <div className="space-y-2">
                {prerequisites.map((prereq) => (
                  <Card
                    key={prereq.id}
                    className="p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onNavigate?.(prereq.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_CONFIG[prereq.status].color}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {prereq.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          掌握度: {(prereq.mastery * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 后续知识 */}
          {nextSteps.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                后续知识
              </h3>
              <div className="space-y-2">
                {nextSteps.map((next) => (
                  <Card
                    key={next.id}
                    className="p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => onNavigate?.(next.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 ${STATUS_CONFIG[next.status].color}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {next.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          重要度: {(next.importance * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* 相关笔记 */}
          {relatedNotes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                相关笔记 ({relatedNotes.length})
              </h3>
              <div className="space-y-2">
                {relatedNotes.map((note) => (
                  <Card
                    key={note.id}
                    className="p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-medium mb-1">{note.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {note.excerpt}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 相关练习 */}
          {relatedPractices.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                相关练习 ({relatedPractices.length})
              </h3>
              <div className="space-y-2">
                {relatedPractices.map((practice) => (
                  <Card
                    key={practice.id}
                    className="p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{practice.title}</div>
                      {practice.completed && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* 操作按钮 */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold mb-3">操作</h3>
            {onEdit && (
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => onEdit(node)}
              >
                <Edit className="h-4 w-4" />
                编辑节点
              </Button>
            )}
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              onClick={() => {
                // 跳转到笔记页面
                window.location.href = `/kb?node=${node.id}`;
              }}
            >
              <FileText className="h-4 w-4" />
              查看笔记
            </Button>
            <Button
              className="w-full justify-start gap-2"
              variant="outline"
              onClick={() => {
                // 跳转到练习页面
                window.location.href = `/workspace/practice?node=${node.id}`;
              }}
            >
              <BookOpen className="h-4 w-4" />
              开始练习
            </Button>
            {onDelete && (
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => onDelete(node)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
                <span className="text-destructive">删除节点</span>
              </Button>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

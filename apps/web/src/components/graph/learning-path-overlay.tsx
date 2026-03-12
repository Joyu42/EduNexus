"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Route,
  Clock,
  TrendingUp,
  ArrowRight,
  Play,
  Lightbulb,
} from "lucide-react";
import type { LearningPath, GraphNode } from "@/lib/graph/types";

interface LearningPathOverlayProps {
  paths: LearningPath[];
  currentPath: LearningPath | null;
  nodes: GraphNode[];
  onSelectPath: (path: LearningPath) => void;
  onClearPath: () => void;
  onStartLearning?: (path: LearningPath) => void;
}

const DIFFICULTY_CONFIG = {
  easy: { label: "简单", color: "bg-green-500", textColor: "text-green-700" },
  medium: { label: "中等", color: "bg-yellow-500", textColor: "text-yellow-700" },
  hard: { label: "困难", color: "bg-red-500", textColor: "text-red-700" },
};

export function LearningPathOverlay({
  paths,
  currentPath,
  nodes,
  onSelectPath,
  onClearPath,
  onStartLearning,
}: LearningPathOverlayProps) {
  const getNodeById = (id: string) => nodes.find((n) => n.id === id);

  return (
    <div className="absolute top-4 left-4 w-96 max-h-[calc(100vh-8rem)] max-md:top-2 max-md:left-2 max-md:w-80 max-md:max-h-[calc(100vh-10rem)] z-20 pointer-events-auto">
      <Card className="shadow-2xl border-2 border-primary/20 bg-card/95 backdrop-blur-sm pointer-events-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">学习路径推荐</CardTitle>
            </div>
            {currentPath && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearPath}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CardDescription>
            {currentPath
              ? "当前选中的学习路径"
              : `为您推荐 ${paths.length} 条学习路径`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-3">
              {currentPath ? (
                // 显示当前路径详情
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{currentPath.name}</h3>
                      <Badge
                        variant="secondary"
                        className={DIFFICULTY_CONFIG[currentPath.difficulty].textColor}
                      >
                        {DIFFICULTY_CONFIG[currentPath.difficulty].label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {currentPath.estimatedTime} 分钟
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {currentPath.nodes.length} 个节点
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {currentPath.reason}
                    </p>
                  </div>

                  {/* 路径节点列表 */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">学习步骤</h4>
                    {currentPath.nodes.map((nodeId, index) => {
                      const node = getNodeById(nodeId);
                      if (!node) return null;

                      return (
                        <div
                          key={nodeId}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{node.name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              掌握度: {(node.mastery * 100).toFixed(0)}% · 重要度:{" "}
                              {(node.importance * 100).toFixed(0)}%
                            </div>
                          </div>
                          {index < currentPath.nodes.length - 1 && (
                            <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 开始学习按钮 */}
                  {onStartLearning && (
                    <Button
                      className="w-full gap-2"
                      onClick={() => onStartLearning(currentPath)}
                    >
                      <Play className="h-4 w-4" />
                      开始学习
                    </Button>
                  )}
                </div>
              ) : (
                // 显示路径列表
                paths.map((path) => {
                  const firstNode = getNodeById(path.nodes[0]);
                  const lastNode = getNodeById(path.nodes[path.nodes.length - 1]);

                  return (
                    <Card
                      key={path.id}
                      className="cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => onSelectPath(path)}
                    >
                      <CardHeader className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm truncate">
                              {path.name}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {firstNode?.name} → {lastNode?.name}
                            </CardDescription>
                          </div>
                          <Badge
                            variant="secondary"
                            className={`flex-shrink-0 ${DIFFICULTY_CONFIG[path.difficulty].textColor}`}
                          >
                            {DIFFICULTY_CONFIG[path.difficulty].label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {path.estimatedTime} 分钟
                          </div>
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            {path.nodes.length} 个节点
                          </div>
                        </div>
                        <div className="flex items-start gap-2 mt-2">
                          <Lightbulb className="h-3 w-3 text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground">
                            {path.reason}
                          </p>
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })
              )}

              {paths.length === 0 && !currentPath && (
                <div className="text-center py-8 text-muted-foreground">
                  <Route className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">暂无推荐路径</p>
                  <p className="text-xs mt-1">
                    开始学习一些知识点后，系统会为您推荐学习路径
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

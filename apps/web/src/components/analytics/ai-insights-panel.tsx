"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Lightbulb,
  Target,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AIInsights } from "@/lib/analytics/analytics-types";

interface AIInsightsPanelProps {
  insights?: AIInsights;
  loading?: boolean;
}

export function AIInsightsPanel({ insights, loading }: AIInsightsPanelProps) {
  const [activeTab, setActiveTab] = useState("patterns");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI 洞察
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-orange-500" />
          AI 洞察
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="patterns">模式</TabsTrigger>
            <TabsTrigger value="recommendations">建议</TabsTrigger>
            <TabsTrigger value="predictions">预测</TabsTrigger>
            <TabsTrigger value="anomalies">异常</TabsTrigger>
          </TabsList>

          <TabsContent value="patterns" className="space-y-4 mt-4">
            {insights.patterns.length > 0 ? (
              insights.patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-orange-500" />
                      <h4 className="font-medium">{pattern.title}</h4>
                    </div>
                    <Badge
                      variant={
                        pattern.impact === "high"
                          ? "default"
                          : pattern.impact === "medium"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {pattern.impact === "high"
                        ? "高影响"
                        : pattern.impact === "medium"
                        ? "中影响"
                        : "低影响"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {pattern.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">
                      置信度: {pattern.confidence}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                暂无发现的学习模式
              </p>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4 mt-4">
            {insights.recommendations.length > 0 ? (
              insights.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      <h4 className="font-medium">{rec.title}</h4>
                    </div>
                    <Badge
                      variant={
                        rec.priority === "high"
                          ? "destructive"
                          : rec.priority === "medium"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {rec.priority === "high"
                        ? "高优先级"
                        : rec.priority === "medium"
                        ? "中优先级"
                        : "低优先级"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {rec.description}
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs font-medium">行动建议：</p>
                    <ul className="space-y-1">
                      {rec.actionItems.map((item, index) => (
                        <li
                          key={index}
                          className="text-xs text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-orange-500 mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      预期效果: {rec.expectedImpact}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                暂无建议
              </p>
            )}
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4 mt-4">
            {insights.predictions.length > 0 ? (
              insights.predictions.map((pred) => (
                <div
                  key={pred.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium">{pred.title}</h4>
                    <Badge variant="outline">{pred.timeframe}</Badge>
                  </div>
                  <p className="text-sm mb-3">{pred.prediction}</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-rose-500 h-2 rounded-full transition-all"
                          style={{ width: `${pred.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {pred.confidence}%
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">影响因素：</p>
                      <ul className="space-y-1">
                        {pred.factors.map((factor, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-orange-500">•</span>
                            <span>{factor}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                暂无预测
              </p>
            )}
          </TabsContent>

          <TabsContent value="anomalies" className="space-y-4 mt-4">
            {insights.anomalies.length > 0 ? (
              insights.anomalies.map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={`p-4 rounded-lg border ${
                    anomaly.severity === "high"
                      ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20"
                      : anomaly.severity === "medium"
                      ? "border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20"
                      : "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                        anomaly.severity === "high"
                          ? "text-red-500"
                          : anomaly.severity === "medium"
                          ? "text-orange-500"
                          : "text-yellow-500"
                      }`}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{anomaly.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {anomaly.description}
                      </p>
                      <div className="p-2 rounded bg-background/50 border">
                        <p className="text-xs font-medium mb-1">建议：</p>
                        <p className="text-xs text-muted-foreground">
                          {anomaly.suggestion}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 mb-3">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-muted-foreground">
                  未检测到异常，学习状态良好！
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* 对比分析 */}
        {insights.comparisons.length > 0 && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-4">对比分析</h4>
            <div className="space-y-3">
              {insights.comparisons.map((comp) => (
                <div
                  key={comp.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/50"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{comp.metric}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {comp.interpretation}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {comp.trend === "up" ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : comp.trend === "down" ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <Minus className="h-4 w-4 text-gray-500" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        comp.trend === "up"
                          ? "text-green-600"
                          : comp.trend === "down"
                          ? "text-red-600"
                          : "text-gray-600"
                      }`}
                    >
                      {comp.changePercentage > 0 ? "+" : ""}
                      {comp.changePercentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import type { AnalyticsInsightCard } from "@/lib/analytics/insight-generator";

interface InsightsPanelProps {
  insights: AnalyticsInsightCard[];
}

const severityConfig = {
  positive: {
    icon: CheckCircle2,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200"
  },
  neutral: {
    icon: Info,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200"
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200"
  }
};

export function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <Card variant="glass" className="border-slate-200">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          分析洞察
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {insights.length === 0 ? (
          <div className="text-center text-slate-500 py-6">暂无分析洞察</div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => {
              const config = severityConfig[insight.severity];
              const Icon = config.icon;
              return (
                <div 
                  key={insight.id} 
                  className={`p-4 rounded-lg border ${config.bg} flex gap-3`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${config.color}`} />
                  <div>
                    <h4 className={`font-medium ${config.color} mb-1`}>{insight.title}</h4>
                    <p className="text-sm text-slate-600">{insight.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

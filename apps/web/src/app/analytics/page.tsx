"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { LoginPrompt } from "@/components/ui/login-prompt";
import { Card } from "@/components/ui/card";
import { WeeklyReport } from "@/components/analytics/weekly-report";
import { MonthlyReport } from "@/components/analytics/monthly-report";
import { InsightsPanel } from "@/components/analytics/insights-panel";
import type { AnalyticsReport } from "@/lib/analytics/report-builder";
import type { AnalyticsInsightCard } from "@/lib/analytics/insight-generator";

export default function AnalyticsPage() {
  const { status } = useSession();
  const [range, setRange] = useState<"weekly" | "monthly">("weekly");

  const { data: reportData, isLoading: isLoadingReport } = useQuery<{ report: AnalyticsReport }>({
    queryKey: ["analytics-report", range],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/reports?range=${range}`);
      if (!res.ok) throw new Error("Failed to fetch report");
      const json = await res.json();
      return json.data;
    },
    enabled: status === "authenticated",
  });

  const { data: insightsData, isLoading: isLoadingInsights } = useQuery<{ insights: AnalyticsInsightCard[] }>({
    queryKey: ["analytics-insights", range],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/insights?range=${range}`);
      if (!res.ok) throw new Error("Failed to fetch insights");
      const json = await res.json();
      return json.data;
    },
    enabled: status === "authenticated",
  });

  if (status === "unauthenticated") {
    return <LoginPrompt title="学习分析" />;
  }

  const isLoading = isLoadingReport || isLoadingInsights;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">数据概览</h1>
              <p className="text-sm text-slate-500">查看平台的整体使用情况和内容增长</p>
            </div>
          </div>
          
          <div className="flex bg-white rounded-lg border border-slate-200 p-1">
            <button
              onClick={() => setRange("weekly")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                range === "weekly" 
                  ? "bg-violet-100 text-violet-700" 
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              周度报告
            </button>
            <button
              onClick={() => setRange("monthly")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                range === "monthly" 
                  ? "bg-violet-100 text-violet-700" 
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              月度报告
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="h-32 bg-slate-100 border-none" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {range === "weekly" ? (
                <WeeklyReport report={reportData?.report ?? null} />
              ) : (
                <MonthlyReport report={reportData?.report ?? null} />
              )}
            </div>
            <div className="lg:col-span-1">
              <InsightsPanel insights={insightsData?.insights ?? []} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

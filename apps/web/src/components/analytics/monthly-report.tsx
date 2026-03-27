import React from "react";
import { Card } from "@/components/ui/card";
import { Activity, Camera } from "lucide-react";
import type { AnalyticsReport } from "@/lib/analytics/report-builder";

interface MonthlyReportProps {
  report: AnalyticsReport | null;
}

export function MonthlyReport({ report }: MonthlyReportProps) {
  if (!report || report.totals.eventCount === 0 && report.totals.snapshotCount === 0) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
        <Activity className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-lg font-medium">暂无月度数据</p>
        <p className="text-sm">您本月还没有学习记录，开始学习吧！</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card variant="glass" padding="md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">月度事件总数</div>
              <div className="text-3xl font-bold text-slate-800">{report.totals.eventCount}</div>
            </div>
          </div>
        </Card>
        
        <Card variant="glass" padding="md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-100 text-teal-600 rounded-xl">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">月度快照总数</div>
              <div className="text-3xl font-bold text-slate-800">{report.totals.snapshotCount}</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

import React from "react";
import { Card } from "@/components/ui/card";
import { Flame, BookOpen, Repeat, RefreshCw, Target, TrendingUp, Activity } from "lucide-react";
import type { AnalyticsReport } from "@/lib/analytics/report-builder";

export type WeeklyReportData = AnalyticsReport & {
  streakDays?: number;
  learnedToday?: number;
  reviewedToday?: number;
  relearnedToday?: number;
  accuracyToday?: number;
  recentProgress?: {
    activeDays: number;
    learnedWordsInRange: number;
    averageDailyLearnedWords: number;
  };
};

interface WeeklyReportProps {
  report: WeeklyReportData | null;
}

export function WeeklyReport({ report }: WeeklyReportProps) {
  if (!report || ((report.streakDays ?? 0) === 0 && (report.learnedToday ?? 0) === 0 && (report.reviewedToday ?? 0) === 0 && (report.relearnedToday ?? 0) === 0 && (report.recentProgress?.activeDays ?? 0) === 0)) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
        <Activity className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-lg font-medium">暂无分析数据</p>
        <p className="text-sm">产生真实的学习记录后，这里将展示您的数据分析。</p>
      </div>
    );
  }

  const accuracyPercent = Math.round((report.accuracyToday ?? 0) * 100);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card variant="glass" padding="md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">连续学习天数</div>
              <div className="text-3xl font-bold text-slate-800">{report.streakDays ?? 0}</div>
            </div>
          </div>
        </Card>
        
        <Card variant="glass" padding="md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">今日新学</div>
              <div className="text-3xl font-bold text-slate-800">{report.learnedToday ?? 0}</div>
            </div>
          </div>
        </Card>
        
        <Card variant="glass" padding="md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
              <Repeat className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">今日复习</div>
              <div className="text-3xl font-bold text-slate-800">{report.reviewedToday ?? 0}</div>
            </div>
          </div>
        </Card>

        <Card variant="glass" padding="md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">今日重学</div>
              <div className="text-3xl font-bold text-slate-800">{report.relearnedToday ?? 0}</div>
            </div>
          </div>
        </Card>

        <Card variant="glass" padding="md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">今日正确率</div>
              <div className="text-3xl font-bold text-slate-800">{accuracyPercent}%</div>
            </div>
          </div>
        </Card>
      </div>

      <Card variant="glass" padding="md" className="bg-gradient-to-r from-violet-50 to-fuchsia-50 border-violet-100">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-violet-200 text-violet-700 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-slate-600">最近7天进度</div>
            <div className="text-lg font-medium text-slate-900 mt-1">
              活跃 {report.recentProgress?.activeDays ?? 0} 天，共学 {report.recentProgress?.learnedWordsInRange ?? 0} 词，日均 {report.recentProgress?.averageDailyLearnedWords ?? 0} 词
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

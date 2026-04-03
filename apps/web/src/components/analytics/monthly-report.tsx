import React from "react";
import { Card } from "@/components/ui/card";
import { BookMarked, Target, CalendarDays, CheckCircle, BookType, Activity } from "lucide-react";
import type { AnalyticsReport } from "@/lib/analytics/report-builder";

export type MonthlyReportData = AnalyticsReport & {
  totalWords?: number;
  learnedWords?: number;
  masteredWords?: number;
  dueToday?: number;
  bookProgress?: Array<{
    bookId: string;
    bookName: string;
    totalWords: number;
    learnedWords: number;
    masteredWords: number;
    dueToday: number;
    progressPercent: number;
  }>;
};

interface MonthlyReportProps {
  report: MonthlyReportData | null;
}

export function MonthlyReport({ report }: MonthlyReportProps) {
  if (!report || ((report.totalWords ?? 0) === 0 && (report.learnedWords ?? 0) === 0)) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
        <Activity className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <p className="text-lg font-medium">暂无分析数据</p>
        <p className="text-sm">产生真实的学习记录后，这里将展示您的数据分析。</p>
      </div>
    );
  }

  const topBooks = (report.bookProgress || []).slice(0, 3);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass" padding="md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
              <BookMarked className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">总词量</div>
              <div className="text-3xl font-bold text-slate-800">{report.totalWords ?? 0}</div>
            </div>
          </div>
        </Card>
        
        <Card variant="glass" padding="md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">已学词数</div>
              <div className="text-3xl font-bold text-slate-800">{report.learnedWords ?? 0}</div>
            </div>
          </div>
        </Card>

        <Card variant="glass" padding="md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">已掌握词数</div>
              <div className="text-3xl font-bold text-slate-800">{report.masteredWords ?? 0}</div>
            </div>
          </div>
        </Card>

        <Card variant="glass" padding="md">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-xl">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-500">今日待复习</div>
              <div className="text-3xl font-bold text-slate-800">{report.dueToday ?? 0}</div>
            </div>
          </div>
        </Card>
      </div>

      {topBooks.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-slate-800 flex items-center gap-2">
            <BookType className="w-5 h-5 text-slate-500" />
            词书进度
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topBooks.map((book) => (
              <Card key={book.bookId} variant="glass" padding="md" className="flex flex-col justify-between">
                <div className="mb-4">
                  <div className="font-medium text-slate-800 truncate" title={book.bookName}>
                    {book.bookName}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {book.learnedWords} / {book.totalWords} 词
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-600 mb-2">
                    <span>进度</span>
                    <span>{book.progressPercent}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-violet-500 rounded-full transition-all duration-500" 
                      style={{ width: `${book.progressPercent}%` }} 
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileDown, Share2, Calendar } from "lucide-react";
import { WeeklyReport } from "@/components/analytics/weekly-report";
import { MonthlyReport } from "@/components/analytics/monthly-report";
import { AISuggestions } from "@/components/analytics/ai-suggestions";

export default function ReportsPage() {
  const [reportType, setReportType] = useState<"weekly" | "monthly">("weekly");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const handleExportPDF = () => {
    // 实现 PDF 导出功能
    window.print();
  };

  const handleShare = () => {
    // 实现分享功能
    if (navigator.share) {
      navigator.share({
        title: "我的学习报告",
        text: "查看我的学习进展",
        url: window.location.href,
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">学习报告</h1>
          <p className="text-muted-foreground mt-1">
            了解你的学习进展和成长轨迹
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileDown className="w-4 h-4 mr-2" />
            导出 PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            分享
          </Button>
        </div>
      </div>

      {/* 报告类型选择 */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={reportType} onValueChange={(v) => setReportType(v as any)}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="weekly">周报</TabsTrigger>
              <TabsTrigger value="monthly">月报</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* 报告内容 */}
      {reportType === "weekly" ? (
        <WeeklyReport date={selectedDate} />
      ) : (
        <MonthlyReport date={selectedDate} />
      )}

      {/* AI 学习建议 */}
      <AISuggestions reportType={reportType} />

      {/* 历史报告 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            历史报告
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                const lastWeek = new Date();
                lastWeek.setDate(lastWeek.getDate() - 7);
                setSelectedDate(lastWeek);
                setReportType("weekly");
              }}
            >
              上周报告
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                setSelectedDate(lastMonth);
                setReportType("monthly");
              }}
            >
              上月报告
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

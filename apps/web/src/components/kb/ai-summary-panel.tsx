/**
 * AI 摘要面板组件
 * 显示文档摘要、关键要点和大纲
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Loader2,
  FileText,
  List,
  CheckCircle2,
  Copy,
  Download,
} from "lucide-react";
import type { DocumentSummary } from "@/lib/ai/document-analyzer";

interface AISummaryPanelProps {
  documentId?: string;
  documentTitle?: string;
  documentContent?: string;
  onInsertText?: (text: string) => void;
}

export function AISummaryPanel({
  documentId,
  documentTitle,
  documentContent,
  onInsertText,
}: AISummaryPanelProps) {
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSummary = async () => {
    if (!documentContent || !documentTitle) {
      setError("请先选择一个文档");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/kb/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "summary",
          content: documentContent,
          title: documentTitle,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSummary(data.data);
      } else {
        setError(data.error || "生成摘要失败");
      }
    } catch (err) {
      console.error("生成摘要失败:", err);
      setError("生成摘要失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (summary) {
      const text = `# ${documentTitle}\n\n## 摘要\n${summary.summary}\n\n## 关键要点\n${summary.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}`;
      navigator.clipboard.writeText(text);
    }
  };

  const handleExportSummary = () => {
    if (summary) {
      const text = `# ${documentTitle}\n\n## 摘要\n${summary.summary}\n\n## 关键要点\n${summary.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}\n\n## 大纲\n${summary.outline.map((item) => `${"  ".repeat(item.level - 1)}- ${item.title}`).join("\n")}`;
      const blob = new Blob([text], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${documentTitle}_摘要.md`;
      a.click();
    }
  };

  if (!documentId) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6 text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>请先选择一个文档</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-600" />
          AI 文档摘要
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!summary && !isLoading && (
          <Button
            onClick={handleGenerateSummary}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            disabled={isLoading}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            生成摘要
          </Button>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
            <span className="ml-2 text-sm text-muted-foreground">
              正在分析文档...
            </span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {summary && (
          <>
            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopySummary}
                className="flex-1"
              >
                <Copy className="w-3 h-3 mr-1" />
                复制
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportSummary}
                className="flex-1"
              >
                <Download className="w-3 h-3 mr-1" />
                导出
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateSummary}
                className="flex-1"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                重新生成
              </Button>
            </div>

            <Separator />

            {/* 摘要 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-900">
                  摘要
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {summary.summary}
              </p>
            </div>

            <Separator />

            {/* 关键要点 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-amber-900">
                  关键要点
                </span>
              </div>
              <ul className="space-y-2">
                {summary.keyPoints.map((point, index) => (
                  <li
                    key={index}
                    className="text-sm text-gray-700 flex items-start gap-2"
                  >
                    <Badge
                      variant="outline"
                      className="flex-shrink-0 bg-green-50 text-green-700 border-green-200"
                    >
                      {index + 1}
                    </Badge>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* 大纲 */}
            {summary.outline.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <List className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-amber-900">
                    文档大纲
                  </span>
                </div>
                <div className="space-y-1">
                  {summary.outline.map((item, index) => (
                    <div
                      key={index}
                      className="text-sm text-gray-700 hover:text-amber-900 cursor-pointer py-1 px-2 rounded hover:bg-amber-50 transition-colors"
                      style={{ paddingLeft: `${item.level * 12}px` }}
                    >
                      {item.title}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* 统计信息 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="text-2xl font-bold text-amber-900">
                  {summary.wordCount}
                </div>
                <div className="text-xs text-amber-600">字数</div>
              </div>
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="text-2xl font-bold text-amber-900">
                  {summary.readingTime}
                </div>
                <div className="text-xs text-amber-600">分钟</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

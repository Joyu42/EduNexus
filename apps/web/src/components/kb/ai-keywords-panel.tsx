/**
 * AI 关键词提取面板
 * 显示关键词云和建议标签
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Loader2, Tag, Plus } from "lucide-react";
import type { KeywordExtractionResult } from "@/lib/ai/document-analyzer";

interface AIKeywordsPanelProps {
  documentId?: string;
  documentTitle?: string;
  documentContent?: string;
  currentTags?: string[];
  onAddTags?: (tags: string[]) => void;
}

export function AIKeywordsPanel({
  documentId,
  documentTitle,
  documentContent,
  currentTags = [],
  onAddTags,
}: AIKeywordsPanelProps) {
  const [keywords, setKeywords] = useState<KeywordExtractionResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtractKeywords = async () => {
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
          action: "keywords",
          content: documentContent,
          title: documentTitle,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setKeywords(data.data);
      } else {
        setError(data.error || "提取关键词失败");
      }
    } catch (err) {
      console.error("提取关键词失败:", err);
      setError("提取关键词失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAllTags = () => {
    if (keywords && onAddTags) {
      onAddTags(keywords.suggestedTags);
    }
  };

  const handleAddTag = (tag: string) => {
    if (onAddTags) {
      onAddTags([tag]);
    }
  };

  const getImportanceColor = (importance: number) => {
    if (importance >= 0.8) return "text-red-600 bg-red-50 border-red-200";
    if (importance >= 0.6) return "text-orange-600 bg-orange-50 border-orange-200";
    if (importance >= 0.4) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-blue-600 bg-blue-50 border-blue-200";
  };

  const getImportanceSize = (importance: number) => {
    if (importance >= 0.8) return "text-lg";
    if (importance >= 0.6) return "text-base";
    return "text-sm";
  };

  if (!documentId) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6 text-center text-muted-foreground">
          <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>请先选择一个文档</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          AI 关键词提取
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!keywords && !isLoading && (
          <Button
            onClick={handleExtractKeywords}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            disabled={isLoading}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            提取关键词
          </Button>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
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

        {keywords && (
          <>
            {/* 关键词云 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-semibold text-gray-900">
                    关键词云
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExtractKeywords}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  重新提取
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                {keywords.keywords.map((kw, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className={`${getImportanceColor(kw.importance)} ${getImportanceSize(kw.importance)} font-medium cursor-default`}
                  >
                    {kw.word}
                  </Badge>
                ))}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                💡 字体大小表示重要性
              </div>
            </div>

            <Separator />

            {/* 建议标签 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-gray-900">
                    建议标签
                  </span>
                </div>
                {onAddTags && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddAllTags}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    全部添加
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {keywords.suggestedTags.map((tag, index) => {
                  const isAdded = currentTags.includes(tag);
                  return (
                    <Badge
                      key={index}
                      variant={isAdded ? "default" : "outline"}
                      className={`cursor-pointer transition-all ${
                        isAdded
                          ? "bg-green-500 hover:bg-green-600"
                          : "hover:bg-green-50 hover:border-green-300"
                      }`}
                      onClick={() => !isAdded && handleAddTag(tag)}
                    >
                      {isAdded ? "✓ " : ""}
                      {tag}
                    </Badge>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* 统计信息 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                <div className="text-2xl font-bold text-purple-900">
                  {keywords.keywords.length}
                </div>
                <div className="text-xs text-purple-600">关键词</div>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                <div className="text-2xl font-bold text-purple-900">
                  {keywords.suggestedTags.length}
                </div>
                <div className="text-xs text-purple-600">建议标签</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

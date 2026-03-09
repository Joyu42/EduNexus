"use client";

import { useMemo } from "react";
import { FileText, Calendar, Tag, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { KBDocument } from "@/lib/client/kb-storage";
import type { SearchResult } from "@/lib/client/search-index";

type SearchResultsProps = {
  results: SearchResult[];
  searchQuery: string;
  onSelectDocument: (doc: KBDocument) => void;
  selectedDocId?: string;
  sortBy?: "relevance" | "date" | "title";
};

// 高亮搜索关键词（支持多个关键词）
function highlightText(text: string, terms: string[]): React.ReactNode {
  if (terms.length === 0) return text;

  // 颜色列表（用于不同关键词）
  const colors = [
    "bg-yellow-200 text-amber-900",
    "bg-blue-200 text-blue-900",
    "bg-green-200 text-green-900",
    "bg-purple-200 text-purple-900",
    "bg-pink-200 text-pink-900",
  ];

  let result: React.ReactNode[] = [text];

  terms.forEach((term, termIndex) => {
    if (!term.trim()) return;

    const newResult: React.ReactNode[] = [];
    const colorClass = colors[termIndex % colors.length];

    result.forEach((part) => {
      if (typeof part !== "string") {
        newResult.push(part);
        return;
      }

      const regex = new RegExp(`(${term})`, "gi");
      const parts = part.split(regex);

      parts.forEach((p, i) => {
        if (p.toLowerCase() === term.toLowerCase()) {
          newResult.push(
            <mark
              key={`${termIndex}-${i}`}
              className={`${colorClass} font-medium rounded px-0.5`}
            >
              {p}
            </mark>
          );
        } else if (p) {
          newResult.push(p);
        }
      });
    });

    result = newResult;
  });

  return <>{result}</>;
}

export function SearchResults({
  results,
  searchQuery,
  onSelectDocument,
  selectedDocId,
  sortBy = "relevance",
}: SearchResultsProps) {
  // 排序结果
  const sortedResults = useMemo(() => {
    const sorted = [...results];

    switch (sortBy) {
      case "date":
        return sorted.sort(
          (a, b) =>
            b.document.updatedAt.getTime() - a.document.updatedAt.getTime()
        );
      case "title":
        return sorted.sort((a, b) =>
          a.document.title.localeCompare(b.document.title, "zh-CN")
        );
      case "relevance":
      default:
        return sorted.sort((a, b) => b.score - a.score);
    }
  }, [results, sortBy]);

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-amber-600">
        <FileText className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">未找到匹配的文档</p>
        <p className="text-sm text-amber-500 mt-2">
          尝试使用不同的关键词或调整筛选条件
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-amber-600">
          找到{" "}
          <span className="font-semibold text-amber-900">{results.length}</span>{" "}
          个结果
        </span>
      </div>

      {sortedResults.map((result) => {
        const { document: doc, highlights, matchedTerms = [] } = result;
        const isSelected = doc.id === selectedDocId;

        // 提取关键词用于高亮
        const termsToHighlight = matchedTerms.length > 0 ? matchedTerms : [searchQuery];

        return (
          <Card
            key={doc.id}
            onClick={() => onSelectDocument(doc)}
            className={`p-4 cursor-pointer transition-all hover:shadow-md ${
              isSelected
                ? "border-amber-400 bg-amber-50/50 shadow-sm"
                : "border-amber-200 hover:border-amber-300"
            }`}
          >
            {/* 标题 */}
            <div className="flex items-start gap-3 mb-2">
              <FileText className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-amber-950 mb-1 line-clamp-1">
                  {highlightText(doc.title, termsToHighlight)}
                </h3>
              </div>
              {isSelected && (
                <ArrowRight className="w-5 h-5 text-amber-600 flex-shrink-0" />
              )}
            </div>

            {/* 高亮片段 */}
            {highlights.length > 0 && (
              <div className="pl-8 mb-3 space-y-1">
                {highlights.slice(0, 2).map((highlight, index) => (
                  <p
                    key={index}
                    className="text-sm text-amber-700 line-clamp-2"
                  >
                    {highlightText(highlight, termsToHighlight)}
                  </p>
                ))}
              </div>
            )}

            {/* 元信息 */}
            <div className="flex items-center gap-4 text-xs text-amber-600 pl-8">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{doc.updatedAt.toLocaleDateString("zh-CN")}</span>
              </div>

              {doc.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <Tag className="w-3 h-3" />
                  {doc.tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs bg-blue-50 text-blue-700 border-blue-200 px-1.5 py-0"
                    >
                      {highlightText(tag, termsToHighlight)}
                    </Badge>
                  ))}
                  {doc.tags.length > 3 && (
                    <span className="text-amber-500">
                      +{doc.tags.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* 相关性得分（调试用） */}
              {sortBy === "relevance" && result.score > 0 && (
                <Badge
                  variant="outline"
                  className="text-xs bg-amber-50 text-amber-600 border-amber-200"
                >
                  {result.score.toFixed(0)}
                </Badge>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

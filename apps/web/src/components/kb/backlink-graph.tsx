"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Link2, TrendingUp, Network } from "lucide-react";
import type { KBDocument } from "@/lib/client/kb-storage";

type BacklinkGraphProps = {
  currentDocument: KBDocument | null;
  allDocuments: KBDocument[];
  onDocumentClick: (doc: KBDocument) => void;
};

export function BacklinkGraph({
  currentDocument,
  allDocuments,
  onDocumentClick,
}: BacklinkGraphProps) {
  // 提取文档中的双链
  const extractBacklinks = (content: string): string[] => {
    const regex = /\[\[([^\]]+)\]\]/g;
    const links: string[] = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      links.push(match[1]);
    }
    return links;
  };

  // 获取当前文档的出链（当前文档链接到的其他文档）
  const outgoingLinks = useMemo(() => {
    if (!currentDocument) return [];
    const links = extractBacklinks(currentDocument.content);
    return allDocuments.filter((doc) => links.includes(doc.title));
  }, [currentDocument, allDocuments]);

  // 获取当前文档的入链（其他文档链接到当前文档）
  const incomingLinks = useMemo(() => {
    if (!currentDocument) return [];
    return allDocuments.filter((doc) => {
      const links = extractBacklinks(doc.content);
      return links.includes(currentDocument.title);
    });
  }, [currentDocument, allDocuments]);

  // 获取相关文档（共享标签的文档）
  const relatedDocuments = useMemo(() => {
    if (!currentDocument) return [];
    return allDocuments
      .filter((doc) => {
        if (doc.id === currentDocument.id) return false;
        return doc.tags.some((tag) => currentDocument.tags.includes(tag));
      })
      .slice(0, 5);
  }, [currentDocument, allDocuments]);

  if (!currentDocument) {
    return (
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-amber-900 flex items-center gap-2">
            <Network className="w-4 h-4" />
            文档关系图
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mb-3 shadow-inner">
              <Link2 className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-sm text-amber-600 font-medium">选择一个文档查看关系</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-lg overflow-hidden relative">
      {/* 装饰性背景 */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-200/20 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-orange-200/20 to-transparent rounded-full blur-2xl" />

      <CardHeader className="pb-3 relative z-10">
        <CardTitle className="text-sm font-semibold text-amber-900 flex items-center gap-2">
          <Network className="w-4 h-4" />
          文档关系图
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        {/* 出链 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              链接到
            </span>
            <Badge
              variant="outline"
              className="text-xs bg-amber-100 border-amber-300 text-amber-700"
            >
              {outgoingLinks.length}
            </Badge>
          </div>
          {outgoingLinks.length > 0 ? (
            <div className="space-y-1">
              {outgoingLinks.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onDocumentClick(doc)}
                  className="w-full p-2 rounded-lg border border-amber-200 hover:border-amber-400 bg-white/80 backdrop-blur-sm hover:bg-amber-50 transition-all text-left group relative overflow-hidden"
                  style={{
                    boxShadow: "0 2px 8px rgba(251, 191, 36, 0.1)",
                  }}
                >
                  {/* 悬停效果 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-100/0 via-amber-100/50 to-amber-100/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                  <div className="flex items-center gap-2 relative z-10">
                    <FileText className="w-3 h-3 text-amber-600 flex-shrink-0" />
                    <span className="text-sm text-amber-900 truncate font-medium">
                      {doc.title}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-amber-500 italic">暂无出链</p>
          )}
        </div>

        {/* 入链 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
              <Link2 className="w-3 h-3" />
              被链接
            </span>
            <Badge
              variant="outline"
              className="text-xs bg-orange-100 border-orange-300 text-orange-700"
            >
              {incomingLinks.length}
            </Badge>
          </div>
          {incomingLinks.length > 0 ? (
            <div className="space-y-1">
              {incomingLinks.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onDocumentClick(doc)}
                  className="w-full p-2 rounded-lg border border-orange-200 hover:border-orange-400 bg-white/80 backdrop-blur-sm hover:bg-orange-50 transition-all text-left group relative overflow-hidden"
                  style={{
                    boxShadow: "0 2px 8px rgba(249, 115, 22, 0.1)",
                  }}
                >
                  {/* 悬停效果 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-100/0 via-orange-100/50 to-orange-100/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                  <div className="flex items-center gap-2 relative z-10">
                    <FileText className="w-3 h-3 text-orange-600 flex-shrink-0" />
                    <span className="text-sm text-orange-900 truncate font-medium">
                      {doc.title}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-amber-500 italic">暂无入链</p>
          )}
        </div>

        {/* 相关文档 */}
        {relatedDocuments.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                相关文档
              </span>
              <Badge
                variant="outline"
                className="text-xs bg-blue-100 border-blue-300 text-blue-700"
              >
                {relatedDocuments.length}
              </Badge>
            </div>
            <div className="space-y-1">
              {relatedDocuments.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onDocumentClick(doc)}
                  className="w-full p-2 rounded-lg border border-blue-200 hover:border-blue-400 bg-white/80 backdrop-blur-sm hover:bg-blue-50 transition-all text-left group relative overflow-hidden"
                  style={{
                    boxShadow: "0 2px 8px rgba(59, 130, 246, 0.1)",
                  }}
                >
                  {/* 悬停效果 */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-100/0 via-blue-100/50 to-blue-100/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                  <div className="flex items-center gap-2 relative z-10">
                    <FileText className="w-3 h-3 text-blue-600 flex-shrink-0" />
                    <span className="text-sm text-blue-900 truncate font-medium">
                      {doc.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1 relative z-10">
                    {doc.tags
                      .filter((tag) => currentDocument.tags.includes(tag))
                      .slice(0, 2)
                      .map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                        >
                          {tag}
                        </Badge>
                      ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 统计信息 */}
        <div className="pt-3 border-t border-amber-200">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200 shadow-sm">
              <div className="text-lg font-bold text-amber-900 drop-shadow-sm">
                {outgoingLinks.length}
              </div>
              <div className="text-xs text-amber-600 font-medium">出链</div>
            </div>
            <div className="p-2 rounded-lg bg-gradient-to-br from-orange-100 to-orange-50 border border-orange-200 shadow-sm">
              <div className="text-lg font-bold text-orange-900 drop-shadow-sm">
                {incomingLinks.length}
              </div>
              <div className="text-xs text-orange-600 font-medium">入链</div>
            </div>
            <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200 shadow-sm">
              <div className="text-lg font-bold text-blue-900 drop-shadow-sm">
                {currentDocument.tags.length}
              </div>
              <div className="text-xs text-blue-600 font-medium">标签</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default BacklinkGraph;

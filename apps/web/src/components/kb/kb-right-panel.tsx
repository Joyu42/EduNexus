"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  List,
  FileText,
} from "lucide-react";
import type { KBDocument } from "@/lib/client/kb-storage";
import { extractOutline, type OutlineItem } from "@/lib/client/document-outline";
import { AISummaryEnhanced } from "./ai-summary-enhanced";

interface KBRightPanelProps {
  document: KBDocument | null;
  draftContent?: string;
  allDocuments?: KBDocument[];
  onDocumentClick?: (doc: KBDocument) => void;
  onOutlineNavigate?: (headingId: string) => void;
}

export function KBRightPanel({ document, draftContent, allDocuments = [], onDocumentClick, onOutlineNavigate }: KBRightPanelProps) {
  const [activeTab, setActiveTab] = useState("outline");
  const [outline, setOutline] = useState<OutlineItem[]>([]);

  // 提取文档大纲
  useEffect(() => {
    const content = draftContent ?? document?.content ?? "";
    if (content) {
      const extracted = extractOutline(content);
      setOutline(extracted);
    } else {
      setOutline([]);
    }
  }, [draftContent, document?.content]);

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center text-muted-foreground text-sm">
          选择文档以查看详情
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b px-4 py-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="outline" className="text-xs">
              <List className="h-3 w-3 mr-1" />
              大纲
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs">
              <FileText className="h-3 w-3 mr-1" />
              摘要
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* 大纲 */}
          <TabsContent value="outline" className="p-4 mt-0">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm mb-3">文档大纲</h3>
              {outline.length > 0 ? (
                <OutlineTree items={outline} onOutlineNavigate={onOutlineNavigate} />
              ) : (
                <div className="text-sm text-muted-foreground">
                  暂无大纲内容
                </div>
              )}
            </div>
          </TabsContent>

          {/* AI 摘要 */}
          <TabsContent value="summary" className="p-4 mt-0 space-y-6">
            {activeTab === "summary" && (
              <AISummaryEnhanced document={document} />
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

// 大纲树组件
function OutlineTree({ items, onOutlineNavigate }: { items: OutlineItem[]; onOutlineNavigate?: (headingId: string) => void }) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <OutlineTreeItem key={item.id} item={item} onOutlineNavigate={onOutlineNavigate} />
      ))}
    </div>
  );
}

function OutlineTreeItem({ item, onOutlineNavigate }: { item: OutlineItem; onOutlineNavigate?: (headingId: string) => void }) {
  const paddingLeft = (item.level - 1) * 12;

  const handleClick = () => {
    onOutlineNavigate?.(item.id);
  };

  return (
    <div>
      <button
        className="w-full text-left text-sm py-1.5 px-2 rounded hover:bg-accent transition-colors"
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={handleClick}
      >
        <span className="text-muted-foreground mr-2">
          {item.level === 1 && '📄'}
          {item.level === 2 && '📌'}
          {item.level === 3 && '•'}
          {item.level > 3 && '◦'}
        </span>
        {item.text}
      </button>
      {item.children.length > 0 && (
        <OutlineTree items={item.children} onOutlineNavigate={onOutlineNavigate} />
      )}
    </div>
  );
}

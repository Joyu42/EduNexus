"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  List,
  Sparkles,
  Tag,
  Clock,
  FileText,
  Calendar,
  User,
  Download,
  Share2,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { KBDocument } from "@/lib/client/kb-storage";
import { getKBStorage } from "@/lib/client/kb-storage";
import { extractOutline, type OutlineItem } from "@/lib/client/document-outline";
import { AIMindMap } from "./ai-mindmap";
import { AISummary } from "./ai-summary";
import { AIChat } from "./ai-chat";

interface KBRightPanelProps {
  document: KBDocument | null;
}

export function KBRightPanel({ document }: KBRightPanelProps) {
  const [activeTab, setActiveTab] = useState("outline");
  const [outline, setOutline] = useState<OutlineItem[]>([]);

  // 提取文档大纲
  useEffect(() => {
    if (document?.content) {
      const extracted = extractOutline(document.content);
      setOutline(extracted);
    } else {
      setOutline([]);
    }
  }, [document?.content]);

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="outline" className="text-xs">
              <List className="h-3 w-3 mr-1" />
              大纲
            </TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              AI
            </TabsTrigger>
            <TabsTrigger value="properties" className="text-xs">
              <Tag className="h-3 w-3 mr-1" />
              属性
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              历史
            </TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1">
          {/* 大纲 */}
          <TabsContent value="outline" className="p-4 mt-0">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm mb-3">文档大纲</h3>
              {outline.length > 0 ? (
                <OutlineTree items={outline} />
              ) : (
                <div className="text-sm text-muted-foreground">
                  暂无大纲内容
                </div>
              )}
            </div>
          </TabsContent>

          {/* AI 功能 */}
          <TabsContent value="ai" className="p-4 mt-0 space-y-4">
            {activeTab === "ai" && (
              <>
                <div>
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI 思维导图
                  </h3>
                  <AIMindMap document={document} />
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    AI 摘要
                  </h3>
                  <AISummary document={document} />
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    AI 问答
                  </h3>
                  <AIChat document={document} />
                </div>
              </>
            )}
          </TabsContent>

          {/* 属性 */}
          <TabsContent value="properties" className="p-4 mt-0">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2 mb-2">
                  <Tag className="h-3 w-3" />
                  标签
                </label>
                <div className="flex flex-wrap gap-1">
                  {document.tags.length > 0 ? (
                    document.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">暂无标签</span>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2 mb-2">
                  <Calendar className="h-3 w-3" />
                  创建时间
                </label>
                <div className="text-sm">
                  {format(document.createdAt, "PPP HH:mm", { locale: zhCN })}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-2 mb-2">
                  <Clock className="h-3 w-3" />
                  更新时间
                </label>
                <div className="text-sm">
                  {format(document.updatedAt, "PPP HH:mm", { locale: zhCN })}
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  操作
                </label>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      if (document) {
                        const storage = getKBStorage();
                        storage.exportDocumentAsMarkdown(document);
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    导出为 Markdown
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Share2 className="h-4 w-4 mr-2" />
                    分享文档
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 历史 */}
          <TabsContent value="history" className="p-4 mt-0">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm mb-3">版本历史</h3>
              <div className="text-sm text-muted-foreground">
                版本 {document.version || 1}
              </div>
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}

// 大纲树组件
function OutlineTree({ items }: { items: OutlineItem[] }) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <OutlineTreeItem key={item.id} item={item} />
      ))}
    </div>
  );
}

function OutlineTreeItem({ item }: { item: OutlineItem }) {
  const paddingLeft = (item.level - 1) * 12;

  return (
    <div>
      <button
        className="w-full text-left text-sm py-1.5 px-2 rounded hover:bg-accent transition-colors"
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={() => {
          // 滚动到对应标题
          const heading = document.querySelector(`#${item.id}`);
          if (heading) {
            heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
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
        <OutlineTree items={item.children} />
      )}
    </div>
  );
}
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
  FileText,
  Calendar,
  Download,
  Share2,
} from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { useRouter } from "next/navigation";
import type { KBDocument } from "@/lib/client/kb-storage";
import { getKBStorage } from "@/lib/client/kb-storage";
import { extractOutline, type OutlineItem } from "@/lib/client/document-outline";
import { AIMindMapEnhanced } from "./ai-mindmap-enhanced";
import { AISummaryEnhanced } from "./ai-summary-enhanced";
import { pathStorage, type LearningPath } from "@/lib/client/path-storage";
import { getAllResources, type Resource } from "@/lib/resources/resource-storage";

interface KBRightPanelProps {
  document: KBDocument | null;
  allDocuments?: KBDocument[];
  onDocumentClick?: (doc: KBDocument) => void;
}

export function KBRightPanel({ document, allDocuments = [], onDocumentClick }: KBRightPanelProps) {
  const router = useRouter();
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
          <TabsList className="grid w-full grid-cols-3">
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
          <TabsContent value="ai" className="p-4 mt-0 space-y-6">
            {activeTab === "ai" && (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-sm">AI 思维导图</h3>
                  </div>
                  <AIMindMapEnhanced document={document} />
                </div>

                <Separator />

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-sm">AI 智能摘要</h3>
                  </div>
                  <AISummaryEnhanced document={document} />
                </div>

                <div className="pt-4 border-t">
                  <div className="text-xs text-muted-foreground text-center space-y-1">
                    <p>💡 提示：使用全局 AI 助手进行文档问答</p>
                    <p className="text-[10px]">快捷键：Cmd/Ctrl + K</p>
                  </div>
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
                  <Calendar className="h-3 w-3" />
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

  const handleClick = () => {
    // 尝试多种方式查找标题元素
    let heading: HTMLElement | null = document.getElementById(item.id);

    if (!heading) {
      // 如果通过 ID 找不到，尝试通过文本内容查找
      const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      heading = Array.from(allHeadings).find(
        h => h.textContent?.trim() === item.text.trim()
      ) as HTMLElement | null;
    }

    if (heading) {
      // 平滑滚动到标题位置，并添加偏移量避免被工具栏遮挡
      const yOffset = -100; // 偏移量
      const y = heading.getBoundingClientRect().top + window.pageYOffset + yOffset;

      window.scrollTo({ top: y, behavior: 'smooth' });

      // 添加高亮效果
      heading.classList.add('outline-highlight');
      setTimeout(() => {
        heading?.classList.remove('outline-highlight');
      }, 2000);
    }
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
        <OutlineTree items={item.children} />
      )}
    </div>
  );
}
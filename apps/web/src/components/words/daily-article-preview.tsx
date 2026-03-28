import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, BookmarkPlus, AlertCircle } from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface DailyArticlePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generatedTitle: string;
  articleContent: string | null;
  onSave: () => void;
}

export function DailyArticlePreviewDialog({
  open,
  onOpenChange,
  generatedTitle,
  articleContent,
  onSave,
}: DailyArticlePreviewDialogProps) {
  const [bilingual, setBilingual] = useState(false);

  const parsed = useMemo(() => {
    if (!articleContent) return null;
    
    // Attempt to extract Chinese and English sections
    const zhMatch = articleContent.match(/###\s*中文[^\n]*\n([\s\S]*?)(?=###\s*英文|$)/i);
    const enMatch = articleContent.match(/###\s*英文[^\n]*\n([\s\S]*?)(?=###|$)/i);
    
    if (zhMatch && enMatch) {
      const zhParagraphs = zhMatch[1].trim().split(/\n\s*\n/).filter(p => p.trim());
      const enParagraphs = enMatch[1].trim().split(/\n\s*\n/).filter(p => p.trim());
      
      return {
        isBilingual: true,
        zhParagraphs,
        enParagraphs,
        fallbackText: null,
      };
    }

    // Attempt just Chinese if we can find it
    const justZhMatch = articleContent.match(/###\s*中文[^\n]*\n([\s\S]*?)(?=###|$)/i);
    if (justZhMatch) {
        return {
            isBilingual: false,
            zhParagraphs: [justZhMatch[1].trim()],
            enParagraphs: [],
            fallbackText: "未能提取到中英对照内容，可能生成结果缺少英文部分。",
        };
    }

    // Complete fallback, we just treat the whole content as Chinese or unparseable
    return {
      isBilingual: false,
      zhParagraphs: [articleContent.trim()],
      enParagraphs: [],
      fallbackText: "未能提取到中英对照内容，可能生成结果缺少英文部分。",
    };
  }, [articleContent]);

  const renderContent = () => {
    if (!articleContent || !parsed) return null;

    if (!bilingual) {
      // If not bilingual mode, just render the chinese part, or the whole thing if we couldn't parse
      const zhContent = parsed.zhParagraphs.join("\n\n");
      return (
        <div className="prose prose-sm max-w-none">
          <MarkdownRenderer content={zhContent} />
        </div>
      );
    }

    if (bilingual && !parsed.isBilingual) {
      return (
        <div className="space-y-4">
          <Alert variant="destructive" className="bg-red-50 text-red-900 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {parsed.fallbackText}
            </AlertDescription>
          </Alert>
          <div className="prose prose-sm max-w-none">
            <MarkdownRenderer content={parsed.zhParagraphs.join("\n\n")} />
          </div>
        </div>
      );
    }

    // Paired rendering
    const maxLen = Math.max(parsed.zhParagraphs.length, parsed.enParagraphs.length);
    const pairs = [];
    for (let i = 0; i < maxLen; i++) {
      pairs.push({
        zh: parsed.zhParagraphs[i] || "",
        en: parsed.enParagraphs[i] || "",
      });
    }

    return (
      <div className="space-y-6">
        {pairs.map((pair, idx) => (
          <div key={idx} className="space-y-2 rounded-lg bg-slate-50 p-4 border border-slate-100">
            <div className="prose prose-sm max-w-none text-slate-900">
              <MarkdownRenderer content={pair.zh} />
            </div>
            {pair.en && (
              <div className="prose prose-sm max-w-none text-slate-600 mt-2 pt-2 border-t border-slate-200 border-dashed">
                <MarkdownRenderer content={pair.en} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            {generatedTitle}
          </DialogTitle>
          <div className="flex items-center space-x-2 mr-6">
            <Switch
              id="bilingual-mode"
              checked={bilingual}
              onCheckedChange={setBilingual}
            />
            <Label htmlFor="bilingual-mode" className="text-sm cursor-pointer">
              中英对照
            </Label>
          </div>
        </DialogHeader>
        <div className="py-2">
          {renderContent()}
        </div>
        <DialogFooter className="gap-2 sm:gap-0 mt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            关闭
          </Button>
          <Button
            onClick={onSave}
            disabled={!articleContent}
            className="bg-gradient-to-br from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white"
          >
            <BookmarkPlus className="h-4 w-4 mr-2" />
            保存到知识宝库
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

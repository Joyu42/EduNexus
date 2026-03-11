"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check } from "lucide-react";
import type { KBDocument } from "@/lib/client/kb-storage";

interface AISummaryProps {
  document: KBDocument;
}

export function AISummary({ document }: AISummaryProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState(false);

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/kb/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: document.content,
          title: document.title,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate summary");

      const data = await response.json();
      setSummary(data.summary);
    } catch (error) {
      console.error("Failed to generate summary:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copySummary = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!summary) {
    return (
      <div className="border rounded-lg p-4 bg-muted/30">
        <p className="text-sm text-muted-foreground mb-3">
          使用 AI 生成文档摘要，快速了解文档核心内容。
        </p>
        <Button
          onClick={generateSummary}
          disabled={isGenerating || !document.content}
          size="sm"
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              生成中...
            </>
          ) : (
            "生成摘要"
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="border rounded-lg p-4 bg-muted/30">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={copySummary}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              已复制
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              复制
            </>
          )}
        </Button>
        <Button
          onClick={generateSummary}
          disabled={isGenerating}
          variant="ghost"
          size="sm"
          className="flex-1"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              重新生成中...
            </>
          ) : (
            "重新生成"
          )}
        </Button>
      </div>
    </div>
  );
}
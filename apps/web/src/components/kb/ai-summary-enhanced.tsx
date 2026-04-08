"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Copy, Check, Maximize2, X, FileText, ArrowRight, Sparkles } from "lucide-react";
import type { KBDocument } from "@/lib/client/kb-storage";
import { getModelConfig } from "@/lib/client/model-config";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface AISummaryEnhancedProps {
  document: KBDocument;
}

export function AISummaryEnhanced({ document }: AISummaryEnhancedProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState("");
  const [copied, setCopied] = useState(false);
  const [showFloating, setShowFloating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setIsGenerating(true);
    setProgress(0);
    setError(null);

    // 模拟进度
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    try {
      const config = getModelConfig();

      const response = await fetch("/api/kb/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: document.content,
          title: document.title,
          config: {
            apiKey: config.apiKey,
            apiEndpoint: config.apiEndpoint,
            model: config.model,
            temperature: config.temperature,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate summary");
      }

      const data = await response.json();
      setSummary(data.summary);
      setProgress(100);
      clearInterval(progressInterval);
    } catch (error) {
      console.error("Failed to generate summary:", error);
      setError(error instanceof Error ? error.message : "生成摘要失败，请检查API配置");
      clearInterval(progressInterval);
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
      }, 500);
    }
  };

  const copySummary = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHandoff = () => {
    router.push(`/workspace?doc=${encodeURIComponent(document.id)}`);
  };

  if (!summary) {
    return (
      <div className="space-y-4">
        <div className="border rounded-lg p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-sm mb-1">AI 智能摘要</h4>
              <p className="text-xs text-muted-foreground">
                自动提取文档核心要点，快速了解内容概要
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {isGenerating && (
            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>正在生成摘要...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          <Button
            onClick={generateSummary}
            disabled={isGenerating || !document.content}
            size="sm"
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
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

        <Button 
          onClick={handleHandoff}
          variant="outline"
          className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-900 dark:hover:bg-blue-950/50"
          size="sm"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          去学习工作区继续提问与总结
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="border rounded-lg p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <p className="text-sm leading-relaxed line-clamp-4">{summary}</p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setShowFloating(true)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
              查看完整
            </Button>
            <Button
              onClick={copySummary}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  复制
                </>
              )}
            </Button>
          </div>
        </div>

        <Button 
          onClick={handleHandoff}
          variant="outline"
          className="w-full text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-900 dark:hover:bg-blue-950/50"
          size="sm"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          去学习工作区继续提问与总结
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      {/* 悬浮子页面 */}
      <AnimatePresence>
        {showFloating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowFloating(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/20">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI 智能摘要</h3>
                    <p className="text-xs opacity-90">{document.title}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFloating(false)}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* 内容 */}
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">{summary}</p>
                </div>
              </div>

              {/* 底部操作 */}
              <div className="flex gap-2 p-4 border-t bg-muted/30">
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
                      复制摘要
                    </>
                  )}
                </Button>
                <Button
                  onClick={generateSummary}
                  disabled={isGenerating}
                  variant="default"
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

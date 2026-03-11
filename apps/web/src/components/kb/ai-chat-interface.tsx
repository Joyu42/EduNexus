"use client";

import { Bot, Copy, Check, RotateCcw, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/markdown-renderer";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
};

type AIChatInterfaceProps = {
  messages: Message[];
  isLoading: boolean;
  onCopy: (content: string, messageId: string) => void;
  onRegenerate: (messageId: string) => void;
  onInsert?: (text: string) => void;
  onReplace?: (text: string) => void;
  copiedId: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement>;
};

export function AIChatInterface({
  messages,
  isLoading,
  onCopy,
  onRegenerate,
  onInsert,
  onReplace,
  copiedId,
  messagesEndRef,
}: AIChatInterfaceProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 flex items-center justify-center mb-6 animate-pulse">
          <Bot className="w-10 h-10 text-purple-500" />
        </div>
        <h3 className="text-lg font-semibold text-purple-900 mb-2">
          AI 写作助手已就绪
        </h3>
        <p className="text-sm text-purple-600 max-w-md mb-6">
          我可以帮你续写内容、改写文字、润色语言、生成摘要、扩展细节、解释概念等
        </p>
        <div className="flex flex-wrap gap-2 justify-center text-xs text-purple-500">
          <span className="px-3 py-1 bg-purple-50 rounded-full">✨ 智能续写</span>
          <span className="px-3 py-1 bg-purple-50 rounded-full">📝 专业改写</span>
          <span className="px-3 py-1 bg-purple-50 rounded-full">💡 深度解释</span>
          <span className="px-3 py-1 bg-purple-50 rounded-full">🌐 多语翻译</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {messages.map((message, index) => (
        <div
          key={message.id}
          className={cn(
            "flex gap-3 animate-in fade-in slide-in-from-bottom-2",
            message.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          {message.role === "assistant" && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
              <Bot className="w-5 h-5 text-white" />
            </div>
          )}

          <div
            className={cn(
              "max-w-[85%] rounded-xl transition-all",
              message.role === "user"
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md"
                : "bg-white border border-purple-200 shadow-sm hover:shadow-md"
            )}
          >
            <div className="p-4">
              {message.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-purple">
                  <MarkdownRenderer content={message.content} />
                  {message.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-1" />
                  )}
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              )}
            </div>

            {/* 操作按钮 */}
            {message.role === "assistant" && !message.isStreaming && (
              <div className="px-4 pb-3 flex items-center gap-2 border-t border-purple-100 pt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onCopy(message.content, message.id)}
                  className="h-7 text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-50"
                >
                  {copiedId === message.id ? (
                    <>
                      <Check className="w-3 h-3 mr-1" />
                      已复制
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      复制
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRegenerate(message.id)}
                  className="h-7 text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-50"
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  重新生成
                </Button>

                {onInsert && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onInsert(message.content)}
                    className="h-7 text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-50"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    插入
                  </Button>
                )}

                {onReplace && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onReplace(message.content)}
                    className="h-7 text-xs text-purple-700 hover:text-purple-900 hover:bg-purple-50"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    替换
                  </Button>
                )}
              </div>
            )}
          </div>

          {message.role === "user" && (
            <div className="w-8 h-8 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-sm font-medium text-purple-900">我</span>
            </div>
          )}
        </div>
      ))}

      {isLoading && messages[messages.length - 1]?.role === "user" && (
        <div className="flex gap-3 justify-start animate-in fade-in">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-md">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div className="bg-white border border-purple-200 rounded-xl p-4 shadow-sm">
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Send, Sparkles, Image as ImageIcon } from "lucide-react";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import { MobileHeader } from "@/components/mobile/mobile-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface MobileWorkspaceLayoutProps {
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }>;
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

/**
 * 学习工作区移动端布局
 * 优化的对话界面
 */
export function MobileWorkspaceLayout({
  messages,
  onSendMessage,
  isLoading = false,
}: MobileWorkspaceLayoutProps) {
  const [inputValue, setInputValue] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue("");
    }
  };

  if (!isMobile) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* 移动端顶部栏 */}
      <MobileHeader title="学习工作区" />

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 mobile-scroll-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-2",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            )}

            <div
              className={cn(
                "max-w-[75%] rounded-2xl p-3 shadow-sm",
                message.role === "user"
                  ? "bg-gradient-to-br from-orange-500 to-rose-500 text-white"
                  : "bg-white dark:bg-gray-800 border border-border"
              )}
            >
              <p className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </p>
              <p className="text-xs opacity-70 mt-1" suppressHydrationWarning>
                {isMounted ? message.timestamp.toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                }) : ""}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center animate-pulse">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div className="bg-white dark:bg-gray-800 border border-border rounded-2xl p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-100" />
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="border-t border-border bg-white dark:bg-gray-900 p-4 safe-area-bottom">
        <div className="flex gap-2 items-end">
          <Button
            variant="outline"
            size="icon"
            className="flex-shrink-0 h-10 w-10"
          >
            <ImageIcon className="h-5 w-5" />
          </Button>

          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入你的问题..."
            className="min-h-[40px] max-h-[120px] resize-none text-base"
            rows={1}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />

          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="flex-shrink-0 h-10 w-10 p-0 bg-gradient-to-br from-orange-500 to-rose-500"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  RotateCcw,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AIQuickActions } from "./ai-quick-actions";
import { AIChatInterface } from "./ai-chat-interface";
import { AIFloatingToolbar } from "./ai-floating-toolbar";
import { AITemplateSelector } from "./ai-template-selector";
import { cn } from "@/lib/utils";

type ViewMode = "sidebar" | "floating" | "fullscreen";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
};

type AIWritingAssistantProps = {
  documentId?: string;
  documentTitle?: string;
  documentContent?: string;
  selectedText?: string;
  selectionPosition?: { top: number; left: number };
  onInsertText?: (text: string) => void;
  onReplaceText?: (text: string) => void;
};

export function AIWritingAssistant({
  documentId,
  documentTitle,
  documentContent,
  selectedText,
  selectionPosition,
  onInsertText,
  onReplaceText,
}: AIWritingAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("sidebar");
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // 流式输出处理
  const handleStreamResponse = async (prompt: string, action?: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: prompt,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch("/api/kb/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          documentTitle,
          documentContent,
          selectedText,
          userInput: prompt,
          action,
          conversationHistory: messages.slice(-6),
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error("AI 响应失败");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("无法读取响应流");
      }

      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedContent += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? { ...msg, content: accumulatedContent }
              : msg
          )
        );
      }

      // 完成流式输出
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessage.id
            ? { ...msg, isStreaming: false }
            : msg
        )
      );
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("请求已取消");
      } else {
        console.error("AI 响应错误:", error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? {
                  ...msg,
                  content: "抱歉，AI 助手暂时无法响应。请稍后再试。",
                  isStreaming: false,
                }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  // 停止生成
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  // 发送消息
  const handleSendMessage = (messageText?: string, action?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;
    handleStreamResponse(textToSend, action);
  };

  // 复制内容
  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("复制失败:", error);
    }
  };

  // 重新生成
  const handleRegenerate = (messageId: string) => {
    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex > 0) {
      const previousUserMessage = messages[messageIndex - 1];
      if (previousUserMessage.role === "user") {
        // 移除当前消息
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
        // 重新发送
        handleStreamResponse(previousUserMessage.content);
      }
    }
  };

  // 清空对话
  const handleClearChat = () => {
    setMessages([]);
  };

  // 浮动按钮
  if (!isOpen) {
    return (
      <>
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50",
            "bg-gradient-to-r from-purple-500 to-pink-500",
            "hover:from-purple-600 hover:to-pink-600",
            "hover:scale-110 transition-all duration-200",
            "animate-in fade-in slide-in-from-bottom-4"
          )}
          size="icon"
          title="打开 AI 写作助手 (Ctrl+J)"
        >
          <Sparkles className="w-6 h-6 text-white" />
        </Button>

        {/* 选中文本时的浮动工具栏 */}
        {selectedText && selectionPosition && (
          <AIFloatingToolbar
            selectedText={selectedText}
            position={selectionPosition}
            onAction={(action, prompt) => {
              setIsOpen(true);
              setTimeout(() => handleSendMessage(prompt, action), 100);
            }}
            onClose={() => {}}
          />
        )}
      </>
    );
  }

  // 全屏模式
  if (viewMode === "fullscreen") {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        {/* 头部 */}
        <div className="h-16 border-b border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-purple-900">
                AI 写作助手
              </h2>
              {documentTitle && (
                <p className="text-xs text-purple-600">{documentTitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowTemplates(!showTemplates)}
              className="text-purple-600 hover:text-purple-900 hover:bg-purple-100"
            >
              <Settings className="w-4 h-4 mr-2" />
              模板
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearChat}
              className="text-purple-600 hover:text-purple-900 hover:bg-purple-100"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              清空
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setViewMode("sidebar")}
              className="text-purple-600 hover:text-purple-900 hover:bg-purple-100"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="text-purple-600 hover:text-purple-900 hover:bg-purple-100"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 主聊天区域 */}
          <div className="flex-1 flex flex-col">
            <AIChatInterface
              messages={messages}
              isLoading={isLoading}
              onCopy={handleCopy}
              onRegenerate={handleRegenerate}
              onInsert={onInsertText}
              onReplace={onReplaceText}
              copiedId={copiedId}
              messagesEndRef={messagesEndRef}
            />

            {/* 输入区域 */}
            <div className="border-t border-purple-200 bg-white p-6">
              <div className="max-w-4xl mx-auto">
                <AIQuickActions
                  onAction={(action, prompt) => handleSendMessage(prompt, action)}
                  selectedText={selectedText}
                  hasMessages={messages.length > 0}
                />
                <div className="flex gap-3 mt-4">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="输入你的需求，或使用上方的快捷操作..."
                    className="min-h-[80px] max-h-[200px] resize-none border-purple-200 focus:border-purple-400"
                    disabled={isLoading}
                  />
                  <div className="flex flex-col gap-2">
                    {isLoading ? (
                      <Button
                        onClick={handleStopGeneration}
                        className="h-[80px] px-6 bg-red-500 hover:bg-red-600"
                      >
                        <X className="w-5 h-5 mr-2" />
                        停止
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSendMessage()}
                        disabled={!input.trim()}
                        className="h-[80px] px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      >
                        <Send className="w-5 h-5 mr-2" />
                        发送
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 侧边栏 - 模板选择器 */}
          {showTemplates && (
            <div className="w-80 border-l border-purple-200 bg-purple-50/30 overflow-y-auto">
              <AITemplateSelector
                onSelectTemplate={(template) => {
                  handleSendMessage(template.prompt, template.action);
                  setShowTemplates(false);
                }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // 侧边栏模式
  return (
    <Card
      className={cn(
        "fixed bottom-6 right-6 shadow-2xl border-purple-200 z-50",
        "transition-all duration-300 ease-in-out",
        "animate-in fade-in slide-in-from-bottom-4",
        isMinimized ? "w-80 h-16" : "w-[480px] h-[700px]"
      )}
    >
      <CardHeader className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-purple-900">
                AI 写作助手
              </h3>
              {documentTitle && !isMinimized && (
                <p className="text-xs text-purple-600 truncate max-w-[300px]">
                  {documentTitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setViewMode("fullscreen")}
              className="h-8 w-8 text-purple-600 hover:text-purple-900 hover:bg-purple-100"
              title="全屏模式"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 text-purple-600 hover:text-purple-900 hover:bg-purple-100"
              title={isMinimized ? "展开" : "最小化"}
            >
              {isMinimized ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-purple-600 hover:text-purple-900 hover:bg-purple-100"
              title="关闭"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="p-0 flex flex-col h-[calc(700px-4.5rem)]">
          {/* 快捷操作 */}
          {messages.length === 0 && (
            <div className="p-4 border-b border-purple-100 bg-purple-50/30">
              <AIQuickActions
                onAction={(action, prompt) => handleSendMessage(prompt, action)}
                selectedText={selectedText}
                hasMessages={false}
              />
            </div>
          )}

          {/* 聊天界面 */}
          <div className="flex-1 overflow-hidden">
            <AIChatInterface
              messages={messages}
              isLoading={isLoading}
              onCopy={handleCopy}
              onRegenerate={handleRegenerate}
              onInsert={onInsertText}
              onReplace={onReplaceText}
              copiedId={copiedId}
              messagesEndRef={messagesEndRef}
            />
          </div>

          {/* 输入框 */}
          <div className="p-4 border-t border-purple-200 bg-white">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="输入你的需求... (Enter 发送，Shift+Enter 换行)"
                className="min-h-[60px] max-h-[120px] resize-none border-purple-200 focus:border-purple-400 text-sm"
                disabled={isLoading}
              />
              {isLoading ? (
                <Button
                  onClick={handleStopGeneration}
                  className="h-[60px] px-4 bg-red-500 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim()}
                  className="h-[60px] px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>
            {selectedText && (
              <div className="mt-2">
                <Badge
                  variant="outline"
                  className="text-xs bg-pink-50 text-pink-700 border-pink-200"
                >
                  已选择 {selectedText.length} 个字符
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

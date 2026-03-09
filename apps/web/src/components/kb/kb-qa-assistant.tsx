/**
 * 知识库智能问答组件
 * 集成到学习工作区，基于知识库内容回答问题
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Send,
  Loader2,
  BookOpen,
  Sparkles,
  Trash2,
} from "lucide-react";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import type { KBDocument } from "@/lib/client/kb-storage";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface KBQAAssistantProps {
  documents: KBDocument[];
}

export function KBQAAssistant({ documents }: KBQAAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "你好！我可以基于你的知识库内容回答问题。请随时提问！",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    if (documents.length === 0) {
      alert("知识库中没有文档，请先添加文档");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/kb/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: inputValue,
          documents: documents.map((doc) => ({
            id: doc.id,
            title: doc.title,
            content: doc.content,
            tags: doc.tags,
          })),
          history: messages.slice(-4).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.answer,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      console.error("问答失败:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "抱歉，处理你的问题时出现了错误。请稍后重试。",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "你好！我可以基于你的知识库内容回答问题。请随时提问！",
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <Card className="shadow-sm h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" />
            知识库问答
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <BookOpen className="w-3 h-3 mr-1" />
              {documents.length} 个文档
            </Badge>
            {messages.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClearHistory}
                className="h-6 px-2"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* 消息列表 */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className={`rounded-lg p-3 max-w-[80%] ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <div className="prose prose-sm max-w-none">
                    {message.role === "user" ? (
                      <p className="text-white m-0">{message.content}</p>
                    ) : (
                      <MarkdownRenderer content={message.content} />
                    )}
                  </div>
                  <div
                    className={`text-xs mt-2 ${
                      message.role === "user"
                        ? "text-purple-100"
                        : "text-gray-500"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>

                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm">👤</span>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">正在思考...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* 输入区域 */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200">
          <div className="flex gap-2">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="基于知识库提问..."
              className="min-h-[60px] max-h-[120px] resize-none text-sm"
              disabled={isLoading || documents.length === 0}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading || documents.length === 0}
              className="bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            💡 Shift+Enter 换行，Enter 发送
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

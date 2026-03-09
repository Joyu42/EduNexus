"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  Plus,
  Send,
  ChevronDown,
  ChevronRight,
  BookOpen,
  FileText,
  Download,
  Sparkles,
  User,
  Bot,
  Loader2,
  Copy,
  Check,
  MoreVertical,
  MessageSquare,
  Clock,
  Lightbulb,
  StickyNote,
  Link2,
  Brain,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Types
type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  thinking?: string;
  codeBlocks?: CodeBlock[];
  knowledgePoints?: string[];
  isStreaming?: boolean;
};

type CodeBlock = {
  language: string;
  code: string;
};

type Session = {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
};

type Note = {
  id: string;
  content: string;
  timestamp: Date;
  messageId?: string;
};

type Resource = {
  id: string;
  title: string;
  type: "document" | "link" | "concept";
  url?: string;
};

// Mock data
const mockSessions: Session[] = [
  {
    id: "1",
    title: "线性代数基础",
    lastMessage: "矩阵乘法的交换律...",
    timestamp: new Date(),
    messageCount: 12
  },
  {
    id: "2",
    title: "微积分导数应用",
    lastMessage: "如何求函数的极值...",
    timestamp: new Date(Date.now() - 3600000),
    messageCount: 8
  },
  {
    id: "3",
    title: "概率论基础",
    lastMessage: "贝叶斯定理的理解...",
    timestamp: new Date(Date.now() - 86400000),
    messageCount: 15
  }
];

export default function WorkspacePage() {
  // State
  const [sessions] = useState<Session[]>(mockSessions);
  const [currentSessionId, setCurrentSessionId] = useState<string>("1");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "你好！我是你的学习助手。我会用苏格拉底式提问引导你深入思考。有什么问题想探讨吗？",
      timestamp: new Date(),
      knowledgePoints: ["苏格拉底式教学法"]
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [socraticMode, setSocraticMode] = useState(true);
  const [showThinking] = useState(true);
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(new Set());
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [notes] = useState<Note[]>([]);
  const [resources] = useState<Resource[]>([
    { id: "1", title: "线性代数教程", type: "document" },
    { id: "2", title: "MIT 公开课", type: "link", url: "#" }
  ]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<"resources" | "knowledge" | "notes">("knowledge");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle send message
  const handleSend = async () => {
    if (!inputValue.trim() || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsStreaming(true);

    // Simulate streaming response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: socraticMode
          ? `很好的问题！让我们一起探索。首先，你能告诉我你对"${inputValue.slice(0, 20)}..."的初步理解吗？`
          : `关于"${inputValue.slice(0, 20)}..."，让我为你详细解答...`,
        timestamp: new Date(),
        thinking: "分析问题 → 识别关键概念 → 构建引导性问题 → 生成回复",
        knowledgePoints: ["问题分析", "概念理解"],
        isStreaming: false
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsStreaming(false);
    }, 1500);
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Copy code
  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Group sessions by time
  const groupedSessions = {
    today: sessions.filter(s => {
      const diff = Date.now() - s.timestamp.getTime();
      return diff < 86400000;
    }),
    thisWeek: sessions.filter(s => {
      const diff = Date.now() - s.timestamp.getTime();
      return diff >= 86400000 && diff < 604800000;
    }),
    older: sessions.filter(s => {
      const diff = Date.now() - s.timestamp.getTime();
      return diff >= 604800000;
    })
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-rose-50/30">
      {/* Left Sidebar - Session List */}
      <div
        className={cn(
          "border-r border-border bg-card/50 backdrop-blur-sm transition-all duration-300",
          sidebarCollapsed ? "w-0 overflow-hidden" : "w-80"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">学习工作区</h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSidebarCollapsed(true)}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索会话..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* New Session Button */}
            <Button className="w-full mt-3" onClick={() => {}}>
              <Plus className="h-4 w-4 mr-2" />
              新建会话
            </Button>
          </div>

          {/* Session List */}
          <div className="flex-1 overflow-y-auto p-2">
            {/* Today */}
            {groupedSessions.today.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground">今天</div>
                {groupedSessions.today.map(session => (
                  <button
                    key={session.id}
                    onClick={() => setCurrentSessionId(session.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg mb-1 transition-colors",
                      "hover:bg-accent/50",
                      currentSessionId === session.id
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-transparent"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">
                          {session.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-1">
                          {session.lastMessage}
                        </div>
                      </div>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {session.messageCount}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* This Week */}
            {groupedSessions.thisWeek.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground">本周</div>
                {groupedSessions.thisWeek.map(session => (
                  <button
                    key={session.id}
                    onClick={() => setCurrentSessionId(session.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg mb-1 transition-colors",
                      "hover:bg-accent/50",
                      currentSessionId === session.id
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-transparent"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">
                          {session.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-1">
                          {session.lastMessage}
                        </div>
                      </div>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {session.messageCount}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Older */}
            {groupedSessions.older.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-2 text-xs font-medium text-muted-foreground">更早</div>
                {groupedSessions.older.map(session => (
                  <button
                    key={session.id}
                    onClick={() => setCurrentSessionId(session.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-lg mb-1 transition-colors",
                      "hover:bg-accent/50",
                      currentSessionId === session.id
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-transparent"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">
                          {session.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-1">
                          {session.lastMessage}
                        </div>
                      </div>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {session.messageCount}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {sidebarCollapsed && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setSidebarCollapsed(false)}
                  className="h-8 w-8"
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>
              )}
              <div>
                <h1 className="text-lg font-semibold text-foreground">线性代数基础</h1>
                <p className="text-xs text-muted-foreground">12 条消息</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 mr-4">
                <Sparkles className="h-4 w-4 text-primary" />
                <Label htmlFor="socratic-mode" className="text-sm cursor-pointer">
                  苏格拉底模式
                </Label>
                <Switch
                  id="socratic-mode"
                  checked={socraticMode}
                  onCheckedChange={setSocraticMode}
                />
              </div>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-4",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Bot className="h-5 w-5 text-white" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-3xl",
                  message.role === "user" ? "order-first" : ""
                )}
              >
                {/* Thinking Process */}
                {message.role === "assistant" && message.thinking && showThinking && (
                  <Card className="mb-3 bg-accent/30 border-accent/50">
                    <CardHeader className="p-3">
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedThinking);
                          if (newExpanded.has(message.id)) {
                            newExpanded.delete(message.id);
                          } else {
                            newExpanded.add(message.id);
                          }
                          setExpandedThinking(newExpanded);
                        }}
                        className="flex items-center gap-2 w-full text-left"
                      >
                        <Brain className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">思考过程</span>
                        {expandedThinking.has(message.id) ? (
                          <ChevronDown className="h-4 w-4 ml-auto" />
                        ) : (
                          <ChevronRight className="h-4 w-4 ml-auto" />
                        )}
                      </button>
                    </CardHeader>
                    {expandedThinking.has(message.id) && (
                      <CardContent className="p-3 pt-0">
                        <p className="text-sm text-muted-foreground">{message.thinking}</p>
                      </CardContent>
                    )}
                  </Card>
                )}

                {/* Message Content */}
                <div
                  className={cn(
                    "rounded-2xl p-4",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border"
                  )}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>

                  {/* Knowledge Points */}
                  {message.knowledgePoints && message.knowledgePoints.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {message.knowledgePoints.map((point, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-xs bg-accent/50"
                        >
                          <Lightbulb className="h-3 w-3 mr-1" />
                          {point}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Code Blocks */}
                  {message.codeBlocks && message.codeBlocks.length > 0 && (
                    <div className="space-y-3 mt-3">
                      {message.codeBlocks.map((block, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg bg-muted/50 border border-border overflow-hidden"
                        >
                          <div className="flex items-center justify-between px-3 py-2 bg-muted/80 border-b border-border">
                            <span className="text-xs font-mono text-muted-foreground">
                              {block.language}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyCode(block.code, `${message.id}-${idx}`)}
                              className="h-6 px-2"
                            >
                              {copiedCode === `${message.id}-${idx}` ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <pre className="p-3 text-xs font-mono overflow-x-auto">
                            <code>{block.code}</code>
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-2 mt-2 px-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {message.timestamp.toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </span>
                </div>
              </div>

              {message.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Streaming Indicator */}
          {isStreaming && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">正在思考...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-card/50 backdrop-blur-sm p-4">
          <div className="max-w-4xl mx-auto">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={
                  socraticMode
                    ? "描述你的问题，我会引导你思考..."
                    : "输入你的问题..."
                }
                className="min-h-[80px] pr-12 resize-none"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!inputValue.trim() || isStreaming}
                className="absolute bottom-3 right-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>按 Enter 发送，Shift + Enter 换行</span>
              <span>{inputValue.length} 字符</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Tools */}
      <div className="w-80 border-l border-border bg-card/50 backdrop-blur-sm flex flex-col">
        {/* Tabs */}
        <div className="border-b border-border p-2">
          <div className="flex gap-1">
            <Button
              variant={rightPanelTab === "knowledge" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setRightPanelTab("knowledge")}
              className="flex-1"
            >
              <Lightbulb className="h-4 w-4 mr-1" />
              知识点
            </Button>
            <Button
              variant={rightPanelTab === "resources" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setRightPanelTab("resources")}
              className="flex-1"
            >
              <BookOpen className="h-4 w-4 mr-1" />
              资源
            </Button>
            <Button
              variant={rightPanelTab === "notes" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setRightPanelTab("notes")}
              className="flex-1"
            >
              <StickyNote className="h-4 w-4 mr-1" />
              笔记
            </Button>
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Knowledge Points Tab */}
          {rightPanelTab === "knowledge" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">提取的知识点</h3>
                <Badge variant="secondary">{messages.length}</Badge>
              </div>

              {messages
                .filter(m => m.knowledgePoints && m.knowledgePoints.length > 0)
                .map((message) => (
                  <Card key={message.id} className="p-3">
                    <div className="space-y-2">
                      {message.knowledgePoints?.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{point}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}

              {messages.filter(m => m.knowledgePoints && m.knowledgePoints.length > 0)
                .length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>暂无提取的知识点</p>
                </div>
              )}
            </div>
          )}

          {/* Resources Tab */}
          {rightPanelTab === "resources" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">相关资源</h3>
                <Button size="sm" variant="ghost">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {resources.map((resource) => (
                <Card key={resource.id} className="p-3 hover:bg-accent/50 transition-colors cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                      {resource.type === "document" && <FileText className="h-4 w-4 text-primary" />}
                      {resource.type === "link" && <Link2 className="h-4 w-4 text-primary" />}
                      {resource.type === "concept" && <Brain className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{resource.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {resource.type === "document" && "文档"}
                        {resource.type === "link" && "链接"}
                        {resource.type === "concept" && "概念"}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Notes Tab */}
          {rightPanelTab === "notes" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">我的笔记</h3>
                <Button size="sm" variant="ghost">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <StickyNote className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>暂无笔记</p>
                  <Button size="sm" variant="outline" className="mt-3">
                    创建第一条笔记
                  </Button>
                </div>
              ) : (
                notes.map((note) => (
                  <Card key={note.id} className="p-3">
                    <p className="text-sm">{note.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {note.timestamp.toLocaleString("zh-CN")}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Export Options */}
        <div className="border-t border-border p-4">
          <Button variant="outline" className="w-full" size="sm">
            <Download className="h-4 w-4 mr-2" />
            导出会话
          </Button>
        </div>
      </div>
    </div>
  );
}

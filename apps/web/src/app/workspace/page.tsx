"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  Loader2,
  Brain,
  Lightbulb,
  BookOpen,
  Target,
  MessageSquare,
  Settings,
  Image as ImageIcon,
  Paperclip,
  X,
  Download,
  Save,
  Code,
  FileText,
  Zap,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { CodeExecutor } from "@/components/workspace/code-executor";
import { LearningNotes } from "@/components/workspace/learning-notes";
import { QuizGenerator } from "@/components/workspace/quiz-generator";
import { CompactLevelDisplay } from "@/components/compact-level-display";
import { LearningPlanner } from "@/components/kb/learning-planner";
import { KBQAAssistant } from "@/components/kb/kb-qa-assistant";
import { ProgrammingLab } from "@/components/workspace/programming-lab";
import { getKBStorage } from "@/lib/client/kb-storage";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[]; // Base64 encoded images
  attachments?: { name: string; type: string; url: string }[];
  thinking?: string;
  timestamp: Date;
};

export default function WorkspacePage() {
  const storage = getKBStorage();
  const [kbDocuments, setKbDocuments] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "你好！我是你的智能学习伙伴。我可以帮你：\n\n- 🔍 搜索知识宝库和星图\n- 📝 生成个性化练习题\n- 🗺️ 规划成长地图\n- 💡 解释复杂概念\n- 🤔 通过提问引导思考\n- 🖼️ 分析图片和图表（支持多模态）\n- 💻 解释和调试代码\n\n有什么想学习或探讨的吗？",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [socraticMode, setSocraticMode] = useState(true);
  const [showThinking, setShowThinking] = useState(true);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"status" | "tools" | "notes" | "quiz" | "plan" | "kb-qa" | "lab">("status");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 加载知识库文档
  useEffect(() => {
    const loadKBDocuments = async () => {
      try {
        await storage.initialize();
        const vaultId = storage.getCurrentVaultId();
        if (vaultId) {
          const docs = await storage.getDocumentsByVault(vaultId);
          setKbDocuments(docs);
        }
      } catch (error) {
        console.error("加载知识库文档失败:", error);
      }
    };
    loadKBDocuments();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newImages: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;

      // Convert to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newImages.push(event.target.result as string);
          if (newImages.length === files.length) {
            setUploadedImages((prev) => [...prev, ...newImages]);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const exportConversation = () => {
    const content = messages
      .map((m) => `[${m.role}] ${m.content}`)
      .join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `学习对话_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
  };

  const handleSend = async () => {
    if ((!inputValue.trim() && uploadedImages.length === 0) || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue || "请分析这些图片",
      images: uploadedImages.length > 0 ? [...uploadedImages] : undefined,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setUploadedImages([]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/workspace/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputValue || "请分析这些图片",
          images: uploadedImages.length > 0 ? uploadedImages : undefined,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
            images: m.images,
          })),
          config: {
            socraticMode,
            temperature: 0.7,
            maxIterations: 5,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          thinking: data.thinking,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "抱歉，处理你的请求时出现了错误。请稍后重试。",
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

  const quickActions = [
    { icon: Brain, label: "解释概念", prompt: "请解释一下" },
    { icon: Lightbulb, label: "生成练习", prompt: "我想练习" },
    { icon: BookOpen, label: "学习路径", prompt: "我想学习" },
    { icon: Target, label: "检查理解", prompt: "测试我对...的理解" },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-rose-50/30">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="border-b bg-white/80 backdrop-blur-sm p-4 shadow-sm"
        >
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <motion.div
                className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-xl font-semibold flex items-center gap-2">
                  学习工作区
                  <Badge variant="secondary" className="text-xs">
                    <Zap className="h-3 w-3 mr-1" />
                    AI 驱动
                  </Badge>
                </h1>
                <p className="text-sm text-muted-foreground">
                  智能学习伙伴 · 随时为你答疑解惑
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <motion.div
                className="flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
              >
                <Switch
                  id="socratic"
                  checked={socraticMode}
                  onCheckedChange={setSocraticMode}
                />
                <Label htmlFor="socratic" className="text-sm cursor-pointer">
                  苏格拉底模式
                </Label>
              </motion.div>
              <motion.div
                className="flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
              >
                <Switch
                  id="thinking"
                  checked={showThinking}
                  onCheckedChange={setShowThinking}
                />
                <Label htmlFor="thinking" className="text-sm cursor-pointer">
                  显示思考
                </Label>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          <div className="max-w-4xl mx-auto space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: "easeOut"
                  }}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, delay: 0.1 }}
                      className="p-2 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 h-8 w-8 flex items-center justify-center flex-shrink-0"
                    >
                      <Sparkles className="h-4 w-4 text-white" />
                    </motion.div>
                  )}

                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className={cn(
                      "rounded-2xl p-4 max-w-[80%] shadow-sm transition-all hover:shadow-md",
                      message.role === "user"
                        ? "bg-gradient-to-br from-orange-500 to-rose-500 text-white"
                        : "bg-white border border-gray-200"
                    )}
                  >
                    {message.thinking && showThinking && (
                      <details className="mb-3 text-sm">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
                          <Brain className="h-4 w-4" />
                          思考过程
                        </summary>
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className="mt-2 p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg text-xs whitespace-pre-wrap border border-orange-100"
                        >
                          {message.thinking}
                        </motion.div>
                      </details>
                    )}
                    {message.images && message.images.length > 0 && (
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        {message.images.map((img, idx) => (
                          <motion.img
                            key={idx}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            src={img}
                            alt={`上传的图片 ${idx + 1}`}
                            className="rounded-lg border border-gray-200 max-h-48 object-cover"
                          />
                        ))}
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none">
                      <MarkdownRenderer content={message.content} />
                    </div>
                    <div className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </motion.div>

                  {message.role === "user" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, delay: 0.1 }}
                      className="p-2 rounded-full bg-gray-200 h-8 w-8 flex items-center justify-center flex-shrink-0"
                    >
                      <MessageSquare className="h-4 w-4 text-gray-600" />
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 justify-start"
              >
                <div className="p-2 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 h-8 w-8 flex items-center justify-center flex-shrink-0 animate-pulse">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">正在思考...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="border-t bg-white/80 backdrop-blur-sm p-4 shadow-lg"
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-thin">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInputValue(action.prompt)}
                      className="flex-shrink-0 hover:bg-orange-50 hover:border-orange-300 transition-colors group"
                    >
                      <Icon className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                      {action.label}
                    </Button>
                  </motion.div>
                );
              })}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: quickActions.length * 0.05 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportConversation}
                  className="flex-shrink-0 hover:bg-blue-50 hover:border-blue-300 transition-colors group"
                >
                  <Download className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  导出对话
                </Button>
              </motion.div>
            </div>

            {/* Image Preview */}
            <AnimatePresence>
              {uploadedImages.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-3 flex gap-2 flex-wrap overflow-hidden"
                >
                  {uploadedImages.map((img, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative group"
                    >
                      <img
                        src={img}
                        alt={`预览 ${idx + 1}`}
                        className="h-20 w-20 object-cover rounded-lg border-2 border-orange-300"
                      />
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </motion.button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="flex-shrink-0 hover:bg-orange-50 hover:border-orange-300"
                  title="上传图片"
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </motion.div>
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  socraticMode
                    ? "提出你的问题，我会引导你思考..."
                    : "输入你的问题..."
                }
                className="min-h-[60px] max-h-[200px] resize-none rounded-xl border-gray-300 focus:border-orange-400 focus:ring-orange-400 transition-all"
                disabled={isLoading}
              />
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  onClick={handleSend}
                  disabled={(!inputValue.trim() && uploadedImages.length === 0) || isLoading}
                  className="bg-gradient-to-br from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 shadow-md hover:shadow-lg transition-all"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-2 text-xs text-muted-foreground flex items-center gap-2"
            >
              {socraticMode ? (
                <>
                  <Lightbulb className="h-3 w-3" />
                  <span>苏格拉底模式：我会通过提问引导你思考</span>
                </>
              ) : (
                <>
                  <BookOpen className="h-3 w-3" />
                  <span>直接教学模式：我会直接解答你的问题</span>
                </>
              )}
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Right Sidebar - Info Panel */}
      <div className={cn(
        "border-l bg-white/50 backdrop-blur-sm overflow-y-auto flex flex-col",
        activeTab === "lab" ? "w-[800px]" : "w-80"
      )}>
        {/* Tabs */}
        <div className="border-b bg-white/80 p-2 flex gap-1 overflow-x-auto">
          <Button
            variant={activeTab === "status" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("status")}
            className="flex-shrink-0 text-xs"
          >
            <Settings className="h-3 w-3 mr-1" />
            状态
          </Button>
          <Button
            variant={activeTab === "tools" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("tools")}
            className="flex-shrink-0 text-xs"
          >
            <Code className="h-3 w-3 mr-1" />
            工具
          </Button>
          <Button
            variant={activeTab === "lab" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("lab")}
            className="flex-shrink-0 text-xs"
          >
            <Code className="h-3 w-3 mr-1" />
            实验室
          </Button>
          <Button
            variant={activeTab === "notes" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("notes")}
            className="flex-shrink-0 text-xs"
          >
            <FileText className="h-3 w-3 mr-1" />
            笔记
          </Button>
          <Button
            variant={activeTab === "quiz" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("quiz")}
            className="flex-shrink-0 text-xs"
          >
            <Target className="h-3 w-3 mr-1" />
            练习
          </Button>
          <Button
            variant={activeTab === "plan" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("plan")}
            className="flex-shrink-0 text-xs"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            计划
          </Button>
          <Button
            variant={activeTab === "kb-qa" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("kb-qa")}
            className="flex-shrink-0 text-xs"
          >
            <Brain className="h-3 w-3 mr-1" />
            问答
          </Button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {activeTab === "status" && (
            <>
              <CompactLevelDisplay className="mb-4" />

              <Card className="shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    助手状态
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">工作模式</span>
                    <Badge variant={socraticMode ? "default" : "secondary"}>
                      {socraticMode ? "苏格拉底" : "直接教学"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">对话轮数</span>
                    <Badge variant="outline">{messages.length}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">状态</span>
                    <Badge variant={isLoading ? "default" : "secondary"}>
                      {isLoading ? "思考中" : "就绪"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-4 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-sm">可用工具</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <div className="p-1 rounded bg-blue-100">
                      <BookOpen className="h-3 w-3 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">搜索知识宝库</div>
                      <div className="text-muted-foreground">查找相关文档</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="p-1 rounded bg-purple-100">
                      <Brain className="h-3 w-3 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium">查询知识星图</div>
                      <div className="text-muted-foreground">获取知识关系</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="p-1 rounded bg-green-100">
                      <Target className="h-3 w-3 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">生成练习</div>
                      <div className="text-muted-foreground">个性化题目</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="p-1 rounded bg-orange-100">
                      <Lightbulb className="h-3 w-3 text-orange-600" />
                    </div>
                    <div>
                      <div className="font-medium">成长地图</div>
                      <div className="text-muted-foreground">智能规划</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="p-1 rounded bg-pink-100">
                      <ImageIcon className="h-3 w-3 text-pink-600" />
                    </div>
                    <div>
                      <div className="font-medium">图片分析</div>
                      <div className="text-muted-foreground">多模态理解</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-4 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-sm">使用提示</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>• 苏格拉底模式会引导你思考</p>
                  <p>• 可以查看助手的思考过程</p>
                  <p>• 支持上传图片进行分析</p>
                  <p>• 使用快捷按钮快速开始</p>
                  <p>• Shift+Enter 换行，Enter 发送</p>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "tools" && (
            <div className="space-y-4">
              <CodeExecutor />
            </div>
          )}

          {activeTab === "lab" && (
            <div className="h-full">
              <ProgrammingLab />
            </div>
          )}

          {activeTab === "notes" && <LearningNotes />}

          {activeTab === "quiz" && <QuizGenerator />}

          {activeTab === "plan" && (
            <div className="space-y-4">
              <LearningPlanner documents={kbDocuments} />
            </div>
          )}

          {activeTab === "kb-qa" && (
            <div className="h-full">
              <KBQAAssistant documents={kbDocuments} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

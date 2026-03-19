'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  X,
  Minus,
  Send,
  Copy,
  Check,
  GripVertical,
  Trash2,
  RotateCcw,
  Settings,
  Maximize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useKeyboardShortcut } from '@/lib/hooks/use-keyboard-shortcut';
import { useDraggable } from '@/lib/hooks/use-draggable';
import { useResizable } from '@/lib/hooks/use-resizable';
import { getAIContext, type AIContext } from '@/lib/ai/context-adapter';
import { useDocument } from '@/lib/ai/document-context';
import { getModelConfig } from '@/lib/client/model-config';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * 全局 AI 悬浮助手
 */
export function GlobalAIAssistant() {
  const pathname = usePathname();
  const { currentDocument } = useDocument();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [context, setContext] = useState<AIContext>(getAIContext(pathname, currentDocument));

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 计算初始位置（右下角，留出边距）
  const getInitialPosition = () => {
    if (typeof window === 'undefined') return { x: 0, y: 0 };
    return {
      x: window.innerWidth - 380, // 减小宽度，留出更多空间
      y: window.innerHeight - 550, // 减小高度
    };
  };

  // 拖拽功能
  const { position, isDragging, handleMouseDown } = useDraggable(containerRef, {
    initialPosition: getInitialPosition(),
    storageKey: 'ai-assistant-position',
    bounds: 'window',
  });

  // 可调整大小功能（更小的默认尺寸）
  const { size, isResizing, handleResizeStart } = useResizable({
    initialSize: { width: 360, height: 500 }, // 减小默认尺寸
    minSize: { width: 300, height: 350 }, // 减小最小尺寸
    maxSize: { width: 600, height: 800 }, // 减小最大尺寸
    storageKey: 'ai-assistant-size',
  });

  // 快捷键 Cmd/Ctrl + K
  useKeyboardShortcut(
    () => {
      setIsOpen(prev => !prev);
      if (!isOpen) {
        setIsMinimized(false);
      }
    },
    { key: 'k', ctrl: true }
  );

  // 更新上下文
  useEffect(() => {
    setContext(getAIContext(pathname, currentDocument));
  }, [pathname, currentDocument]);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const modelConfig = getModelConfig();

      const response = await fetch('/api/workspace/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input.trim(),
          history: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          config: {
            systemPrompt: context.systemPrompt,
            apiKey: modelConfig.apiKey,
            apiEndpoint: modelConfig.apiEndpoint,
            modelName: modelConfig.model,
            temperature: modelConfig.temperature,
          },
        }),
      });

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response || '抱歉，我现在无法回答。',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，发生了错误。请稍后再试。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 快速操作
  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  // 复制消息
  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 清空对话
  const handleClear = () => {
    setMessages([]);
  };

  // 重新开始
  const handleReset = () => {
    setMessages([]);
    setInput('');
  };

  // 重置位置和尺寸
  const handleResetLayout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ai-assistant-position');
      localStorage.removeItem('ai-assistant-size');
      window.location.reload();
    }
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center group"
        onClick={() => setIsOpen(true)}
        title="打开 AI 助手 (Cmd/Ctrl + K)"
      >
        <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          zIndex: 30, // 降低到 30，确保不遮挡下拉框
        }}
        className={`relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden ${
          isDragging ? 'opacity-90' : ''
        } ${isResizing ? 'select-none' : ''}`}
      >
        {/* 尺寸指示器 */}
        {isResizing && (
          <div className="absolute top-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded z-50 pointer-events-none">
            {Math.round(size.width)} × {Math.round(size.height)}
          </div>
        )}
        {/* 头部 */}
        <div
          className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical className="w-4 h-4 opacity-70 flex-shrink-0" />
            <Sparkles className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">{context.title}</h3>
              {currentDocument && pathname.startsWith('/kb') && (
                <p className="text-xs opacity-90 truncate">
                  📄 {currentDocument.title}
                </p>
              )}
              {!currentDocument && pathname.startsWith('/kb') && (
                <p className="text-xs opacity-70">未选择文档</p>
              )}
              {!pathname.startsWith('/kb') && (
                <p className="text-xs opacity-80">Cmd/Ctrl + K</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">\n            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-white hover:bg-white/20 transition-colors"
              onClick={handleResetLayout}
              title="重置布局"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-white hover:bg-white/20 transition-colors"
              onClick={handleReset}
              title="重新开始"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-white hover:bg-white/20 transition-colors"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? '展开' : '最小化'}
            >
              <Minus className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-white hover:bg-white/20 transition-colors"
              onClick={() => setIsOpen(false)}
              title="关闭"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 内容区域 */}
        {!isMinimized && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="flex flex-col"
          >
            {/* 快速操作 - 紧凑型，始终显示 */}
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10">
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
                {context.quickActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-md border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-sm transition-all whitespace-nowrap flex-shrink-0"
                    title={action.label}
                  >
                    <span className="text-sm">{action.icon}</span>
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* 消息列表 */}
            <ScrollArea
              className="p-4"
              ref={scrollRef}
              style={{ height: `${size.height - 240}px` }}
            >
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-purple-500" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm max-w-xs">
                    {context.placeholder}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                          message.role === 'user'
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        {message.role === 'assistant' && (
                          <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <button
                              onClick={() => handleCopy(message.content, message.id)}
                              className="text-xs opacity-60 hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                              title="复制"
                            >
                              {copiedId === message.id ? (
                                <Check className="w-3.5 h-3.5 text-green-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 shadow-sm">
                        <div className="flex gap-1.5">
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* 输入区域 */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              {messages.length > 0 && (
                <div className="flex justify-end mb-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClear}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-7"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    清空对话
                  </Button>
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={context.placeholder}
                  className="min-h-[60px] max-h-[120px] resize-none bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:border-purple-400 dark:focus:border-purple-500 focus:ring-purple-400 dark:focus:ring-purple-500"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  size="icon"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                按 Enter 发送，Shift + Enter 换行
              </p>
            </div>
          </motion.div>
        )}

        {/* 右下角调整大小手柄 */}
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize group z-50"
          onMouseDown={handleResizeStart}
          title="拖拽调整大小"
        >
          <div className="absolute bottom-1 right-1 w-4 h-4 border-r-2 border-b-2 border-gray-400 dark:border-gray-600 group-hover:border-purple-500 dark:group-hover:border-purple-400 transition-colors" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

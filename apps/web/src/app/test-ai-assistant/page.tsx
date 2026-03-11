'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function AIAssistantTestPage() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold mb-4">全局 AI 助手测试页面</h1>
          <p className="text-gray-600 dark:text-gray-400">
            按 <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border">Cmd/Ctrl + K</kbd> 打开 AI 助手
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">功能测试</h2>
            <div className="space-y-2">
              <Button onClick={() => addLog('点击了测试按钮')} className="w-full">
                测试按钮
              </Button>
              <Button onClick={() => addLog('触发了操作')} variant="outline" className="w-full">
                另一个操作
              </Button>
            </div>
          </div>

          <div className="p-6 border rounded-lg">
            <h2 className="text-xl font-semibold mb-4">快捷键说明</h2>
            <ul className="space-y-2 text-sm">
              <li>• <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Cmd/Ctrl + K</kbd> - 打开/关闭助手</li>
              <li>• <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Enter</kbd> - 发送消息</li>
              <li>• <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">Shift + Enter</kbd> - 换行</li>
              <li>• 拖拽头部 - 移动位置</li>
            </ul>
          </div>
        </div>

        <div className="p-6 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4">操作日志</h2>
          <div className="bg-gray-50 dark:bg-gray-900 rounded p-4 h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500 text-sm">暂无日志</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono text-gray-700 dark:text-gray-300">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={() => setLogs([])}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            清空日志
          </Button>
        </div>

        <div className="p-6 border rounded-lg bg-blue-50 dark:bg-blue-950">
          <h2 className="text-xl font-semibold mb-4">使用提示</h2>
          <ul className="space-y-2 text-sm">
            <li>✅ AI 助手会根据当前页面自动调整功能</li>
            <li>✅ 在知识库页面提供写作辅助</li>
            <li>✅ 在工作区页面提供学习辅助</li>
            <li>✅ 在练习页面提供答题辅助</li>
            <li>✅ 位置会自动保存到本地</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

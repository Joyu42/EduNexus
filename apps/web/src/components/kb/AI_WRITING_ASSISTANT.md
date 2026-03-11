# AI 写作助手 - 使用文档

## 概述

全新设计的 AI 写作助手，提供现代化、美观、易用的 UI 和交互体验。参考了 Notion AI、Grammarly 和飞书 AI 的设计理念。

## 核心特性

### 1. 多种视图模式

- **侧边栏模式**：默认模式，固定在右下角，不干扰主界面
- **全屏模式**：提供更大的工作空间，适合长时间使用
- **浮动工具栏**：选中文本时自动出现，快速执行操作

### 2. 流式输出

- 实时显示 AI 生成的内容，打字机效果
- 支持中途停止生成
- 优雅的加载动画

### 3. 快速操作

提供 10+ 种常用操作：

**写作辅助**：
- ✨ 续写 - 根据上下文继续写作
- 📝 改写 - 用不同方式表达
- 💡 润色 - 提升文字质量
- ✅ 修正 - 语法和拼写检查

**内容生成**：
- 📊 总结 - 提取核心要点
- 🔍 扩展 - 增加细节和例子
- 📋 大纲 - 生成结构化大纲
- 💭 头脑风暴 - 生成创意想法

**理解辅助**：
- ❓ 解释 - 通俗易懂的解释
- 🌐 翻译 - 多语言翻译

### 4. 写作模板

内置 12+ 种专业模板：

**写作辅助**：
- 会议纪要
- 邮件草稿
- 报告模板
- 学习笔记

**内容生成**：
- 文章大纲
- 博客文章
- 教程指南
- 案例分析

**学习辅助**：
- 概念解释
- 对比分析
- 问答生成
- 要点总结

### 5. 智能交互

- 对话式交互，支持多轮对话
- 一键复制、重新生成、插入、替换
- 自动保存对话历史
- 支持 Markdown 渲染

## 使用方法

### 基本使用

1. **打开助手**：
   - 点击右下角浮动按钮
   - 使用快捷键 `Ctrl/Cmd + J`

2. **快速操作**：
   - 点击快速操作按钮
   - 或直接输入需求

3. **选中文本操作**：
   - 选中编辑器中的文本
   - 浮动工具栏自动出现
   - 点击相应操作

### 高级功能

1. **全屏模式**：
   - 点击头部的全屏按钮
   - 获得更大的工作空间

2. **使用模板**：
   - 全屏模式下点击"模板"按钮
   - 浏览并选择合适的模板
   - 根据提示调整内容

3. **管理对话**：
   - 复制：复制 AI 回复内容
   - 重新生成：重新生成当前回复
   - 插入：插入到文档光标位置
   - 替换：替换选中的文本

4. **停止生成**：
   - 生成过程中点击"停止"按钮
   - 已生成的内容会保留

## 快捷键

- `Ctrl/Cmd + J` - 打开/关闭助手
- `Enter` - 发送消息
- `Shift + Enter` - 换行
- `Esc` - 关闭助手

## 集成方式

### 在知识库页面中使用

```tsx
import { AIWritingAssistant } from "@/components/kb/ai-writing-assistant";

function KBPage() {
  const [selectedText, setSelectedText] = useState("");
  const [selectionPosition, setSelectionPosition] = useState({ top: 0, left: 0 });

  const handleInsertText = (text: string) => {
    // 插入文本到编辑器
  };

  const handleReplaceText = (text: string) => {
    // 替换选中的文本
  };

  return (
    <>
      {/* 你的页面内容 */}

      <AIWritingAssistant
        documentId={currentDoc?.id}
        documentTitle={currentDoc?.title}
        documentContent={currentDoc?.content}
        selectedText={selectedText}
        selectionPosition={selectionPosition}
        onInsertText={handleInsertText}
        onReplaceText={handleReplaceText}
      />
    </>
  );
}
```

### 处理文本选择

```tsx
const handleTextSelection = () => {
  const selection = window.getSelection();
  const text = selection?.toString() || "";

  if (text) {
    const range = selection?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();

    setSelectedText(text);
    setSelectionPosition({
      top: rect?.top || 0,
      left: rect?.left || 0,
    });
  } else {
    setSelectedText("");
  }
};

// 监听文本选择
useEffect(() => {
  document.addEventListener("mouseup", handleTextSelection);
  return () => document.removeEventListener("mouseup", handleTextSelection);
}, []);
```

## API 端点

### POST /api/kb/ai/stream

流式 AI 响应端点。

**请求体**：
```json
{
  "documentId": "string",
  "documentTitle": "string",
  "documentContent": "string",
  "selectedText": "string",
  "userInput": "string",
  "action": "string",
  "conversationHistory": [
    {
      "role": "user" | "assistant",
      "content": "string"
    }
  ]
}
```

**响应**：
- Content-Type: `text/plain; charset=utf-8`
- Transfer-Encoding: `chunked`
- 流式返回生成的文本

## 性能优化

1. **防抖输入**：输入框使用防抖，减少不必要的渲染
2. **虚拟滚动**：长对话列表使用虚拟滚动
3. **懒加载**：模板选择器按需加载
4. **缓存结果**：相同请求缓存结果
5. **取消请求**：切换对话时取消未完成的请求

## 样式定制

所有组件使用 Tailwind CSS，可以通过修改类名来定制样式：

```tsx
// 修改主题色
className="bg-gradient-to-r from-purple-500 to-pink-500"

// 修改圆角
className="rounded-xl"

// 修改阴影
className="shadow-2xl"
```

## 注意事项

1. 确保 AI 配置正确（`AI_CONFIG`）
2. 流式输出需要服务器支持
3. 浮动工具栏需要正确的选择位置
4. 长文本可能需要较长的生成时间

## 故障排除

### 问题：AI 无响应

**解决方案**：
1. 检查 AI 配置是否正确
2. 查看浏览器控制台错误
3. 确认 API 端点可访问
4. 检查网络连接

### 问题：流式输出不工作

**解决方案**：
1. 确认服务器支持流式响应
2. 检查 Content-Type 头
3. 查看浏览器兼容性
4. 降级到非流式模式

### 问题：浮动工具栏位置不正确

**解决方案**：
1. 检查选择位置计算
2. 考虑滚动偏移
3. 调整工具栏位置算法
4. 添加边界检测

## 更新日志

### v1.0.0 (2026-03-11)

- ✨ 全新设计的 UI 界面
- 🚀 支持流式输出
- 📱 多种视图模式
- 🎨 10+ 快速操作
- 📝 12+ 写作模板
- ⌨️ 快捷键支持
- 🎯 浮动工具栏
- 💬 对话式交互
- 🔄 一键操作（复制、重新生成、插入、替换）
- 🎭 优雅的动画效果

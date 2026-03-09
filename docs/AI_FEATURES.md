# AI 智能功能实现说明

## 功能概述

为 EduNexus 知识宝库和学习工作区添加了以下 AI 智能功能：

### 1. 自动总结文档
- **位置**: 知识库右侧面板 → "摘要" 标签页
- **功能**:
  - 生成 200-300 字的文档摘要
  - 提取 3-5 个关键要点
  - 生成文档大纲
  - 显示字数和阅读时间统计
  - 支持复制和导出摘要

### 2. 自动提取关键词
- **位置**: 知识库右侧面板 → "关键词" 标签页
- **功能**:
  - 从文档内容提取 5-10 个关键词
  - 按重要性排序（字体大小表示重要性）
  - 生成建议标签
  - 一键添加标签到文档
  - 关键词云可视化展示

### 3. 自动生成思维导图
- **位置**: 知识库右侧面板 → "导图" 标签页
- **功能**:
  - 分析文档结构生成思维导图
  - 使用 React Flow 渲染交互式导图
  - 支持缩放、拖拽等操作
  - 支持全屏查看
  - 支持导出（开发中）

### 4. 自动生成学习计划
- **位置**: 学习工作区右侧面板 → "计划" 标签页
- **功能**:
  - 基于知识库内容生成学习计划
  - 分析知识点覆盖度
  - 推荐学习顺序
  - 估算学习时间
  - 生成每日/每周学习任务
  - 支持导出学习计划

### 5. 智能问答
- **位置**: 学习工作区右侧面板 → "问答" 标签页
- **功能**:
  - 基于知识库内容回答问题
  - 引用相关文档片段
  - 支持追问和深入讨论
  - 保留对话历史
  - 实时显示知识库文档数量

## 技术实现

### 核心服务

1. **文档分析服务** (`apps/web/src/lib/ai/document-analyzer.ts`)
   - `generateDocumentSummary()` - 生成文档摘要
   - `extractKeywords()` - 提取关键词
   - `generateMindMap()` - 生成思维导图数据

2. **学习计划服务** (`apps/web/src/lib/ai/learning-planner.ts`)
   - `generateLearningPlan()` - 生成学习计划
   - `analyzeKnowledgeCoverage()` - 分析知识覆盖度
   - `recommendLearningOrder()` - 推荐学习顺序

### API 路由

1. **文档分析 API** (`apps/web/src/app/api/kb/analyze/route.ts`)
   - POST `/api/kb/analyze`
   - 支持 `summary`、`keywords`、`mindmap` 三种操作

2. **学习计划 API** (`apps/web/src/app/api/kb/learning-plan/route.ts`)
   - POST `/api/kb/learning-plan`
   - 支持 `generate`、`coverage`、`order` 三种操作

3. **智能问答 API** (`apps/web/src/app/api/kb/qa/route.ts`)
   - POST `/api/kb/qa`
   - 基于知识库内容回答问题

### 前端组件

1. **AI 摘要面板** (`apps/web/src/components/kb/ai-summary-panel.tsx`)
2. **AI 关键词面板** (`apps/web/src/components/kb/ai-keywords-panel.tsx`)
3. **思维导图查看器** (`apps/web/src/components/kb/mindmap-viewer.tsx`)
4. **学习计划生成器** (`apps/web/src/components/kb/learning-planner.tsx`)
5. **知识库问答助手** (`apps/web/src/components/kb/kb-qa-assistant.tsx`)

## 使用方法

### 在知识库中使用

1. 打开知识库页面
2. 选择一个文档
3. 在右侧面板切换到对应的 AI 功能标签页：
   - "摘要" - 生成文档摘要
   - "关键词" - 提取关键词和标签
   - "导图" - 生成思维导图
4. 点击"生成"按钮即可使用

### 在学习工作区中使用

1. 打开学习工作区页面
2. 在右侧面板切换到对应的标签页：
   - "计划" - 生成学习计划
   - "问答" - 基于知识库问答
3. 按照提示操作即可

## 配置要求

确保环境变量中配置了 ModelScope API：

```env
MODELSCOPE_API_KEY=your_api_key
MODELSCOPE_BASE_URL=https://api-inference.modelscope.cn/v1
MODELSCOPE_CHAT_MODEL=Qwen/Qwen3.5-122B-A10B
```

## 特性

- ✅ 使用 ModelScope API 调用 AI 模型
- ✅ 完整的加载状态和错误处理
- ✅ 结果可编辑和保存
- ✅ UI 直观易用
- ✅ 支持导出功能
- ✅ 响应式设计
- ✅ 与现有功能无缝集成

## 后续优化建议

1. 添加缓存机制，避免重复生成
2. 支持批量处理多个文档
3. 添加更多导出格式（PDF、图片等）
4. 优化思维导图布局算法
5. 添加学习进度跟踪
6. 支持自定义 AI 模型参数

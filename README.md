# EduNexus - 智能教育学习平台

<div align="center">

**新一代 AI 驱动的个性化学习系统**

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## 📖 项目简介

EduNexus 是一个基于 AI 技术的智能教育学习平台，致力于通过知识图谱、个性化学习路径和智能助手，为学习者提供高效、系统化的学习体验。平台融合了现代 Web 技术与先进的 AI 算法，打造了一个完整的学习生态系统。

## 🎯 设计背景与开发意义

### 背景
在信息爆炸的时代，学习者面临着：
- **知识碎片化**：信息分散，难以建立系统性认知
- **学习路径不清晰**：不知道从何学起，如何进阶
- **缺乏个性化指导**：传统教育难以满足个体差异化需求
- **学习效率低下**：缺少科学的学习方法和工具支持

### 意义
EduNexus 通过技术创新解决这些痛点：
1. **知识体系化**：通过知识图谱将碎片化知识连接成网络
2. **路径可视化**：AI 生成个性化学习路径，清晰展示学习进程
3. **智能化辅导**：24/7 AI 助手提供即时答疑和学习建议
4. **数据驱动**：基于学习数据分析，持续优化学习策略


## ✨ 核心功能

### 1. 📚 知识宝库
- **Markdown 编辑器**：支持实时预览、语法高亮、快捷键操作
- **文档大纲**：自动提取标题结构，快速导航
- **双向链接**：建立文档间的关联，构建知识网络
- **标签系统**：多维度组织和检索知识
- **AI 功能**：智能摘要生成、思维导图自动构建、文档问答

### 2. 🗺️ 知识星图（核心功能）

**可视化展示**
- 基于 Force-directed 布局算法的交互式图谱
- 参考 Obsidian 设计理念，节点间距合理、分组清晰
- 支持多种布局：力导向、层次布局、径向布局、时间轴

**节点类型**
- **概念节点（concept）**：知识库中的文档和笔记
- **主题节点（topic）**：学习路径
- **技能节点（skill）**：学习任务
- **资源节点（resource）**：学习资料

**节点状态**
- **未学习（unlearned）**：灰色节点
- **学习中（learning）**：黄色节点
- **已掌握（mastered）**：绿色节点
- **待复习（review）**：橙色节点

**交互功能**
- 缩放、拖拽、搜索、筛选
- 点击节点查看详情
- 显示连接关系和依赖
- 学习路径高亮追踪

**数据同步**
- 知识库文档自动同步到图谱
- 学习路径进度实时反映
- Vault 本地知识库整合

### 3. 🛤️ 学习路径
- **可视化编辑**：拖拽式路径设计，支持任务、里程碑管理
- **AI 生成**：基于目标自动生成学习路径
- **进度追踪**：实时统计学习进度和完成情况
- **任务管理**：支持任务依赖、预估时间、资源关联
- **客户端-服务端同步**：学习路径自动同步到服务端图谱

### 4. 🎯 目标管理
- **SMART 目标**：结构化目标设定和追踪
- **进度可视化**：多维度展示目标完成情况
- **AI 建议**：智能分析目标可行性，提供优化建议

### 5. 🤖 AI 学习助手
- **全局助手**：随时随地提供学习支持
- **上下文感知**：理解当前学习内容，提供针对性建议
- **多模态交互**：支持文本、代码、图表等多种形式
- **知识图谱集成**：可查询图谱节点关系
- **学习进度访问**：可查看学习路径完成情况

## 🏗️ 技术架构

### 核心技术栈

**前端框架**
- Next.js 16.1 - React 全栈框架，支持 SSR/SSG、Turbopack 构建
- React 19 - 最新 UI 组件库
- TypeScript 5.9 - 类型安全
- Turbopack - 快速构建工具

**UI 与样式**
- Tailwind CSS 3.4 - 原子化 CSS
- Shadcn/ui - 高质量组件库
- Framer Motion 12.0 - 流畅动画
- Lucide Icons - 图标库

**数据可视化**
- React Force Graph 2D - 力导向图谱
- React Flow 11.11 - 流程图可视化
- Recharts 2.15 - 数据图表
- Canvas 渲染优化

**编辑器**
- TipTap 2.10 - 富文本编辑器
- Monaco Editor - 代码编辑器

**数据存储**
- IndexedDB - 客户端结构化存储
- LocalStorage - 配置存储
- 服务端 JSON 文件存储

**AI 集成**
- ModelScope API - Qwen 模型
- LangChain - AI 应用框架
- Vercel AI SDK - 流式响应


## 📂 项目结构

```
EduNexus/
├── apps/
│   └── web/                              # Next.js 主应用
│       ├── public/                       # 静态资源
│       │   ├── sw.js                     # Service Worker (PWA)
│       │   └── manifest.json             # PWA 配置
│       ├── src/
│       │   ├── app/                      # App Router 页面
│       │   │   ├── api/                 # API 路由
│       │   │   │   ├── goals/           # 目标 API
│       │   │   │   ├── graph/           # 图谱 API
│       │   │   │   │   └── view/       # 图谱视图接口
│       │   │   │   ├── kb/              # 知识库 API
│       │   │   │   ├── path/            # 路径 API
│       │   │   │   │   ├── sync/       # 路径同步接口
│       │   │   │   └── workspace/       # 工作区 API
│       │   │   ├── graph/               # 知识星图页面
│       │   │   │   ├── page.tsx         # 入口
│       │   │   │   └── enhanced-page.tsx # 主页面组件
│       │   │   ├── kb/                  # 知识库页面
│       │   │   ├── learning-paths/      # 学习路径
│       │   │   ├── path/                # 路径编辑器
│       │   │   ├── workspace/           # AI 学习工作区
│       │   │   └── ...
│       │   ├── components/              # React 组件
│       │   │   ├── ui/                # 基础 UI 组件
│       │   │   ├── graph/             # 图谱组件
│       │   │   │   ├── interactive-graph.tsx  # 力导向图谱
│       │   │   │   ├── node-detail-panel.tsx  # 节点详情
│       │   │   │   └── learning-path-overlay.tsx # 路径覆盖层
│       │   │   ├── kb/               # 知识库组件
│       │   │   ├── sync/             # 同步组件
│       │   │   │   └── kg-sync-bootstrap.tsx # 图谱同步引导
│       │   │   └── workspace/        # 工作区组件
│       │   └── lib/                  # 工具库
│       │       ├── agent/            # AI Agent
│       │       │   ├── tools-real.ts  # 工具实现
│       │       │   └── learning-agent.ts # 学习代理
│       │       ├── client/          # 客户端存储
│       │       │   └── path-storage.ts # 路径存储
│       │       ├── graph/           # 图谱算法
│       │       │   ├── layout-algorithms.ts
│       │       │   ├── recommendation-engine.ts
│       │       │   └── types.ts
│       │       ├── pwa/             # PWA 功能
│       │       ├── server/          # 服务端逻辑
│       │       │   ├── graph-service.ts    # 图谱服务
│       │       │   ├── kb-lite.ts         # 知识库
│       │       │   └── store.ts           # 数据存储
│       │       └── workspace/       # 工作区工具
│       └── ...
├── vault/                          # 本地知识库
│   ├── notes/                     # 笔记
│   ├── sources/                   # 资料
│   ├── skills/                   # 技能
│   └── daily/                    # 日记
├── .edunexus/                    # 应用数据
│   └── data/db.json              # 数据库
└── README.md
```

## 🔧 核心模块实现

### 知识星图服务

```typescript
// apps/web/src/lib/server/graph-service.ts
export async function getGraphView(input: { domain?: string; owner?: string }) {
  // 1. 从 Vault 构建基础图谱
  const graph = await buildGraphFromVault();

  // 2. 获取数据库中的学习路径
  const db = await loadDb();

  // 3. 合并节点：基础节点 + 路径节点 + 任务节点
  const mergedNodes = [...baseNodes, ...pathNodes, ...taskNodes];

  // 4. 合并边：基础边 + 路径边 + 依赖边
  const mergedEdges = [...baseEdges, ...pathEdges];

  // 5. 去重和过滤
  return { nodes, edges };
}
```

### 力导向图谱组件

```typescript
// apps/web/src/components/graph/interactive-graph.tsx
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

// 力导向参数优化
fg.d3Force('charge')?.strength(-400).distanceMax(600);
fg.d3Force('link')?.distance(120).strength(0.4);
fg.d3Force('center')?.strength(0.05);

// 模拟参数
cooldownTicks={200}
warmupTicks={50}
d3AlphaDecay={0.03}
d3VelocityDecay={0.35}
```

### AI 工具系统

```typescript
// 可用工具
- search_knowledge_base: 搜索知识库
- query_knowledge_graph: 查询图谱关系
- query_learning_progress: 查询学习进度
- generate_exercise: 生成练习题
- recommend_learning_path: 推荐学习路径
- explain_concept: 解释概念
- socratic_question: 苏格拉底提问
- check_understanding: 检查理解
```

## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装

```bash
# 克隆项目
git clone https://github.com/kabishou11/EduNexus.git
cd EduNexus

# 安装依赖
pnpm install
```

### 开发

```bash
# 启动开发服务器
pnpm dev

# 访问 http://localhost:3000
```

### 测试

```bash
# 运行测试
pnpm test

# 运行烟雾测试
pnpm test:smoke

# 类型检查
pnpm typecheck
```

### 构建

```bash
# 生产构建
pnpm build

# 启动生产服务器
pnpm start
```


## 🌟 创新亮点

### 1. 算法创新

**知识图谱构建**
- 基于文档链接自动构建图谱
- 学习路径与知识库节点整合
- 拓扑排序确定学习顺序

**力导向布局优化**
- 参考 Obsidian 设计，节点分布均匀
- 中心引力防止分组远离
- 平滑衰减实现流畅动画

### 2. 架构创新

**渐进式数据持久化**
- IndexedDB 优先，LocalStorage 降级
- 服务端图谱与客户端同步

**PWA 支持**
- Service Worker 缓存策略
- 离线学习能力

### 3. AI 集成

**Agent 工具系统**
- 知识库搜索
- 图谱查询
- 学习进度追踪
- 练习生成
- 路径推荐


## 🔐 安全最佳实践

### API 安全
- 环境变量管理敏感密钥
- 请求限流防护
- 严格输入验证

### 数据安全
- 本地数据优先
- 服务端数据隔离


## 🙏 致谢

感谢以下开源项目：
- [Next.js](https://nextjs.org/) - React 框架
- [Shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [TipTap](https://tiptap.dev/) - 编辑器
- [React Flow](https://reactflow.dev/) - 流程图库
- [React Force Graph](https://github.com/vasturiano/react-force-graph) - 力导向图
- [ModelScope](https://modelscope.cn/) - AI 模型服务

---

<div align="center">

**用 AI 重新定义学习**

Made with ❤️ by EduNexus Team

</div>

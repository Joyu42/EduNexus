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

### 2. 🗺️ 知识图谱
- **可视化展示**：Force-directed 布局算法，直观展示知识关联
- **多维度节点**：文档、学习路径、资源、标签等多类型节点
- **交互探索**：缩放、拖拽、搜索、筛选
- **关系分析**：自动识别知识点之间的依赖和关联关系

### 3. 🛤️ 学习路径
- **可视化编辑**：拖拽式路径设计，支持任务、里程碑管理
- **AI 生成**：基于目标自动生成学习路径
- **进度追踪**：实时统计学习进度和完成情况
- **任务管理**：支持任务依赖、预估时间、资源关联

### 4. 🎯 目标管理
- **SMART 目标**：结构化目标设定和追踪
- **进度可视化**：多维度展示目标完成情况
- **AI 建议**：智能分析目标可行性，提供优化建议

### 5. 🤖 AI 学习助手
- **全局助手**：随时随地提供学习支持
- **上下文感知**：理解当前学习内容，提供针对性建议
- **多模态交互**：支持文本、代码、图表等多种形式

## 🏗️ 技术架构

### 核心技术栈

**前端框架**
- Next.js 16.1 - React 全栈框架，支持 SSR/SSG
- React 19 - 最新 UI 组件库
- TypeScript 5.9 - 类型安全

**UI 与样式**
- Tailwind CSS 3.4 - 原子化 CSS
- Shadcn/ui - 高质量组件库
- Framer Motion 12.0 - 流畅动画

**数据可视化**
- React Flow 11.11 - 流程图可视化
- Force Graph 1.44 - 力导向图
- Recharts 2.15 - 数据图表

**编辑器**
- TipTap 2.10 - 富文本编辑器
- Monaco Editor - 代码编辑器

**数据存储**
- IndexedDB - 客户端结构化存储
- LocalStorage - 配置存储
- idb - IndexedDB 封装

**AI 集成**
- modelscople API - qwen 模型
- LangChain - AI 应用框架
- Vercel AI SDK - 流式响应


## 🚀 创新亮点

### 1. 算法创新

**知识图谱构建**
- 基于 TF-IDF 和余弦相似度的自动关联识别
- K-means 标签聚类，发现隐藏知识主题
- PageRank 算法计算节点重要性

**学习路径推荐**
- 拓扑排序确定知识点学习顺序
- 协同过滤算法评估难度
- 混合推荐系统实现个性化

**进度预测**
- 基于历史数据的线性回归时间估算
- LSTM 神经网络预测学习曲线

### 2. 架构创新

**渐进式数据持久化**
```typescript
// 自动降级：IndexedDB → LocalStorage
class StorageManager {
  async save(data) {
    try {
      await indexedDB.save(data);
    } catch {
      localStorage.save(data); // 自动降级
    }
  }
}
```

**响应式知识图谱**
- Web Workers 图谱计算，避免阻塞主线程
- Canvas 渲染优化，支持 1000+ 节点流畅交互
- 虚拟滚动处理大规模数据

### 3. 用户体验创新
- 零配置启动，自动创建示例数据
- PWA 支持，离线也能学习
- Vim 风格快捷键系统
- 完整的移动端适配

## 🌟 未来规划

### 短期目标（3-6个月）

**AI 能力增强**
- 多模态学习：视频、音频内容 AI 分析
- 智能笔记：AI 自动整理优化笔记
- 语音交互：语音输入和 TTS 输出
- 实时翻译：多语言学习支持

**协作功能**
- 学习小组：多人协作学习空间
- 知识共享：公开/私有知识库
- 实时协作：多人同时编辑
- 评论系统：文档批注和讨论

**数据分析**
- 学习报告：周报、月报自动生成
- 效率分析：识别学习瓶颈
- 对比分析：与同类学习者对比
- 预测模型：学习成果预测

### 中期目标（6-12个月）

**教育生态**
- 教师端：课程管理、作业批改、学情分析
- 机构版：多租户支持，权限管理
- 课程市场：优质学习路径交易平台
- 认证系统：学习成果认证和证书

**AI 技术升级**
- 本地模型：支持私有化部署的本地 LLM
- 知识蒸馏：个性化微调模型
- 强化学习：基于反馈优化推荐
- 多智能体：AI 教师、AI 同学协同

**平台扩展**
- 移动 App：iOS/Android 原生应用
- 浏览器插件：网页内容一键收藏
- API 开放：第三方集成接口
- Webhook：自动化工作流

### 长期愿景（1-3年）

**AI 教育革命**
- 自适应学习系统：完全个性化的学习体验
- 虚拟导师：具有教学能力的 AI Agent
- 元学习能力：教会学习者如何学习
- 认知科学融合：基于脑科学的学习优化

**教育公平**
- 核心功能永久免费
- 多语言支持，覆盖全球
- 无障碍设计，服务特殊需求群体
- 低带宽优化，服务偏远地区

**生态建设**
- 开发者社区：插件市场、主题商店
- 学术合作：与高校、研究机构合作
- 企业培训：B2B 企业学习解决方案
- 终身学习：覆盖全年龄段的学习平台


## 🚀 快速开始

### 环境要求
- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装

```bash
# 克隆项目
git clone https://github.com/yourusername/EduNexus.git
cd EduNexus

# 安装依赖
pnpm install


### 开发

```bash
# 启动开发服务器
pnpm dev

# 访问 http://localhost:3000
```

### 构建

```bash
# 生产构建
pnpm build

# 启动生产服务器
pnpm start
```

## 📁 项目结构

```
EduNexus/
├── apps/
│   └── web/                    # Next.js 主应用
│       ├── src/
│       │   ├── app/           # 页面路由
│       │   │   ├── kb/        # 知识库
│       │   │   ├── path/      # 学习路径
│       │   │   ├── goals/     # 目标管理
│       │   │   ├── workspace/ # 学习工作区
│       │   │   └── graph/     # 知识图谱
│       │   ├── components/    # React 组件
│       │   ├── lib/           # 工具库
│       │   └── styles/        # 样式文件
│       └── public/            # 静态资源
└── README.md                  # 项目文档
```

### 开发规范
- 遵循 TypeScript 严格模式
- 使用 ESLint 和 Prettier
- 编写清晰的提交信息


## 🙏 致谢

感谢以下开源项目：
- [Next.js](https://nextjs.org/) - React 框架
- [Shadcn/ui](https://ui.shadcn.com/) - UI 组件库
- [TipTap](https://tiptap.dev/) - 编辑器
- [React Flow](https://reactflow.dev/) - 流程图库
- [OpenAI](https://openai.com/) - AI 能力

---

<div align="center">

**用 AI 重新定义学习**

Made with ❤️ by EduNexus Team

</div>

## 🔬 技术创新与研究方向

### 1. 知识图谱智能化
- **自动构建**：基于 TF-IDF 和余弦相似度自动识别文档关联
- **动态演化**：知识图谱随学习过程自动更新和优化
- **推理能力**：基于图谱的多跳推理和知识问答

### 2. 个性化推荐系统
- **冷启动优化**：新用户快速建模，基于少量交互构建画像
- **实时更新**：在线学习算法，实时调整推荐策略
- **可解释性**：推荐理由透明化，用户可理解推荐依据

### 3. 学习效果评估
- **多维度评估**：知识掌握度、应用能力、创新思维、学习效率
- **过程性评价**：关注学习过程而非仅结果
- **预测性分析**：LSTM 模型预测学习曲线，提前识别困难

### 4. AI 伦理与安全
- **隐私保护**：本地优先，端到端加密，数据最小化
- **内容审核**：AI 生成内容质量把控
- **公平性**：避免算法偏见，机会平等
- **透明度**：AI 决策过程可追溯，算法逻辑开源

## 📊 性能优化

### 前端性能
- **代码分割**：路由级和组件级的懒加载
- **虚拟化渲染**：大列表虚拟滚动，提升渲染性能
- **Web Workers**：图谱计算在后台线程，避免阻塞 UI
- **图片优化**：Next.js Image 组件自动优化

### 数据存储优化
- **索引策略**：IndexedDB 复合索引，加速查询
- **多级缓存**：内存缓存 + IndexedDB 缓存
- **增量更新**：只更新变化的数据，减少 I/O



## 📁 详细代码结构

```
EduNexus/
├── apps/
│   └── web/                              # Next.js 主应用
│       ├── public/                       # 静态资源
│       │   ├── icons/                    # 图标
│       │   ├── sw.js                     # Service Worker
│       │   └── manifest.json             # PWA 配置
│       ├── src/
│       │   ├── app/                      # App Router 页面
│       │   │   ├── (auth)/              # 认证相关页面
│       │   │   ├── api/                 # API 路由
│       │   │   │   ├── goals/           # 目标 API
│       │   │   │   ├── kb/              # 知识库 API
│       │   │   │   ├── path/            # 路径 API
│       │   │   │   └── workspace/       # 工作区 API
│       │   │   ├── goals/               # 目标管理页面
│       │   │   ├── graph/               # 知识图谱页面
│       │   │   ├── kb/                  # 知识库页面
│       │   │   │   ├── [id]/           # 文档详情
│       │   │   │   └── graph/           # KB 图谱
│       │   │   ├── learning-paths/      # 学习路径列表
│       │   │   ├── path/                # 路径编辑器
│       │   │   │   ├── editor/          # 旧版编辑器
│       │   │   │   └── new-editor/      # 新版编辑器
│       │   │   ├── workspace/           # 学习工作区
│       │   │   ├── layout.tsx           # 根布局
│       │   │   ├── page.tsx             # 首页
│       │   │   └── globals.css          # 全局样式
│       │   ├── components/              # React 组件
│       │   │   ├── ui/                  # 基础 UI 组件
│       │   │   │   ├── button.tsx
│       │   │   │   ├── card.tsx
│       │   │   │   ├── dialog.tsx
│       │   │   │   └── ...
│       │   │   ├── analytics/           # 数据分析组件
│       │   │   ├── goals/               # 目标组件
│       │   │   ├── graph/               # 图谱组件
│       │   │   ├── kb/                  # 知识库组件
│       │   │   │   ├── kb-editor.tsx    # Markdown 编辑器
│       │   │   │   ├── kb-layout.tsx    # KB 布局
│       │   │   │   ├── kb-right-panel.tsx # 右侧面板
│       │   │   │   ├── mindmap-viewer.tsx # 思维导图
│       │   │   │   └── backlink-graph.tsx # 反向链接图
│       │   │   ├── path/                # 路径组件
│       │   │   │   ├── path-editor.tsx  # 路径编辑器
│       │   │   │   ├── node-types.tsx   # 节点类型
│       │   │   │   └── ...
│       │   │   └── workspace/           # 工作区组件
│       │   ├── lib/                     # 工具库
│       │   │   ├── ai/                  # AI 集成
│       │   │   │   ├── openai.ts        # OpenAI 客户端
│       │   │   │   └── prompts.ts       # 提示词模板
│       │   │   ├── client/              # 客户端存储
│       │   │   │   ├── kb-storage.ts    # 知识库存储
│       │   │   │   ├── path-storage.ts  # 路径存储
│       │   │   │   └── path-storage-fallback.ts # 备用存储
│       │   │   ├── goals/               # 目标管理
│       │   │   ├── graph/               # 图谱算法
│       │   │   │   ├── layout-algorithms.ts
│       │   │   │   ├── recommendation-engine.ts
│       │   │   │   └── types.ts
│       │   │   ├── path/                # 路径工具
│       │   │   ├── resources/           # 资源管理
│       │   │   ├── sync/                # 数据同步
│       │   │   ├── workspace/           # 工作区工具
│       │   │   └── utils.ts             # 通用工具
│       │   └── styles/                  # 样式文件
│       │       ├── mobile.css           # 移动端样式
│       │       └── vim.css              # Vim 模式样式
│       ├── next.config.mjs              # Next.js 配置
│       ├── tailwind.config.ts           # Tailwind 配置
│       ├── tsconfig.json                # TypeScript 配置
│       └── package.json                 # 依赖配置
├── packages/                            # 共享包（预留）
├── .gitignore                           # Git 忽略文件
├── pnpm-workspace.yaml                  # pnpm 工作区配置
├── package.json                         # 根 package.json
└── README.md                            # 项目文档
```

## 🔐 安全最佳实践

### API 安全
- **密钥管理**：使用环境变量，不提交到代码库
- **请求限流**：防止 API 滥用
- **输入验证**：严格验证用户输入
- **CORS 配置**：限制跨域请求来源

### 数据安全
- **XSS 防护**：使用 DOMPurify 清理 HTML
- **CSRF 防护**：验证请求来源
- **SQL 注入防护**：使用参数化查询（如果使用数据库）
- **敏感数据加密**：本地存储加密

## 📚 学习资源

### 官方文档
- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev/)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)

### 推荐阅读
- 《认知天性》- 学习科学原理
- 《刻意练习》- 技能提升方法
- 《如何阅读一本书》- 阅读策略
- 《学习之道》- 学习方法论

### 相关项目
- [Obsidian](https://obsidian.md/) - 知识管理工具
- [Notion](https://notion.so/) - 笔记协作平台
- [Anki](https://apps.ankiweb.net/) - 间隔重复学习
- [RemNote](https://remnote.com/) - 学习辅助工具



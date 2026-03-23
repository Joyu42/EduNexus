# EduNexus CLAUDE Guide (Low-Token Context)

> 目标：让 AI/开发者在最少上下文下，快速理解项目结构、核心能力、当前进度与开发约束。

## 1) 30 秒项目快照

- 项目：`EduNexus`，基于 `Next.js 16 + React 19 + TypeScript` 的 AI 学习平台。
- 代码规模（tracked）：`575` 文件；其中 `apps/web` 占 `544`，主应用集中在 `apps/web/src`。
- 主要代码分布：`src/components`（219）/ `src/lib`（199）/ `src/app`（110）。
- 主要文件类型：`.ts`（253）/ `.tsx`（244），以前端与 API Route 为核心。
- 架构形态：前后端同仓（Next App Router + Route Handlers），数据层以客户端存储与服务抽象并存。

## 2) 目录与职责（只看关键路径）

### 根目录

- `apps/web/`: 主应用（唯一核心业务包）
- `.github/workflows/web-ci.yml`: CI 校验链路（typecheck/lint/build/unit/smoke）
- `openapi/edu-nexus-phase1.openapi.yaml`: API 契约（阶段性）
- `vault/`: 示例学习内容与模板数据

### `apps/web/src/app`（页面与 API 入口）

- 页面：`kb`、`graph`、`path`、`goals`、`workspace`、`community`、`groups`、`resources`、`profile`、`analytics`
- API：`src/app/api/**/route.ts`
  - `kb/*`: 知识库检索/问答/摘要/思维导图
  - `path/*`: 路径生成、重规划、推荐、聚焦反馈
  - `workspace/*`: Agent 对话、运行、会话流
  - `analytics/*`: 学习数据统计与报告
  - `practice/*`: 题库、作答、错题、统计
  - `goals/*`, `graph/*`, `user/*`, `push/*` 等辅助域

### `apps/web/src/components`（UI 与交互）

- `kb/*`: 编辑器、AI 写作助手、搜索、侧栏、星图、思维导图
- `graph/*`: 知识图谱可视化与详情面板
- `path/*`: 路径编辑器、节点类型、任务/里程碑管理
- `workspace/*`: 编程实验、代码执行、教师管理
- `global/global-ai-assistant.tsx`: 全局 AI 助手入口
- `ui/*`: 通用基础组件（Radix + Tailwind 封装）

### `apps/web/src/lib`（领域逻辑与基础设施）

- `lib/client/*`: 客户端存储、配置导入导出、搜索/图谱桥接
- `lib/server/*`: 服务编排、路径与图谱服务、会话服务、响应封装
- `lib/ai/*`, `lib/agent/*`: AI 上下文适配、学习代理工具链
- `lib/path/*`, `lib/graph/*`, `lib/resources/*`, `lib/goals/*`: 领域模型与算法
- `lib/sync/*`: 跨模块数据同步机制

## 3) 核心功能能力矩阵（现状）

- 知识库（KB）：文档编辑、摘要、问答、思维导图、双链与标签，能力完整度高。
- 知识图谱（Graph）：节点关系可视化、进度映射、与路径/知识库联动已落地。
- 学习路径（Path）：可视化编辑 + AI 生成/推荐/重规划，近期持续增强中。
- 学习工作区（Workspace）：Agent 会话、代码实验、项目模板与学习笔记能力稳定。
- 单词学习（Words）：学习仪表盘、词库选择、学习/复习流程页与交互组件已落地（前端版）。
- 目标管理（Goals）：目标拆解与 AI 建议接口存在，持续打磨体验。
- 练习系统（Practice）：题库与错题闭环可用，偏工具化，后续可继续产品化。
- 分析报表（Analytics）：周/月报与洞察 API 已具备基础闭环。
- 社区/小组/资源中心：核心页面与组件具备，持续迭代内容与协作细节。

## 4) 最近提交历史总结（近阶段完成进度）

基于最近提交（`0f70ef7` ~ `76e31ff`）可归纳为：

- 已完成：适配 `Next.js 16` 关键变更（动态路由 `params` Promise 化、lint CLI 参数更新）。
- 已完成：CI typecheck 相关修复，保证 GitHub Actions 主链路可持续校验。
- 已完成：知识星图（`knowledge-star-map`）与图谱交互增强。
- 已完成：路径存储体系增强（含 fallback 与调试支持）、路径编辑器能力扩展。
- 已完成：全局 AI 助手可用性与 UI 细节修复（尺寸、层级、交互）。
- 已完成：知识库编辑体验升级（大纲、快捷键、Markdown 增强）。
- 已完成：大规模文档清理与模块重组织，减少历史冗余文档噪音。
- 已完成：单词学习前端模块基础搭建（`/words` 路由族 + `components/words` 可复用组件 + mock 数据接入）。
- 持续中：多模块功能并行迭代后的一致性收敛（API、测试覆盖、文档单一事实源）。

## 5) 当前项目进度判断（工程视角）

- Phase 状态：已形成可运行的一体化学习平台（MVP+）。
- 高成熟模块：`kb`, `path`, `graph`, `workspace`, `global-ai-assistant`。
- 中成熟模块：`goals`, `resources`, `groups/community`, `analytics`, `words`（功能具备，产品打磨空间较大）。
- 主要任务类型已从“功能缺失”转向“稳定性、规范化、体验一致性、测试补全”。

## 5.1) 新增模块：Words（给后续 AI 的最小上下文）

### 路由入口

- `apps/web/src/app/words/page.tsx`：单词学习首页仪表盘（今日进度、连学天数、待复习、词库入口）。
- `apps/web/src/app/words/learn/[bookId]/page.tsx`：学习流程页（进度条、单词卡片、认识/不认识、完成弹窗）。
- `apps/web/src/app/words/review/page.tsx`：复习流程页（复习队列、快捷回忆模式、结果统计）。

### 组件库

- `apps/web/src/components/words/word-card.tsx`：单词展示、释义/例句展开、Web Speech 发音。
- `apps/web/src/components/words/book-selector.tsx`：词库列表与进度/待复习展示。
- `apps/web/src/components/words/progress-ring.tsx`：可配置环形进度组件。
- `apps/web/src/components/words/review-buttons.tsx`：认识/不认识按钮与左右键快捷键。
- `apps/web/src/components/words/stats-card.tsx`：仪表盘统计卡片（图标、趋势）。
- `apps/web/src/components/words/streak-calendar.tsx`：学习热力日历。
- `apps/web/src/components/words/index.ts`：统一导出入口。

### 数据与依赖

- 依赖类型：`apps/web/src/lib/words/types.ts`（由 Agent 1 提供）。
- mock 数据：`apps/web/src/lib/words/mock-data.ts`（词库、单词、学习记录、学习事件）。
- 统计算法：`apps/web/src/lib/words/stats.ts`, `apps/web/src/lib/words/algorithm.ts`。
- 存储层：`apps/web/src/lib/words/storage.ts`（已补 `StudyEvent` 类型导入，修复 typecheck）。

### 当前边界（重要）

- 当前 `words` 以前端交互与 mock 数据闭环为主，尚未接入正式 API Route。
- 学习与复习流程页可以直接演示，但进度写回仍需后续服务端/持久化联调。

## 6) 未来开发规范（必须遵循）

### 代码与结构

- 所有业务代码优先放在 `apps/web/src`，按现有分层（`app/components/lib`）扩展。
- 复用路径别名：`@/* -> ./src/*`（见 `apps/web/tsconfig.json`）。
- 保持模块职责单一：UI 在 `components`，纯逻辑在 `lib`，入口在 `app`。
- 新增 API 必须归类到现有业务域目录，避免横向散落。

### 类型与质量

- 默认 TypeScript 严格约束，不引入 `any` 逃逸（必要时局部最小化）。
- ESLint 基线：`next/core-web-vitals` + `next/typescript`（见 `.eslintrc.json`）。
- Next 16 约束：动态路由参数按 Promise 语义处理，避免回退旧写法。

### 测试与验证

- 本地最小验证顺序：
  1. `pnpm typecheck`
  2. `pnpm lint`
  3. `pnpm test:unit`
  4. `pnpm test:smoke`
  5. `pnpm build`
- CI 同步执行上述链路（见 `.github/workflows/web-ci.yml`），PR 需保持全绿。

### Git 与提交信息

- 提交前缀遵循现有风格：`feat:` / `fix:` / `docs:`。
- 单次提交聚焦单一主题，避免“跨域混改”。
- 涉及 API 语义变化时，同步更新测试与文档（至少 README/本文件相关段落）。

### 文档策略

- 保持“少而准”：以本文件作为 AI/开发者入口总览，避免再产生大量重复状态文档。
- 组件级说明优先放在模块内 `README.md`（如 `components/kb/README.md`）。

## 7) AI 协作低 token 工作流（推荐）

### 启动时只读这些文件

- `CLAUDE.md`（本文件）
- `README.md`
- `apps/web/package.json`
- `apps/web/src/app/<目标域>/page.tsx` 与 `apps/web/src/app/api/<目标域>/*`
- `apps/web/src/components/<目标域>/*`
- `apps/web/src/lib/<目标域>/*`

### 按任务类型缩小上下文

- 改 UI：优先读 `app + components`，少读 `lib/server`。
- 改业务逻辑：优先读 `lib/* + api route`，再补组件。
- 改存储/同步：优先读 `lib/client/*`, `lib/sync/*`。
- 改 Agent/AI：优先读 `lib/agent/*`, `lib/ai/*`, `app/api/workspace/*`。

### 禁止事项

- 不要全量扫描整个仓库后再动手；先定位业务域，再最小读取。
- 不要引入与当前任务无关的大规模重构。
- 不要绕过现有脚本链路直接宣称“已完成”。

## 8) 当前注意点（已观察到）

- 存在临时文件：`apps/web/src/app/dashboard/page.tsx.tmp`（非正式源码）。
- 历史上发生过大规模文档增删，后续应坚持单一事实源，减少状态文档漂移。
- 路径/资源/同步相关代码近期改动密集，改动前需优先阅读对应测试文件。

---

如果你是新接入的 AI，请先按“第 7 节”读取最小上下文，再开始任务。

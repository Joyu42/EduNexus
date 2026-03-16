# 用户数据隔离审计与大幅收缩计划

## TL;DR
> **Summary**: 在保留认证与核心学习链路的前提下，把 `EduNexus-auth` 收缩为一个“服务端会话是唯一身份真相源、核心学习路径可验证、非核心 demo/高风险功能面已移除”的版本。
> **Deliverables**:
> - 用 Auth.js v5 官方方式重建路由保护与会话读取
> - 移除非核心且高风险的 demo/社交/协作/统计/PWA 表面与依赖
> - 压缩重复身份同步与混合持久化复杂度
> - 为保留功能补最小认证/隔离回归测试
> **Effort**: Large
> **Parallel**: YES - 2 waves
> **Critical Path**: 1 → 2 → 3 → 4/5/6 → 7/8 → 9 → 10

## Context
### Original Request
- 分析当前项目情况
- 检查用户数据隔离系统实现
- 寻找并修复 bug
- 简化项目代码
- 去除不必要功能
- 参考 `/Users/Ng/workspace/EduNexus`

### Interview Summary
- 用户选择了“大幅收缩”方向，而不是保留全部功能逐个修补。
- “收缩”按功能价值与隔离风险定义，不按目录名机械删除；保留认证与核心学习链路，移除在多用户场景下仍然是 demo/硬编码/无安全边界的功能面。
- 测试策略采用 `tests-after`：先完成收缩与修复，再补最小但必须的认证/隔离回归套件，并对齐现有 CI。

### Metis Review (gaps addressed)
- 纠偏：`/Users/Ng/workspace/EduNexus` 是“产品面参考”，不是“技术实现目标”；不能因为参考仓库无认证就回退成单机版。
- Guardrail: 保留 `NextAuth + Prisma` 作为认证与文档所有权基础，不把“简化”误做成“移除认证/数据库”。
- Guardrail: 删除范围以“非核心且高风险”为准，优先删 demo 社交/协作/统计/PWA 表面，再收缩相应依赖。
- Guardrail: 任何保留的服务端数据访问都必须从会话派生 `userId`；绝不接受请求体、URL 参数或 `localStorage` 提供的身份作为授权依据。

## Work Objectives
### Core Objective
把当前仓库收敛为一个可持续维护的认证版学习应用：认证与授权只走 Auth.js/服务端会话，核心学习页面可用，跨用户数据泄漏风险被压缩到可验证范围，明显 demo/硬编码/重复身份逻辑被删除或统一。

### Deliverables
- Auth.js v5 兼容的统一路由保护方案
- 单一客户端身份缓存辅助层，替代散落的 `getCurrentUserId()/setCurrentUser()` 重复实现
- 明确的保留/删除矩阵，并落实到页面、API、导航、组件、lib 依赖
- 收缩后的服务端持久化边界：Prisma 负责用户与 KB 文档；JSON store 仅保留确有必要的核心工作区数据
- 认证/隔离/删减后的回归测试与 CI 对齐

### Definition of Done (verifiable conditions with commands)
- `pnpm --filter @edunexus/web test:unit` 通过，且新增认证/隔离测试覆盖保留链路
- `pnpm --filter @edunexus/web build` 通过，无已删除路由/组件残留引用
- `pnpm --filter @edunexus/web lint` 通过，无已删除模块的死引用与未使用导入
- `pnpm --filter @edunexus/web typecheck` 通过，`session.user.id` 在保留代码路径中类型稳定
- 受保护页面未登录时重定向到 `/login`；已登录用户只能读取自己的 KB 文档与工作区会话
- 已删除页面/API 返回 404、无入口、无导航残留

### Must Have
- 保留：`/(auth)` 登录注册、`/`、`/kb`、`/graph`、`/path`、`/learning-paths`、`/goals`、`/workspace`（含 practice 子页面）、`/settings`
- 保留：`NextAuth v5`、`Prisma`、`User`/`Document` 所有权模型
- 保留：服务端 `getCurrentUserId()` 作为授权边界入口
- 删除：`/community`、`/groups`、`/collab`、`/profile`、`/dashboard`、`/resources`、`/user-level`、`/workspace/analytics`、`/about`、`/share`、`/offline`、`/pwa-test`、`/test-ai-assistant`
- 删除：与上述页面绑定的 API、组件、`lib` 子模块、导航入口、PWA/推送/同步/统计依赖（若保留链路不再使用）

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- 不要移除认证、Prisma 或 `Document.authorId` 所有权模型
- 不要继续依赖手工 cookie 读取、客户端传入 `userId`、或 `localStorage` 作为服务端授权依据
- 不要为了“简化”把核心学习功能改成不可登录、不可隔离的单机模式
- 不要保留已删除功能的 UI 入口、空壳页面、假数据 API 或 README/QUICKSTART 残留
- 不要引入新的持久化层；只允许“减少层数/减少重复”

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: `tests-after` + `Vitest` (`apps/web/vitest.config.ts:4-14`)
- QA policy: Every task has agent-executed scenarios
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`
- CI baseline: `.github/workflows/web-ci.yml:9-44` 规定 `typecheck → lint → build → unit → smoke`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: 身份与路由基础、导航收缩、非核心功能面删除（Tasks 1-5）
Wave 2: 基础设施瘦身、持久化边界收敛、回归测试与 CI 对齐（Tasks 6-10）

### Dependency Matrix (full, all tasks)
- 1 blocks 2, 4, 9, 10
- 2 blocks 3, 7, 9
- 3 blocks 7, 9
- 4 blocks 5, 6, 10
- 5 blocks 6, 8, 10
- 6 blocks 10
- 7 blocks 8, 9, 10
- 8 blocks 9, 10
- 9 blocks 10
- 10 depends on 1-9

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 5 tasks → `unspecified-high`, `quick`, `deep`
- Wave 2 → 5 tasks → `unspecified-high`, `deep`, `writing`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. 用 Auth.js 官方方式替换手工中间件鉴权

  **What to do**: 将 `apps/web/middleware.ts` 的手工 cookie 检测改为 Auth.js v5 官方保护方式；在 Next.js 16 语义下优先落地 `proxy.ts`（或按当前框架要求保留兼容文件名），并把公开路由固定为 `/login`、`/register`、`/api/auth/*`。所有核心页面的“未登录重定向”只依赖该机制，API 侧继续保留服务端 `getCurrentUserId()` 二次校验。
  **Must NOT do**: 不要继续手写 `request.cookies.get('next-auth.session-token')`；不要把 middleware 作为唯一授权边界；不要把已删除功能面单独列入公开白名单。

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 涉及 Next.js/Auth.js 运行时边界与全局路由保护
  - Skills: [`git-master`] — 需要小步原子提交与路径收敛
  - Omitted: [`test-driven-development`] — 本计划采用 tests-after，不在此任务前先写红测

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [2, 4, 9, 10] | Blocked By: []

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `apps/web/middleware.ts:5` — 当前公开路径策略起点
  - Bug source: `apps/web/middleware.ts:20` — 当前手工读取 session cookie，是明确要删除的反模式
  - Auth config: `apps/web/src/auth.ts:6` — Auth.js v5 配置导出 `auth`
  - Official: `https://authjs.dev/getting-started/migrating-to-v5` — v5 推荐用 `auth()`/`auth` 替代 `getToken`/手工 cookie
  - Official: `https://authjs.dev/getting-started/session-management/protecting` — 官方保护资源模式与“middleware 不是唯一授权边界”的警告

  **Acceptance Criteria** (agent-executable only):
  - [ ] `apps/web/middleware.ts` 不再包含 `next-auth.session-token` / `__Secure-next-auth.session-token` 字面量
  - [ ] 路由保护实现改为从 `@/auth` 导出的官方 Auth.js 保护方式
  - [ ] 未登录请求核心页面会重定向到 `/login`，且 `callbackUrl` 逻辑仍可用
  - [ ] 已登录请求不会因为 cookie 名差异或运行时不一致而被误拦截

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Unauthenticated browser redirect on protected route
    Tool: Playwright
    Steps: Open `/kb` in a fresh browser context with no auth cookies.
    Expected: Browser lands on `/login` and preserves callback intent.
    Evidence: .sisyphus/evidence/task-1-auth-protection.png

  Scenario: Protected API still denies without session
    Tool: Bash
    Steps: Run `curl -i http://localhost:3000/api/kb/docs` with no cookies.
    Expected: HTTP 401 response from API layer.
    Evidence: .sisyphus/evidence/task-1-auth-protection-error.txt
  ```

  **Commit**: YES | Message: `fix(auth): replace manual middleware protection` | Files: [`apps/web/middleware.ts` or `apps/web/proxy.ts`, `apps/web/src/auth.ts`]

- [x] 2. 固化认证会话契约与注册入口

  **What to do**: 为 `NextAuth` 的 `JWT`/`Session` 补类型扩展，确保 `session.user.id` 在客户端和服务端都稳定可用；收紧 `api/auth/register` 的输入校验并统一错误返回；检查 `/(auth)/login`、`/(auth)/register` 成功后跳转逻辑，确保登录、注册、刷新后的身份状态能驱动保留页面。
  **Must NOT do**: 不要把 email 当作长期主键回退；不要允许未校验的注册 payload 直接写库；不要让登录/注册页面绕过统一的会话字段约定。

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 涉及认证核心约定、类型扩展、服务端输入校验
  - Skills: [`git-master`] — 需要保持 auth 相关改动原子可回滚
  - Omitted: [`brainstorming`] — 方案已在规划阶段确定

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [3, 7, 9] | Blocked By: [1]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `apps/web/src/auth.ts:40` — 现有 JWT/Session callback 已设置 `token.id` / `session.user.id`
  - API: `apps/web/src/app/api/auth/register/route.ts:4` — 当前注册接口缺少结构化校验
  - UI: `apps/web/src/app/(auth)/login/page.tsx:14` — 当前登录表单行为
  - UI: `apps/web/src/app/(auth)/register/page.tsx:16` — 当前注册表单行为
  - Context: `apps/web/src/app/providers.tsx:3` — `SessionProvider` 已存在
  - Official: `https://authjs.dev/getting-started/authentication/credentials` — Credentials provider 的校验与密码处理注意事项

  **Acceptance Criteria** (agent-executable only):
  - [ ] `session.user.id` 在 TS 层无 `any`/类型断言兜底依赖
  - [ ] `api/auth/register` 对 email/password/name 做结构化校验并返回稳定错误格式
  - [ ] 新注册用户可自动登录并进入首页；错误凭据不会导致空白页或悬空状态
  - [ ] 保留代码路径不再依赖 `email || id` 这种身份回退作为授权主键

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Register then auto-login
    Tool: Playwright
    Steps: Visit `/register`, fill email `plan-auth@example.com`, nickname `PlanAuth`, password `secret123`, submit.
    Expected: Browser lands on `/` with authenticated session available.
    Evidence: .sisyphus/evidence/task-2-register-login.png

  Scenario: Invalid registration payload rejected
    Tool: Bash
    Steps: Run `curl -i -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"email":"bad","password":"123"}'`.
    Expected: HTTP 400 with structured validation error response.
    Evidence: .sisyphus/evidence/task-2-register-login-error.txt
  ```

  **Commit**: YES | Message: `fix(auth): stabilize session and registration contract` | Files: [`apps/web/src/auth.ts`, `apps/web/src/app/api/auth/register/route.ts`, `apps/web/src/app/(auth)/login/page.tsx`, `apps/web/src/app/(auth)/register/page.tsx`, `apps/web/src/types/next-auth.d.ts`]

- [x] 3. 建立单一客户端身份缓存辅助层并移除重复用户镜像逻辑

  **What to do**: 新建一个单一客户端身份辅助模块（例如 `apps/web/src/lib/auth/client-user-cache.ts`），只允许 `AuthSyncProvider` 写入当前用户快照；把保留功能链路中所有重复的 `getCurrentUserId()/setCurrentUser()` 实现改为依赖该辅助层读取身份。保留页面所需的客户端存储隔离键继续存在，但身份解析逻辑必须集中；即将被 Task 5 删除的模块不做额外重构，只需确保删除前不会反向污染保留链路。
  **Must NOT do**: 不要继续在 `kb-storage`、`path-storage`、`goal-storage` 等文件内重复解析 `localStorage`；不要让任何 API/服务端代码读取这个客户端缓存；不要保留多个 `setCurrentUser()` 导出。

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 横跨多个核心存储模块的去重重构
  - Skills: [`git-master`] — 需要控制重命名与批量替换的稳定性
  - Omitted: [`test-driven-development`] — 依赖前置认证契约稳定后再补回归测试

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [7, 9] | Blocked By: [2]

  **References** (executor has NO interview context — be exhaustive):
  - Pattern: `apps/web/src/components/providers/auth-sync-provider.tsx:14` — 当前唯一跨模块同步点，保留为 sole writer
  - Duplication: `apps/web/src/lib/client/kb-storage.ts:45` — 重复本地解析当前用户
  - Duplication: `apps/web/src/lib/client/path-storage.ts:65` — 重复本地解析当前用户
  - Duplication: `apps/web/src/lib/goals/goal-storage.ts:42` — 重复本地解析当前用户
  - Risk: `apps/web/src/lib/client/data-sync-manager.ts:10` — 另一个散落身份读取点，若 Task 6 判定仍保留该模块必须一并收敛

  **Acceptance Criteria** (agent-executable only):
  - [ ] 保留功能链路中的客户端身份读取都经由单一 helper
  - [ ] `AuthSyncProvider` 是唯一负责写入/清除客户端身份缓存的保留入口
  - [ ] 保留文件里不再出现多个重复的 `setCurrentUser()` 实现
  - [ ] 会话切换后，KB/Path/Goals/Workspace 等保留功能读到的是同一身份缓存值

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Session switch updates all retained client stores consistently
    Tool: Playwright
    Steps: Login as User A, visit `/kb` and `/path`, logout, login as User B, revisit same pages.
    Expected: No retained page shows User A-scoped cached data after User B login.
    Evidence: .sisyphus/evidence/task-3-client-user-cache.png

  Scenario: No duplicate writer exports remain
    Tool: Bash
    Steps: Run `rg "export function setCurrentUser|function getCurrentUserId\(" apps/web/src/lib apps/web/src/components/providers`.
    Expected: Results only point to the new helper (plus intentionally deleted files excluded from tree).
    Evidence: .sisyphus/evidence/task-3-client-user-cache-error.txt
  ```

  **Commit**: YES | Message: `refactor(auth): centralize client user cache` | Files: [`apps/web/src/components/providers/auth-sync-provider.tsx`, `apps/web/src/lib/auth/client-user-cache.ts`, retained storage modules under `apps/web/src/lib/`]

- [x] 4. 收缩导航与路由暴露面到核心学习产品

  **What to do**: 以本计划的保留/删除矩阵为准，修改桌面侧边栏、移动端导航/菜单、全局入口和布局层，只保留 auth + 核心学习链路。删除所有指向 `community/groups/collab/profile/dashboard/resources/user-level/workspace/analytics/about/share/offline/pwa-test/test-ai-assistant` 的导航项、快捷入口和布局包裹；同时从根布局剥离不再需要的全局 UI 容器。
  **Must NOT do**: 不要只“隐藏链接”而保留可直接访问的页面；不要保留已删除模块的全局 provider、prompt、indicator；不要改动保留页面的 URL。

  **Recommended Agent Profile**:
  - Category: `quick` — Reason: 以入口收缩与显式删链为主，改动集中于导航/布局
  - Skills: [`git-master`] — 需要小而清晰的删除型提交
  - Omitted: [`frontend-ui-ux`] — 不做视觉重设计，只做信息架构收缩

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [5, 6, 10] | Blocked By: [1]

  **References** (executor has NO interview context — be exhaustive):
  - Navigation: `apps/web/src/components/layout/AppSidebar.tsx:34` — 当前核心/工作区/系统导航项清单
  - Layout: `apps/web/src/app/layout.tsx:60` — 当前根布局挂载 `Providers`、PWA 组件、全局 AI 助手、Toaster
  - Shell: `apps/web/src/components/layout/AppShell.tsx:18` — 当前全局壳层包裹结构
  - Route examples: `apps/web/src/app/resources/page.tsx:26`, `apps/web/src/app/collab/[sessionId]/page.tsx:28` — 这些页面会被移除而非保留

  **Acceptance Criteria** (agent-executable only):
  - [ ] 桌面与移动导航只暴露保留页面
  - [ ] 根布局不再挂载与已删除功能绑定的全局组件
  - [ ] 访问保留页面 URL 不变；访问已删除页面无导航入口且后续任务将落地 404/删除
  - [ ] `AppSidebar`、移动导航与布局中的保留信息架构一致

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Navigation only shows retained core routes
    Tool: Playwright
    Steps: Login, open desktop sidebar and mobile menu, inspect visible route labels.
    Expected: Only `/`, `/kb`, `/graph`, `/path`, `/learning-paths`, `/goals`, `/workspace`, `/settings` appear.
    Evidence: .sisyphus/evidence/task-4-route-exposure.png

  Scenario: Deleted surface has no entry link
    Tool: Bash
    Steps: Run `rg "/community|/groups|/collab|/resources|/workspace/analytics" apps/web/src/components apps/web/src/app/layout.tsx`.
    Expected: No retained navigation/layout file references these URLs.
    Evidence: .sisyphus/evidence/task-4-route-exposure-error.txt
  ```

  **Commit**: YES | Message: `refactor(app): shrink navigation to core routes` | Files: [`apps/web/src/components/layout/AppSidebar.tsx`, `apps/web/src/app/layout.tsx`, mobile navigation/menu files, shell/layout helpers]

- [x] 5. 删除非核心 demo/社交/协作/统计功能面及其直连依赖

  **What to do**: 彻底删除以下页面/API/组件/lib：`community`、`groups`、`collab`、`profile`、`dashboard`、`resources`、`user-level`、`workspace/analytics` 及对应 API 路由；同时移除与这些功能面强绑定的 `components/community/*`、`components/groups/*`、`components/collab/*`、`components/profile/*`、`components/analytics/*`、`lib/community/*`、`lib/analytics/*`。保留的核心页面不得再 import 这些模块。
  **Must NOT do**: 不要留下空壳目录、未引用但仍可访问的 route、仅返回 mock data 的 API；不要误删保留功能共用的基础 UI 组件。

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 大批量删除，需要准确辨认依赖边界
  - Skills: [`git-master`] — 删除型改动需要稳定地审查 diff 与原子提交
  - Omitted: [`subagent-driven-development`] — 该任务存在共享删除边界，不适合无协调并改

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [6, 8, 10] | Blocked By: [4]

  **References** (executor has NO interview context — be exhaustive):
  - Hardcoded demo user: `apps/web/src/app/collab/[sessionId]/page.tsx:40` — 明确示例用户硬编码
  - Mock analytics: `apps/web/src/app/api/analytics/stats/route.ts:24` — 仍使用模拟数据与 `user_1`
  - Global social storage: `apps/web/src/lib/community/post-storage.ts:5` — 全局共享 localStorage key 与默认示例用户
  - Demo resources: `apps/web/src/app/resources/page.tsx:36` — 页面直接写死 `demo_user`
  - Feature count: `apps/web/src/components/layout/AppSidebar.tsx:44` — 当前资源/小组/社区等入口

  **Acceptance Criteria** (agent-executable only):
  - [ ] 已删除功能面对应的页面与 API 文件都从仓库移除
  - [ ] 保留代码路径中不存在对 `components/community|groups|collab|profile|analytics` 或 `lib/community|analytics` 的 import
  - [ ] 已删除 URL 返回 404（或由框架级不存在页面处理），不是空白/500
  - [ ] 仓库中不再出现保留代码路径对 `demo_user`、`user_1` 的依赖

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Removed pages are inaccessible
    Tool: Playwright
    Steps: Login, visit `/community`, `/groups`, `/collab`, `/resources`, `/workspace/analytics` directly.
    Expected: Each route resolves to framework 404 or redirect away from deleted surface; no runtime crash.
    Evidence: .sisyphus/evidence/task-5-remove-demo-surfaces.png

  Scenario: No stale imports or demo-user literals remain in retained tree
    Tool: Bash
    Steps: Run `rg "demo_user|user_1|components/(community|groups|collab|profile|analytics)|lib/(community|analytics)" apps/web/src`.
    Expected: Matches only inside intentionally deleted paths or none at all.
    Evidence: .sisyphus/evidence/task-5-remove-demo-surfaces-error.txt
  ```

  **Commit**: YES | Message: `refactor(app): remove non-core demo surfaces` | Files: [deleted app routes, deleted APIs, deleted components/libs, updated imports]

- [x] 6. 清理已收缩后不再必要的 PWA、推送、同步与性能基础设施

  **What to do**: 在 Task 5 删除结果基础上，检查 `PWAInit`、`InstallPrompt`、`OfflineIndicator`、`NotificationPermission`、`UpdatePrompt`、`lib/pwa/*`、`lib/sync/*`、`lib/performance/*`、`lib/client/data-sync-manager.ts` 是否仍被保留功能使用；凡是仅为已删除功能、测试页或离线/PWA 体验服务的模块，一并删除。若少量保留链路仍依赖其中某个基础函数，则内联或迁移到更小的核心文件，禁止继续保留整套子系统。
  **Must NOT do**: 不要删除 KB/Path/Graph 核心功能真实依赖的最小同步逻辑；不要仅移除布局引用却保留整套未使用目录。

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 需要在删减后重新判断 infra 依赖边界
  - Skills: [`git-master`] — 适合做大规模删除后的整洁提交
  - Omitted: [`playwright`] — 此任务主要是依赖收敛与代码删除，不是浏览器驱动

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [10] | Blocked By: [4, 5]

  **References** (executor has NO interview context — be exhaustive):
  - Layout mount point: `apps/web/src/app/layout.tsx:63` — 当前挂载所有 PWA 组件
  - Sync duplication: `apps/web/src/lib/client/data-sync-manager.ts:1` — 额外同步管理器与本地身份读取
  - Storage sync coupling: `apps/web/src/lib/client/kb-storage.ts:6` — KB 存储目前耦合 sync event manager
  - Directory inventory: `apps/web/src/lib/sync/README.md`, `apps/web/src/lib/pwa/index.ts`, `apps/web/src/lib/performance/monitor.ts`

  **Acceptance Criteria** (agent-executable only):
  - [ ] 根布局不再挂载未使用的 PWA/推送/更新提示组件
  - [ ] `lib/pwa`、`lib/sync`、`lib/performance` 只保留保留功能真实依赖的最小代码，或被彻底删除
  - [ ] 删除后 `typecheck`/`build` 不报缺失引用
  - [ ] 核心 KB/Path/Graph 页面仍能加载，不因删除外围 infra 崩溃

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Core pages still load after infra cleanup
    Tool: Playwright
    Steps: Login, open `/kb`, `/path`, `/graph`, `/workspace`.
    Expected: Pages render without PWA/sync/performance runtime errors in console.
    Evidence: .sisyphus/evidence/task-6-infra-cleanup.png

  Scenario: Removed infra directories are no longer referenced
    Tool: Bash
    Steps: Run `rg "lib/(pwa|sync|performance)|components/pwa" apps/web/src`.
    Expected: Only intentional retained minimal modules remain; root layout no longer imports deleted packages.
    Evidence: .sisyphus/evidence/task-6-infra-cleanup-error.txt
  ```

  **Commit**: YES | Message: `refactor(core): remove unused pwa sync and perf infrastructure` | Files: [`apps/web/src/app/layout.tsx`, retained core modules, deleted `lib/pwa|sync|performance` files]

- [x] 7. 固化保留服务端数据访问的所有权边界（Prisma + Auth）

  **What to do**: 对保留的服务端数据访问链路做最终收口：`auth-utils` 继续作为唯一服务端身份入口；`document-service` 与 `/api/kb/*` 全部以会话 userId 过滤；在 Prisma 模式里为 `Document.authorId` 补索引（若缺失），并核查所有保留服务端查询都不接受客户端传入的 `userId` 作为授权条件。若发现保留 API 仍使用 body/query 中的 `userId`，必须改为忽略客户端值、只取会话值。
  **Must NOT do**: 不要把 Prisma ownership 逻辑挪回客户端；不要保留任何“客户端传 userId，服务端照单全收”的模式；不要改动已删除功能面的 API。

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 涉及服务端授权边界、数据库模式与保留 API 的一致性
  - Skills: [`git-master`] — 需要将 schema/service/API 三类改动打成清晰提交
  - Omitted: [`systematic-debugging`] — 当前不是未知故障排查，而是明确的边界收口

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [8, 9, 10] | Blocked By: [2, 3]

  **References** (executor has NO interview context — be exhaustive):
  - Identity boundary: `apps/web/src/lib/server/auth-utils.ts:1` — 保留为服务端身份入口
  - Ownership filter: `apps/web/src/lib/server/document-service.ts:6` — 现有 KB 所有权过滤正确，应作为保留模式
  - API usage: `apps/web/src/app/api/kb/docs/route.ts:8` — 现有 `getCurrentUserId()` + `authorId` 写入链路
  - Schema: `prisma/schema.prisma:23` — `Document.authorId` 所有权字段与 relation
  - Guidance: `https://www.prisma.io/docs/orm/prisma-client/queries/crud` — 官方 query filtering 模式
  - Guidance: `https://www.prisma.io/docs/orm/more/best-practices` — relation/index/migrate best practices

  **Acceptance Criteria** (agent-executable only):
  - [ ] 保留服务端 API 不再信任客户端传入的 `userId`
  - [ ] `Document` 模型具备可验证的 ownership 索引/高效过滤策略
  - [ ] `/api/kb/docs`、`/api/kb/doc/[id]`、相关保留 KB API 都从会话派生身份
  - [ ] Prisma schema/service/API 三层对 ownership 的命名与过滤一致

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Cross-user KB access is denied
    Tool: Bash
    Steps: Seed User A and User B, create a document for User A, then request User A doc with User B session cookie.
    Expected: API returns 404 or 403; never returns User A document content.
    Evidence: .sisyphus/evidence/task-7-kb-ownership.txt

  Scenario: Client-supplied userId is ignored
    Tool: Bash
    Steps: Call a retained API with authenticated User A cookie but body/query containing `userId=UserB`.
    Expected: Server operates on User A scope only or rejects the request.
    Evidence: .sisyphus/evidence/task-7-kb-ownership-error.txt
  ```

  **Commit**: YES | Message: `fix(data): enforce server-side ownership boundaries` | Files: [`prisma/schema.prisma`, `apps/web/src/lib/server/auth-utils.ts`, retained `apps/web/src/lib/server/*`, retained `apps/web/src/app/api/**/*`]

- [x] 8. 收缩 JSON store 到最小核心工作区边界

  **What to do**: 以 Task 5 删除结果为前提，重写 `apps/web/src/lib/server/store.ts` 的 `DbSchema`，去掉已经删除功能面的字段（尤其 `resources`、`bookmarks`、`bookmarkFolders`、`resourceNotes`、`collabSessions`、`collabMessages`、`collabVersions`、`users` 这类不再需要或与 Prisma 冲突的内容），只保留核心工作区确实还需要的会话/计划等字段；同步更新 `session-service` 及其 API，确保 `.edunexus/data/db.json` 只承载最小必要状态。
  **Must NOT do**: 不要把 `User` 数据继续塞回 JSON store；不要让被删掉的功能面继续污染 `DbSchema`；不要无理由把仍在保留链路中使用的数据字段一起删除。

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: 涉及状态模型收缩、服务层跟随、数据文件边界重定义
  - Skills: [`git-master`] — 需要谨慎控制 schema-like 变更与清理 diff
  - Omitted: [`test-driven-development`] — 此处优先完成边界收缩，再用 Task 9 回归验证

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [9, 10] | Blocked By: [5, 7]

  **References** (executor has NO interview context — be exhaustive):
  - Schema bloat: `apps/web/src/lib/server/store.ts:40` — 当前 JSON store 混入多类已删除域对象
  - File persistence: `apps/web/src/lib/server/store.ts:114` — 当前 `loadDb()/saveDb()` 生命周期
  - Kept workspace service: `apps/web/src/lib/server/session-service.ts:4` — 当前核心工作区会话服务依赖 JSON store
  - Kept API: `apps/web/src/app/api/workspace/session/route.ts:8` — 创建学习会话的保留入口
  - Risk note: `/Users/Ng/workspace/EduNexus-auth/.edunexus/data/db.json` — 现有运行时数据文件，执行时要兼容空值/历史字段

  **Acceptance Criteria** (agent-executable only):
  - [ ] `DbSchema` 只包含保留核心工作区需要的字段
  - [ ] `User`/文档所有权不再出现在 JSON store 边界中
  - [ ] 工作区保留 API 仍可创建、列出、读取、更新、删除自己的会话
  - [ ] 旧数据文件即使包含历史字段，也不会导致运行时崩溃

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Workspace session CRUD still works after store shrink
    Tool: Bash
    Steps: Login, call retained workspace session create/list/detail/update/delete APIs in sequence.
    Expected: Each step succeeds for the authenticated user and persists only required fields.
    Evidence: .sisyphus/evidence/task-8-json-store.txt

  Scenario: Historical db.json with removed keys does not crash server
    Tool: Bash
    Steps: Start app with a fixture `.edunexus/data/db.json` containing old collab/resource keys, then hit retained workspace endpoints.
    Expected: Server ignores legacy keys and returns normal responses.
    Evidence: .sisyphus/evidence/task-8-json-store-error.txt
  ```

  **Commit**: YES | Message: `refactor(store): shrink json persistence to workspace core` | Files: [`apps/web/src/lib/server/store.ts`, `apps/web/src/lib/server/session-service.ts`, retained workspace APIs/tests]

- [x] 9. 为认证与隔离建立最小回归测试套件

  **What to do**: 在现有 `Vitest` 基础上新增/改写测试，覆盖保留链路最小安全面：认证契约、未登录访问重定向/401、KB 跨用户隔离、工作区会话跨用户隔离、以及已删除功能面不再暴露。沿用现有 sandbox/test-helper 习惯；如果某些现有测试引用了已删除功能面，删除或替换它们，不允许留下红测。
  **Must NOT do**: 不要继续保留“手工浏览器控制台测试”作为唯一验证；不要给已删除功能面补测试；不要引入不跑进 CI 的新测试框架。

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 涉及多类保留边界的回归测试设计与改造
  - Skills: [`git-master`] — 需要控制测试删除/新增的可审查性
  - Omitted: [`playwright`] — 浏览器验证留给 QA 场景，单元/集成测试仍用 Vitest

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [10] | Blocked By: [1, 2, 3, 7, 8]

  **References** (executor has NO interview context — be exhaustive):
  - Test runner: `apps/web/vitest.config.ts:4` — 只收 `src/**/*.test.ts`
  - CI order: `.github/workflows/web-ci.yml:31` — 单测必须可并入现有 verify job
  - Helper pattern: `apps/web/src/tests/test-helpers.ts:11` — 现有 sandbox 创建与清理模式
  - Representative API test: `apps/web/src/app/api/kb/kb-api.test.ts:18` — 当前 API 测试组织方式
  - Known gap: 仓库当前没有 `auth.ts`、session isolation、cross-user leakage 自动化覆盖

  **Acceptance Criteria** (agent-executable only):
  - [ ] 至少存在针对 auth/session 契约、KB 跨用户隔离、workspace 跨用户隔离、删减路由不可访问的自动化测试
  - [ ] 现有受影响测试全部更新到新范围，无失败的删除后残留用例
  - [ ] `pnpm --filter @edunexus/web test:unit` 全绿
  - [ ] 测试命名、目录与现有 `src/**/*.test.ts` 约定一致

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Unit suite covers retained auth and isolation boundaries
    Tool: Bash
    Steps: Run `pnpm --filter @edunexus/web test:unit`.
    Expected: Exit code 0, including newly added auth/isolation tests.
    Evidence: .sisyphus/evidence/task-9-regression-tests.txt

  Scenario: Deleted-route tests fail before cleanup and pass after cleanup
    Tool: Bash
    Steps: Run the new deleted-surface regression test file directly.
    Expected: It asserts removed routes/APIs are absent or return expected framework response.
    Evidence: .sisyphus/evidence/task-9-regression-tests-error.txt
  ```

  **Commit**: YES | Message: `test(core): add auth and isolation regression coverage` | Files: [new/updated `src/**/*.test.ts`, existing helpers/tests]

- [x] 10. 对齐 CI 验证链并完成收缩后的端到端冒烟确认

  **What to do**: 在所有删减与修复完成后，按 CI 顺序执行 `typecheck`、`lint`、`build`、`test:unit`，必要时更新 smoke 脚本只覆盖保留功能；再补一轮真实浏览器冒烟，确认登录、核心导航、KB、Path、Goals、Workspace、Settings 均可进入且已删除页面/API 不再暴露。保存命令输出与截图证据。
  **Must NOT do**: 不要跳过现有 CI 任一步骤；不要把失败测试简单移出脚本；不要只验证首页就宣称完成。

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — Reason: 最终质量关口，需要命令验证与真实页面冒烟双证据
  - Skills: [`verification-before-completion`, `git-master`] — 需要先拿到证据再宣称完成，并整理最终提交
  - Omitted: [`subagent-driven-development`] — 最终验证需要统一视角整体验收

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [Final Verification Wave] | Blocked By: [1, 4, 5, 6, 7, 8, 9]

  **References** (executor has NO interview context — be exhaustive):
  - CI source: `.github/workflows/web-ci.yml:9` — 最终验证必须遵循 verify job 顺序
  - Scripts: `apps/web/package.json:5` — `build`/`lint`/`typecheck`/`test:unit`/`test:smoke` 定义
  - Kept routes: `apps/web/src/components/layout/AppSidebar.tsx:34` — 用于最终浏览器冒烟比对保留入口
  - Removed route examples: `apps/web/src/app/community/page.tsx`, `apps/web/src/app/collab/page.tsx`, `apps/web/src/app/resources/page.tsx` — 用于确认 404/缺失

  **Acceptance Criteria** (agent-executable only):
  - [ ] `pnpm --filter @edunexus/web typecheck` 通过
  - [ ] `pnpm --filter @edunexus/web lint` 通过
  - [ ] `pnpm --filter @edunexus/web build` 通过
  - [ ] `pnpm --filter @edunexus/web test:unit` 通过；若保留 `test:smoke`，其脚本已适配收缩范围并通过
  - [ ] 浏览器冒烟覆盖登录、核心导航、KB、Path、Goals、Workspace、Settings 与已删除页面 404 行为

  **QA Scenarios** (MANDATORY — task incomplete without these):
  ```
  Scenario: Full CI-aligned verification passes
    Tool: Bash
    Steps: Run `pnpm --filter @edunexus/web typecheck && pnpm --filter @edunexus/web lint && pnpm --filter @edunexus/web build && pnpm --filter @edunexus/web test:unit`.
    Expected: Combined command exits 0.
    Evidence: .sisyphus/evidence/task-10-final-verification.txt

  Scenario: Browser smoke confirms retained vs removed surface boundaries
    Tool: Playwright
    Steps: Login, visit each retained route; then directly visit `/community`, `/collab`, `/resources`, `/workspace/analytics`.
    Expected: Retained routes load; removed routes resolve to 404/absence with no console errors.
    Evidence: .sisyphus/evidence/task-10-final-verification-error.png
  ```

  **Commit**: YES | Message: `chore(core): verify shrunken auth build` | Files: [updated smoke scripts if needed, evidence-linked verification adjustments]

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit after Task 2: `fix(auth): unify route protection and session contract`
- Commit after Task 5: `refactor(app): remove non-core demo surfaces`
- Commit after Task 8: `refactor(store): shrink json persistence to workspace core`
- Commit after Task 10: `chore(core): verify shrunken auth build`

## Success Criteria
- 认证保护链路只依赖 Auth.js 官方方式，未登录访问核心页面时行为一致
- 核心学习链路仍可进入并完成基础读写/会话操作
- 保留链路里不存在硬编码 `demo_user` / `user_1` / 客户端提交 `userId` 的授权模式
- 已删除功能面无页面、无 API、无导航、无布局残留
- 测试、类型检查、构建都能在现有 CI 顺序中通过

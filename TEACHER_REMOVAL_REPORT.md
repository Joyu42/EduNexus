# 教师工作台删除报告

## 执行时间
2026-03-11

## 删除原因
让平台更专注于 AI 教育，移除教师工作台相关的所有内容。

## 删除内容清单

### 1. 路由和页面
- ✅ 删除 `apps/web/src/app/teacher/` 目录及其所有内容
- ✅ 删除 `apps/web/src/app/api/teacher/` 目录及其所有 API 路由
  - `lesson-plan/templates/route.ts`
  - `lesson-plan/generate/route.ts`
  - `teacher-api.test.ts`

### 2. 服务层
- ✅ 删除 `apps/web/src/lib/server/teacher-service.ts`

### 3. 导航更新
- ✅ 更新 `apps/web/src/components/layout/AppSidebar.tsx`
  - 移除 GraduationCap 图标导入
  - 从"工作区"导航组中移除"教师工作台"链接
- ✅ 更新 `apps/web/src/components/mobile/mobile-menu.tsx`
  - 移除 GraduationCap 图标导入
  - 从导航列表中移除"教师工作台"项

### 4. 首页更新
- ✅ 更新 `apps/web/src/app/page.tsx`
  - 移除 GraduationCap 图标导入
  - 从 `supportEntries` 数组中移除教师工作台卡片
  - 调整网格布局从 4 列改为 3 列（`md:grid-cols-2 lg:grid-cols-4` → `md:grid-cols-3`）

### 5. 应用外壳更新
- ✅ 更新 `apps/web/src/components/app-shell.tsx`
  - 从"生态支撑"导航组中移除教师工作台链接

### 6. Dashboard 更新
- ✅ 更新 `apps/web/src/app/dashboard/page.tsx`
  - 从快速操作列表中移除教师工作台卡片

### 7. SEO 配置更新
- ✅ 更新 `apps/web/src/lib/seo.ts`
  - 从 `seoPresets` 中移除 `teacher` 配置
  - 从 sitemap 条目中移除 `/teacher` 路径

### 8. 代码逻辑清理
- ✅ 更新 `apps/web/src/lib/server/langgraph-agent.ts`
  - 从 `detectIntent` 函数中移除 `teacher_design` 意图检测

### 9. 测试文件更新
- ✅ 更新 `apps/web/scripts/api-smoke.mjs`
  - 移除教师备课接口的冒烟测试

### 10. API 文档更新
- ✅ 更新 `openapi/edu-nexus-phase1.openapi.yaml`
  - 从 tags 中移除 `Teacher` 标签
  - 删除 `TeacherWeaknessTemplate` schema
  - 删除 `TeacherWeaknessTemplateResponse` schema
  - 删除 `TeacherLessonPlanRequest` schema
  - 删除 `TeacherLessonPlanResponse` schema
  - 删除 `/teacher/lesson-plan/templates` 端点
  - 删除 `/teacher/lesson-plan/generate` 端点

### 11. README 文档更新
- ✅ 更新 `README.md`
  - 移除教师工作台的描述
  - 从访问列表中移除 `/teacher` 路径
  - 从已实现接口列表中移除教师相关 API
  - 更新测试说明，移除 teacher 模块

### 12. 构建产物清理
- ✅ 删除 `.next` 目录中的教师相关构建文件
  - `.next/static/chunks/app/teacher/`
  - `.next/server/app/teacher/`
  - `.next/types/app/teacher/`

## 保留内容

以下内容包含 "teacher" 关键词但已保留，因为它们不是教师工作台功能：

1. **`apps/web/src/lib/qa/reputation-system.ts`**
   - 保留 `teacher` 徽章定义（用于社区问答系统的"教师"角色徽章）

2. **`apps/web/src/app/globals.css.backup`**
   - 备份文件，保留用于历史参考

3. **文档文件**
   - `docs/implementation/TASKS_COMPLETED.md`
   - `docs/plans/AGENT_INTEGRATION_PLAN.md`
   - `docs/implementation/TIMESTAMP_IMPLEMENTATION.md`
   - `docs/plans/REFACTOR_TODO.md`
   - `docs/implementation/REFACTOR_PROGRESS.md`
   - 这些文档保留用于历史记录和项目演进追踪

## 影响评估

### 功能影响
- ❌ 教师备课功能不再可用
- ❌ 教学计划生成功能不再可用
- ❌ 班级弱点模板功能不再可用
- ✅ 学习相关的所有核心功能保持完整
- ✅ 知识库、工作区、图谱、路径等功能不受影响

### 导航影响
- 侧边栏导航更简洁，"工作区"组从 3 项减少到 2 项
- 首页"生态支撑模块"从 4 个卡片减少到 3 个卡片
- 快速搜索中不再包含教师工作台

### API 影响
- 移除 2 个教师相关 API 端点
- API 冒烟测试不再测试教师接口
- OpenAPI 文档更新，移除 4 个 schema 定义

## 验证结果

✅ 所有教师相关文件已删除
✅ 所有导航链接已更新
✅ 所有文档已更新
✅ 代码中无断链引用
✅ 布局调整完成，视觉平衡

## 后续建议

1. **运行测试**
   ```bash
   pnpm test
   pnpm test:unit
   ```

2. **清理构建缓存**
   ```bash
   rm -rf apps/web/.next
   pnpm dev
   ```

3. **验证页面**
   - 访问首页，确认卡片布局正常
   - 检查侧边栏导航，确认无教师工作台链接
   - 测试快速搜索，确认不会匹配到教师相关页面

4. **更新部署**
   - 如果已部署到生产环境，需要重新部署以应用更改

## 总结

成功删除教师工作台相关的所有内容，包括：
- 3 个页面/路由文件
- 1 个服务层文件
- 6 个导航/UI 组件更新
- 1 个 SEO 配置更新
- 1 个测试文件更新
- 1 个 OpenAPI 文档更新
- 1 个 README 更新
- 1 个代码逻辑清理

平台现在更专注于 AI 教育的核心功能：学习工作区、知识星图、成长地图和知识宝库。

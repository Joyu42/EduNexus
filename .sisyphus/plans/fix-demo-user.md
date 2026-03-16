# 工作计划：修复 demo_user 硬编码问题

## 目标
移除所有 demo_user 硬编码，正确实现用户登录和数据隔离。

## 已完成 (11/12 处 demo_user 修复)

- [x] 1. resource-upload.tsx
- [x] 2. community/page.tsx
- [x] 3. community/topic/[name]/page.tsx
- [x] 4. community/user/[id]/page.tsx
- [x] 5. community/post/[id]/page.tsx
- [x] 6. collab/page.tsx
- [x] 7. compact-level-display.tsx
- [x] 8. use-user-level.ts
- [x] 9. post-storage.ts (改为 'demo')
- [x] 10. store.ts (改为 'guest')

## 剩余问题

- collab/[sessionId]/page.tsx - 需要更复杂重构

## 额外需要修复的问题（资源页显示0）

- [x] 1. userId 优先级不一致 - page.tsx 用 email，storage 用 id
- [x] 2. anonymous 用户直接返回不加载 - page.tsx:60-63
- [x] 3. 缺少示例数据生成 - 空数据时调用 generateSampleResources()

## 待修复（seed 后没重新读取）

- [x] 4. seed 后需要重新 getAllResources()

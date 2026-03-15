# Plan: 清理 demo_user 硬编码引用 + 导入 Demo 内容

**Objective**: 
1. 将所有硬编码的 `demo_user` 替换为从 session 动态获取的用户 ID
2. 从备份 vault 导入 demo 内容供 demo@edunexus.com 展示

**背景**:
- 数据库已迁移完成，KB 核心功能正常
- 备份 vault 位于 `/Users/Ng/workspace/EduNexus/vault/`（6 个 md 文件）
- demo@edunexus.com 需要导入这些文档作为演示内容
- 项目中有 28 个文件仍硬编码 `demo_user` 字符串
- 需要统一改为从 NextAuth session 动态获取 userId

---

## Task 0: 从备份 Vault 导入 Demo 内容（优先执行）

**目标**: 将 `/Users/Ng/workspace/EduNexus/vault/` 的内容导入 demo@edunexus.com 名下

**状态**: `[x] Done`

**步骤**:
1. 修改 `scripts/migrate-vault.ts` 的 VAULT_DIR 路径：
   ```typescript
   // 从
   const VAULT_DIR = path.join(process.cwd(), 'vault');
   // 改为
   const VAULT_DIR = '/Users/Ng/workspace/EduNexus/vault';
   ```

2. 先清空 demo 用户的现有文档（可选，避免重复）：
   ```bash
   node -e 'const {PrismaClient}=require("@prisma/client");const p=new PrismaClient();p.document.deleteMany({where:{authorId:(await p.user.findUnique({where:{email:"demo@edunexus.com"}}))?.id}}).then(()=>p.$disconnect());'
   ```

3. 运行迁移脚本：
   ```bash
   npx tsx scripts/migrate-vault.ts
   ```

4. 验证导入结果：
   ```bash
   node -e 'const {PrismaClient}=require("@prisma/client");const p=new PrismaClient();p.document.count({where:{authorId:(await p.user.findUnique({where:{email:"demo@edunexus.com"}}))?.id}}).then(c=>console.log("Demo docs:",c)).finally(()=>p.$disconnect());'
   ```

**预期结果**: demo@edunexus.com 名下有 6 篇文档

---

## 受影响文件清单

### 1. 核心服务（必须修复）
| 文件 | 当前模式 | 修复方式 |
|------|---------|---------|
| `apps/web/src/lib/server/session-service.ts` | `userId \|\| 'demo_user'` | 改为 `userId`（必需参数） |
| `apps/web/src/lib/server/store.ts` | `session.userId ?? "demo_user"` | 使用 `auth()` 获取真实 userId |

### 2. API 路由（必须修复）
| 文件 | 当前模式 | 修复方式 |
|------|---------|---------|
| `apps/web/src/app/api/workspace/agent/run/route.ts` | `'demo_user'` | 从 session 获取 |
| `apps/web/src/app/api/workspace/session/route.ts` | `userId \|\| 'demo_user'` | 从 session 获取 |
| `apps/web/src/app/api/user/level/route.ts` | `currentUserId \|\| 'demo_user'` | 移除 fallback |
| `apps/web/src/app/api/user/achievements/route.ts` | `searchParams.get('userId') \|\| 'demo_user'` | 从 session 获取 |
| `apps/web/src/app/api/analytics/*/route.ts` (3 个) | `userId \|\| 'demo_user'` | 从 session 获取 |
| `apps/web/src/app/api/collab/session/route.ts` | `userId \|\| 'demo_user'` | 从 session 获取 |
| `apps/web/src/app/api/user/experience/add/route.ts` | `validated.userId \|\| 'demo_user'` | 从 session 获取 |

### 3. 前端页面（可选修复）
| 文件 | 当前模式 | 修复方式 |
|------|---------|---------|
| `apps/web/src/app/community/page.tsx` | `CURRENT_USER_ID = 'demo_user'` | 动态获取 |
| `apps/web/src/app/resources/page.tsx` | `userId = "demo_user"` | 动态获取 |
| `apps/web/src/app/collab/page.tsx` | `userId: "demo_user"` | 动态获取 |
| 其他 community/* 页面 (4 个) | `CURRENT_USER_ID = 'demo_user'` | 动态获取 |

### 4. 组件（可选修复）
| 文件 | 当前模式 | 修复方式 |
|------|---------|---------|
| `apps/web/src/components/compact-level-display.tsx` | `userId = 'demo_user'` | 从 props/session 获取 |
| `apps/web/src/components/resources/resource-card.tsx` | `"demo_user"` | 从 context 获取 |

---

## 修复模式

### 模式 A：API 路由（推荐）
```typescript
// 之前
const userId = queryUserId || 'demo_user';

// 之后
const session = await auth();
const userId = session?.user?.id;
if (!userId) {
  return fail({ code: 'UNAUTHORIZED', message: '请先登录' }, 401);
}
```

### 模式 B：前端组件
```typescript
// 之前
const userId = 'demo_user';

// 之后
const { data: session } = useSession();
const userId = session?.user?.id;
```

---

## Task 规划

### Task 1: 核心服务修复
- [x] `session-service.ts` - 移除 demo_user fallback
- [ ] `store.ts` - 改用 auth()

### Task 2: API 路由修复
- [x] `workspace/agent/run/route.ts`
- [x] `workspace/session/route.ts`
- [x] `user/level/route.ts`
- [x] `user/achievements/route.ts`
- [x] `analytics/weekly-report/route.ts`
- [x] `analytics/monthly-report/route.ts`
- [x] `analytics/insights/route.ts`
- [x] `collab/session/route.ts`
- [x] `user/experience/add/route.ts`

### Task 3: 前端页面修复（剩余 16 个文件）
- [ ] community/page.tsx
- [ ] community/topic/[name]/page.tsx
- [ ] community/user/[id]/page.tsx
- [ ] community/post/[id]/page.tsx
- [ ] resources/page.tsx
- [ ] collab/page.tsx
- [ ] collab/[sessionId]/page.tsx
- [ ] user-level/page.tsx

### Task 4: 组件修复
- [ ] compact-level-display.tsx
- [ ] resources/resource-card.tsx
- [ ] resources/resource-upload.tsx

### Task 5: 验证
- [ ] `pnpm typecheck` 通过

---

## 注意事项

1. **向后兼容**：某些 API 可能需要支持 `?userId=xxx` 查询参数用于管理员查看他人数据
2. **测试覆盖**：确保 community、analytics、resources、collab 等功能在已登录用户下正常工作
3. **类型安全**：使用 `getCurrentUserId()` 工具函数简化代码

# 实施计划: 用户认证与数据隔离

> **给 Claude 的指令:** 使用 `superpowers/executing-plans` 技能，按任务逐一执行此计划。

**🎯 目标:** 为 EduNexus 添加完整的用户认证系统，并实现用户数据的完全隔离，将应用从"单机演示版"升级为"多用户在线版"。

**🏗️ 核心架构:**
1.  **认证库:** 使用 **Auth.js (NextAuth.js v5)**，它是 Next.js App Router 的官方标准。
2.  **认证方式:** 提供 **GitHub** 和 **Credentials (邮箱+密码)** 两种登录方式。
3.  **会话管理:** 使用 **JWT (JSON Web Token)** 进行会话管理。
4.  **数据隔离:** 在 **API 层**、**服务层** 和 **客户端存储层** 全面引入 `userId` 作为数据隔离键。

**🔧 技术栈:**
*   `next-auth@5.0.0-beta`
*   `bcryptjs` (密码哈希)
*   `Zod` (后端校验)

---

## 🔐 阶段一: 认证基础设置 (Auth.js)

### 任务 1.1: 安装依赖并配置环境变量

**文件:**
*   修改: `apps/web/package.json`
*   修改: `.env.example`
*   创建: `.env`

**步骤 1: 安装依赖**
运行以下命令安装 `Auth.js` 和 `bcrypt`。

```bash
pnpm --filter @edunexus/web add next-auth@5.0.0-beta.19 bcryptjs @types/bcryptjs
```

**步骤 2: 更新环境变量**
在 `.env.example` 和 `.env` 文件中添加以下配置。

```dotenv
# .env.example & .env

# Auth.js
AUTH_SECRET="your_strong_secret_here" # 运行 openssl rand -hex 32 生成
AUTH_URL="http://localhost:3000"

# GitHub Provider
AUTH_GITHUB_ID="your_github_client_id"
AUTH_GITHUB_SECRET="your_github_client_secret"
```

**步骤 3: 提交变更**

```bash
git add apps/web/package.json pnpm-lock.yaml .env.example
git commit -m "feat(auth): install next-auth and configure env"
```

---

### 任务 1.2: 创建 Auth.js 核心配置

**文件:**
*   创建: `apps/web/auth.ts`
*   创建: `apps/web/src/app/api/auth/[...nextauth]/route.ts`

**步骤 1: 创建 `auth.ts` 配置文件**

```typescript
// apps/web/auth.ts
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { z } from 'zod';
import { getUserByEmail, verifyPassword, createUser } from '@/lib/server/user-service'; // 我们稍后创建

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub,
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: "邮箱", type: "text" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        const parsedCredentials = z.object({
          email: z.string().email(),
          password: z.string().min(6),
        }).safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUserByEmail(email);
          if (!user || !user.password) return null;

          const passwordsMatch = await verifyPassword(password, user.password);
          if (passwordsMatch) return user;
        }
        return null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id; // 将用户ID添加到JWT
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string; // 将用户ID添加到session
      }
      return session;
    },
  },
  pages: {
    signIn: '/login', // 指定自定义登录页面
  },
  session: { strategy: 'jwt' },
});
```

**步骤 2: 创建 API 路由 Handler**

```typescript
// apps/web/src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;
export const runtime = 'nodejs';
```

**步骤 3: 提交变更**

```bash
git add apps/web/auth.ts apps/web/src/app/api/auth/[...nextauth]/route.ts
git commit -m "feat(auth): set up core next-auth config and api route"
```

---

### 任务 1.3: 创建认证中间件

**文件:**
*   创建: `apps/web/middleware.ts`

**步骤 1: 创建中间件**

```typescript
// apps/web/middleware.ts
import { auth } from "@/auth";

export default auth;

export const config = {
  matcher: ['/((?!api/|_next/|static/|public/|.*\\..*).*)'],
};
```

**步骤 2: 提交变更**

```bash
git add apps/web/middleware.ts
git commit -m "feat(auth): add middleware to protect routes"
```

---

## 👤 阶段二: 用户服务与数据隔离

### 任务 2.1: 创建用户服务层

**文件:**
*   创建: `apps/web/src/lib/server/user-service.ts`
*   创建: `apps/web/src/lib/server/types/user.ts`
*   修改: `apps/web/src/lib/server/store.ts`

**步骤 1: 定义用户类型**

```typescript
// apps/web/src/lib/server/types/user.ts
export type User = {
  id: string;
  name?: string | null;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
  password?: string; // 仅用于 Credentials 登录
  createdAt: Date;
};
```

**步骤 2: 在 `store.ts` 的 `DbSchema` 中添加 `users`**

```typescript
// apps/web/src/lib/server/store.ts

// ...
import type { User } from './types/user';

type DbSchema = {
  users: User[]; // <-- 新增
  sessions: SessionRecord[];
  // ...
};

const DEFAULT_DB: DbSchema = {
  users: [], // <-- 新增
  sessions: [],
  // ...
};
```

**步骤 3: 创建 `user-service.ts`**

```typescript
// apps/web/src/lib/server/user-service.ts
import bcrypt from 'bcryptjs';
import { loadDb, saveDb, DbSchema } from './store';
import type { User } from './types/user';

async function getUserStore(): Promise<DbSchema> {
  return await loadDb();
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const db = await getUserStore();
  return db.users.find(u => u.email === email) ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const db = await getUserStore();
  return db.users.find(u => u.id === id) ?? null;
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return await bcrypt.compare(plain, hashed);
}

export async function createUser(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  const db = await getUserStore();
  const hashedPassword = data.password ? await bcrypt.hash(data.password, 10) : undefined;
  
  const newUser: User = {
    id: `user_${Date.now()}`,
    ...data,
    password: hashedPassword,
    createdAt: new Date(),
  };

  db.users.push(newUser);
  await saveDb(db);
  return newUser;
}
```

**步骤 4: 提交变更**

```bash
git add apps/web/src/lib/server/user-service.ts apps/web/src/lib/server/types/user.ts apps/web/src/lib/server/store.ts
git commit -m "feat(user): create user service and integrate into db schema"
```

---

### 任务 2.2: 改造服务端 API (数据隔离)

**文件:**
*   创建: `apps/web/src/lib/server/auth-utils.ts`
*   修改: 所有包含 `demo_user` 的 API 和服务文件

**步骤 1: 创建获取当前用户的工具函数**

```typescript
// apps/web/src/lib/server/auth-utils.ts
import { auth } from '@/auth';

export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
```

**步骤 2: 重构 API 路由**
将所有 `userId = 'demo_user'` 的地方替换为从会话中获取。

```typescript
// apps/web/src/app/api/user/level/route.ts
import { getCurrentUserId } from '@/lib/server/auth-utils';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    // ... 原有逻辑，但将 userId 传递下去
  } // ...
}
```

**步骤 3: 重构服务层**
确保所有服务函数都接收 `userId` 参数。

```typescript
// apps/web/src/lib/server/session-service.ts
export async function createSession(input: { title?: string }, userId: string) {
  // ...
  const session = {
    // ...
    userId: userId, //不再是 'demo_user'
    // ...
  };
  // ...
}
```

**步骤 4: 提交变更 (分多次提交)**

```bash
git add apps/web/src/lib/server/auth-utils.ts
git commit -m "refactor(auth): create getCurrentUserId utility"

# 逐个文件修改并提交
git add .
git commit -m "refactor(api): isolate server data by session userId"
```

---

### 任务 2.3: 隔离客户端存储

**文件:**
*   修改: `apps/web/src/lib/client/kb-storage.ts`
*   修改: `apps/web/src/lib/profile/profile-storage.ts`

**步骤 1: 使用 `useSession` Hook 获取用户 ID**
在需要隔离数据的客户端组件或 Hook 中，使用 `useSession` 获取当前用户。

```tsx
// 示例组件中
import { useSession } from "next-auth/react";

function MyComponent() {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  // ...
}
```

**步骤 2: 改造 localStorage 存储 Key**

```typescript
// apps/web/src/lib/profile/profile-storage.ts
const getStorageKey = (base: string, userId: string) => `edunexus_${base}_${userId}`;
// ...
export function getUserProfile(userId: string): UserProfile | null {
  const key = getStorageKey('user_profiles', userId);
  // ...
}
```

**步骤 3: 改造 IndexedDB Store**

```typescript
// apps/web/src/lib/client/kb-storage.ts
export type KBDocument = {
  userId: string; // <-- 新增字段
  id: string;
  // ...
};

// 在 onupgradeneeded 中创建 userId 索引
docStore.createIndex("by_user", ["userId", "updatedAt"]);

// 在查询函数中
async function getDocumentsForUser(userId: string): Promise<KBDocument[]> {
  const tx = this.db!.transaction(STORE_DOCUMENTS, 'readonly');
  const index = tx.store.index('by_user');
  return index.getAll(IDBKeyRange.bound([userId, ''], [userId, '\uffff']));
}
```

**步骤 4: 提交变更**
```bash
git commit -m "refactor(client): isolate localStorage and IndexedDB by userId"
```

---

## 🎨 阶段三: UI & 用户体验

### 任务 3.1: 创建登录/注册页面

**文件:**
*   创建: `apps/web/src/app/(auth)/login/page.tsx`
*   创建: `apps/web/src/app/(auth)/register/page.tsx`

**步骤 1: 创建 `(auth)` 布局**
用于包裹登录/注册页面的居中布局。

**步骤 2: 创建登录页面**
使用 `shadcn/ui` 组件构建登录表单。

**步骤 3: 创建注册页面**
创建新用户注册表单。

**步骤 4: 提交变更**
```bash
git add apps/web/src/app/\(auth\)/
git commit -m "feat(ui): add login and register pages"
```

---

### 任务 3.2: 添加用户下拉菜单

**文件:**
*   创建: `apps/web/src/components/global/user-dropdown.tsx`
*   修改: `apps/web/src/components/app-shell.tsx`

**步骤 1: 创建 `UserDropdown` 组件**

```tsx
// apps/web/src/components/global/user-dropdown.tsx
'use client';
import { useSession, signOut } from 'next-auth/react';
import { Avatar, DropdownMenu, ... } from '@/components/ui';

export function UserDropdown() {
  const { data: session } = useSession();
  if (!session?.user) return <Button>登录</Button>; // 或链接到 /login

  return (
    <DropdownMenu>
      {/* ... */}
      <DropdownMenuItem onClick={() => signOut()}>退出登录</DropdownMenuItem>
    </DropdownMenu>
  );
}
```

**步骤 2: 集成到主布局**
在 `app-shell.tsx` 的右上角添加 `UserDropdown`。

**步骤 3: 创建 AuthProvider**
在根布局中包裹 `SessionProvider`。

```tsx
// apps/web/src/app/providers.tsx
'use client';
import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

// apps/web/src/app/layout.tsx
// ...
<Providers>
  {children}
</Providers>
//...
```

**步骤 4: 提交变更**

```bash
git add .
git commit -m "feat(ui): add user dropdown menu and session provider"
```

---

## 🧹 阶段四: 清理与修正

### 任务 4.1: 修正 README 文档

**文件:**
*   修改: `README.md`

**步骤 1: 修正端口号**
将文档中所有 `localhost:3002` 的引用修改为 `localhost:3000`。

**步骤 2: 提交变更**
```bash
git add README.md
git commit -m "docs: correct development port to 3000"
```
---

## ✅ 阶段五: 测试与验证

### 任务 5.1: 端到端测试

*   **场景 1**: 使用 GitHub 登录 -> 创建笔记 -> 登出。
*   **场景 2**: 注册新用户 -> 登录 -> 修改个人资料 -> 登出。
*   **场景 3**: 登录用户 A，创建笔记；登出后登录用户 B，确认看不到用户 A 的笔记。
*   **场景 4**: 未登录状态下访问 `/workspace`，应自动跳转到 `/login` 页面。

完成以上所有阶段，EduNexus 将成功升级为支持多用户的应用。

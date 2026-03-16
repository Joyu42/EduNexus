# 修复计划：用户隔离与认证保护

## 问题总结

用户反馈：**不登录也能看到应该隔离的内容**

### 根本原因

1. **前端使用本地存储** - IndexedDB/localStorage 无用户隔离
2. **硬编码 demo_user** - 前端直接带参数绕过认证
3. **部分页面无认证保护** - Middleware 只保护页面路由，不保护本地存储

---

## 需要修复的功能（按用户隔离）

### 🔴 高优先级 - 必须修复

#### 1. 成长地图 (/user-level)
**问题**: 硬编码 `userId=demo_user` 请求 API
**修复**: 
- 使用 `useSession()` 获取真实 userId
- 未登录时显示登录提示

#### 2. 知识星图 (/graph)
**问题**: 需要检查是否使用本地数据
**修复**:
- 确认使用 `/api/graph/view` (已保护)
- 未登录重定向到登录页

#### 3. 学习工作区 (/workspace) 
**问题**: 使用本地存储 (chat history, teachers)
**修复**:
- 添加 `useSession()` 检查
- 未登录显示登录界面

#### 4. 学习分析 (/dashboard 或 /analytics)
**问题**: 需要确认路由和存储方式
**修复**:
- 确保 API 已认证
- 前端添加登录检查

### 🟡 中优先级 - 需要服务器存储

#### 5. 学习路径 (/learning-paths)
**问题**: 使用 `pathStorage` (IndexedDB)
**方案**: 
- 短期：添加登录检查，本地数据按 userId 隔离
- 长期：迁移到服务器存储

#### 6. 目标管理 (/goals)
**问题**: 使用 `goalStorage` (localStorage)
**方案**:
- 短期：添加登录检查，本地数据按 userId 隔离
- 长期：迁移到服务器存储

---

## 可以保持公开的功能

- **资源中心** (/resources) - 公共资源库
- **学习社区** (/community/*) - 社区内容
- **学习小组** (/groups) - 公开小组信息

---

## 修复步骤

### Phase 1: 立即修复（认证检查）
1. [ ] /user-level - 移除硬编码 demo_user
2. [ ] /graph - 确认 API 认证，添加登录检查
3. [ ] /workspace - 添加登录检查
4. [ ] /analytics - 添加登录检查

### Phase 2: 本地存储隔离（短期方案）
5. [ ] /learning-paths - 本地存储 key 添加 userId 前缀
6. [ ] /goals - 本地存储 key 添加 userId 前缀

### Phase 3: 服务器迁移（长期方案）
7. [ ] 创建 learning-path API 路由
8. [ ] 创建 goals API 路由
9. [ ] 前端迁移到服务器 API

---

## 验证清单

- [ ] 未登录访问 /user-level → 重定向到 /login
- [ ] 未登录访问 /graph → 重定向到 /login
- [ ] 未登录访问 /workspace → 重定向到 /login
- [ ] 未登录访问 /learning-paths → 显示登录提示
- [ ] 未登录访问 /goals → 显示登录提示
- [ ] demo@edunexus.com 登录 → 看到自己的数据
- [ ] 其他用户登录 → 看到自己的数据（与 demo 隔离）

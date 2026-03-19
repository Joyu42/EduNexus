# 协作编辑系统 (Collaborative Editing System)

EduNexus 的实时协作编辑功能，支持多人同时编辑文档和代码。

## 功能特性

### ✅ 核心功能
- **实时协作编辑** - 多人同时编辑，实时同步
- **用户光标显示** - 显示其他用户的光标位置和选区
- **冲突自动解决** - 使用 Operational Transformation 算法
- **版本控制** - 自动保存版本快照，支持版本对比和回滚
- **权限管理** - 角色系统（所有者、编辑者、评论者、查看者）
- **实时聊天** - 会话内置聊天功能
- **分享邀请** - 通过链接或邀请码分享会话

### 📁 文件结构

```
apps/web/src/
├── app/
│   ├── api/collab/              # API 路由
│   │   ├── session/route.ts     # 会话管理
│   │   ├── chat/route.ts        # 聊天功能
│   │   └── version/route.ts     # 版本管理
│   └── collab/                  # 页面
│       ├── page.tsx             # 会话列表
│       └── [sessionId]/page.tsx # 协作编辑器
├── components/collab/           # UI 组件
│   ├── collab-editor.tsx        # 协作编辑器
│   ├── online-users.tsx         # 在线用户列表
│   ├── session-chat.tsx         # 会话聊天
│   ├── version-history.tsx      # 版本历史
│   ├── share-dialog.tsx         # 分享对话框
│   ├── permission-manager.tsx   # 权限管理
│   └── user-cursors.tsx         # 用户光标
└── lib/collab/                  # 核心库
    ├── collab-types.ts          # 类型定义
    ├── collab-storage.ts        # 数据存储 (IndexedDB)
    ├── collab-client.ts         # 协作客户端
    ├── sync-engine.ts           # 同步引擎
    ├── conflict-resolver.ts     # 冲突解决
    └── version-manager.ts       # 版本管理
```

## 快速开始

### 1. 初始化示例数据

```bash
node apps/web/scripts/init-collab-data.mjs
```

### 2. 启动开发服务器

```bash
cd apps/web
npm run dev
```

### 3. 访问协作编辑

```
http://localhost:3000/collab
```

## 使用指南

### 创建协作会话

1. 访问 `/collab` 页面
2. 点击"新建会话"
3. 填写会话信息（标题、类型、语言等）
4. 开始编辑

### 邀请协作者

1. 点击"分享"按钮
2. 复制邀请链接或邀请码
3. 发送给协作者
4. 协作者通过链接加入

### 实时编辑

- 在编辑器中输入内容
- 自动同步到其他用户
- 查看其他用户的光标位置
- 冲突自动解决

### 版本管理

- 系统每 5 分钟自动保存
- 手动点击"保存"创建快照
- 查看版本历史
- 对比版本差异
- 回滚到历史版本

### 权限管理

- 所有者：完全控制
- 编辑者：可以编辑和分享
- 评论者：只能评论
- 查看者：只能查看

## API 接口

### 会话管理

```typescript
// 创建会话
POST /api/collab/session
Body: { title, documentType, language?, content? }

// 获取会话列表
GET /api/collab/session?userId=xxx

// 获取单个会话
GET /api/collab/session?id=xxx&userId=xxx

// 更新会话
PATCH /api/collab/session?id=xxx
Body: { title?, content?, isPublic? }

// 删除会话
DELETE /api/collab/session?id=xxx&userId=xxx
```

### 聊天功能

```typescript
// 获取聊天记录
GET /api/collab/chat?sessionId=xxx

// 发送消息
POST /api/collab/chat
Body: { sessionId, content, userId, userName }
```

### 版本管理

```typescript
// 获取版本历史
GET /api/collab/version?sessionId=xxx

// 创建版本快照
POST /api/collab/version
Body: { sessionId, content, userId, userName, description? }
```

## 技术实现

### 实时同步
- 使用 Operational Transformation (OT) 算法
- 操作批处理和增量同步
- 自动重连和断线恢复

### 冲突解决
- 插入-插入冲突：按位置调整
- 删除-删除冲突：保留较早操作
- 插入-删除冲突：调整位置

### 数据存储
- 客户端：IndexedDB
- 服务端：JSON 文件
- 支持导出和备份

## 示例数据

运行初始化脚本后，将创建 3 个示例会话：

1. **React 组件设计文档** (Markdown)
   - 邀请码: REACT2024
   - 讨论 React 组件架构设计

2. **算法实现：快速排序** (JavaScript)
   - 邀请码: ALGO2024
   - 协作实现快速排序算法

3. **项目需求文档** (Markdown)
   - 邀请码: EDUNEXUS
   - EduNexus 新功能需求讨论

## 文档

- **系统文档**: `docs/COLLAB_SYSTEM.md` - 完整的技术文档
- **快速开始**: `docs/COLLAB_QUICKSTART.md` - 快速上手指南

## 性能优化

- 编辑器虚拟滚动
- 操作批处理
- 增量同步
- 数据压缩
- 定期清理旧数据

## 安全考虑

- 权限验证
- 数据加密（计划中）
- 防止滥用
- 敏感信息保护

## 未来改进

- [ ] WebSocket 实时通信
- [ ] Yjs CRDT 实现
- [ ] 语音/视频通话
- [ ] 评论和批注
- [ ] Git 集成
- [ ] AI 辅助编辑

## 故障排查

### 编辑器不显示
- 检查 Monaco Editor 是否加载
- 查看浏览器控制台错误
- 确认依赖已安装

### 同步失败
- 检查网络连接
- 查看 API 响应
- 检查 IndexedDB

### 权限错误
- 确认用户角色
- 检查会话权限
- 验证 API 权限

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

---

**EduNexus** - 智能教育平台

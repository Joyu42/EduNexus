# 知识星图测试数据使用指南

## 概述

本目录包含知识星图的测试数据生成器和初始化工具，用于快速创建丰富的测试数据。

## 文件说明

- `knowledge-graph-data.ts` - 测试数据定义和初始化函数
- `test-init.ts` - 测试工具和验证脚本

## 测试数据内容

### 1. 知识库文档（16个）

包含多个主题的文档，涵盖：
- 前端开发（React、JavaScript、CSS、TypeScript）
- 后端开发（Node.js、Express、RESTful API）
- 数据库（SQL、数据库设计）
- 算法与数据结构
- 开发工具（Git、Docker）

每个文档都包含：
- 双链语法 `[[文档名]]` 用于文档间关联
- 多个标签用于分类
- 不同的创建时间

### 2. 学习路径（3条）

- **前端开发完整路径**（初级，1200分钟）
  - HTML 基础 → CSS 基础 → JavaScript 基础 → React 入门 → 前端项目实战

- **后端开发进阶路径**（中级，1500分钟）
  - Node.js 基础 → Express 框架 → SQL 数据库 → RESTful API 设计 → 后端项目实战

- **全栈开发大师之路**（高级，2400分钟）
  - React 高级特性 + Node.js 进阶 → TypeScript 全栈应用 → 数据库设计与优化 → Docker 容器化 → CI/CD 自动化部署 → 全栈项目实战

### 3. 资源（12个）

包含多种类型的资源：
- 文档（官方文档、教程）
- 视频（课程、教学视频）
- 书籍（经典教材）
- 工具（开发工具、编辑器）
- 网站（参考网站）

## 使用方法

### 方法一：在代码中使用

```typescript
import { initializeAllTestData, clearAllTestData } from '@/lib/mock/knowledge-graph-data';

// 初始化所有测试数据
await initializeAllTestData();

// 清除所有测试数据
await clearAllTestData();
```

### 方法二：在浏览器控制台使用

1. 在应用中导入测试工具：

```typescript
import '@/lib/mock/test-init';
```

2. 打开浏览器控制台，运行以下命令：

```javascript
// 完整测试（清除旧数据 + 初始化 + 验证）
await testInit();

// 快速初始化（不清除旧数据）
await quickInit();

// 清除所有测试数据
await clearData();
```

### 方法三：创建初始化页面

创建一个管理页面，添加初始化按钮：

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { initializeAllTestData, clearAllTestData } from '@/lib/mock/knowledge-graph-data';

export default function TestDataManager() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInit = async () => {
    setLoading(true);
    try {
      await initializeAllTestData();
      setMessage('测试数据初始化成功！');
    } catch (error) {
      setMessage('初始化失败：' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      await clearAllTestData();
      setMessage('测试数据已清除！');
    } catch (error) {
      setMessage('清除失败：' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">测试数据管理</h1>
      <div className="space-x-4">
        <Button onClick={handleInit} disabled={loading}>
          初始化测试数据
        </Button>
        <Button onClick={handleClear} disabled={loading} variant="destructive">
          清除测试数据
        </Button>
      </div>
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
```

## 学习路径保存问题修复

已修复以下问题：

1. **事件检测逻辑错误**
   - 修复了 `savePath` 函数中的 `isNew` 检测逻辑
   - 现在在保存前检查路径是否存在，而不是保存后

2. **添加调试日志**
   - 在 `savePath` 函数中添加了详细的日志输出
   - 在 `path-editor.tsx` 的 `handleSave` 中添加了错误处理和日志

3. **添加验证函数**
   - `verifyPathSaved(pathId)` - 验证路径是否正确保存
   - `getStorageStats()` - 获取存储统计信息

4. **错误处理**
   - 在保存失败时显示具体错误信息
   - 添加 try-catch 块捕获异常

## 验证数据

初始化后，可以通过以下方式验证数据：

```typescript
import { getAllPaths, getStorageStats } from '@/lib/path/path-storage';
import { getKBStorage } from '@/lib/client/kb-storage';
import { getAllResources } from '@/lib/resources/resource-storage';

// 检查学习路径
const paths = await getAllPaths();
console.log('学习路径数量:', paths.length);

// 检查知识库文档
const storage = getKBStorage();
await storage.initialize();
const vaults = await storage.getAllVaults();
const docs = await storage.getDocumentsByVault(vaults[0].id);
console.log('知识库文档数量:', docs.length);

// 检查资源
const resources = getAllResources();
console.log('资源数量:', resources.length);

// 获取存储统计
const stats = await getStorageStats();
console.log('存储统计:', stats);
```

## 注意事项

1. **数据持久化**
   - 知识库文档存储在 IndexedDB 中
   - 学习路径存储在 IndexedDB 中
   - 资源存储在 localStorage 中

2. **浏览器兼容性**
   - 需要浏览器支持 IndexedDB
   - 需要浏览器支持 localStorage

3. **数据量**
   - 初始化会创建大量数据，首次运行可能需要几秒钟
   - 建议在开发环境使用，生产环境谨慎使用

4. **清除数据**
   - `clearAllTestData()` 会删除所有知识库和资源
   - 清除前请确认不会影响重要数据

## 故障排查

### 学习路径无法保存

1. 打开浏览器控制台，查看是否有错误信息
2. 检查 IndexedDB 是否正常工作：
   ```javascript
   // 在控制台运行
   indexedDB.databases().then(console.log);
   ```
3. 查看详细日志：
   ```javascript
   // 保存路径时会输出日志
   [path-storage] 创建路径: { id, title, nodesCount, edgesCount }
   ```

### 知识库文档无法创建

1. 检查 IndexedDB 是否被禁用
2. 查看浏览器存储配额是否已满
3. 检查控制台错误信息

### 资源无法保存

1. 检查 localStorage 是否被禁用
2. 查看 localStorage 配额是否已满
3. 尝试清除 localStorage：
   ```javascript
   localStorage.clear();
   ```

## 开发建议

1. **首次使用**
   - 运行 `testInit()` 进行完整测试
   - 验证所有数据是否正确创建

2. **日常开发**
   - 使用 `quickInit()` 快速添加测试数据
   - 不需要每次都清除旧数据

3. **测试完成**
   - 使用 `clearData()` 清除测试数据
   - 保持开发环境整洁

## 扩展测试数据

如果需要添加更多测试数据，编辑 `knowledge-graph-data.ts`：

```typescript
// 添加更多文档
const KB_DOCUMENTS = [
  // ... 现有文档
  {
    title: '新文档标题',
    content: '文档内容，支持 [[双链]]',
    tags: ['标签1', '标签2'],
  },
];

// 添加更多学习路径
const LEARNING_PATHS = [
  // ... 现有路径
  {
    title: '新学习路径',
    description: '路径描述',
    // ... 其他配置
  },
];

// 添加更多资源
const RESOURCES = [
  // ... 现有资源
  {
    title: '新资源',
    type: 'document',
    // ... 其他配置
  },
];
```

## 技术支持

如有问题，请查看：
- 浏览器控制台的错误信息
- IndexedDB 开发者工具
- localStorage 开发者工具

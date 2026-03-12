/**
 * 知识星图测试数据生成器
 * 包含知识库文档、学习路径、资源等丰富的测试数据
 */

import { KBDocument, KBVault, getKBStorage } from '../client/kb-storage';
import { LearningPath, PathNode, PathEdge, DifficultyLevel } from '../path/path-types';
import { savePath } from '../path/path-storage';
import { Resource, createResource } from '../resources/resource-storage';

// ==================== 知识库文档数据 ====================

const KB_DOCUMENTS: Omit<KBDocument, 'id' | 'createdAt' | 'updatedAt' | 'vaultId'>[] = [
  {
    title: 'React 核心概念',
    content: `# React 核心概念

React 是一个用于构建用户界面的 JavaScript 库。

## 组件化
组件是 React 的核心概念，详见 [[组件生命周期]]。

## 状态管理
使用 useState 和 useReducer 管理状态，参考 [[React Hooks 详解]]。

## 虚拟 DOM
React 使用虚拟 DOM 提升性能，相关内容见 [[性能优化最佳实践]]。

#前端 #React #基础`,
    tags: ['前端', 'React', '基础'],
  },
  {
    title: '组件生命周期',
    content: `# 组件生命周期

## 类组件生命周期
- componentDidMount
- componentDidUpdate
- componentWillUnmount

## 函数组件生命周期
使用 useEffect 模拟生命周期，详见 [[React Hooks 详解]]。

相关概念：[[React 核心概念]]

#前端 #React #生命周期`,
    tags: ['前端', 'React', '生命周期'],
  },
  {
    title: 'React Hooks 详解',
    content: `# React Hooks 详解

Hooks 是 React 16.8 引入的新特性。

## 常用 Hooks
- useState：状态管理
- useEffect：副作用处理，参考 [[组件生命周期]]
- useContext：上下文
- useReducer：复杂状态管理

## 自定义 Hooks
创建可复用的逻辑，详见 [[React 最佳实践]]。

#前端 #React #Hooks`,
    tags: ['前端', 'React', 'Hooks'],
  },
  {
    title: 'Node.js 基础',
    content: `# Node.js 基础

Node.js 是基于 Chrome V8 引擎的 JavaScript 运行时。

## 核心模块
- fs：文件系统
- http：HTTP 服务器
- path：路径处理

## 异步编程
详见 [[JavaScript 异步编程]]。

## Express 框架
参考 [[Express 快速入门]]。

#后端 #Node.js #基础`,
    tags: ['后端', 'Node.js', '基础'],
  },
  {
    title: 'Express 快速入门',
    content: `# Express 快速入门

Express 是 Node.js 的 Web 应用框架。

## 路由
定义应用的端点和响应方式。

## 中间件
处理请求和响应的函数，详见 [[Node.js 中间件模式]]。

## RESTful API
参考 [[RESTful API 设计规范]]。

#后端 #Express #框架`,
    tags: ['后端', 'Express', '框架'],
  },
  {
    title: 'JavaScript 异步编程',
    content: `# JavaScript 异步编程

## 回调函数
最基础的异步模式。

## Promise
解决回调地狱问题。

## async/await
更优雅的异步语法，基于 Promise。

相关：[[Node.js 基础]]、[[前端性能优化]]

#JavaScript #异步 #基础`,
    tags: ['JavaScript', '异步', '基础'],
  },
  {
    title: 'SQL 基础教程',
    content: `# SQL 基础教程

结构化查询语言基础。

## 基本操作
- SELECT：查询
- INSERT：插入
- UPDATE：更新
- DELETE：删除

## 高级查询
详见 [[SQL 高级查询技巧]]。

## 数据库设计
参考 [[数据库设计原则]]。

#数据库 #SQL #基础`,
    tags: ['数据库', 'SQL', '基础'],
  },
  {
    title: '数据库设计原则',
    content: `# 数据库设计原则

## 范式理论
- 第一范式（1NF）
- 第二范式（2NF）
- 第三范式（3NF）

## 索引优化
详见 [[数据库性能优化]]。

## 关系设计
参考 [[SQL 基础教程]]。

#数据库 #设计 #原则`,
    tags: ['数据库', '设计', '原则'],
  },
  {
    title: '算法与数据结构',
    content: `# 算法与数据结构

## 基础数据结构
- 数组
- 链表：详见 [[链表实现与应用]]
- 栈和队列
- 树：参考 [[二叉树遍历算法]]

## 排序算法
详见 [[常见排序算法]]。

#算法 #数据结构 #基础`,
    tags: ['算法', '数据结构', '基础'],
  },
  {
    title: '常见排序算法',
    content: `# 常见排序算法

## 简单排序
- 冒泡排序
- 选择排序
- 插入排序

## 高级排序
- 快速排序
- 归并排序
- 堆排序

时间复杂度分析见 [[算法复杂度分析]]。

#算法 #排序 #进阶`,
    tags: ['算法', '排序', '进阶'],
  },
  {
    title: 'Git 版本控制',
    content: `# Git 版本控制

分布式版本控制系统。

## 基本命令
- git init
- git add
- git commit
- git push

## 分支管理
详见 [[Git 分支策略]]。

## 协作流程
参考 [[团队协作最佳实践]]。

#工具 #Git #版本控制`,
    tags: ['工具', 'Git', '版本控制'],
  },
  {
    title: 'Docker 容器化',
    content: `# Docker 容器化

容器化应用部署。

## 核心概念
- 镜像
- 容器
- Dockerfile

## 编排工具
详见 [[Docker Compose 使用]]。

## 微服务
参考 [[微服务架构设计]]。

#DevOps #Docker #容器`,
    tags: ['DevOps', 'Docker', '容器'],
  },
  {
    title: 'TypeScript 入门',
    content: `# TypeScript 入门

JavaScript 的超集，添加了类型系统。

## 基础类型
- string、number、boolean
- array、tuple
- enum、any、void

## 接口与类型
详见 [[TypeScript 高级类型]]。

## 泛型
参考 [[TypeScript 泛型编程]]。

#前端 #TypeScript #基础`,
    tags: ['前端', 'TypeScript', '基础'],
  },
  {
    title: 'RESTful API 设计规范',
    content: `# RESTful API 设计规范

## 资源命名
使用名词复数形式。

## HTTP 方法
- GET：获取
- POST：创建
- PUT：更新
- DELETE：删除

## 状态码
详见 [[HTTP 状态码详解]]。

相关：[[Express 快速入门]]、[[API 安全最佳实践]]

#后端 #API #设计`,
    tags: ['后端', 'API', '设计'],
  },
  {
    title: '前端性能优化',
    content: `# 前端性能优化

## 加载优化
- 代码分割
- 懒加载
- CDN 加速

## 渲染优化
详见 [[React 性能优化]]。

## 网络优化
参考 [[HTTP 缓存策略]]。

相关：[[JavaScript 异步编程]]

#前端 #性能 #优化`,
    tags: ['前端', '性能', '优化'],
  },
  {
    title: 'CSS 布局技巧',
    content: `# CSS 布局技巧

## Flexbox
弹性盒子布局。

## Grid
网格布局系统。

## 响应式设计
详见 [[响应式设计原则]]。

#前端 #CSS #布局`,
    tags: ['前端', 'CSS', '布局'],
  },
];

// ==================== 学习路径数据 ====================

const LEARNING_PATHS: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: '前端开发完整路径',
    description: '从零开始学习前端开发，掌握 HTML、CSS、JavaScript 和现代前端框架',
    category: '前端开发',
    difficulty: 'beginner' as DifficultyLevel,
    estimatedDuration: 1200,
    isPublic: true,
    version: 1,
    tags: ['前端', 'React', 'JavaScript', 'CSS'],
    nodes: [
      {
        id: 'node-1',
        type: 'default',
        position: { x: 250, y: 0 },
        data: {
          label: 'HTML 基础',
          description: '学习 HTML 标签和语义化',
          type: 'document',
          estimatedTime: 120,
          difficulty: 'beginner',
        },
      },
      {
        id: 'node-2',
        type: 'default',
        position: { x: 250, y: 150 },
        data: {
          label: 'CSS 基础',
          description: '学习 CSS 选择器、盒模型和布局',
          type: 'document',
          estimatedTime: 180,
          difficulty: 'beginner',
        },
      },
      {
        id: 'node-3',
        type: 'default',
        position: { x: 250, y: 300 },
        data: {
          label: 'JavaScript 基础',
          description: '学习 JavaScript 语法和 DOM 操作',
          type: 'document',
          estimatedTime: 240,
          difficulty: 'beginner',
        },
      },
      {
        id: 'node-4',
        type: 'default',
        position: { x: 250, y: 450 },
        data: {
          label: 'React 入门',
          description: '学习 React 组件和状态管理',
          type: 'video',
          estimatedTime: 300,
          difficulty: 'intermediate',
        },
      },
      {
        id: 'node-5',
        type: 'default',
        position: { x: 250, y: 600 },
        data: {
          label: '前端项目实战',
          description: '构建一个完整的前端应用',
          type: 'project',
          estimatedTime: 360,
          difficulty: 'intermediate',
        },
      },
    ] as PathNode[],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2' },
      { id: 'e2-3', source: 'node-2', target: 'node-3' },
      { id: 'e3-4', source: 'node-3', target: 'node-4' },
      { id: 'e4-5', source: 'node-4', target: 'node-5' },
    ],
  },
  {
    title: '后端开发进阶路径',
    description: '学习 Node.js、数据库和 API 设计，成为全栈开发者',
    category: '后端开发',
    difficulty: 'intermediate' as DifficultyLevel,
    estimatedDuration: 1500,
    isPublic: true,
    version: 1,
    tags: ['后端', 'Node.js', 'Express', '数据库'],
    nodes: [
      {
        id: 'node-1',
        type: 'default',
        position: { x: 250, y: 0 },
        data: {
          label: 'Node.js 基础',
          description: '学习 Node.js 核心模块和异步编程',
          type: 'document',
          estimatedTime: 180,
          difficulty: 'intermediate',
        },
      },
      {
        id: 'node-2',
        type: 'default',
        position: { x: 250, y: 150 },
        data: {
          label: 'Express 框架',
          description: '使用 Express 构建 Web 应用',
          type: 'video',
          estimatedTime: 240,
          difficulty: 'intermediate',
        },
      },
      {
        id: 'node-3',
        type: 'default',
        position: { x: 250, y: 300 },
        data: {
          label: 'SQL 数据库',
          description: '学习关系型数据库和 SQL 查询',
          type: 'document',
          estimatedTime: 300,
          difficulty: 'intermediate',
        },
      },
      {
        id: 'node-4',
        type: 'default',
        position: { x: 250, y: 450 },
        data: {
          label: 'RESTful API 设计',
          description: '设计和实现 RESTful API',
          type: 'practice',
          estimatedTime: 240,
          difficulty: 'intermediate',
        },
      },
      {
        id: 'node-5',
        type: 'default',
        position: { x: 250, y: 600 },
        data: {
          label: '后端项目实战',
          description: '构建完整的后端服务',
          type: 'project',
          estimatedTime: 540,
          difficulty: 'advanced',
        },
      },
    ] as PathNode[],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2' },
      { id: 'e2-3', source: 'node-2', target: 'node-3' },
      { id: 'e3-4', source: 'node-3', target: 'node-4' },
      { id: 'e4-5', source: 'node-4', target: 'node-5' },
    ],
  },
  {
    title: '全栈开发大师之路',
    description: '掌握前端、后端、数据库和部署，成为全栈工程师',
    category: '全栈开发',
    difficulty: 'advanced' as DifficultyLevel,
    estimatedDuration: 2400,
    isPublic: true,
    version: 1,
    tags: ['全栈', '前端', '后端', 'DevOps'],
    nodes: [
      {
        id: 'node-1',
        type: 'default',
        position: { x: 150, y: 0 },
        data: {
          label: 'React 高级特性',
          description: '深入学习 React Hooks 和性能优化',
          type: 'document',
          estimatedTime: 240,
          difficulty: 'advanced',
        },
      },
      {
        id: 'node-2',
        type: 'default',
        position: { x: 350, y: 0 },
        data: {
          label: 'Node.js 进阶',
          description: '学习 Node.js 高级特性和最佳实践',
          type: 'document',
          estimatedTime: 240,
          difficulty: 'advanced',
        },
      },
      {
        id: 'node-3',
        type: 'default',
        position: { x: 250, y: 150 },
        data: {
          label: 'TypeScript 全栈应用',
          description: '使用 TypeScript 开发全栈应用',
          type: 'video',
          estimatedTime: 300,
          difficulty: 'advanced',
        },
      },
      {
        id: 'node-4',
        type: 'default',
        position: { x: 250, y: 300 },
        data: {
          label: '数据库设计与优化',
          description: '学习数据库设计原则和性能优化',
          type: 'document',
          estimatedTime: 360,
          difficulty: 'advanced',
        },
      },
      {
        id: 'node-5',
        type: 'default',
        position: { x: 250, y: 450 },
        data: {
          label: 'Docker 容器化',
          description: '使用 Docker 容器化应用',
          type: 'practice',
          estimatedTime: 240,
          difficulty: 'advanced',
        },
      },
      {
        id: 'node-6',
        type: 'default',
        position: { x: 250, y: 600 },
        data: {
          label: 'CI/CD 自动化部署',
          description: '搭建持续集成和部署流程',
          type: 'practice',
          estimatedTime: 300,
          difficulty: 'advanced',
        },
      },
      {
        id: 'node-7',
        type: 'default',
        position: { x: 250, y: 750 },
        data: {
          label: '全栈项目实战',
          description: '从零到一构建完整的全栈应用',
          type: 'project',
          estimatedTime: 720,
          difficulty: 'advanced',
        },
      },
    ] as PathNode[],
    edges: [
      { id: 'e1-3', source: 'node-1', target: 'node-3' },
      { id: 'e2-3', source: 'node-2', target: 'node-3' },
      { id: 'e3-4', source: 'node-3', target: 'node-4' },
      { id: 'e4-5', source: 'node-4', target: 'node-5' },
      { id: 'e5-6', source: 'node-5', target: 'node-6' },
      { id: 'e6-7', source: 'node-6', target: 'node-7' },
    ],
  },
];

// ==================== 资源数据 ====================

const RESOURCES: Omit<Resource, 'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'bookmarkCount' | 'rating' | 'ratingCount'>[] = [
  {
    title: 'React 官方文档',
    description: 'React 官方中文文档，学习 React 的最佳资源',
    type: 'document',
    url: 'https://react.dev',
    tags: ['React', '前端', '官方文档'],
    userId: 'default-user',
    status: 'active',
  },
  {
    title: 'MDN Web 文档',
    description: 'Mozilla 开发者网络，Web 技术权威参考',
    type: 'website',
    url: 'https://developer.mozilla.org',
    tags: ['Web', 'JavaScript', 'CSS', 'HTML'],
    userId: 'default-user',
    status: 'active',
  },
  {
    title: 'Node.js 完整教程',
    description: '从入门到精通的 Node.js 视频教程',
    type: 'video',
    url: 'https://example.com/nodejs-course',
    tags: ['Node.js', '后端', '视频教程'],
    userId: 'default-user',
    status: 'active',
  },
  {
    title: 'JavaScript 高级程序设计',
    description: '前端开发必读经典书籍',
    type: 'book',
    tags: ['JavaScript', '前端', '书籍'],
    userId: 'default-user',
    status: 'active',
  },
  {
    title: 'TypeScript 官方手册',
    description: 'TypeScript 官方文档和教程',
    type: 'document',
    url: 'https://www.typescriptlang.org/docs',
    tags: ['TypeScript', '前端', '官方文档'],
    userId: 'default-user',
    status: 'active',
  },
  {
    title: 'Docker 入门教程',
    description: '容器化技术入门指南',
    type: 'video',
    url: 'https://example.com/docker-tutorial',
    tags: ['Docker', 'DevOps', '容器'],
    userId: 'default-user',
    status: 'active',
  },
  {
    title: 'SQL 必知必会',
    description: '数据库查询语言经典教材',
    type: 'book',
    tags: ['SQL', '数据库', '书籍'],
    userId: 'default-user',
    status: 'active',
  },
  {
    title: 'Git 版本控制工具',
    description: '分布式版本控制系统',
    type: 'tool',
    url: 'https://git-scm.com',
    tags: ['Git', '工具', '版本控制'],
    userId: 'default-user',
    status: 'active',
  },
  {
    title: 'VS Code 编辑器',
    description: '微软开发的强大代码编辑器',
    type: 'tool',
    url: 'https://code.visualstudio.com',
    tags: ['编辑器', '工具', '开发环境'],
    userId: 'default-user',
    status: 'active',
  },
  {
    title: 'CSS 布局完全指南',
    description: '深入理解 Flexbox 和 Grid 布局',
    type: 'document',
    url: 'https://example.com/css-layout-guide',
    tags: ['CSS', '布局', '前端'],
    userId: 'default-user',
    status: 'active',
  },
  {
    title: '算法导论',
    description: '计算机科学经典教材',
    type: 'book',
    tags: ['算法', '数据结构', '书籍'],
    userId: 'default-user',
    status: 'active',
  },
  {
    title: 'Express.js 实战',
    description: 'Node.js Web 框架实战教程',
    type: 'video',
    url: 'https://example.com/express-course',
    tags: ['Express', 'Node.js', '后端'],
    userId: 'default-user',
    status: 'active',
  },
];

// ==================== 初始化函数 ====================

/**
 * 初始化知识库文档
 */
export async function initializeKBDocuments(): Promise<void> {
  const storage = getKBStorage();
  await storage.initialize();

  // 创建默认知识库
  const vaults = await storage.getAllVaults();
  let defaultVault: KBVault;

  if (vaults.length === 0) {
    defaultVault = await storage.createVault('默认知识库', '/default');
    storage.setCurrentVault(defaultVault.id);
  } else {
    defaultVault = vaults[0];
  }

  // 创建文档
  const existingDocs = await storage.getDocumentsByVault(defaultVault.id);
  if (existingDocs.length === 0) {
    console.log('开始创建知识库文档...');
    for (const docData of KB_DOCUMENTS) {
      await storage.createDocument(
        defaultVault.id,
        docData.title,
        docData.content,
        docData.tags
      );
    }
    console.log(`成功创建 ${KB_DOCUMENTS.length} 个知识库文档`);
  } else {
    console.log(`知识库已有 ${existingDocs.length} 个文档，跳过初始化`);
  }
}

/**
 * 初始化学习路径
 */
export async function initializeLearningPaths(): Promise<void> {
  console.log('开始创建学习路径...');

  for (const pathData of LEARNING_PATHS) {
    const path: LearningPath = {
      ...pathData,
      id: `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await savePath(path);
      console.log(`创建学习路径: ${path.title}`);
    } catch (error) {
      console.error(`创建学习路径失败: ${path.title}`, error);
    }
  }

  console.log(`成功创建 ${LEARNING_PATHS.length} 条学习路径`);
}

/**
 * 初始化资源
 */
export function initializeResources(): void {
  console.log('开始创建资源...');

  for (const resourceData of RESOURCES) {
    try {
      createResource(resourceData);
      console.log(`创建资源: ${resourceData.title}`);
    } catch (error) {
      console.error(`创建资源失败: ${resourceData.title}`, error);
    }
  }

  console.log(`成功创建 ${RESOURCES.length} 个资源`);
}

/**
 * 一键初始化所有测试数据
 */
export async function initializeAllTestData(): Promise<void> {
  console.log('=== 开始初始化知识星图测试数据 ===');

  try {
    await initializeKBDocuments();
    await initializeLearningPaths();
    initializeResources();

    console.log('=== 测试数据初始化完成 ===');
    console.log(`- 知识库文档: ${KB_DOCUMENTS.length} 个`);
    console.log(`- 学习路径: ${LEARNING_PATHS.length} 条`);
    console.log(`- 资源: ${RESOURCES.length} 个`);
  } catch (error) {
    console.error('初始化测试数据失败:', error);
    throw error;
  }
}

/**
 * 清除所有测试数据
 */
export async function clearAllTestData(): Promise<void> {
  console.log('=== 开始清除测试数据 ===');

  // 清除知识库
  const storage = getKBStorage();
  await storage.initialize();
  const vaults = await storage.getAllVaults();
  for (const vault of vaults) {
    await storage.deleteVault(vault.id);
  }

  // 清除资源
  if (typeof window !== 'undefined') {
    localStorage.removeItem('edunexus_resources');
    localStorage.removeItem('edunexus_bookmarks');
    localStorage.removeItem('edunexus_bookmark_folders');
    localStorage.removeItem('edunexus_resource_notes');
  }

  console.log('=== 测试数据清除完成 ===');
}

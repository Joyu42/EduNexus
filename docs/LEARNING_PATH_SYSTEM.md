# 学习路径可视化编辑器

一个功能完整的学习路径创建、管理和执行系统，支持可视化拖拽编辑、进度追踪和证书生成。

## 功能特性

### 1. 路径编辑器 (`/path/editor`)

可视化拖拽编辑界面，基于 React Flow 构建：

- **节点类型**
  - 📄 文档节点：学习文档和教程
  - 🎥 视频节点：视频教程
  - 💻 练习节点：编程练习和实战
  - ✅ 测验节点：知识测验
  - ▶️ 开始节点：路径起点
  - 🏁 结束节点：路径终点

- **编辑功能**
  - 拖拽添加节点
  - 连接节点设置依赖关系
  - 编辑节点属性（标题、描述、预计时长、难度）
  - 路径设置（标题、描述、分类、难度）
  - 导入/导出 JSON 格式
  - 实时预览

### 2. 路径执行器

交互式学习路径执行界面：

- **进度追踪**
  - 实时显示完成进度百分比
  - 节点状态标记（未开始/进行中/已完成）
  - 自动计算总体进度

- **节点完成**
  - 点击节点查看详情
  - 标记节点为完成
  - 打勾动画效果
  - 自动解锁下一节点

- **完成证书**
  - 路径完成后自动弹出证书
  - 下载证书功能
  - 显示完成时间和总时长

### 3. 路径市场

浏览和选择预设路径模板：

- **预设模板**
  - 前端开发入门（HTML/CSS/JavaScript）
  - Python 编程入门
  - 数据结构与算法

- **搜索和筛选**
  - 关键词搜索
  - 按分类筛选
  - 按难度筛选

- **操作**
  - 开始学习：直接开始路径
  - 克隆模板：复制并自定义

### 4. 我的学习路径 (`/learning-paths`)

管理个人学习路径：

- 查看所有创建的路径
- 显示学习进度
- 编辑/删除路径
- 继续学习或开始新路径

## 技术实现

### 核心技术栈

- **React Flow**: 可视化流程图编辑
- **IndexedDB (idb)**: 本地数据存储
- **Framer Motion**: 动画效果
- **Tailwind CSS**: 样式设计
- **TypeScript**: 类型安全

### 文件结构

```
apps/web/src/
├── app/
│   ├── learning-paths/
│   │   └── page.tsx                    # 路径列表页面
│   └── path/
│       └── editor/
│           └── page.tsx                # 编辑器页面
├── components/
│   └── path/
│       ├── node-types.tsx              # 节点类型组件
│       ├── path-editor.tsx             # 编辑器核心组件
│       ├── path-executor.tsx           # 路径执行器
│       └── learning-path-market.tsx    # 路径市场
└── lib/
    └── path/
        ├── path-types.ts               # 类型定义
        ├── path-storage.ts             # 数据存储
        └── path-templates.ts           # 预设模板
```

### 数据模型

```typescript
// 节点数据
interface PathNodeData {
  label: string;
  description?: string;
  type: 'document' | 'video' | 'practice' | 'quiz' | 'start' | 'end';
  estimatedTime?: number;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  status?: 'not_started' | 'in_progress' | 'completed';
}

// 学习路径
interface LearningPath {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: DifficultyLevel;
  estimatedDuration: number;
  nodes: PathNode[];
  edges: PathEdge[];
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

// 进度追踪
interface PathProgress {
  pathId: string;
  userId: string;
  completedNodes: string[];
  currentNode?: string;
  startedAt: string;
  lastAccessedAt: string;
  completedAt?: string;
  progress: number;
}
```

## 使用指南

### 创建新路径

1. 访问 `/learning-paths` 或点击侧边栏"🛤️ 学习路径"
2. 点击"创建路径"按钮
3. 在编辑器中：
   - 点击"添加节点"添加学习节点
   - 拖拽节点调整位置
   - 连接节点设置学习顺序
   - 点击"设置"配置路径信息
4. 点击"保存"保存路径

### 使用模板

1. 访问编辑器页面
2. 切换到"路径市场"标签
3. 浏览预设模板
4. 点击"开始学习"直接开始，或点击下载图标克隆模板

### 学习路径

1. 在"我的学习路径"中选择一个路径
2. 点击"开始学习"或"继续学习"
3. 在执行器中：
   - 点击节点查看详情
   - 阅读/观看学习资源
   - 点击"标记为完成"完成节点
4. 完成所有节点后获得证书

### 导入/导出

**导出路径：**
1. 在编辑器中打开路径
2. 点击"导出"按钮
3. 保存 JSON 文件

**导入路径：**
1. 在编辑器中点击"导入"
2. 选择 JSON 文件
3. 路径自动加载到编辑器

## API 参考

### 存储 API

```typescript
// 保存路径
await savePath(path: LearningPath): Promise<void>

// 获取路径
await getPath(id: string): Promise<LearningPath | undefined>

// 获取所有路径
await getAllPaths(): Promise<LearningPath[]>

// 删除路径
await deletePath(id: string): Promise<void>

// 导出路径
await exportPath(id: string): Promise<string>

// 导入路径
await importPath(jsonString: string): Promise<LearningPath>

// 更新节点完成状态
await updateNodeCompletion(
  pathId: string,
  nodeId: string,
  completed: boolean
): Promise<void>

// 获取进度
await getProgress(pathId: string): Promise<PathProgress | undefined>

// 重置进度
await resetProgress(pathId: string): Promise<void>
```

## 扩展功能建议

### 短期改进

1. **PDF 证书生成**
   - 使用 `jspdf` 或 `pdfmake` 生成专业证书
   - 添加二维码验证

2. **协作功能**
   - 路径分享链接
   - 公开路径市场
   - 评分和评论

3. **学习统计**
   - 学习时长统计
   - 完成率分析
   - 学习热力图

### 长期规划

1. **AI 辅助**
   - 根据知识图谱自动生成学习路径
   - 智能推荐下一步学习内容
   - 个性化难度调整

2. **社交功能**
   - 学习小组
   - 进度分享
   - 学习排行榜

3. **资源集成**
   - 直接嵌入视频播放器
   - 在线代码编辑器
   - 测验系统集成

## 注意事项

1. **数据存储**：当前使用 IndexedDB 本地存储，数据仅保存在浏览器中
2. **浏览器兼容性**：需要支持 IndexedDB 的现代浏览器
3. **性能优化**：大型路径（>50个节点）可能需要优化渲染性能

## 故障排除

### 路径无法保存
- 检查浏览器是否支持 IndexedDB
- 清除浏览器缓存后重试

### 节点无法连接
- 确保节点类型正确（start 节点只能作为源，end 节点只能作为目标）
- 检查是否存在循环依赖

### 进度未更新
- 刷新页面重新加载进度
- 检查浏览器控制台是否有错误

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

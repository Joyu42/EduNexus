/**
 * 学习路径示例数据
 * 用于快速开始和测试
 */

import { pathStorage, type LearningPath } from './path-storage';

export const samplePaths: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    title: '前端开发基础',
    description: '从零开始学习前端开发的完整路径',
    status: 'in_progress',
    progress: 45,
    tags: ['前端', '基础', 'HTML', 'CSS', 'JavaScript'],
    tasks: [
      {
        id: 'task_1',
        title: 'HTML 语义化标签',
        description: '学习 HTML5 语义化标签的使用',
        estimatedTime: '2小时',
        progress: 100,
        status: 'completed',
        dependencies: [],
        resources: [
          { id: 'r1', title: 'MDN HTML 指南', type: 'article', url: 'https://developer.mozilla.org/zh-CN/docs/Web/HTML' },
        ],
        notes: '已完成基础学习',
        createdAt: new Date('2026-03-01'),
        completedAt: new Date('2026-03-02'),
      },
      {
        id: 'task_2',
        title: 'CSS Flexbox 布局',
        description: '掌握 Flexbox 弹性布局',
        estimatedTime: '3小时',
        progress: 60,
        status: 'in_progress',
        dependencies: ['task_1'],
        resources: [
          { id: 'r2', title: 'Flexbox 完全指南', type: 'article', url: 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/' },
        ],
        notes: '正在学习对齐属性',
        createdAt: new Date('2026-03-02'),
        startedAt: new Date('2026-03-03'),
      },
      {
        id: 'task_3',
        title: 'JavaScript 基础语法',
        description: '变量、数据类型、运算符',
        estimatedTime: '4小时',
        progress: 30,
        status: 'in_progress',
        dependencies: ['task_1'],
        resources: [],
        notes: '',
        createdAt: new Date('2026-03-03'),
        startedAt: new Date('2026-03-05'),
      },
      {
        id: 'task_4',
        title: 'DOM 操作',
        description: '学习 DOM API 和事件处理',
        estimatedTime: '5小时',
        progress: 0,
        status: 'not_started',
        dependencies: ['task_3'],
        resources: [],
        notes: '',
        createdAt: new Date('2026-03-04'),
      },
    ],
    milestones: [
      { id: 'm1', title: 'HTML/CSS 基础', taskIds: ['task_1', 'task_2'] },
      { id: 'm2', title: 'JavaScript 核心', taskIds: ['task_3', 'task_4'] },
    ],
  },
  {
    title: 'React 进阶',
    description: '深入学习 React 框架',
    status: 'not_started',
    progress: 0,
    tags: ['React', '进阶', 'Hooks'],
    tasks: [],
    milestones: [],
  },
];

/**
 * 初始化示例数据
 */
export async function initializeSampleData() {
  try {
    const existingPaths = await pathStorage.getAllPaths();
    if (existingPaths.length === 0) {
      for (const pathData of samplePaths) {
        await pathStorage.createPath(pathData);
      }
      console.log('示例数据已初始化');
      return true;
    }
    return false;
  } catch (error) {
    console.error('初始化示例数据失败:', error);
    return false;
  }
}

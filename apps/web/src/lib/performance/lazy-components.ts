/**
 * 懒加载组件配置
 * 用于代码分割和按需加载
 */

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

// 加载占位符组件
const LoadingSpinner = () => {
  return null;
};

const LoadingCard = () => {
  return null;
};

/**
 * 创建懒加载组件的辅助函数
 */
export function createLazyComponent<P = {}>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    loading?: ComponentType;
    ssr?: boolean;
  }
) {
  return dynamic(importFn, {
    loading: options?.loading || LoadingSpinner,
    ssr: options?.ssr ?? true,
  });
}

// 重量级组件懒加载
export const LazyMonacoEditor = createLazyComponent(
  () => import('@monaco-editor/react'),
  { loading: LoadingCard, ssr: false }
);

export const LazyReactFlow = createLazyComponent(
  () => import('reactflow').then(mod => ({ default: mod.ReactFlow })),
  { loading: LoadingCard, ssr: false }
);

export const LazyForceGraph = createLazyComponent(
  () => import('react-force-graph-2d'),
  { loading: LoadingCard, ssr: false }
);

export const LazyD3Chart = createLazyComponent(
  () => import('@/components/analytics/activity-heatmap'),
  { loading: LoadingCard }
);

export const LazyMarkdownRenderer = createLazyComponent(
  () => import('@/components/markdown-renderer'),
  { loading: LoadingCard }
);

// 分析相关组件
export const LazyWeeklyReport = createLazyComponent(
  () => import('@/components/analytics/weekly-report'),
  { loading: LoadingCard }
);

export const LazyMonthlyReport = createLazyComponent(
  () => import('@/components/analytics/monthly-report'),
  { loading: LoadingCard }
);

// 练习相关组件
export const LazyQuestionEditor = createLazyComponent(
  () => import('@/components/practice/question-editor'),
  { loading: LoadingCard }
);

export const LazyQuestionRenderer = createLazyComponent(
  () => import('@/components/practice/question-renderer'),
  { loading: LoadingCard }
);

// 知识库相关组件
export const LazyBacklinkGraph = createLazyComponent(
  () => import('@/components/kb/backlink-graph'),
  { loading: LoadingCard, ssr: false }
);

export const LazyMindmapViewer = createLazyComponent(
  () => import('@/components/kb/mindmap-viewer'),
  { loading: LoadingCard, ssr: false }
);

// 图谱相关组件
export const LazyInteractiveGraph = createLazyComponent(
  () => import('@/components/graph/interactive-graph'),
  { loading: LoadingCard, ssr: false }
);

export const LazySkillTree = createLazyComponent(
  () => import('@/components/path/skill-tree'),
  { loading: LoadingCard, ssr: false }
);

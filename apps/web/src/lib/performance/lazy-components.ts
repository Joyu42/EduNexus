/**
 * 懒加载组件配置
 * 用于代码分割和按需加载
 */

import dynamic, { DynamicOptionsLoadingProps } from 'next/dynamic';
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
    loading?: ComponentType | (() => null);
    ssr?: boolean;
  }
) {
  return dynamic(importFn, {
    loading: options?.loading as ((loadingProps: DynamicOptionsLoadingProps) => JSX.Element | null) | undefined,
    ssr: options?.ssr ?? true,
  });
}

// 重量级组件懒加载
export const LazyMonacoEditor = createLazyComponent(
  () => import('@monaco-editor/react'),
  { loading: LoadingCard, ssr: false }
);

export const LazyReactFlow = createLazyComponent<any>(
  () => import('reactflow').then(mod => ({ default: mod.ReactFlow as any })),
  { loading: LoadingCard, ssr: false }
);

export const LazyForceGraph = createLazyComponent(
  () => import('react-force-graph-2d'),
  { loading: LoadingCard, ssr: false }
);

export const LazyD3Chart = createLazyComponent<any>(
  () => import('@/components/analytics/activity-heatmap').then(mod => ({ default: mod.ActivityHeatmap as any })),
  { loading: LoadingCard }
);

export const LazyMarkdownRenderer = createLazyComponent<any>(
  () => import('@/components/markdown-renderer').then(mod => ({ default: mod.MarkdownRenderer as any })),
  { loading: LoadingCard }
);

// 分析相关组件
export const LazyWeeklyReport = createLazyComponent<any>(
  () => import('@/components/analytics/weekly-report').then(mod => ({ default: mod.WeeklyReport as any })),
  { loading: LoadingCard }
);

export const LazyMonthlyReport = createLazyComponent<any>(
  () => import('@/components/analytics/monthly-report').then(mod => ({ default: mod.MonthlyReport as any })),
  { loading: LoadingCard }
);

// 练习相关组件
export const LazyQuestionEditor = createLazyComponent<any>(
  () => import('@/components/practice/question-editor').then(mod => ({ default: mod.QuestionEditor as any })),
  { loading: LoadingCard }
);

export const LazyQuestionRenderer = createLazyComponent<any>(
  () => import('@/components/practice/question-renderer').then(mod => ({ default: mod.QuestionRenderer as any })),
  { loading: LoadingCard }
);

// 知识库相关组件
export const LazyBacklinkGraph = createLazyComponent<any>(
  () => import('@/components/kb/backlink-graph').then(mod => ({ default: mod.BacklinkGraph as any })),
  { loading: LoadingCard, ssr: false }
);

export const LazyMindmapViewer = createLazyComponent<any>(
  () => import('@/components/kb/mindmap-viewer').then(mod => ({ default: mod.MindMapViewer as any })),
  { loading: LoadingCard, ssr: false }
);

// 图谱相关组件
export const LazyInteractiveGraph = createLazyComponent<any>(
  () => import('@/components/graph/interactive-graph').then(mod => ({ default: mod.InteractiveGraph as any })),
  { loading: LoadingCard, ssr: false }
);

export const LazySkillTree = createLazyComponent<any>(
  () => import('@/components/path/skill-tree'),
  { loading: LoadingCard, ssr: false }
);

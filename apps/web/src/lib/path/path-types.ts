import { Node, Edge } from 'reactflow';

export type NodeType =
  | 'document'    // 文档学习
  | 'video'       // 视频课程
  | 'practice'    // 实践练习
  | 'quiz'        // 测验考核
  | 'project'     // 项目实战
  | 'discussion'  // 讨论交流
  | 'review'      // 复习回顾
  | 'reading'     // 阅读材料
  | 'lab'         // 实验室
  | 'assignment'  // 作业任务
  | 'presentation'// 演示汇报
  | 'research'    // 研究调研
  | 'start'       // 开始
  | 'end';        // 结束
export type NodeStatus = 'not_started' | 'in_progress' | 'completed';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface PathNodeData {
  label: string;
  description?: string;
  type: NodeType;
  estimatedTime?: number; // 分钟
  difficulty?: DifficultyLevel;
  status?: NodeStatus;
  resourceUrl?: string;
  resourceId?: string;
  completedAt?: string;
  metadata?: Record<string, any>;
}

export interface PathNode extends Node {
  data: PathNodeData;
}

export type PathEdge = Edge & {
  data?: {
    label?: string;
    condition?: string;
  };
};

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: DifficultyLevel;
  estimatedDuration: number; // 总时长（分钟）
  nodes: PathNode[];
  edges: PathEdge[];
  tags: string[];
  author?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface PathProgress {
  pathId: string;
  userId: string;
  completedNodes: string[];
  currentNode?: string;
  startedAt: string;
  lastAccessedAt: string;
  completedAt?: string;
  progress: number; // 0-100
}

export interface PathTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: DifficultyLevel;
  estimatedDuration: number;
  thumbnail?: string;
  tags: string[];
  path: Omit<LearningPath, 'id' | 'createdAt' | 'updatedAt'>;
}

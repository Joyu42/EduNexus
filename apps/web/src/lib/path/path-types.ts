import { Node, Edge } from 'reactflow';

export type NodeType = 'document' | 'video' | 'practice' | 'quiz' | 'start' | 'end';
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

export type PathNode = Node<PathNodeData>;

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

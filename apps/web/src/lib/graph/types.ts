// 知识星图类型定义

export type NodeStatus = "unlearned" | "learning" | "mastered" | "review";
export type NodeType = "concept" | "topic" | "resource" | "skill";
export type EdgeType = "prerequisite" | "related" | "contains" | "applies";
export type LayoutType = "force" | "hierarchical" | "radial" | "timeline";
export type ThemeType = "tech" | "nature" | "minimal";
export type MasteryStage = "seen" | "understood" | "applied" | "mastered";

export type PathMembership = {
  pathId: string;
  pathName: string;
  stage: string;
  orderWithinStage: number;
};

export interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  status: NodeStatus;
  importance: number; // 0-1，影响节点大小
  mastery: number; // 0-1，掌握程度
  connections: number;
  noteCount: number; // 关联笔记数量
  practiceCount: number; // 关联练习数量
  practiceCompleted: number; // 完成的练习数量
  lastReviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // 数据联动字段
  documentIds: string[];     // 关联的文档
  skillNodeId?: string;      // 关联的技能
  keywords?: string[];       // 关键词
  masteryStage?: MasteryStage; // 掌握阶段
  needsReview?: boolean;
  pathMemberships?: PathMembership[];
  category?: string;
  kbDocumentId?: string;
  // 可视化相关
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  type: EdgeType;
  strength: number; // 0-1，关联强度，影响连接线粗细
}

export interface LearningPath {
  id: string;
  name: string;
  nodes: string[]; // 节点 ID 序列
  estimatedTime: number; // 预计学习时间（分钟）
  difficulty: "easy" | "medium" | "hard";
  reason: string; // 推荐理由
}

export interface KnowledgeGap {
  nodeId: string;
  reason: string;
  priority: "high" | "medium" | "low";
  suggestedActions: string[];
}

export interface NodeDetail {
  node: GraphNode;
  prerequisites: GraphNode[]; // 前置知识
  nextSteps: GraphNode[]; // 后续知识
  relatedNotes: Array<{
    id: string;
    title: string;
    excerpt: string;
  }>;
  relatedPractices: Array<{
    id: string;
    title: string;
    completed: boolean;
  }>;
  learningProgress: {
    totalTime: number; // 总学习时间（分钟）
    lastStudied?: Date;
    reviewCount: number;
  };
}

export interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  hoveredNode: GraphNode | null;
  layout: LayoutType;
  theme: ThemeType;
  filters: {
    types: Set<NodeType>;
    statuses: Set<NodeStatus>;
    importanceRange: [number, number];
  };
  searchQuery: string;
  showLearningPath: boolean;
  currentPath: LearningPath | null;
}

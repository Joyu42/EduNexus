// 智能推荐引擎

import type { GraphNode, GraphEdge, LearningPath, KnowledgeGap } from "./types";

export class RecommendationEngine {
  private nodes: GraphNode[];
  private edges: GraphEdge[];
  private pathIdCounter = 0;

  constructor(nodes: GraphNode[], edges: GraphEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
  }

  /**
   * 推荐下一步学习内容
   */
  recommendNextSteps(currentNodeId: string, count: number = 3): GraphNode[] {
    const currentNode = this.nodes.find((n) => n.id === currentNodeId);
    if (!currentNode) return [];

    // 找到所有后续节点
    const nextNodes = this.edges
      .filter((e) => {
        const sourceId = typeof e.source === "string" ? e.source : e.source.id;
        return sourceId === currentNodeId;
      })
      .map((e) => {
        const targetId = typeof e.target === "string" ? e.target : e.target.id;
        return this.nodes.find((n) => n.id === targetId);
      })
      .filter((n): n is GraphNode => n !== undefined);

    // 按优先级排序：未学习 > 学习中 > 需复习
    const priorityMap = {
      unlearned: 3,
      learning: 2,
      review: 1,
      mastered: 0,
    };

    return nextNodes
      .sort((a, b) => {
        // 首先按状态优先级
        const priorityDiff = priorityMap[b.status] - priorityMap[a.status];
        if (priorityDiff !== 0) return priorityDiff;
        // 然后按重要性
        return b.importance - a.importance;
      })
      .slice(0, count);
  }

  /**
   * 识别知识盲区
   */
  identifyKnowledgeGaps(): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];

    for (const node of this.nodes) {
      // 孤立节点（连接数少）
      if (node.connections <= 1 && node.status === "unlearned") {
        gaps.push({
          nodeId: node.id,
          reason: "孤立知识点，缺少关联",
          priority: "medium",
          suggestedActions: [
            "建立与其他知识点的联系",
            "添加相关笔记和资源",
          ],
        });
      }

      // 长期未复习
      if (
        node.status === "mastered" &&
        node.lastReviewedAt &&
        Date.now() - node.lastReviewedAt.getTime() > 30 * 24 * 60 * 60 * 1000
      ) {
        gaps.push({
          nodeId: node.id,
          reason: "超过30天未复习，可能遗忘",
          priority: "high",
          suggestedActions: ["安排复习计划", "完成相关练习"],
        });
      }

      // 前置知识未掌握
      const prerequisites = this.getPrerequisites(node.id);
      const unmasteredPrereqs = prerequisites.filter(
        (p) => p.status !== "mastered"
      );
      if (unmasteredPrereqs.length > 0 && node.status === "learning") {
        gaps.push({
          nodeId: node.id,
          reason: `前置知识未掌握：${unmasteredPrereqs.map((p) => p.name).join("、")}`,
          priority: "high",
          suggestedActions: ["先学习前置知识", "巩固基础概念"],
        });
      }
    }

    return gaps.sort((a, b) => {
      const priorityMap = { high: 3, medium: 2, low: 1 };
      return priorityMap[b.priority] - priorityMap[a.priority];
    });
  }

  /**
   * 生成最优学习路径
   */
  generateLearningPath(
    startNodeId: string,
    goalNodeId: string
  ): LearningPath | null {
    const path = this.findShortestPath(startNodeId, goalNodeId);
    if (!path) return null;

    const pathNodes = path
      .map((id) => this.nodes.find((n) => n.id === id))
      .filter((n): n is GraphNode => n !== undefined);

    // 估算学习时间（每个节点平均30分钟）
    const estimatedTime = pathNodes.length * 30;

    // 计算难度
    const avgImportance =
      pathNodes.reduce((sum, n) => sum + n.importance, 0) / pathNodes.length;
    const difficulty =
      avgImportance > 0.7 ? "hard" : avgImportance > 0.4 ? "medium" : "easy";

    return {
      id: `path-${Date.now()}-${this.pathIdCounter++}`,
      name: `从 ${pathNodes[0].name} 到 ${pathNodes[pathNodes.length - 1].name}`,
      nodes: path,
      estimatedTime,
      difficulty,
      reason: `这是最短的学习路径，包含 ${pathNodes.length} 个知识点`,
    };
  }

  /**
   * 基于当前进度推荐学习路径
   */
  recommendLearningPaths(count: number = 3): LearningPath[] {
    const paths: LearningPath[] = [];

    // 找到所有学习中的节点
    const learningNodes = this.nodes.filter((n) => n.status === "learning");

    // 找到所有未学习但重要的节点
    const importantUnlearnedNodes = this.nodes
      .filter((n) => n.status === "unlearned" && n.importance > 0.6)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);

    // 为每个学习中的节点生成到重要未学习节点的路径
    for (const startNode of learningNodes) {
      for (const goalNode of importantUnlearnedNodes) {
        const path = this.generateLearningPath(startNode.id, goalNode.id);
        if (path) {
          paths.push(path);
        }
      }
    }

    // 如果没有学习中的节点，从已掌握的节点开始
    if (paths.length === 0) {
      const masteredNodes = this.nodes.filter((n) => n.status === "mastered");
      for (const startNode of masteredNodes.slice(0, 3)) {
        for (const goalNode of importantUnlearnedNodes.slice(0, 2)) {
          const path = this.generateLearningPath(startNode.id, goalNode.id);
          if (path) {
            paths.push(path);
          }
        }
      }
    }

    return paths.slice(0, count);
  }

  /**
   * 获取前置知识
   */
  private getPrerequisites(nodeId: string): GraphNode[] {
    return this.edges
      .filter((e) => {
        const targetId = typeof e.target === "string" ? e.target : e.target.id;
        return targetId === nodeId && e.type === "prerequisite";
      })
      .map((e) => {
        const sourceId = typeof e.source === "string" ? e.source : e.source.id;
        return this.nodes.find((n) => n.id === sourceId);
      })
      .filter((n): n is GraphNode => n !== undefined);
  }

  /**
   * 使用 BFS 查找最短路径
   */
  private findShortestPath(
    startId: string,
    goalId: string
  ): string[] | null {
    if (startId === goalId) return [startId];

    const queue: Array<{ nodeId: string; path: string[] }> = [
      { nodeId: startId, path: [startId] },
    ];
    const visited = new Set<string>([startId]);

    while (queue.length > 0) {
      const current = queue.shift()!;

      // 找到所有相邻节点
      const neighbors = this.edges
        .filter((e) => {
          const sourceId =
            typeof e.source === "string" ? e.source : e.source.id;
          return sourceId === current.nodeId;
        })
        .map((e) => (typeof e.target === "string" ? e.target : e.target.id));

      for (const neighborId of neighbors) {
        if (neighborId === goalId) {
          return [...current.path, neighborId];
        }

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({
            nodeId: neighborId,
            path: [...current.path, neighborId],
          });
        }
      }
    }

    return null;
  }
}

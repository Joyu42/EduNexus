// AI-powered group recommendation system
import type { Group, GroupCategory } from './group-types';
import { getAllGroups } from './group-storage';

export interface UserInterests {
  categories: GroupCategory[];
  tags: string[];
  activityLevel: 'low' | 'medium' | 'high';
  preferredGroupSize: 'small' | 'medium' | 'large';
}

export interface GroupRecommendation {
  group: Group;
  score: number;
  reasons: string[];
}

/**
 * 基于用户兴趣推荐小组
 */
export function recommendGroups(
  userId: string,
  userInterests: UserInterests,
  limit: number = 5
): GroupRecommendation[] {
  const allGroups = getAllGroups();
  const recommendations: GroupRecommendation[] = [];

  for (const group of allGroups) {
    const score = calculateMatchScore(group, userInterests);
    const reasons = generateReasons(group, userInterests);

    if (score > 0) {
      recommendations.push({ group, score, reasons });
    }
  }

  // 按分数排序并返回前N个
  return recommendations
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * 计算小组与用户兴趣的匹配分数
 */
function calculateMatchScore(group: Group, interests: UserInterests): number {
  let score = 0;

  // 分类匹配 (40分)
  if (interests.categories.includes(group.category)) {
    score += 40;
  }

  // 标签匹配 (30分)
  const matchingTags = group.tags.filter(tag =>
    interests.tags.some(userTag =>
      tag.toLowerCase().includes(userTag.toLowerCase()) ||
      userTag.toLowerCase().includes(tag.toLowerCase())
    )
  );
  score += Math.min(matchingTags.length * 10, 30);

  // 活跃度匹配 (15分)
  const activityScore = getActivityScore(group.activeLevel, interests.activityLevel);
  score += activityScore;

  // 小组规模匹配 (15分)
  const sizeScore = getSizeScore(group.memberCount, interests.preferredGroupSize);
  score += sizeScore;

  return score;
}

/**
 * 根据活跃度计算分数
 */
function getActivityScore(groupActivity: number, preferredActivity: string): number {
  if (preferredActivity === 'high' && groupActivity >= 80) return 15;
  if (preferredActivity === 'medium' && groupActivity >= 50 && groupActivity < 80) return 15;
  if (preferredActivity === 'low' && groupActivity < 50) return 15;
  return 5; // 部分匹配
}

/**
 * 根据小组规模计算分数
 */
function getSizeScore(memberCount: number, preferredSize: string): number {
  if (preferredSize === 'small' && memberCount <= 10) return 15;
  if (preferredSize === 'medium' && memberCount > 10 && memberCount <= 30) return 15;
  if (preferredSize === 'large' && memberCount > 30) return 15;
  return 5; // 部分匹配
}

/**
 * 生成推荐理由
 */
function generateReasons(group: Group, interests: UserInterests): string[] {
  const reasons: string[] = [];

  // 分类匹配
  if (interests.categories.includes(group.category)) {
    reasons.push(`与你感兴趣的${getCategoryLabel(group.category)}分类匹配`);
  }

  // 标签匹配
  const matchingTags = group.tags.filter(tag =>
    interests.tags.some(userTag =>
      tag.toLowerCase().includes(userTag.toLowerCase())
    )
  );
  if (matchingTags.length > 0) {
    reasons.push(`包含你关注的标签: ${matchingTags.slice(0, 3).join('、')}`);
  }

  // 活跃度
  if (group.activeLevel >= 80) {
    reasons.push('小组非常活跃，互动频繁');
  } else if (group.activeLevel >= 50) {
    reasons.push('小组活跃度适中');
  }

  // 成员数
  if (group.memberCount >= 20) {
    reasons.push(`已有 ${group.memberCount} 名成员，社区氛围良好`);
  } else if (group.memberCount >= 5) {
    reasons.push('小组规模适中，便于深度交流');
  }

  return reasons;
}

/**
 * 获取分类标签
 */
function getCategoryLabel(category: GroupCategory): string {
  const labels: Record<GroupCategory, string> = {
    programming: '编程',
    math: '数学',
    language: '语言',
    science: '科学',
    art: '艺术',
    business: '商业',
    other: '其他',
  };
  return labels[category];
}

/**
 * 基于用户历史行为推荐小组
 */
export function recommendBasedOnHistory(
  userId: string,
  userGroups: string[],
  limit: number = 5
): GroupRecommendation[] {
  const allGroups = getAllGroups();
  const userGroupData = allGroups.filter(g => userGroups.includes(g.id));

  // 提取用户偏好
  const categoryCount: Record<string, number> = {};
  const tagCount: Record<string, number> = {};

  userGroupData.forEach(group => {
    categoryCount[group.category] = (categoryCount[group.category] || 0) + 1;
    group.tags.forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });
  });

  // 构建用户兴趣
  const topCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat as GroupCategory);

  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  const interests: UserInterests = {
    categories: topCategories,
    tags: topTags,
    activityLevel: 'medium',
    preferredGroupSize: 'medium',
  };

  // 过滤掉用户已加入的小组
  const recommendations = recommendGroups(userId, interests, limit * 2);
  return recommendations.filter(rec => !userGroups.includes(rec.group.id)).slice(0, limit);
}

/**
 * 获取热门小组
 */
export function getPopularGroups(limit: number = 5): Group[] {
  const allGroups = getAllGroups();
  return allGroups
    .filter(g => g.visibility === 'public')
    .sort((a, b) => {
      // 综合排序：活跃度 * 0.6 + 成员数 * 0.4
      const scoreA = a.activeLevel * 0.6 + a.memberCount * 0.4;
      const scoreB = b.activeLevel * 0.6 + b.memberCount * 0.4;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

/**
 * 获取新建小组
 */
export function getNewGroups(limit: number = 5): Group[] {
  const allGroups = getAllGroups();
  return allGroups
    .filter(g => g.visibility === 'public')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

import type { Badge } from './user-level-types';

/**
 * 徽章配置数据
 */
export const BADGE_CONFIGS: Badge[] = [
  // 学习徽章
  {
    badgeId: 'bronze_scholar',
    name: '青铜学者',
    description: '学习 10 小时',
    emoji: '🥉',
    category: 'learning',
    requirement: {
      type: 'learning_hours',
      threshold: 10
    },
    expReward: 100,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'silver_scholar',
    name: '白银学者',
    description: '学习 50 小时',
    emoji: '🥈',
    category: 'learning',
    requirement: {
      type: 'learning_hours',
      threshold: 50
    },
    expReward: 300,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'gold_scholar',
    name: '黄金学者',
    description: '学习 100 小时',
    emoji: '🥇',
    category: 'learning',
    requirement: {
      type: 'learning_hours',
      threshold: 100
    },
    expReward: 500,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'diamond_scholar',
    name: '钻石学者',
    description: '学习 500 小时',
    emoji: '💎',
    category: 'learning',
    requirement: {
      type: 'learning_hours',
      threshold: 500
    },
    expReward: 2000,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'king_scholar',
    name: '王者学者',
    description: '学习 1000 小时',
    emoji: '👑',
    category: 'learning',
    requirement: {
      type: 'learning_hours',
      threshold: 1000
    },
    expReward: 5000,
    createdAt: new Date().toISOString()
  },
  // 练习徽章
  {
    badgeId: 'novice_shooter',
    name: '新手射手',
    description: '完成 10 道题',
    emoji: '🎯',
    category: 'practice',
    requirement: {
      type: 'practice_count',
      threshold: 10
    },
    expReward: 50,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'sharpshooter',
    name: '神射手',
    description: '完成 100 道题',
    emoji: '🏹',
    category: 'practice',
    requirement: {
      type: 'practice_count',
      threshold: 100
    },
    expReward: 200,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'bullseye',
    name: '百发百中',
    description: '完成 1000 道题',
    emoji: '🎪',
    category: 'practice',
    requirement: {
      type: 'practice_count',
      threshold: 1000
    },
    expReward: 1000,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'ocean_of_questions',
    name: '题海无涯',
    description: '完成 5000 道题',
    emoji: '🌟',
    category: 'practice',
    requirement: {
      type: 'practice_count',
      threshold: 5000
    },
    expReward: 3000,
    createdAt: new Date().toISOString()
  },
  // 社区徽章
  {
    badgeId: 'chatterbox',
    name: '话痨',
    description: '发帖 100 次',
    emoji: '💬',
    category: 'community',
    requirement: {
      type: 'posts_count',
      threshold: 100
    },
    expReward: 300,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'orator',
    name: '演说家',
    description: '回答 50 个问题',
    emoji: '🎤',
    category: 'community',
    requirement: {
      type: 'answers_count',
      threshold: 50
    },
    expReward: 400,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'best_answerer',
    name: '最佳答主',
    description: '被采纳 20 次',
    emoji: '🏆',
    category: 'community',
    requirement: {
      type: 'custom',
      threshold: 20,
      customCheck: 'answers_accepted'
    },
    expReward: 500,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'popularity_king',
    name: '人气王',
    description: '获得 1000 个赞',
    emoji: '❤️',
    category: 'community',
    requirement: {
      type: 'likes_count',
      threshold: 1000
    },
    expReward: 800,
    createdAt: new Date().toISOString()
  },
  // 特殊徽章
  {
    badgeId: 'all_rounder',
    name: '全能战士',
    description: '各项指标均衡发展',
    emoji: '🌈',
    category: 'special',
    requirement: {
      type: 'custom',
      threshold: 1,
      customCheck: 'balanced_stats'
    },
    expReward: 1000,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'learning_maniac',
    name: '学习狂魔',
    description: '单月学习 100 小时',
    emoji: '🔥',
    category: 'special',
    requirement: {
      type: 'custom',
      threshold: 100,
      customCheck: 'monthly_learning_hours'
    },
    expReward: 1500,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'creative_master',
    name: '创作大师',
    description: '创作 100 篇优质笔记',
    emoji: '🎨',
    category: 'special',
    requirement: {
      type: 'notes_count',
      threshold: 100
    },
    expReward: 1200,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'team_star',
    name: '团队之星',
    description: '小组贡献突出',
    emoji: '🤝',
    category: 'special',
    requirement: {
      type: 'custom',
      threshold: 1,
      customCheck: 'group_contribution'
    },
    expReward: 800,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'night_owl',
    name: '夜猫子学习家',
    description: '凌晨 0-6 点学习累计 50 小时',
    emoji: '🌙',
    category: 'special',
    requirement: {
      type: 'custom',
      threshold: 50,
      customCheck: 'night_learning_hours'
    },
    expReward: 600,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'early_bird',
    name: '早起学习鸟',
    description: '早上 5-7 点学习累计 50 小时',
    emoji: '🌅',
    category: 'special',
    requirement: {
      type: 'custom',
      threshold: 50,
      customCheck: 'morning_learning_hours'
    },
    expReward: 600,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'perfectionist',
    name: '完美主义者',
    description: '连续 100 道题全对',
    emoji: '💯',
    category: 'special',
    requirement: {
      type: 'custom',
      threshold: 100,
      customCheck: 'consecutive_correct'
    },
    expReward: 1000,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'combo_master',
    name: '连击大师',
    description: '连续学习 100 天',
    emoji: '🔥',
    category: 'special',
    requirement: {
      type: 'streak_days',
      threshold: 100
    },
    expReward: 2000,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'knowledge_hoarder',
    name: '知识囤积狂',
    description: '收藏 1000 篇文档',
    emoji: '📚',
    category: 'special',
    requirement: {
      type: 'custom',
      threshold: 1000,
      customCheck: 'bookmarks_count'
    },
    expReward: 500,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'note_artist',
    name: '笔记艺术家',
    description: '笔记被点赞 500 次',
    emoji: '🎨',
    category: 'special',
    requirement: {
      type: 'custom',
      threshold: 500,
      customCheck: 'note_likes'
    },
    expReward: 800,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'helpful_person',
    name: '乐于助人',
    description: '帮助 100 个用户',
    emoji: '🤝',
    category: 'special',
    requirement: {
      type: 'custom',
      threshold: 100,
      customCheck: 'users_helped'
    },
    expReward: 1000,
    createdAt: new Date().toISOString()
  },
  {
    badgeId: 'marathon_runner',
    name: '学习马拉松选手',
    description: '单次学习 6 小时以上',
    emoji: '🏃',
    category: 'special',
    requirement: {
      type: 'custom',
      threshold: 6,
      customCheck: 'single_session_hours'
    },
    expReward: 300,
    createdAt: new Date().toISOString()
  }
];

/**
 * 根据 badgeId 获取徽章配置
 */
export function getBadgeById(badgeId: string): Badge | undefined {
  return BADGE_CONFIGS.find(badge => badge.badgeId === badgeId);
}

/**
 * 根据类别获取徽章列表
 */
export function getBadgesByCategory(category: Badge['category']): Badge[] {
  return BADGE_CONFIGS.filter(badge => badge.category === category);
}

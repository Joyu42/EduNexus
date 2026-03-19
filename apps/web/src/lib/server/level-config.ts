import type { LevelConfig } from './user-level-types';

/**
 * 等级配置数据
 * 基于 docs/USER_LEVEL_SYSTEM.md 的设计
 */
export const LEVEL_CONFIGS: LevelConfig[] = [
  // 初学者阶段 (Lv 1-10)
  {
    level: 1,
    minExp: 0,
    maxExp: 100,
    title: '懵懂萌新',
    titleEmoji: '🐣',
    titleDescription: '刚踏入知识的海洋，眼神里充满好奇和迷茫',
    privileges: {
      aiChatLimit: 3,
      knowledgeBaseCapacity: 100,
      learningPathsLimit: 0,
      groupsLimit: 3,
      features: ['basic_knowledge', 'basic_practice']
    }
  },
  {
    level: 2,
    minExp: 101,
    maxExp: 300,
    title: '摸索小白',
    titleEmoji: '🐥',
    titleDescription: '开始摸索学习的门道，偶尔还会迷路',
    privileges: {
      aiChatLimit: 5,
      knowledgeBaseCapacity: 100,
      learningPathsLimit: 0,
      groupsLimit: 3,
      features: ['basic_knowledge', 'basic_practice', 'personal_kb', 'basic_templates']
    },
    unlockConditions: [
      { type: 'learning_hours', value: 1, description: '学习 1 小时' }
    ]
  },
  {
    level: 3,
    minExp: 301,
    maxExp: 600,
    title: '入门学徒',
    titleEmoji: '📚',
    titleDescription: '已经掌握了基本操作，开始像模像样地学习',
    privileges: {
      aiChatLimit: 10,
      knowledgeBaseCapacity: 100,
      learningPathsLimit: 0,
      groupsLimit: 3,
      features: ['basic_knowledge', 'basic_practice', 'personal_kb', 'markdown_advanced', 'join_groups']
    },
    unlockConditions: [
      { type: 'practice_count', value: 10, description: '完成 10 道练习题' }
    ]
  },
  {
    level: 4,
    minExp: 601,
    maxExp: 1000,
    title: '勤奋学童',
    titleEmoji: '✏️',
    titleDescription: '每天都在认真学习，虽然偶尔会偷懒',
    privileges: {
      aiChatLimit: 15,
      knowledgeBaseCapacity: 100,
      learningPathsLimit: 0,
      groupsLimit: 3,
      features: ['basic_knowledge', 'basic_practice', 'personal_kb', 'markdown_advanced', 'join_groups', 'code_executor']
    },
    unlockConditions: [
      { type: 'streak_days', value: 7, description: '连续学习 7 天' }
    ]
  },
  {
    level: 5,
    minExp: 1001,
    maxExp: 1500,
    title: '好学少年',
    titleEmoji: '🎒',
    titleDescription: '求知欲旺盛，总是问个不停',
    privileges: {
      aiChatLimit: 20,
      knowledgeBaseCapacity: 100,
      learningPathsLimit: 0,
      groupsLimit: 3,
      features: ['basic_knowledge', 'basic_practice', 'personal_kb', 'markdown_advanced', 'join_groups', 'code_executor', 'custom_theme', 'export_report']
    },
    unlockConditions: [
      { type: 'knowledge_points', value: 10, description: '掌握 10 个知识点' }
    ]
  },
  {
    level: 6,
    minExp: 1501,
    maxExp: 2200,
    title: '刷题狂魔',
    titleEmoji: '💪',
    titleDescription: '见到题目就两眼放光，刷题停不下来',
    privileges: {
      aiChatLimit: 25,
      knowledgeBaseCapacity: 500,
      learningPathsLimit: 3,
      groupsLimit: 5,
      features: ['basic_knowledge', 'basic_practice', 'personal_kb', 'markdown_advanced', 'join_groups', 'code_executor', 'custom_theme', 'export_report', 'custom_practice', 'error_book']
    },
    unlockConditions: [
      { type: 'practice_count', value: 100, description: '完成 100 道练习题' }
    ]
  },
  {
    level: 7,
    minExp: 2201,
    maxExp: 3000,
    title: '笔记达人',
    titleEmoji: '📝',
    titleDescription: '笔记整理得井井有条，堪称强迫症典范',
    privileges: {
      aiChatLimit: 30,
      knowledgeBaseCapacity: 500,
      learningPathsLimit: 3,
      groupsLimit: 5,
      features: ['basic_knowledge', 'basic_practice', 'personal_kb', 'markdown_advanced', 'join_groups', 'code_executor', 'custom_theme', 'export_report', 'custom_practice', 'error_book', 'kb_collaboration', 'template_market']
    }
  },
  {
    level: 8,
    minExp: 3001,
    maxExp: 4000,
    title: '知识探索者',
    titleEmoji: '🔍',
    titleDescription: '在知识的海洋中遨游，总能发现新大陆',
    privileges: {
      aiChatLimit: 40,
      knowledgeBaseCapacity: 500,
      learningPathsLimit: 3,
      groupsLimit: 5,
      features: ['basic_knowledge', 'basic_practice', 'personal_kb', 'markdown_advanced', 'join_groups', 'code_executor', 'custom_theme', 'export_report', 'custom_practice', 'error_book', 'kb_collaboration', 'template_market', 'knowledge_graph', 'advanced_search']
    },
    unlockConditions: [
      { type: 'learning_hours', value: 50, description: '学习 50 小时' },
      { type: 'knowledge_points', value: 20, description: '掌握 20 个知识点' }
    ]
  },
  {
    level: 9,
    minExp: 4001,
    maxExp: 5000,
    title: '进阶学者',
    titleEmoji: '🎓',
    titleDescription: '已经有了自己的学习方法论',
    privileges: {
      aiChatLimit: 50,
      knowledgeBaseCapacity: 500,
      learningPathsLimit: 10,
      groupsLimit: 5,
      features: ['basic_knowledge', 'basic_practice', 'personal_kb', 'markdown_advanced', 'join_groups', 'code_executor', 'custom_theme', 'export_report', 'custom_practice', 'error_book', 'kb_collaboration', 'template_market', 'knowledge_graph', 'advanced_search', 'create_public_path', 'learning_analytics']
    }
  },
  {
    level: 10,
    minExp: 5001,
    maxExp: 6500,
    title: '知识收割机',
    titleEmoji: '🌾',
    titleDescription: '学习效率惊人，知识点一个接一个地收入囊中',
    privileges: {
      aiChatLimit: 'unlimited',
      knowledgeBaseCapacity: 500,
      learningPathsLimit: 10,
      groupsLimit: 5,
      features: ['basic_knowledge', 'basic_practice', 'personal_kb', 'markdown_advanced', 'join_groups', 'code_executor', 'custom_theme', 'export_report', 'custom_practice', 'error_book', 'kb_collaboration', 'template_market', 'knowledge_graph', 'advanced_search', 'create_public_path', 'learning_analytics', 'mentor_certification', 'custom_badges']
    },
    unlockConditions: [
      { type: 'knowledge_points', value: 50, description: '掌握 50 个知识点' },
      { type: 'streak_days', value: 30, description: '连续学习 30 天' }
    ]
  },
  // 进阶者阶段 (Lv 11-20)
  {
    level: 11,
    minExp: 6501,
    maxExp: 8000,
    title: '学霸预备役',
    titleEmoji: '📖',
    titleDescription: '距离学霸只差一步之遥',
    privileges: {
      aiChatLimit: 'unlimited',
      knowledgeBaseCapacity: 1000,
      learningPathsLimit: 10,
      groupsLimit: 5,
      features: ['all_basic', 'paid_path_creation', 'ai_learning_plan', 'priority_support']
    },
    unlockConditions: [
      { type: 'accuracy_rate', value: 80, description: '练习题正确率 > 80%' }
    ]
  },
  {
    level: 12,
    minExp: 8001,
    maxExp: 10000,
    title: '代码忍者',
    titleEmoji: '🥷',
    titleDescription: '代码写得飞快，bug 修得更快',
    privileges: {
      aiChatLimit: 'unlimited',
      knowledgeBaseCapacity: 1000,
      learningPathsLimit: 10,
      groupsLimit: 5,
      features: ['all_basic', 'paid_path_creation', 'ai_learning_plan', 'priority_support', 'code_lab_advanced', 'code_review', 'project_hosting_1gb']
    }
  },
  {
    level: 13,
    minExp: 10001,
    maxExp: 12000,
    title: '思维导图大师',
    titleEmoji: '🗺️',
    titleDescription: '脑子里的知识都是网状结构',
    privileges: {
      aiChatLimit: 'unlimited',
      knowledgeBaseCapacity: 1000,
      learningPathsLimit: 10,
      groupsLimit: 5,
      features: ['all_basic', 'paid_path_creation', 'ai_learning_plan', 'priority_support', 'mindmap_advanced', 'mindmap_collaboration', 'export_hd']
    }
  },
  {
    level: 14,
    minExp: 12001,
    maxExp: 14500,
    title: '时间管理专家',
    titleEmoji: '⏰',
    titleDescription: '把时间安排得明明白白，效率拉满',
    privileges: {
      aiChatLimit: 'unlimited',
      knowledgeBaseCapacity: 1000,
      learningPathsLimit: 10,
      groupsLimit: 5,
      features: ['all_basic', 'paid_path_creation', 'ai_learning_plan', 'priority_support', 'pomodoro_advanced', 'ai_schedule_optimization', 'time_analytics']
    }
  },
  {
    level: 15,
    minExp: 14501,
    maxExp: 17500,
    title: '社区活跃分子',
    titleEmoji: '💬',
    titleDescription: '社区里到处都能看到 TA 的身影',
    privileges: {
      aiChatLimit: 'unlimited',
      knowledgeBaseCapacity: 1000,
      learningPathsLimit: 10,
      groupsLimit: 10,
      features: ['all_basic', 'paid_path_creation', 'ai_learning_plan', 'priority_support', 'create_groups', 'group_management', 'community_badges']
    }
  },
  {
    level: 16,
    minExp: 17501,
    maxExp: 21000,
    title: '知识传播者',
    titleEmoji: '📢',
    titleDescription: '乐于分享，让知识流动起来',
    privileges: {
      aiChatLimit: 'unlimited',
      knowledgeBaseCapacity: 5000,
      learningPathsLimit: 'unlimited',
      groupsLimit: 10,
      features: ['all_basic', 'paid_path_creation', 'ai_learning_plan', 'priority_support', 'note_recommendation', 'creator_certification', 'tip_feature']
    }
  },
  {
    level: 17,
    minExp: 21001,
    maxExp: 25000,
    title: '全栈学习者',
    titleEmoji: '🎯',
    titleDescription: '什么都学，什么都会一点',
    privileges: {
      aiChatLimit: 'unlimited',
      knowledgeBaseCapacity: 5000,
      learningPathsLimit: 'unlimited',
      groupsLimit: 10,
      features: ['all_basic', 'paid_path_creation', 'ai_learning_plan', 'priority_support', 'cross_domain_recommendation', 'knowledge_transfer_analysis', 'custom_learning_path']
    }
  },
  {
    level: 18,
    minExp: 25001,
    maxExp: 30000,
    title: '学习机器',
    titleEmoji: '🤖',
    titleDescription: '学习起来像机器一样不知疲倦',
    privileges: {
      aiChatLimit: 'unlimited',
      knowledgeBaseCapacity: 5000,
      learningPathsLimit: 'unlimited',
      groupsLimit: 10,
      features: ['all_basic', 'paid_path_creation', 'ai_learning_plan', 'priority_support', 'learning_data_api', 'automation_tools', 'efficiency_analytics']
    },
    unlockConditions: [
      { type: 'learning_hours', value: 200, description: '学习 200 小时' },
      { type: 'streak_days', value: 100, description: '连续学习 100 天' }
    ]
  },
  {
    level: 19,
    minExp: 30001,
    maxExp: 36000,
    title: '知识架构师',
    titleEmoji: '🏗️',
    titleDescription: '能够构建完整的知识体系',
    privileges: {
      aiChatLimit: 'unlimited',
      knowledgeBaseCapacity: 5000,
      learningPathsLimit: 'unlimited',
      groupsLimit: 10,
      features: ['all_basic', 'paid_path_creation', 'ai_learning_plan', 'priority_support', 'path_editor_advanced', 'path_analytics', 'path_revenue_share']
    }
  },
  {
    level: 20,
    minExp: 36001,
    maxExp: 43000,
    title: '学霸本霸',
    titleEmoji: '👑',
    titleDescription: '真正的学霸，实至名归',
    privileges: {
      aiChatLimit: 'unlimited',
      knowledgeBaseCapacity: 5000,
      learningPathsLimit: 'unlimited',
      groupsLimit: 10,
      features: ['all_basic', 'paid_path_creation', 'ai_learning_plan', 'priority_support', 'xueba_badge', 'xueba_leaderboard', 'xueba_skin']
    },
    unlockConditions: [
      { type: 'knowledge_points', value: 150, description: '掌握 150 个知识点' },
      { type: 'accuracy_rate', value: 90, description: '练习题正确率 > 90%' }
    ]
  },
  // 大师阶段 (Lv 21-30) - 简化版
  {
    level: 21,
    minExp: 43001,
    maxExp: 51000,
    title: '知识炼金术士',
    titleEmoji: '⚗️',
    titleDescription: '能把不同领域的知识炼成金子',
    privileges: {
      aiChatLimit: 'unlimited',
      knowledgeBaseCapacity: 10000,
      learningPathsLimit: 'unlimited',
      groupsLimit: 10,
      features: ['all_features', 'knowledge_fusion', 'cross_domain_paths', 'innovation_training']
    }
  },
  {
    level: 25,
    minExp: 82001,
    maxExp: 96000,
    title: '终身学习践行者',
    titleEmoji: '🌟',
    titleDescription: '把学习变成了一种生活方式',
    privileges: {
      aiChatLimit: 'unlimited',
      knowledgeBaseCapacity: 10000,
      learningPathsLimit: 'unlimited',
      groupsLimit: 10,
      features: ['all_features', 'lifelong_badge', 'learning_memoir', 'platform_lifetime_member']
    },
    unlockConditions: [
      { type: 'streak_days', value: 365, description: '连续学习 365 天' }
    ]
  },
  {
    level: 30,
    minExp: 175001,
    maxExp: 200000,
    title: '知识宇宙探索者',
    titleEmoji: '🌌',
    titleDescription: '知识的边界在哪里？继续探索！',
    privileges: {
      aiChatLimit: 'unlimited',
      knowledgeBaseCapacity: 'unlimited',
      learningPathsLimit: 'unlimited',
      groupsLimit: 'unlimited',
      features: ['all_features', 'universe_explorer_badge', 'platform_lifetime_honor', 'hall_of_fame', 'unlimited_everything']
    },
    unlockConditions: [
      { type: 'knowledge_points', value: 500, description: '掌握 500 个知识点' },
      { type: 'learning_hours', value: 1000, description: '学习 1000 小时' }
    ]
  },
  // 传说阶段 (Lv 31-40) - 极简版
  {
    level: 40,
    minExp: 700001,
    maxExp: 999999999,
    title: '学习之神',
    titleEmoji: '👼',
    titleDescription: '传说中的学习之神，知识的化身',
    privileges: {
      aiChatLimit: 'unlimited',
      knowledgeBaseCapacity: 'unlimited',
      learningPathsLimit: 'unlimited',
      groupsLimit: 'unlimited',
      features: ['all_features', 'god_badge', 'platform_highest_honor', 'hall_of_fame_permanent', 'unlimited_everything', 'custom_features']
    }
  }
];

/**
 * 根据经验值获取等级配置
 */
export function getLevelByExp(exp: number): LevelConfig {
  for (let i = LEVEL_CONFIGS.length - 1; i >= 0; i--) {
    if (exp >= LEVEL_CONFIGS[i].minExp) {
      return LEVEL_CONFIGS[i];
    }
  }
  return LEVEL_CONFIGS[0];
}

/**
 * 根据等级数字获取等级配置
 */
export function getLevelByNumber(level: number): LevelConfig | undefined {
  return LEVEL_CONFIGS.find(config => config.level === level);
}

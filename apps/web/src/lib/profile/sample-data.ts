/**
 * 用户主页系统示例数据初始化脚本
 *
 * 使用方法：
 * 1. 在浏览器控制台运行此脚本
 * 2. 或在应用启动时调用 initializeProfileSampleData()
 */

import {
  saveUserProfile,
  updateSocialStats,
  addActivity,
  updateLearningCalendar,
  addMilestone
} from '@/lib/profile/profile-storage';
import type {
  UserProfile,
  UserActivity,
  UserNote,
  UserProject,
  UserGroup,
  Milestone
} from '@/lib/profile/profile-types';

export function initializeProfileSampleData() {
  if (typeof window === 'undefined') return;

  // 创建示例用户资料
  const sampleProfiles: UserProfile[] = [
    {
      userId: 'user_demo_001',
      username: 'alice_chen',
      displayName: '陈小雅',
      avatar: '👩‍💻',
      coverImage: 'https://images.unsplash.com/photo-1557683316-973673baf926',
      bio: '全栈开发者 | 终身学习者 | 开源爱好者\n热爱技术，喜欢分享，相信知识的力量。',
      signature: '代码改变世界 ✨',
      school: '清华大学',
      company: '字节跳动',
      location: '北京',
      website: 'https://alice.dev',
      github: 'alice-chen',
      twitter: 'alice_codes',
      blog: 'https://blog.alice.dev',
      interests: ['前端开发', '人工智能', 'Web3', '开源项目'],
      skills: ['React', 'TypeScript', 'Node.js', 'Python', 'Machine Learning'],
      theme: 'blue',
      isPublic: true,
      createdAt: '2024-01-15T08:00:00Z',
      updatedAt: new Date().toISOString()
    },
    {
      userId: 'user_demo_002',
      username: 'bob_wang',
      displayName: '王大明',
      avatar: '👨‍🎓',
      coverImage: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c',
      bio: '计算机科学在读博士 | 算法竞赛选手\n专注于算法研究和系统设计。',
      signature: '算法之美，代码之道 🚀',
      school: '北京大学',
      location: '北京',
      github: 'bob-wang',
      interests: ['算法', '数据结构', '竞赛编程', '系统设计'],
      skills: ['C++', 'Java', 'Algorithms', 'Data Structures', 'System Design'],
      theme: 'default',
      isPublic: true,
      createdAt: '2024-02-20T10:30:00Z',
      updatedAt: new Date().toISOString()
    },
    {
      userId: 'user_demo_003',
      username: 'carol_li',
      displayName: '李晓晓',
      avatar: '👩‍🏫',
      coverImage: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f',
      bio: '高中数学教师 | 教育技术爱好者\n用技术赋能教育，让学习更有趣。',
      signature: '教育改变未来 📚',
      school: '北京师范大学',
      company: '北京四中',
      location: '北京',
      interests: ['数学教育', '教育技术', '在线教学', '课程设计'],
      skills: ['数学', '教学设计', 'PPT制作', '视频剪辑'],
      theme: 'green',
      isPublic: true,
      createdAt: '2024-03-10T14:00:00Z',
      updatedAt: new Date().toISOString()
    }
  ];

  // 保存用户资料
  sampleProfiles.forEach(profile => {
    saveUserProfile(profile);
  });

  // 创建社交统计数据
  const socialStatsData = [
    {
      userId: 'user_demo_001',
      followingCount: 156,
      followersCount: 892,
      likesReceived: 3421,
      commentsReceived: 567,
      sharesReceived: 234,
      reputation: 8520,
      contributionScore: 9200
    },
    {
      userId: 'user_demo_002',
      followingCount: 89,
      followersCount: 445,
      likesReceived: 1876,
      commentsReceived: 312,
      sharesReceived: 145,
      reputation: 5430,
      contributionScore: 6100
    },
    {
      userId: 'user_demo_003',
      followingCount: 203,
      followersCount: 1234,
      likesReceived: 5678,
      commentsReceived: 890,
      sharesReceived: 456,
      reputation: 12340,
      contributionScore: 13500
    }
  ];

  socialStatsData.forEach(stats => {
    updateSocialStats(stats.userId, stats);
  });

  // 创建示例动态
  const sampleActivities: Omit<UserActivity, 'activityId' | 'createdAt'>[] = [
    {
      userId: 'user_demo_001',
      type: 'note_created',
      title: 'React 18 新特性深度解析',
      description: '详细介绍了 React 18 的并发渲染、自动批处理等新特性',
      isPublic: true
    },
    {
      userId: 'user_demo_001',
      type: 'achievement_unlocked',
      title: '解锁成就：黄金学者',
      description: '学习时长达到 100 小时',
      isPublic: true
    },
    {
      userId: 'user_demo_001',
      type: 'project_shared',
      title: '分享项目：EduNexus 知识管理系统',
      description: '一个基于 AI 的智能学习平台',
      isPublic: true
    },
    {
      userId: 'user_demo_002',
      type: 'answer_posted',
      title: '回答了问题：如何优化算法时间复杂度？',
      description: '详细讲解了动态规划和贪心算法的应用',
      isPublic: true
    },
    {
      userId: 'user_demo_002',
      type: 'level_up',
      title: '等级提升至 Lv.20',
      description: '成为算法大师',
      isPublic: true
    },
    {
      userId: 'user_demo_003',
      type: 'note_created',
      title: '高中数学教学方法总结',
      description: '分享了多年教学经验和创新教学方法',
      isPublic: true
    },
    {
      userId: 'user_demo_003',
      type: 'group_joined',
      title: '加入小组：数学教育研究',
      description: '与全国各地的数学教师交流教学经验',
      isPublic: true
    }
  ];

  sampleActivities.forEach(activity => {
    addActivity(activity);
  });

  // 创建示例笔记
  const sampleNotes: UserNote[] = [
    {
      noteId: 'note_001',
      userId: 'user_demo_001',
      title: 'TypeScript 高级类型系统',
      content: '深入探讨 TypeScript 的类型系统...',
      excerpt: '本文详细介绍了 TypeScript 的高级类型特性，包括条件类型、映射类型等',
      tags: ['TypeScript', '前端开发', '类型系统'],
      isPublic: true,
      likesCount: 234,
      viewsCount: 1567,
      commentsCount: 45,
      createdAt: '2024-11-15T10:00:00Z',
      updatedAt: '2024-11-20T15:30:00Z'
    },
    {
      noteId: 'note_002',
      userId: 'user_demo_001',
      title: 'React 性能优化实战',
      content: 'React 性能优化的最佳实践...',
      excerpt: '分享在实际项目中总结的 React 性能优化技巧和经验',
      tags: ['React', '性能优化', '前端开发'],
      isPublic: true,
      likesCount: 456,
      viewsCount: 2890,
      commentsCount: 78,
      createdAt: '2024-12-01T14:00:00Z',
      updatedAt: '2024-12-05T09:20:00Z'
    }
  ];

  localStorage.setItem('edunexus_user_notes', JSON.stringify(sampleNotes));

  // 创建示例项目
  const sampleProjects: UserProject[] = [
    {
      projectId: 'project_001',
      userId: 'user_demo_001',
      name: 'EduNexus',
      description: '基于 AI 的智能学习平台，提供个性化学习路径和知识管理功能',
      coverImage: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3',
      technologies: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'AI'],
      githubUrl: 'https://github.com/alice-chen/edunexus',
      demoUrl: 'https://edunexus.demo.com',
      isPublic: true,
      likesCount: 567,
      viewsCount: 3456,
      createdAt: '2024-10-01T08:00:00Z',
      updatedAt: '2024-12-10T16:00:00Z'
    },
    {
      projectId: 'project_002',
      userId: 'user_demo_001',
      name: 'Code Visualizer',
      description: '代码可视化工具，帮助理解复杂算法和数据结构',
      technologies: ['React', 'D3.js', 'TypeScript'],
      githubUrl: 'https://github.com/alice-chen/code-visualizer',
      isPublic: true,
      likesCount: 234,
      viewsCount: 1890,
      createdAt: '2024-09-15T10:00:00Z',
      updatedAt: '2024-11-20T14:30:00Z'
    }
  ];

  localStorage.setItem('edunexus_user_projects', JSON.stringify(sampleProjects));

  // 创建示例小组
  const sampleGroups: Record<string, UserGroup[]> = {
    user_demo_001: [
      {
        groupId: 'group_001',
        name: '前端技术交流',
        description: '分享前端开发经验和最新技术动态',
        avatar: '💻',
        memberCount: 1234,
        role: 'admin',
        joinedAt: '2024-06-01T08:00:00Z'
      },
      {
        groupId: 'group_002',
        name: 'AI 学习小组',
        description: '一起学习人工智能和机器学习',
        avatar: '🤖',
        memberCount: 567,
        role: 'member',
        joinedAt: '2024-08-15T10:00:00Z'
      }
    ],
    user_demo_002: [
      {
        groupId: 'group_003',
        name: '算法竞赛训练营',
        description: '备战各类算法竞赛',
        avatar: '🏆',
        memberCount: 890,
        role: 'owner',
        joinedAt: '2024-05-01T08:00:00Z'
      }
    ],
    user_demo_003: [
      {
        groupId: 'group_004',
        name: '数学教育研究',
        description: '探讨数学教学方法和教育技术',
        avatar: '📐',
        memberCount: 456,
        role: 'admin',
        joinedAt: '2024-07-01T08:00:00Z'
      }
    ]
  };

  localStorage.setItem('edunexus_user_groups', JSON.stringify(sampleGroups));

  // 创建学习日历数据
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // 随机生成学习时长
    const minutes = Math.random() > 0.3 ? Math.floor(Math.random() * 180) : 0;

    if (minutes > 0) {
      updateLearningCalendar('user_demo_001', dateStr, minutes);
      updateLearningCalendar('user_demo_002', dateStr, Math.floor(minutes * 0.8));
      updateLearningCalendar('user_demo_003', dateStr, Math.floor(minutes * 1.2));
    }
  }

  // 创建里程碑
  const sampleMilestones: Omit<Milestone, 'milestoneId' | 'achievedAt'>[] = [
    {
      userId: 'user_demo_001',
      type: 'level_up',
      title: '达到 15 级',
      description: '成为学术大师',
      icon: '⬆️'
    },
    {
      userId: 'user_demo_001',
      type: 'learning_hours',
      title: '学习 100 小时',
      description: '累计学习时长突破 100 小时',
      icon: '⏱️'
    },
    {
      userId: 'user_demo_001',
      type: 'streak_milestone',
      title: '连续学习 100 天',
      description: '保持学习习惯 100 天',
      icon: '🔥'
    },
    {
      userId: 'user_demo_001',
      type: 'badge_earned',
      title: '获得黄金学者徽章',
      description: '学习成就达到黄金级别',
      icon: '🥇'
    }
  ];

  sampleMilestones.forEach(milestone => {
    addMilestone(milestone);
  });

  console.log('✅ 用户主页示例数据初始化完成！');
  console.log('📝 已创建 3 个示例用户');
  console.log('🎯 已创建社交统计、动态、笔记、项目、小组等数据');
  console.log('📅 已生成 365 天的学习日历数据');
  console.log('🏆 已创建里程碑数据');
  console.log('\n访问以下链接查看示例用户主页：');
  console.log('- /profile/alice_chen');
  console.log('- /profile/bob_wang');
  console.log('- /profile/carol_li');
}

// 清除所有示例数据
export function clearProfileSampleData() {
  if (typeof window === 'undefined') return;

  const keys = [
    'edunexus_user_profiles',
    'edunexus_social_stats',
    'edunexus_follows',
    'edunexus_activities',
    'edunexus_user_notes',
    'edunexus_user_projects',
    'edunexus_user_groups',
    'edunexus_privacy_settings',
    'edunexus_learning_calendar',
    'edunexus_milestones'
  ];

  keys.forEach(key => localStorage.removeItem(key));
  console.log('🗑️ 已清除所有用户主页示例数据');
}

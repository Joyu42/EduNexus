/**
 * 用户个人主页数据存储服务
 */

import type {
  UserProfile,
  UserSocialStats,
  UserFollow,
  UserActivity,
  UserNote,
  UserProject,
  UserGroup,
  PrivacySettings,
  LearningCalendar,
  Milestone
} from './profile-types';

const STORAGE_KEYS = {
  PROFILES: 'edunexus_user_profiles',
  SOCIAL_STATS: 'edunexus_social_stats',
  FOLLOWS: 'edunexus_follows',
  ACTIVITIES: 'edunexus_activities',
  NOTES: 'edunexus_user_notes',
  PROJECTS: 'edunexus_user_projects',
  GROUPS: 'edunexus_user_groups',
  PRIVACY: 'edunexus_privacy_settings',
  CALENDAR: 'edunexus_learning_calendar',
  MILESTONES: 'edunexus_milestones'
};

// ==================== 用户资料 ====================

export function getUserProfile(userId: string): UserProfile | null {
  if (typeof window === 'undefined') return null;
  const profiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILES) || '{}');
  return profiles[userId] || null;
}

export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  const profiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILES) || '{}');
  profiles[profile.userId] = {
    ...profile,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
}

export function updateUserProfile(userId: string, updates: Partial<UserProfile>): void {
  const profile = getUserProfile(userId);
  if (!profile) return;
  saveUserProfile({ ...profile, ...updates });
}

// ==================== 社交统计 ====================

export function getSocialStats(userId: string): UserSocialStats | null {
  if (typeof window === 'undefined') return null;
  const stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOCIAL_STATS) || '{}');
  return stats[userId] || null;
}

export function updateSocialStats(userId: string, updates: Partial<UserSocialStats>): void {
  if (typeof window === 'undefined') return;
  const stats = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOCIAL_STATS) || '{}');
  stats[userId] = {
    ...stats[userId],
    ...updates,
    userId,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEYS.SOCIAL_STATS, JSON.stringify(stats));
}

// ==================== 关注系统 ====================

export function followUser(followerId: string, followingId: string): void {
  if (typeof window === 'undefined') return;
  const follows = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOWS) || '[]') as UserFollow[];

  const existing = follows.find(f => f.followerId === followerId && f.followingId === followingId);
  if (existing) return;

  const newFollow: UserFollow = {
    followId: `follow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    followerId,
    followingId,
    createdAt: new Date().toISOString()
  };

  follows.push(newFollow);
  localStorage.setItem(STORAGE_KEYS.FOLLOWS, JSON.stringify(follows));

  const followerStats = getSocialStats(followerId) || createDefaultSocialStats(followerId);
  const followingStats = getSocialStats(followingId) || createDefaultSocialStats(followingId);

  updateSocialStats(followerId, { followingCount: followerStats.followingCount + 1 });
  updateSocialStats(followingId, { followersCount: followingStats.followersCount + 1 });
}

export function unfollowUser(followerId: string, followingId: string): void {
  if (typeof window === 'undefined') return;
  const follows = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOWS) || '[]') as UserFollow[];

  const filtered = follows.filter(f => !(f.followerId === followerId && f.followingId === followingId));
  localStorage.setItem(STORAGE_KEYS.FOLLOWS, JSON.stringify(filtered));

  const followerStats = getSocialStats(followerId);
  const followingStats = getSocialStats(followingId);

  if (followerStats) {
    updateSocialStats(followerId, { followingCount: Math.max(0, followerStats.followingCount - 1) });
  }
  if (followingStats) {
    updateSocialStats(followingId, { followersCount: Math.max(0, followingStats.followersCount - 1) });
  }
}

export function isFollowing(followerId: string, followingId: string): boolean {
  if (typeof window === 'undefined') return false;
  const follows = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOWS) || '[]') as UserFollow[];
  return follows.some(f => f.followerId === followerId && f.followingId === followingId);
}

export function getFollowers(userId: string): string[] {
  if (typeof window === 'undefined') return [];
  const follows = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOWS) || '[]') as UserFollow[];
  return follows.filter(f => f.followingId === userId).map(f => f.followerId);
}

export function getFollowing(userId: string): string[] {
  if (typeof window === 'undefined') return [];
  const follows = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOLLOWS) || '[]') as UserFollow[];
  return follows.filter(f => f.followerId === userId).map(f => f.followingId);
}

// ==================== 用户动态 ====================

export function getUserActivities(userId: string, limit = 20): UserActivity[] {
  if (typeof window === 'undefined') return [];
  const activities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || '[]') as UserActivity[];
  return activities
    .filter(a => a.userId === userId && a.isPublic)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function addActivity(activity: Omit<UserActivity, 'activityId' | 'createdAt'>): void {
  if (typeof window === 'undefined') return;
  const activities = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITIES) || '[]') as UserActivity[];

  const newActivity: UserActivity = {
    ...activity,
    activityId: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString()
  };

  activities.push(newActivity);
  localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
}

// ==================== 用户笔记 ====================

export function getUserNotes(userId: string, publicOnly = true): UserNote[] {
  if (typeof window === 'undefined') return [];
  const notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || '[]') as UserNote[];
  return notes
    .filter(n => n.userId === userId && (!publicOnly || n.isPublic))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// ==================== 用户项目 ====================

export function getUserProjects(userId: string, publicOnly = true): UserProject[] {
  if (typeof window === 'undefined') return [];
  const projects = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROJECTS) || '[]') as UserProject[];
  return projects
    .filter(p => p.userId === userId && (!publicOnly || p.isPublic))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// ==================== 用户小组 ====================

export function getUserGroups(userId: string): UserGroup[] {
  if (typeof window === 'undefined') return [];
  const groups = JSON.parse(localStorage.getItem(STORAGE_KEYS.GROUPS) || '{}');
  return groups[userId] || [];
}

// ==================== 隐私设置 ====================

export function getPrivacySettings(userId: string): PrivacySettings {
  if (typeof window === 'undefined') return createDefaultPrivacySettings(userId);
  const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRIVACY) || '{}');
  return settings[userId] || createDefaultPrivacySettings(userId);
}

export function updatePrivacySettings(userId: string, updates: Partial<PrivacySettings>): void {
  if (typeof window === 'undefined') return;
  const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRIVACY) || '{}');
  settings[userId] = {
    ...settings[userId],
    ...updates,
    userId,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEYS.PRIVACY, JSON.stringify(settings));
}

// ==================== 学习日历 ====================

export function getLearningCalendar(userId: string, days = 365): LearningCalendar[] {
  if (typeof window === 'undefined') return [];
  const calendar = JSON.parse(localStorage.getItem(STORAGE_KEYS.CALENDAR) || '{}');
  const userCalendar = calendar[userId] || [];

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return userCalendar.filter((day: LearningCalendar) => {
    const date = new Date(day.date);
    return date >= startDate && date <= endDate;
  });
}

export function updateLearningCalendar(userId: string, date: string, minutes: number): void {
  if (typeof window === 'undefined') return;
  const calendar = JSON.parse(localStorage.getItem(STORAGE_KEYS.CALENDAR) || '{}');
  const userCalendar = calendar[userId] || [];

  const existingIndex = userCalendar.findIndex((day: LearningCalendar) => day.date === date);
  const totalMinutes = existingIndex >= 0 ? userCalendar[existingIndex].minutes + minutes : minutes;

  let level: 0 | 1 | 2 | 3 | 4 = 0;
  if (totalMinutes >= 120) level = 4;
  else if (totalMinutes >= 60) level = 3;
  else if (totalMinutes >= 30) level = 2;
  else if (totalMinutes > 0) level = 1;

  const dayData: LearningCalendar = { date, minutes: totalMinutes, level };

  if (existingIndex >= 0) {
    userCalendar[existingIndex] = dayData;
  } else {
    userCalendar.push(dayData);
  }

  calendar[userId] = userCalendar;
  localStorage.setItem(STORAGE_KEYS.CALENDAR, JSON.stringify(calendar));
}

// ==================== 里程碑 ====================

export function getUserMilestones(userId: string): Milestone[] {
  if (typeof window === 'undefined') return [];
  const milestones = JSON.parse(localStorage.getItem(STORAGE_KEYS.MILESTONES) || '[]') as Milestone[];
  return milestones
    .filter(m => m.userId === userId)
    .sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime());
}

export function addMilestone(milestone: Omit<Milestone, 'milestoneId' | 'achievedAt'>): void {
  if (typeof window === 'undefined') return;
  const milestones = JSON.parse(localStorage.getItem(STORAGE_KEYS.MILESTONES) || '[]') as Milestone[];

  const newMilestone: Milestone = {
    ...milestone,
    milestoneId: `milestone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    achievedAt: new Date().toISOString()
  };

  milestones.push(newMilestone);
  localStorage.setItem(STORAGE_KEYS.MILESTONES, JSON.stringify(milestones));
}

// ==================== 辅助函数 ====================

function createDefaultSocialStats(userId: string): UserSocialStats {
  return {
    userId,
    followingCount: 0,
    followersCount: 0,
    likesReceived: 0,
    commentsReceived: 0,
    sharesReceived: 0,
    reputation: 0,
    contributionScore: 0,
    updatedAt: new Date().toISOString()
  };
}

function createDefaultPrivacySettings(userId: string): PrivacySettings {
  return {
    userId,
    profileVisibility: 'public',
    showEmail: false,
    showSocialLinks: true,
    showLearningStats: true,
    showAchievements: true,
    showActivities: true,
    allowFollow: true,
    allowComments: true,
    blockedUsers: [],
    updatedAt: new Date().toISOString()
  };
}

// ==================== 初始化示例数据 ====================

export function initializeSampleProfiles(): void {
  if (typeof window === 'undefined') return;

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

  const profiles = JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILES) || '{}');
  sampleProfiles.forEach(profile => {
    if (!profiles[profile.userId]) {
      profiles[profile.userId] = profile;
    }
  });
  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));

  const socialStats = JSON.parse(localStorage.getItem(STORAGE_KEYS.SOCIAL_STATS) || '{}');
  const sampleStats = [
    { userId: 'user_demo_001', followingCount: 156, followersCount: 892, likesReceived: 3421, commentsReceived: 567, sharesReceived: 234, reputation: 8520, contributionScore: 9200 },
    { userId: 'user_demo_002', followingCount: 89, followersCount: 445, likesReceived: 1876, commentsReceived: 312, sharesReceived: 145, reputation: 5430, contributionScore: 6100 },
    { userId: 'user_demo_003', followingCount: 203, followersCount: 1234, likesReceived: 5678, commentsReceived: 890, sharesReceived: 456, reputation: 12340, contributionScore: 13500 }
  ];

  sampleStats.forEach(stat => {
    if (!socialStats[stat.userId]) {
      socialStats[stat.userId] = { ...stat, updatedAt: new Date().toISOString() };
    }
  });
  localStorage.setItem(STORAGE_KEYS.SOCIAL_STATS, JSON.stringify(socialStats));
}


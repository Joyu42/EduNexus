/**
 * 用户个人主页系统类型定义
 */

export type UserProfile = {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  coverImage?: string;
  bio?: string;
  signature?: string;
  school?: string;
  company?: string;
  location?: string;
  website?: string;
  github?: string;
  twitter?: string;
  blog?: string;
  interests: string[];
  skills: string[];
  theme?: 'default' | 'dark' | 'blue' | 'green' | 'purple';
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserSocialStats = {
  userId: string;
  followingCount: number;
  followersCount: number;
  likesReceived: number;
  commentsReceived: number;
  sharesReceived: number;
  reputation: number;
  contributionScore: number;
  updatedAt: string;
};

export type UserFollow = {
  followId: string;
  followerId: string;
  followingId: string;
  createdAt: string;
};

export type UserActivity = {
  activityId: string;
  userId: string;
  type: 'note_created' | 'note_updated' | 'question_asked' | 'answer_posted' |
        'achievement_unlocked' | 'level_up' | 'group_joined' | 'project_shared';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  isPublic: boolean;
  createdAt: string;
};

export type UserNote = {
  noteId: string;
  userId: string;
  title: string;
  content: string;
  excerpt?: string;
  tags: string[];
  isPublic: boolean;
  likesCount: number;
  viewsCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type UserProject = {
  projectId: string;
  userId: string;
  name: string;
  description: string;
  coverImage?: string;
  technologies: string[];
  githubUrl?: string;
  demoUrl?: string;
  isPublic: boolean;
  likesCount: number;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
};

export type UserGroup = {
  groupId: string;
  name: string;
  description: string;
  avatar?: string;
  memberCount: number;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
};

export type PrivacySettings = {
  userId: string;
  profileVisibility: 'public' | 'followers' | 'private';
  showEmail: boolean;
  showSocialLinks: boolean;
  showLearningStats: boolean;
  showAchievements: boolean;
  showActivities: boolean;
  allowFollow: boolean;
  allowComments: boolean;
  blockedUsers: string[];
  updatedAt: string;
};

export type LearningCalendar = {
  date: string;
  minutes: number;
  level: 0 | 1 | 2 | 3 | 4;
};

export type SkillRadarData = {
  skill: string;
  value: number;
  maxValue: number;
};

export type Milestone = {
  milestoneId: string;
  userId: string;
  type: 'level_up' | 'badge_earned' | 'streak_milestone' | 'learning_hours' | 'custom';
  title: string;
  description: string;
  icon: string;
  achievedAt: string;
};

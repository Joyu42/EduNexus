/**
 * 用户等级系统类型定义
 */

export type UserLevel = {
  userId: string;
  level: number;
  currentExp: number;
  totalExp: number;
  title: string;
  titleEmoji: string;
  titleDescription: string;
  createdAt: string;
  updatedAt: string;
};

export type UserExperience = {
  userId: string;
  learningTimeExp: number;      // 学习时长经验
  knowledgeMasteryExp: number;  // 知识掌握经验
  practiceExp: number;          // 练习完成经验
  communityExp: number;         // 社区贡献经验
  streakExp: number;            // 连续学习经验
  totalExp: number;             // 总经验值
  updatedAt: string;
};

export type UserAchievement = {
  achievementId: string;
  userId: string;
  badgeId: string;
  unlockedAt: string;
  progress: number;             // 0-100
  isCompleted: boolean;
};

export type Badge = {
  badgeId: string;
  name: string;
  description: string;
  emoji: string;
  category: 'learning' | 'practice' | 'community' | 'special' | 'limited';
  requirement: BadgeRequirement;
  expReward: number;
  createdAt: string;
};

export type BadgeRequirement = {
  type: 'learning_hours' | 'practice_count' | 'streak_days' | 'posts_count' |
        'answers_count' | 'likes_count' | 'notes_count' | 'knowledge_points' | 'custom';
  threshold: number;
  customCheck?: string;         // 自定义检查逻辑的标识符
};

export type LevelConfig = {
  level: number;
  minExp: number;
  maxExp: number;
  title: string;
  titleEmoji: string;
  titleDescription: string;
  privileges: LevelPrivileges;
  unlockConditions?: UnlockCondition[];
};

export type LevelPrivileges = {
  aiChatLimit: number | 'unlimited';
  knowledgeBaseCapacity: number | 'unlimited';
  learningPathsLimit: number | 'unlimited';
  groupsLimit: number | 'unlimited';
  features: string[];
};

export type UnlockCondition = {
  type: 'learning_hours' | 'knowledge_points' | 'practice_count' |
        'streak_days' | 'accuracy_rate' | 'custom';
  value: number;
  description: string;
};

export type ExpGainEvent = {
  userId: string;
  eventType: 'learning_minute' | 'create_note' | 'edit_note' |
             'practice_correct' | 'practice_wrong' | 'master_knowledge' |
             'complete_path' | 'pass_quiz' | 'post' | 'answer' |
             'answer_accepted' | 'like_received' | 'share_note' |
             'streak_day' | 'streak_week' | 'streak_month' | 'streak_100days' |
             'complete_tutorial' | 'invite_friend' | 'event_participation' | 'badge_earned';
  expGained: number;
  metadata?: Record<string, any>;
  timestamp: string;
};

export type UserStats = {
  userId: string;
  learningMinutes: number;
  notesCreated: number;
  notesEdited: number;
  practiceCorrect: number;
  practiceWrong: number;
  knowledgePointsMastered: number;
  pathsCompleted: number;
  quizzesPassed: number;
  postsCount: number;
  answersCount: number;
  answersAccepted: number;
  likesReceived: number;
  notesShared: number;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
  updatedAt: string;
};

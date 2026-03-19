import { loadDb, saveDb } from './store';
import type {
  UserLevel,
  UserExperience,
  UserStats,
  ExpGainEvent,
  UserAchievement
} from './user-level-types';
import { getLevelByExp, getLevelByNumber, LEVEL_CONFIGS } from './level-config';
import { BADGE_CONFIGS, getBadgeById } from './badge-config';

/**
 * 经验值获取规则（基于设计文档）
 */
export const EXP_RULES = {
  // 日常学习
  LEARNING_MINUTE: 2,
  CREATE_NOTE: 20,
  EDIT_NOTE: 5,
  PRACTICE_CORRECT: 10,
  PRACTICE_WRONG: 2,

  // 知识掌握
  MASTER_KNOWLEDGE: 50,
  COMPLETE_PATH: 200,
  PASS_QUIZ: 100,

  // 社区贡献
  POST: 5,
  ANSWER: 10,
  ANSWER_ACCEPTED: 30,
  LIKE_RECEIVED: 1,
  SHARE_NOTE: 15,

  // 连续学习
  STREAK_DAY: 20,
  STREAK_WEEK: 100,
  STREAK_MONTH: 500,
  STREAK_100DAYS: 2000,

  // 特殊成就
  COMPLETE_TUTORIAL: 50,
  INVITE_FRIEND: 100,
  EVENT_PARTICIPATION: 50
};

/**
 * 经验值权重（用于计算总经验值）
 */
const EXP_WEIGHTS = {
  learningTime: 0.3,
  knowledgeMastery: 0.25,
  practice: 0.2,
  community: 0.15,
  streak: 0.1
};

/**
 * 获取用户等级信息
 */
export async function getUserLevel(userId: string): Promise<UserLevel> {
  const db = await loadDb();

  if (!db.userLevels[userId]) {
    // 初始化新用户等级
    const initialLevel: UserLevel = {
      userId,
      level: 1,
      currentExp: 0,
      totalExp: 0,
      title: '懵懂萌新',
      titleEmoji: '🐣',
      titleDescription: '刚踏入知识的海洋，眼神里充满好奇和迷茫',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.userLevels[userId] = initialLevel;
    await saveDb(db);
    return initialLevel;
  }

  return db.userLevels[userId];
}

/**
 * 获取用户经验值详情
 */
export async function getUserExperience(userId: string): Promise<UserExperience> {
  const db = await loadDb();

  if (!db.userExperience[userId]) {
    const initialExp: UserExperience = {
      userId,
      learningTimeExp: 0,
      knowledgeMasteryExp: 0,
      practiceExp: 0,
      communityExp: 0,
      streakExp: 0,
      totalExp: 0,
      updatedAt: new Date().toISOString()
    };

    db.userExperience[userId] = initialExp;
    await saveDb(db);
    return initialExp;
  }

  return db.userExperience[userId];
}

/**
 * 获取用户统计数据
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  const db = await loadDb();

  if (!db.userStats[userId]) {
    const initialStats: UserStats = {
      userId,
      learningMinutes: 0,
      notesCreated: 0,
      notesEdited: 0,
      practiceCorrect: 0,
      practiceWrong: 0,
      knowledgePointsMastered: 0,
      pathsCompleted: 0,
      quizzesPassed: 0,
      postsCount: 0,
      answersCount: 0,
      answersAccepted: 0,
      likesReceived: 0,
      notesShared: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.userStats[userId] = initialStats;
    await saveDb(db);
    return initialStats;
  }

  return db.userStats[userId];
}

/**
 * 添加经验值
 */
export async function addExperience(
  userId: string,
  eventType: ExpGainEvent['eventType'],
  metadata?: Record<string, any>
): Promise<{
  expGained: number;
  levelUp: boolean;
  newLevel?: number;
  unlockedBadges?: string[];
}> {
  const db = await loadDb();

  // 计算获得的经验值
  let expGained = 0;
  switch (eventType) {
    case 'learning_minute':
      expGained = EXP_RULES.LEARNING_MINUTE;
      break;
    case 'create_note':
      expGained = EXP_RULES.CREATE_NOTE;
      break;
    case 'edit_note':
      expGained = EXP_RULES.EDIT_NOTE;
      break;
    case 'practice_correct':
      expGained = EXP_RULES.PRACTICE_CORRECT;
      break;
    case 'practice_wrong':
      expGained = EXP_RULES.PRACTICE_WRONG;
      break;
    case 'master_knowledge':
      expGained = EXP_RULES.MASTER_KNOWLEDGE;
      break;
    case 'complete_path':
      expGained = EXP_RULES.COMPLETE_PATH;
      break;
    case 'pass_quiz':
      expGained = EXP_RULES.PASS_QUIZ;
      break;
    case 'post':
      expGained = EXP_RULES.POST;
      break;
    case 'answer':
      expGained = EXP_RULES.ANSWER;
      break;
    case 'answer_accepted':
      expGained = EXP_RULES.ANSWER_ACCEPTED;
      break;
    case 'like_received':
      expGained = EXP_RULES.LIKE_RECEIVED;
      break;
    case 'share_note':
      expGained = EXP_RULES.SHARE_NOTE;
      break;
    case 'streak_day':
      expGained = EXP_RULES.STREAK_DAY;
      break;
    case 'streak_week':
      expGained = EXP_RULES.STREAK_WEEK;
      break;
    case 'streak_month':
      expGained = EXP_RULES.STREAK_MONTH;
      break;
    case 'streak_100days':
      expGained = EXP_RULES.STREAK_100DAYS;
      break;
    case 'complete_tutorial':
      expGained = EXP_RULES.COMPLETE_TUTORIAL;
      break;
    case 'invite_friend':
      expGained = EXP_RULES.INVITE_FRIEND;
      break;
    case 'event_participation':
      expGained = metadata?.expReward ?? EXP_RULES.EVENT_PARTICIPATION;
      break;
    case 'badge_earned':
      expGained = metadata?.expReward ?? 0;
      break;
  }

  // 记录经验值获取历史
  const expEvent: ExpGainEvent = {
    userId,
    eventType,
    expGained,
    metadata,
    timestamp: new Date().toISOString()
  };
  db.expGainHistory.push(expEvent);

  // 更新用户经验值
  const userExp = await getUserExperience(userId);
  const oldTotalExp = userExp.totalExp;
  userExp.totalExp += expGained;

  // 更新分类经验值
  if (eventType === 'learning_minute') {
    userExp.learningTimeExp += expGained;
  } else if (['master_knowledge', 'complete_path', 'pass_quiz'].includes(eventType)) {
    userExp.knowledgeMasteryExp += expGained;
  } else if (['practice_correct', 'practice_wrong'].includes(eventType)) {
    userExp.practiceExp += expGained;
  } else if (['post', 'answer', 'answer_accepted', 'like_received', 'share_note'].includes(eventType)) {
    userExp.communityExp += expGained;
  } else if (eventType.startsWith('streak_')) {
    userExp.streakExp += expGained;
  }

  userExp.updatedAt = new Date().toISOString();
  db.userExperience[userId] = userExp;

  // 检查是否升级
  const userLevel = await getUserLevel(userId);
  const oldLevel = userLevel.level;
  const newLevelConfig = getLevelByExp(userExp.totalExp);
  const levelUp = newLevelConfig.level > oldLevel;

  if (levelUp) {
    userLevel.level = newLevelConfig.level;
    userLevel.title = newLevelConfig.title;
    userLevel.titleEmoji = newLevelConfig.titleEmoji;
    userLevel.titleDescription = newLevelConfig.titleDescription;
  }

  userLevel.totalExp = userExp.totalExp;
  userLevel.currentExp = userExp.totalExp - newLevelConfig.minExp;
  userLevel.updatedAt = new Date().toISOString();
  db.userLevels[userId] = userLevel;

  // 检查徽章解锁
  const unlockedBadges = await checkAndUnlockBadges(userId, db);

  await saveDb(db);

  return {
    expGained,
    levelUp,
    newLevel: levelUp ? newLevelConfig.level : undefined,
    unlockedBadges: unlockedBadges.length > 0 ? unlockedBadges : undefined
  };
}

/**
 * 更新用户统计数据
 */
export async function updateUserStats(
  userId: string,
  updates: Partial<Omit<UserStats, 'userId' | 'updatedAt'>>
): Promise<UserStats> {
  const db = await loadDb();
  const stats = await getUserStats(userId);

  Object.assign(stats, updates);
  stats.updatedAt = new Date().toISOString();

  // 更新最长连续学习天数
  if (updates.currentStreak !== undefined && updates.currentStreak > stats.longestStreak) {
    stats.longestStreak = updates.currentStreak;
  }

  db.userStats[userId] = stats;
  await saveDb(db);

  return stats;
}

/**
 * 检查并解锁徽章
 */
async function checkAndUnlockBadges(userId: string, db: any): Promise<string[]> {
  const stats = await getUserStats(userId);
  const userAchievements = db.userAchievements.filter((a: UserAchievement) => a.userId === userId);
  const unlockedBadgeIds = new Set(userAchievements.map((a: UserAchievement) => a.badgeId));
  const newlyUnlocked: string[] = [];

  for (const badge of BADGE_CONFIGS) {
    if (unlockedBadgeIds.has(badge.badgeId)) continue;

    let shouldUnlock = false;

    switch (badge.requirement.type) {
      case 'learning_hours':
        shouldUnlock = (stats.learningMinutes / 60) >= badge.requirement.threshold;
        break;
      case 'practice_count':
        shouldUnlock = (stats.practiceCorrect + stats.practiceWrong) >= badge.requirement.threshold;
        break;
      case 'streak_days':
        shouldUnlock = stats.currentStreak >= badge.requirement.threshold;
        break;
      case 'posts_count':
        shouldUnlock = stats.postsCount >= badge.requirement.threshold;
        break;
      case 'answers_count':
        shouldUnlock = stats.answersCount >= badge.requirement.threshold;
        break;
      case 'likes_count':
        shouldUnlock = stats.likesReceived >= badge.requirement.threshold;
        break;
      case 'notes_count':
        shouldUnlock = stats.notesCreated >= badge.requirement.threshold;
        break;
      case 'knowledge_points':
        shouldUnlock = stats.knowledgePointsMastered >= badge.requirement.threshold;
        break;
      case 'custom':
        // 自定义检查逻辑
        shouldUnlock = checkCustomBadgeRequirement(badge.requirement.customCheck!, stats);
        break;
    }

    if (shouldUnlock) {
      const achievement: UserAchievement = {
        achievementId: `${userId}_${badge.badgeId}_${Date.now()}`,
        userId,
        badgeId: badge.badgeId,
        unlockedAt: new Date().toISOString(),
        progress: 100,
        isCompleted: true
      };

      db.userAchievements.push(achievement);
      newlyUnlocked.push(badge.badgeId);

      // 徽章解锁奖励经验值
      if (badge.expReward > 0) {
        const userExp = db.userExperience[userId];
        if (userExp) {
          userExp.totalExp += badge.expReward;
          userExp.updatedAt = new Date().toISOString();
        }
      }
    }
  }

  return newlyUnlocked;
}

/**
 * 自定义徽章检查逻辑
 */
function checkCustomBadgeRequirement(customCheck: string, stats: UserStats): boolean {
  switch (customCheck) {
    case 'answers_accepted':
      return stats.answersAccepted >= 20;
    case 'balanced_stats':
      // 各项指标均衡发展：学习时长、练习、笔记、社区参与都达到一定水平
      return (
        stats.learningMinutes >= 600 && // 10小时
        (stats.practiceCorrect + stats.practiceWrong) >= 50 &&
        stats.notesCreated >= 10 &&
        (stats.postsCount + stats.answersCount) >= 10
      );
    default:
      return false;
  }
}

/**
 * 获取用户成就列表
 */
export async function getUserAchievements(userId: string): Promise<UserAchievement[]> {
  const db = await loadDb();
  return db.userAchievements.filter(a => a.userId === userId);
}

/**
 * 获取用户徽章进度
 */
export async function getBadgeProgress(userId: string, badgeId: string): Promise<number> {
  const stats = await getUserStats(userId);
  const badge = getBadgeById(badgeId);

  if (!badge) return 0;

  let current = 0;
  const threshold = badge.requirement.threshold;

  switch (badge.requirement.type) {
    case 'learning_hours':
      current = stats.learningMinutes / 60;
      break;
    case 'practice_count':
      current = stats.practiceCorrect + stats.practiceWrong;
      break;
    case 'streak_days':
      current = stats.currentStreak;
      break;
    case 'posts_count':
      current = stats.postsCount;
      break;
    case 'answers_count':
      current = stats.answersCount;
      break;
    case 'likes_count':
      current = stats.likesReceived;
      break;
    case 'notes_count':
      current = stats.notesCreated;
      break;
    case 'knowledge_points':
      current = stats.knowledgePointsMastered;
      break;
  }

  return Math.min(100, (current / threshold) * 100);
}

/**
 * 获取下一等级所需经验值
 */
export function getExpToNextLevel(currentExp: number): { needed: number; nextLevel: number } {
  const currentLevel = getLevelByExp(currentExp);
  const nextLevelConfig = LEVEL_CONFIGS.find(c => c.level === currentLevel.level + 1);

  if (!nextLevelConfig) {
    return { needed: 0, nextLevel: currentLevel.level };
  }

  return {
    needed: nextLevelConfig.minExp - currentExp,
    nextLevel: nextLevelConfig.level
  };
}

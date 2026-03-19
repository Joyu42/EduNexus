import { NextResponse } from 'next/server';
import { getUserAchievements, getBadgeProgress } from '@/lib/server/user-level-service';
import { BADGE_CONFIGS, getBadgesByCategory } from '@/lib/server/badge-config';

/**
 * GET /api/user/achievements
 * 获取用户成就和徽章
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'demo_user';
    const category = searchParams.get('category') as any;

    const userAchievements = await getUserAchievements(userId);
    const unlockedBadgeIds = new Set(userAchievements.map(a => a.badgeId));

    // 获取徽章列表
    const badges = category
      ? getBadgesByCategory(category)
      : BADGE_CONFIGS;

    // 为每个徽章添加解锁状态和进度
    const badgesWithProgress = await Promise.all(
      badges.map(async (badge) => {
        const isUnlocked = unlockedBadgeIds.has(badge.badgeId);
        const progress = isUnlocked ? 100 : await getBadgeProgress(userId, badge.badgeId);
        const achievement = userAchievements.find(a => a.badgeId === badge.badgeId);

        return {
          ...badge,
          isUnlocked,
          progress,
          unlockedAt: achievement?.unlockedAt
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        achievements: userAchievements,
        badges: badgesWithProgress,
        stats: {
          total: BADGE_CONFIGS.length,
          unlocked: userAchievements.length,
          progress: (userAchievements.length / BADGE_CONFIGS.length) * 100
        }
      }
    });
  } catch (error) {
    console.error('获取用户成就失败:', error);
    return NextResponse.json(
      { success: false, error: '获取用户成就失败' },
      { status: 500 }
    );
  }
}

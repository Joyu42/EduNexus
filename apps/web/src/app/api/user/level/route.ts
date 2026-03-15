import { NextResponse } from 'next/server';
import { getUserLevel, getUserExperience, getUserStats } from '@/lib/server/user-level-service';
import { getLevelByNumber } from '@/lib/server/level-config';
import { getCurrentUserId } from '@/lib/server/auth-utils';

/**
 * GET /api/user/level
 * 获取用户等级信息
 */
export async function GET(request: Request) {
  try {
    // 优先从 session 获取 userId，支持通过 query 参数覆盖（用于查看其他用户）
    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId');
    const currentUserId = await getCurrentUserId();
    
    // 如果 query 中指定了 userId，使用 query 中的值；否则使用当前登录用户的 ID
    // 必须登录才能查看用户信息
    const userId = queryUserId || currentUserId;
    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const [level, experience, stats] = await Promise.all([
      getUserLevel(userId),
      getUserExperience(userId),
      getUserStats(userId)
    ]);

    // 获取当前等级配置
    const levelConfig = getLevelByNumber(level.level);

    // 计算到下一等级的进度
    const nextLevelConfig = getLevelByNumber(level.level + 1);
    const expToNextLevel = nextLevelConfig
      ? nextLevelConfig.minExp - level.totalExp
      : 0;
    const progressPercent = levelConfig && nextLevelConfig
      ? ((level.totalExp - levelConfig.minExp) / (nextLevelConfig.minExp - levelConfig.minExp)) * 100
      : 100;

    return NextResponse.json({
      success: true,
      data: {
        level,
        experience,
        stats,
        levelConfig,
        nextLevel: nextLevelConfig ? {
          level: nextLevelConfig.level,
          title: nextLevelConfig.title,
          titleEmoji: nextLevelConfig.titleEmoji,
          expNeeded: expToNextLevel,
          progressPercent: Math.min(100, Math.max(0, progressPercent))
        } : null
      }
    });
  } catch (error) {
    console.error('获取用户等级失败:', error);
    return NextResponse.json(
      { success: false, error: '获取用户等级失败' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { addExperience } from '@/lib/server/user-level-service';
import { z } from 'zod';

const addExpSchema = z.object({
  userId: z.string().optional(),
  eventType: z.enum([
    'learning_minute', 'create_note', 'edit_note',
    'practice_correct', 'practice_wrong', 'master_knowledge',
    'complete_path', 'pass_quiz', 'post', 'answer',
    'answer_accepted', 'like_received', 'share_note',
    'streak_day', 'streak_week', 'streak_month', 'streak_100days',
    'complete_tutorial', 'invite_friend', 'event_participation', 'badge_earned'
  ]),
  metadata: z.record(z.any()).optional()
});

/**
 * POST /api/user/experience/add
 * 添加经验值
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = addExpSchema.parse(body);

    const userId = validated.userId || 'demo_user';
    const result = await addExperience(userId, validated.eventType, validated.metadata);

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: '参数验证失败', details: error.errors },
        { status: 400 }
      );
    }

    console.error('添加经验值失败:', error);
    return NextResponse.json(
      { success: false, error: '添加经验值失败' },
      { status: 500 }
    );
  }
}

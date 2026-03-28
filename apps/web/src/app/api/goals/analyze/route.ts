import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function safeNumber(value: unknown, fallback: number = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function deriveMilestoneSummary(goal: Record<string, unknown>) {
  const linkedPathIds = Array.isArray(goal.linkedPathIds) ? goal.linkedPathIds : [];
  const total = linkedPathIds.length;
  const progress = safeNumber(goal.progress, 0);
  const completed = total > 0 ? Math.round((progress / 100) * total) : 0;

  return { completed, total };
}

function deriveHabitCompletionRate(habit: Record<string, unknown>) {
  const checkIns = habit.checkIns;
  if (!checkIns || typeof checkIns !== 'object') {
    return 0;
  }

  const values = Object.values(checkIns).filter((value): value is boolean => typeof value === 'boolean');
  if (values.length === 0) {
    return 0;
  }

  const done = values.filter(Boolean).length;
  return Math.round((done / values.length) * 100);
}

export async function POST(request: NextRequest) {
  try {
    const { goal, habits } = await request.json();

    if (!goal) {
      return NextResponse.json(
        { error: '目标信息不能为空' },
        { status: 400 }
      );
    }

    const safeGoal = goal as Record<string, unknown>;
    const milestone = deriveMilestoneSummary(safeGoal);
    const safeHabits = Array.isArray(habits) ? habits : [];
    const progress = safeNumber(safeGoal.progress, 0);
    const milestoneSummary =
      milestone.total > 0
        ? `${milestone.completed} / ${milestone.total}`
        : '当前目标契约未包含独立里程碑字段，请基于进度与时间信息评估';

    const prompt = `作为一个学习进度分析专家，请分析用户的目标进展情况。

目标信息：
- 标题：${String(safeGoal.title ?? '未命名目标')}
- 描述：${String(safeGoal.description ?? '无描述')}
- 当前进度：${progress}%
- 开始日期：${String(safeGoal.startDate ?? '未设置')}
- 目标日期：${String(safeGoal.endDate ?? '未设置')}
- 里程碑/关联路径进度：${milestoneSummary}

${safeHabits.length > 0 ? `相关习惯：
${safeHabits
  .map((habit: Record<string, unknown>) => {
    const name = String(habit.name ?? '未命名习惯');
    const streak = safeNumber(habit.streak, 0);
    const completionRate = deriveHabitCompletionRate(habit);
    return `- ${name}: 连续${streak}天，完成率${completionRate}%`;
  })
  .join('\n')}` : ''}

请提供以下分析（以JSON格式返回）：
1. 进度评估（是否按计划进行）
2. 优势分析（做得好的地方）
3. 改进建议（需要改进的地方）
4. 下一步行动建议（具体可执行的步骤）
5. 激励语（鼓励的话）

返回格式：
{
  "progressAssessment": {
    "status": "on-track|ahead|behind",
    "summary": "进度评估总结"
  },
  "strengths": ["优势1", "优势2"],
  "improvements": ["改进建议1", "改进建议2"],
  "nextActions": [
    {
      "action": "行动描述",
      "priority": "high|medium|low",
      "estimatedTime": "预计时间"
    }
  ],
  "motivation": "激励语"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Extract JSON from the response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Goal analysis error:', error);
    return NextResponse.json(
      { error: '分析失败，请稍后重试' },
      { status: 500 }
    );
  }
}

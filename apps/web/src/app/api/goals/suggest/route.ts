import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { goalTitle, goalDescription, category, type, apiKey, apiEndpoint, model } = await request.json();

    if (!goalTitle || !apiKey || !apiEndpoint) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const prompt = `作为一个学习目标规划专家，请帮助用户完善他们的学习目标。

用户的目标信息：
- 标题：${goalTitle}
- 描述：${goalDescription || '无'}
- 分类：${category || '未指定'}
- 类型：${type || '未指定'}

请提供以下建议（以JSON格式返回）：
1. SMART目标分析（Specific, Measurable, Achievable, Relevant, Time-bound）
2. 建议的学习路径（3-5个）
3. 相关知识点推荐
4. 潜在挑战和应对策略

返回格式：
{
  "smart": {
    "specific": "具体的目标描述",
    "measurable": "可衡量的指标",
    "achievable": "可实现性分析",
    "relevant": "相关性说明",
    "timeBound": "时间规划建议"
  },
  "suggestedPaths": [
    {
      "title": "路径标题",
      "description": "路径描述",
      "estimatedWeeks": 4
    }
  ],
  "relatedKnowledge": ["知识点1", "知识点2"],
  "challenges": [
    {
      "challenge": "挑战描述",
      "solution": "应对策略"
    }
  ]
}`;

    const response = await fetch(`${apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'qwen-plus',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error('AI API 调用失败');
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('AI 返回内容为空');
    }

    // Extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response');
    }

    const suggestions = JSON.parse(jsonMatch[0]);

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Goal suggestion error:', error);
    return NextResponse.json(
      { error: '生成建议失败，请稍后重试' },
      { status: 500 }
    );
  }
}

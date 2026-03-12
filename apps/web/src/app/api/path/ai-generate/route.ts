import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { prompt, apiKey, apiEndpoint, model, ageGroup = 'general' } = await request.json();

    if (!prompt || !apiKey || !apiEndpoint) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 年龄段适配说明
    const ageGroupGuidance: Record<string, string> = {
      'elementary': '小学生（6-12岁）：使用简单语言，多用游戏化、互动式学习，时间短（15-20分钟），难度以 beginner 为主',
      'middle': '初中生（12-15岁）：语言清晰，结合实践和理论，时间适中（20-30分钟），难度 beginner 到 intermediate',
      'high': '高中生（15-18岁）：系统化学习，注重深度理解，时间较长（30-45分钟），难度 intermediate 为主',
      'college': '大学生（18-22岁）：专业深入，强调项目实战，时间灵活（45-90分钟），难度 intermediate 到 advanced',
      'professional': '职场人士（22岁+）：实用导向，快速上手，注重实战应用，时间高效（30-60分钟），难度根据基础调整',
      'general': '通用（全年龄）：平衡理论与实践，循序渐进，时间适中（30-45分钟），难度从 beginner 到 intermediate'
    };

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
            role: 'system',
            content: `你是一位资深的教育专家和学习路径设计师。你擅长为不同年龄段的学习者设计科学、高效、有趣的学习路径。

目标学习者：${ageGroupGuidance[ageGroup] || ageGroupGuidance['general']}

请根据用户的学习目标，生成一个**丰富、完整、支持并行学习**的学习路径。

核心要求：
1. **节点数量**：生成 12-18 个节点，形成完整的学习体系
2. **并行分支**：必须包含并行学习路径（理论与实践并行、不同主题并行等）
3. **节点多样性**：使用多种节点类型，避免单一类型
4. **难度递进**：从简单到复杂，循序渐进
5. **实践导向**：理论与实践结合，至少 40% 的实践类节点

返回格式必须是纯 JSON（不要包含任何其他文字）：

{
  "nodes": [
    {
      "id": "start",
      "type": "default",
      "position": { "x": 400, "y": 0 },
      "data": {
        "label": "开始学习",
        "description": "欢迎开始学习之旅",
        "type": "start",
        "estimatedTime": 5,
        "difficulty": "beginner",
        "status": "not_started"
      }
    },
    {
      "id": "node-1",
      "type": "default",
      "position": { "x": 400, "y": 150 },
      "data": {
        "label": "基础概念",
        "description": "学习核心概念和术语",
        "type": "document",
        "estimatedTime": 30,
        "difficulty": "beginner",
        "status": "not_started"
      }
    }
  ],
  "edges": [
    {
      "id": "e-start-1",
      "source": "start",
      "target": "node-1",
      "animated": true,
      "style": { "stroke": "#6366f1", "strokeWidth": 2 },
      "type": "smoothstep"
    }
  ]
}

节点类型（14种，请多样化使用）：
- **学习类**：document（文档）、video（视频）、reading（阅读材料）
- **实践类**：practice（练习）、project（项目）、lab（实验）、assignment（作业）
- **评估类**：quiz（测验）、review（复习）、presentation（演示）
- **协作类**：discussion（讨论）、research（研究）
- **特殊类**：start（开始）、end（完成）

难度级别：
- beginner：初级（基础概念、入门知识）
- intermediate：中级（深入理解、综合应用）
- advanced：高级（高级技巧、复杂项目）

布局规则（支持并行分支）：
- **主路径**：x=400（中心线）
- **左分支**：x=150（理论/基础分支）
- **右分支**：x=650（实践/进阶分支）
- **垂直间距**：每层 y+=180
- **并行节点**：相同 y 坐标，不同 x 坐标
- **分支与合并**：
  * 分支：一个节点连接到多个节点（edges 中一个 source 对应多个 target）
  * 合并：多个节点连接到一个节点（edges 中多个 source 对应一个 target）

并行分支示例结构：
1. Start (x=400, y=0)
2. 基础介绍 (x=400, y=180)
3. **分支开始**：
   - 理论学习 (x=150, y=360)
   - 实践练习 (x=650, y=360)
4. **并行深入**：
   - 理论深化 (x=150, y=540)
   - 项目实战 (x=650, y=540)
5. **合并点**：综合测验 (x=400, y=720)
6. 继续后续内容...
7. End (x=400, y=最后)

请确保：
- 至少有 2-3 个并行分支点
- 分支后要有合并点
- 节点描述简洁有用（20-40字）
- 时间估计合理（根据年龄段调整）
- 难度递进自然
- 最后必须有一个 end 节点`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
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

    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 返回格式错误');
    }

    const result = JSON.parse(jsonMatch[0]);

    // 验证返回格式
    if (!result.nodes || !Array.isArray(result.nodes) || result.nodes.length === 0) {
      throw new Error('生成的路径格式不正确');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Path generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '生成失败' },
      { status: 500 }
    );
  }
}

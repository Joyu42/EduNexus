/**
 * 知识库智能问答 API
 * POST /api/kb/qa
 */

import { NextRequest, NextResponse } from "next/server";
import { getModelscopeClient } from "@/lib/server/modelscope";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, documents, history } = body;

    if (!question) {
      return NextResponse.json(
        { success: false, error: "缺少问题" },
        { status: 400 }
      );
    }

    const client = getModelscopeClient();
    const model = process.env.MODELSCOPE_CHAT_MODEL || "Qwen/Qwen3.5-122B-A10B";

    // 准备上下文
    const context = documents
      ? documents
          .slice(0, 5)
          .map(
            (doc: any) =>
              `【${doc.title}】\n${doc.content.slice(0, 500)}...\n`
          )
          .join("\n")
      : "";

    // 构建消息
    const messages: any[] = [
      {
        role: "system",
        content: `你是一个基于知识库的智能问答助手。请根据提供的知识库内容回答用户的问题。

知识库内容：
${context}

要求：
- 优先使用知识库中的信息回答
- 如果知识库中没有相关信息，请明确说明
- 引用具体的文档片段
- 保持回答简洁准确`,
      },
    ];

    // 添加历史对话
    if (history && Array.isArray(history)) {
      history.slice(-4).forEach((msg: any) => {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        });
      });
    }

    // 添加当前问题
    messages.push({
      role: "user",
      content: question,
    });

    // 调用模型
    const completion = await client.chat.completions.create({
      model,
      messages,
      temperature: 0.3,
      max_tokens: 1500,
    });

    const answer = completion.choices[0]?.message?.content || "抱歉，我无法回答这个问题。";

    return NextResponse.json({
      success: true,
      answer,
    });
  } catch (error) {
    console.error("智能问答失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "问答失败",
      },
      { status: 500 }
    );
  }
}

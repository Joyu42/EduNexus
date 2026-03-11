import { fail } from "@/lib/server/response";
import { kbAIChatSchema } from "@/lib/server/schema";
import { AI_CONFIG } from "@/lib/ai-config";
import { getModelscopeClient } from "@/lib/server/modelscope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const json = await request.json().catch(() => ({}));
    const parsed = kbAIChatSchema.safeParse(json);

    if (!parsed.success) {
      return fail({
        code: "INVALID_REQUEST",
        message: "请求参数不合法。",
        details: parsed.error.flatten(),
      });
    }

    const {
      documentTitle,
      documentContent,
      selectedText,
      userInput,
      conversationHistory,
    } = parsed.data;

    // 构建上下文提示
    const contextPrompt = AI_CONFIG.prompts.contextTemplate(
      documentTitle,
      documentContent,
      selectedText
    );

    // 构建系统提示
    const systemPrompt = AI_CONFIG.prompts.system + "\n\n" + contextPrompt;

    // 构建消息历史
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...(conversationHistory || []).slice(-AI_CONFIG.general.maxHistoryRounds),
      { role: "user" as const, content: userInput },
    ];

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await streamAIResponse(messages, (chunk) => {
            controller.enqueue(encoder.encode(chunk));
          });
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("AI stream error:", error);
    return fail(
      {
        code: "KB_AI_STREAM_FAILED",
        message: "AI 流式响应失败。",
        details: error instanceof Error ? error.message : error,
      },
      500
    );
  }
}

// 流式 AI 响应生成函数
async function streamAIResponse(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  onChunk: (chunk: string) => void
): Promise<void> {
  const provider = AI_CONFIG.provider;

  try {
    // 使用 ModelScope (支持流式)
    if (provider === "modelscope") {
      const client = getModelscopeClient();
      const model = AI_CONFIG.modelscope.model;

      const stream = await client.chat.completions.create({
        model,
        messages,
        temperature: AI_CONFIG.modelscope.temperature,
        max_tokens: AI_CONFIG.modelscope.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          onChunk(content);
        }
      }
      return;
    }

    // 使用 OpenAI (支持流式)
    if (provider === "openai" && AI_CONFIG.openai.apiKey) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AI_CONFIG.openai.apiKey}`,
        },
        body: JSON.stringify({
          model: AI_CONFIG.openai.model,
          messages,
          max_tokens: AI_CONFIG.openai.maxTokens,
          temperature: AI_CONFIG.openai.temperature,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("无法读取响应流");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
      return;
    }

    // 使用 Anthropic (支持流式)
    if (provider === "anthropic" && AI_CONFIG.anthropic.apiKey) {
      const systemMessage = messages.find((m) => m.role === "system")?.content || "";
      const conversationMessages = messages.filter((m) => m.role !== "system");

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": AI_CONFIG.anthropic.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: AI_CONFIG.anthropic.model,
          system: systemMessage,
          messages: conversationMessages,
          max_tokens: AI_CONFIG.anthropic.maxTokens,
          temperature: AI_CONFIG.anthropic.temperature,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("无法读取响应流");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "content_block_delta") {
                const content = parsed.delta?.text || "";
                if (content) {
                  onChunk(content);
                }
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
      return;
    }

    // 降级到模拟流式输出
    const mockResponse = generateMockResponse(
      messages[messages.length - 1]?.content || ""
    );
    const words = mockResponse.split("");
    for (const word of words) {
      onChunk(word);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  } catch (error) {
    console.error("AI stream generation error:", error);
    // 降级到模拟流式输出
    const mockResponse = generateMockResponse(
      messages[messages.length - 1]?.content || ""
    );
    const words = mockResponse.split("");
    for (const word of words) {
      onChunk(word);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  }
}

// 模拟 AI 响应（降级方案）
function generateMockResponse(userInput: string): string {
  const input = userInput.toLowerCase();

  if (input.includes("摘要") || input.includes("总结")) {
    return `基于文档内容，我为你生成了以下摘要：

这篇文档主要介绍了知识管理系统的核心功能，包括 Markdown 编辑、双链笔记、标签系统和实时预览等特性。文档强调了这些功能如何帮助用户更好地组织和管理知识。

主要要点：
- 支持完整的 Markdown 语法
- 通过双链建立文档之间的关联
- 使用标签进行内容分类
- 提供实时预览功能`;
  }

  if (input.includes("扩展") || input.includes("详细")) {
    return `我可以帮你扩展这部分内容。以下是一些建议：

1. 添加具体示例：通过实际案例说明概念
2. 补充背景信息：解释为什么这个功能重要
3. 提供使用场景：说明在什么情况下使用
4. 增加技术细节：深入解释实现原理

你希望我重点扩展哪个方面？`;
  }

  if (input.includes("解释") || input.includes("什么是")) {
    return `让我为你解释这个概念：

双链笔记（Bidirectional Links）是一种知识管理方法，它允许在文档之间建立双向链接。当你在文档 A 中链接到文档 B 时，文档 B 会自动显示来自文档 A 的反向链接。

这种方法的优势：
- 发现知识之间的隐藏联系
- 构建知识网络而非孤立的笔记
- 促进创造性思维和灵感涌现

它被广泛应用于 Roam Research、Obsidian 等现代笔记工具中。`;
  }

  if (input.includes("改进") || input.includes("优化") || input.includes("修改")) {
    return `我建议从以下几个方面改进这段文字：

1. 结构优化：使用更清晰的段落划分
2. 语言精炼：去除冗余表达，使用更准确的词汇
3. 逻辑增强：确保论点之间的连贯性
4. 可读性提升：添加过渡句，改善阅读体验

具体修改建议：
- 将长句拆分为短句
- 使用主动语态代替被动语态
- 添加具体数据或例子支撑观点`;
  }

  // 默认响应
  return `我理解你的问题。基于当前文档内容，我建议：

1. 明确你的写作目标和受众
2. 保持内容的逻辑性和连贯性
3. 使用清晰的标题和段落结构
4. 适当添加示例和说明

如果你有更具体的需求，请告诉我，我会提供更有针对性的帮助。`;
}

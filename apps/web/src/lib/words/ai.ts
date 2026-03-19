import { getModelConfig } from "@/lib/client/model-config";

export async function generateWordMnemonic(input: {
  word: string;
  definition: string;
  example?: string;
}): Promise<string> {
  const config = getModelConfig();

  if (!config.apiEndpoint || !config.apiKey) {
    return `记忆法：把 ${input.word} 和它的含义建立场景联想，重复朗读并在句子中使用。`;
  }

  try {
    const response = await fetch("/api/kb/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `请为英语单词生成简洁记忆技巧。\n单词: ${input.word}\n释义: ${input.definition}\n例句: ${input.example ?? ""}\n要求: 中文输出，2-3句，包含联想和使用建议。`,
          },
        ],
        config: {
          apiKey: config.apiKey,
          apiEndpoint: config.apiEndpoint,
          modelName: config.model,
          temperature: 0.6,
        },
      }),
    });

    const payload = await response.json();
    return payload.response || payload.error || "暂时无法生成记忆技巧，请稍后再试。";
  } catch {
    return `记忆法：把 ${input.word} 放进你自己的学习场景里，今天复习 2 次，明天再复习 1 次。`;
  }
}

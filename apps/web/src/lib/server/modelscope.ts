import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export function getModelscopeClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const apiKey = process.env.MODELSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("缺少 MODELSCOPE_API_KEY，请在环境变量中配置。");
  }

  cachedClient = new OpenAI({
    baseURL: process.env.MODELSCOPE_BASE_URL ?? "https://api-inference.modelscope.cn/v1",
    apiKey
  });
  return cachedClient;
}

export async function chatWithModelscope(prompt: string) {
  const client = getModelscopeClient();
  const model = process.env.MODELSCOPE_CHAT_MODEL ?? "deepseek-ai/DeepSeek-V3.2";
  const result = await client.chat.completions.create(
    {
      model,
      messages: [
        {
          role: "system",
          content: "你是 EduNexus 学习引导助手。请优先引导而非直接给答案。"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3
    } as OpenAI.Chat.Completions.ChatCompletionCreateParams,
    {
      // ModelScope 支持 OpenAI 兼容扩展字段，官方 TS 类型暂未声明。
      body: {
        extra_body: {
          enable_thinking: true
        }
      } as Record<string, unknown>
    }
  );

  if ("choices" in result) {
    return result.choices[0]?.message?.content ?? "";
  }
  return "";
}

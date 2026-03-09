import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 获取 ModelScope 可用模型列表
 * GET /api/models/list
 */
export async function GET() {
  try {
    // 调用 ModelScope API 获取模型列表
    const response = await fetch("https://api-inference.modelscope.cn/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.MODELSCOPE_API_KEY}`,
      },
    });

    if (!response.ok) {
      console.error(`ModelScope API error: ${response.status} ${response.statusText}`);
      throw new Error(`ModelScope API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("ModelScope API response:", JSON.stringify(data, null, 2));

    // 格式化模型列表
    let models = [];

    if (data.data && Array.isArray(data.data)) {
      models = data.data
        .filter((model: any) => {
          // 过滤出聊天模型
          const id = model.id || "";
          return (
            id.includes("Qwen") ||
            id.includes("qwen") ||
            id.includes("DeepSeek") ||
            id.includes("deepseek") ||
            id.includes("GLM") ||
            id.includes("glm") ||
            id.includes("chat") ||
            id.includes("Chat") ||
            id.includes("instruct") ||
            id.includes("Instruct")
          );
        })
        .map((model: any) => {
          const id = model.id || "";
          const isMultimodal = id.includes("VL") || id.includes("vision") || id.includes("Vision");

          return {
            id: model.id,
            name: model.id.split("/").pop() || model.id,
            description: model.description || `${model.id}`,
            provider: "ModelScope",
            multimodal: isMultimodal,
            created: model.created,
          };
        })
        .sort((a: any, b: any) => {
          // 优先显示 Qwen3.5 系列
          if (a.id.includes("Qwen3.5") && !b.id.includes("Qwen3.5")) return -1;
          if (!a.id.includes("Qwen3.5") && b.id.includes("Qwen3.5")) return 1;
          return 0;
        });
    }

    return NextResponse.json({
      success: true,
      models: models.slice(0, 30), // 返回前 30 个模型
      total: models.length,
      source: "api",
    });
  } catch (error) {
    console.error("Failed to fetch models from API:", error);

    // 如果 API 调用失败，返回最新的默认模型列表
    const fallbackModels = [
      // Qwen3.5 系列（最新）
      {
        id: "Qwen/Qwen3.5-122B-A10B",
        name: "Qwen3.5-122B-A10B",
        description: "通义千问 3.5 代 122B 模型（最强）",
        provider: "ModelScope",
        multimodal: false
      },
      {
        id: "Qwen/Qwen3.5-72B-Instruct",
        name: "Qwen3.5-72B-Instruct",
        description: "通义千问 3.5 代 72B 指令模型",
        provider: "ModelScope",
        multimodal: false
      },
      {
        id: "Qwen/Qwen3.5-32B-Instruct",
        name: "Qwen3.5-32B-Instruct",
        description: "通义千问 3.5 代 32B 指令模型",
        provider: "ModelScope",
        multimodal: false
      },
      {
        id: "Qwen/Qwen3.5-14B-Instruct",
        name: "Qwen3.5-14B-Instruct",
        description: "通义千问 3.5 代 14B 指令模型",
        provider: "ModelScope",
        multimodal: false
      },
      {
        id: "Qwen/Qwen3.5-7B-Instruct",
        name: "Qwen3.5-7B-Instruct",
        description: "通义千问 3.5 代 7B 指令模型（推荐）",
        provider: "ModelScope",
        multimodal: false
      },
      // Qwen3.5 VL 系列（多模态）
      {
        id: "Qwen/Qwen3.5-VL-72B",
        name: "Qwen3.5-VL-72B",
        description: "通义千问 3.5 视觉语言模型 72B，支持图片理解",
        provider: "ModelScope",
        multimodal: true
      },
      {
        id: "Qwen/Qwen3.5-VL-32B",
        name: "Qwen3.5-VL-32B",
        description: "通义千问 3.5 视觉语言模型 32B，支持图片理解",
        provider: "ModelScope",
        multimodal: true
      },
      {
        id: "Qwen/Qwen3.5-VL-7B",
        name: "Qwen3.5-VL-7B",
        description: "通义千问 3.5 视觉语言模型 7B，支持图片理解",
        provider: "ModelScope",
        multimodal: true
      },
      // Qwen3 系列
      {
        id: "Qwen/Qwen3-32B",
        name: "Qwen3-32B",
        description: "通义千问 3 代 32B 模型",
        provider: "ModelScope",
        multimodal: false
      },
      {
        id: "Qwen/Qwen3-14B",
        name: "Qwen3-14B",
        description: "通义千问 3 代 14B 模型",
        provider: "ModelScope",
        multimodal: false
      },
      {
        id: "Qwen/Qwen3-8B",
        name: "Qwen3-8B",
        description: "通义千问 3 代 8B 模型",
        provider: "ModelScope",
        multimodal: false
      },
      // DeepSeek 系列
      {
        id: "deepseek-ai/DeepSeek-R1",
        name: "DeepSeek-R1",
        description: "DeepSeek 推理模型，强大的逻辑推理能力",
        provider: "ModelScope",
        multimodal: false
      },
      {
        id: "deepseek-ai/DeepSeek-V3.2",
        name: "DeepSeek-V3.2",
        description: "DeepSeek V3.2 最新版本",
        provider: "ModelScope",
        multimodal: false
      },
      // GLM 系列
      {
        id: "THUDM/glm-4-9b-chat",
        name: "GLM-4-9B",
        description: "智谱 GLM-4 9B 对话模型",
        provider: "ModelScope",
        multimodal: false
      }
    ];

    return NextResponse.json({
      success: true,
      models: fallbackModels,
      total: fallbackModels.length,
      fallback: true,
      source: "fallback",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

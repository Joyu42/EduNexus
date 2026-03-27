import { NextResponse } from "next/server";
import { fail } from "@/lib/server/response";
import { getCurrentUserId } from "@/lib/server/auth-utils";
import { getStoredModelConfig, saveStoredModelConfig } from "@/lib/server/model-config-store";
import { normalizeApiKey } from "@/lib/model-api-key";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "请先登录" }, 401);
    }

    const config = await getStoredModelConfig(userId);
    return NextResponse.json({
      success: true,
      data: config
        ? {
            model: config.modelName,
            apiEndpoint: config.apiEndpoint,
            apiKey: config.apiKey,
            updatedAt: config.updatedAt,
          }
        : null,
    });
  } catch (error) {
    return fail(
      {
        code: "CONFIG_GET_FAILED",
        message: "读取配置失败",
        details: error instanceof Error ? error.message : error,
      },
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return fail({ code: "UNAUTHORIZED", message: "请先登录" }, 401);
    }

    const config = await request.json();
    const apiKey = normalizeApiKey(config.MODELSCOPE_API_KEY);
    const apiEndpoint = typeof config.MODELSCOPE_BASE_URL === "string"
      ? config.MODELSCOPE_BASE_URL.trim()
      : "https://api-inference.modelscope.cn/v1";
    const modelName = typeof config.MODELSCOPE_CHAT_MODEL === "string"
      ? config.MODELSCOPE_CHAT_MODEL.trim()
      : "Qwen/Qwen3.5-122B-A10B";

    if (!apiKey) {
      return fail({ code: "INVALID_API_KEY", message: "API Key 格式非法，请重新填写。" }, 400);
    }

    await saveStoredModelConfig({
      userId,
      apiKey,
      apiEndpoint,
      modelName,
    });

    return NextResponse.json({
      success: true,
      message: "配置已保存到服务器",
    });
  } catch (error) {
    return fail(
      {
        code: "CONFIG_SAVE_FAILED",
        message: "保存配置失败",
        details: error instanceof Error ? error.message : error,
      },
      500
    );
  }
}

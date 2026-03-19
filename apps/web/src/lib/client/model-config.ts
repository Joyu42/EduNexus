/**
 * 客户端模型配置管理
 * 从 localStorage 读取和保存模型配置
 */

export interface ModelConfig {
  model: string;
  apiEndpoint: string;
  apiKey: string;
  temperature: number;
  topP: number;
  maxTokens: number;
}

const CONFIG_KEY = "edunexus_model_config";

const DEFAULT_CONFIG: ModelConfig = {
  model: "Qwen/Qwen3.5-122B-A10B",
  apiEndpoint: "https://api-inference.modelscope.cn/v1",
  apiKey: "",
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 2000,
};

/**
 * 获取模型配置
 */
export function getModelConfig(): ModelConfig {
  if (typeof window === "undefined") {
    return DEFAULT_CONFIG;
  }

  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
      const config = JSON.parse(saved);
      return { ...DEFAULT_CONFIG, ...config };
    }
  } catch (error) {
    console.error("Failed to load model config:", error);
  }

  return DEFAULT_CONFIG;
}

/**
 * 保存模型配置
 */
export function saveModelConfig(config: Partial<ModelConfig>): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const current = getModelConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save model config:", error);
  }
}

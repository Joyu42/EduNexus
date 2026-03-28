"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Save, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getModelConfig, saveModelConfig } from "@/lib/client/model-config";

interface ModelConfigPanelProps {
  temperature: number;
  topP: number;
  maxTokens: number;
  apiKey: string;
  onTemperatureChange: (value: number) => void;
  onTopPChange: (value: number) => void;
  onMaxTokensChange: (value: number) => void;
  onApiKeyChange: (value: string) => void;
}

type Model = {
  id: string;
  name: string;
  description: string;
  provider: string;
  multimodal?: boolean;
};

export function ModelConfigPanel({
  temperature,
  topP,
  maxTokens,
  apiKey,
  onTemperatureChange,
  onTopPChange,
  onMaxTokensChange,
  onApiKeyChange,
}: ModelConfigPanelProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Qwen/Qwen3.5-122B-A10B");
  const [apiEndpoint, setApiEndpoint] = useState("https://api-inference.modelscope.cn/v1");
  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // 加载模型列表
  const loadModels = async () => {
    setIsLoadingModels(true);
    setModelsError(null);
    try {
      const response = await fetch("/api/models/list");
      const data = await response.json();

      if (data.success && data.models && data.models.length > 0) {
        setModels(data.models);
        if (data.source === "fallback") {
          setModelsError("使用默认模型列表（API 调用失败）");
        }
      } else {
        throw new Error(data.message || "Failed to load models");
      }
    } catch (error) {
      console.error("Failed to load models:", error);
      setModelsError("加载模型列表失败，请检查 API Key 配置");
      setModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // 组件加载时获取模型列表
  useEffect(() => {
    loadModels();

    const localConfig = getModelConfig();
    if (localConfig.model) setSelectedModel(localConfig.model);
    if (localConfig.apiEndpoint) setApiEndpoint(localConfig.apiEndpoint);
    onApiKeyChange(localConfig.apiKey);
    if (localConfig.temperature !== undefined) onTemperatureChange(localConfig.temperature);
    if (localConfig.topP !== undefined) onTopPChange(localConfig.topP);
    if (localConfig.maxTokens !== undefined) onMaxTokensChange(localConfig.maxTokens);

    const loadServerConfig = async () => {
      try {
        const response = await fetch("/api/config/save", { cache: "no-store" });
        const data = await response.json();
        const serverConfig = data?.data;
        if (!response.ok || !serverConfig) {
          return;
        }

        const merged = {
          ...localConfig,
          model: typeof serverConfig.model === "string" && serverConfig.model ? serverConfig.model : localConfig.model,
          apiEndpoint:
            typeof serverConfig.apiEndpoint === "string" && serverConfig.apiEndpoint
              ? serverConfig.apiEndpoint
              : localConfig.apiEndpoint,
          apiKey: typeof serverConfig.apiKey === "string" ? serverConfig.apiKey : localConfig.apiKey,
        };

        saveModelConfig(merged);
        setSelectedModel(merged.model);
        setApiEndpoint(merged.apiEndpoint);
        onApiKeyChange(merged.apiKey);
      } catch {
        return;
      }
    };

    void loadServerConfig();
  }, []);

  const handleSave = async () => {
    const config = {
      model: selectedModel,
      apiEndpoint,
      apiKey,
      temperature,
      topP,
      maxTokens
    };
    saveModelConfig(config);

    const response = await fetch("/api/config/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        MODELSCOPE_API_KEY: apiKey,
        MODELSCOPE_BASE_URL: apiEndpoint,
        MODELSCOPE_CHAT_MODEL: selectedModel,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      alert(data?.error?.message || data?.error || "模型配置保存失败");
      return;
    }

    alert("模型配置已保存到服务器");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">模型配置</h2>
        <p className="text-sm text-muted-foreground mt-1">
          配置 AI 模型参数和 API 密钥
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            模型选择
          </CardTitle>
          <CardDescription>选择要使用的 AI 模型</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="model">AI 模型</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={loadModels}
                disabled={isLoadingModels}
              >
                {isLoadingModels ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">刷新</span>
              </Button>
            </div>
            <Select value={selectedModel} onValueChange={setSelectedModel} disabled={isLoadingModels}>
              <SelectTrigger id="model">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span className="font-medium flex items-center gap-2">
                        {model.name}
                        {model.multimodal && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                            多模态
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {model.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {modelsError && (
              <p className="text-xs text-amber-600">{modelsError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              当前选择: {models.find(m => m.id === selectedModel)?.name || selectedModel}
              {models.find(m => m.id === selectedModel)?.multimodal && (
                <span className="ml-2 text-purple-600">· 支持图片理解</span>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiEndpoint">API 端点</Label>
            <Input
              id="apiEndpoint"
              type="text"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder="https://api-inference.modelscope.cn/v1"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              ModelScope API 端点地址
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API 密钥</CardTitle>
          <CardDescription>管理您的 API 访问凭证</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="apiKey"
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                placeholder="输入 ModelScope API Key"
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              在 <a href="https://modelscope.cn" target="_blank" rel="noopener noreferrer" className="underline">ModelScope</a> 获取 API Key
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>模型参数</CardTitle>
          <CardDescription>调整模型生成行为</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature">Temperature</Label>
              <span className="text-sm text-muted-foreground">{temperature.toFixed(2)}</span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.01}
              value={[temperature]}
              onValueChange={(value) => onTemperatureChange(value[0])}
            />
            <p className="text-xs text-muted-foreground">
              控制输出的随机性。较高的值使输出更随机，较低的值使其更确定。
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="topP">Top P</Label>
              <span className="text-sm text-muted-foreground">{topP.toFixed(2)}</span>
            </div>
            <Slider
              id="topP"
              min={0}
              max={1}
              step={0.01}
              value={[topP]}
              onValueChange={(value) => onTopPChange(value[0])}
            />
            <p className="text-xs text-muted-foreground">
              核采样参数。控制模型考虑的 token 范围。
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <span className="text-sm text-muted-foreground">{maxTokens}</span>
            </div>
            <Slider
              id="maxTokens"
              min={100}
              max={4000}
              step={100}
              value={[maxTokens]}
              onValueChange={(value) => onMaxTokensChange(value[0])}
            />
            <p className="text-xs text-muted-foreground">
              生成响应的最大 token 数量。
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          保存配置
        </Button>
      </div>
    </div>
  );
}

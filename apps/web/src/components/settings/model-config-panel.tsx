"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Save, Sparkles } from "lucide-react";
import { useState } from "react";

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

// ModelScope 可用模型列表 (2026-03 实测)
const AVAILABLE_MODELS = [
  {
    id: "Qwen/Qwen3-8B",
    name: "Qwen3-8B",
    description: "通义千问 3 代 8B 模型，平衡性能与速度",
    provider: "ModelScope"
  },
  {
    id: "Qwen/Qwen3-4B",
    name: "Qwen3-4B",
    description: "通义千问 3 代 4B 模型，快速响应",
    provider: "ModelScope"
  },
  {
    id: "Qwen/Qwen3-14B",
    name: "Qwen3-14B",
    description: "通义千问 3 代 14B 模型，更强理解能力",
    provider: "ModelScope"
  },
  {
    id: "Qwen/Qwen3-32B",
    name: "Qwen3-32B",
    description: "通义千问 3 代 32B 模型，顶级性能",
    provider: "ModelScope"
  },
  {
    id: "deepseek-ai/DeepSeek-R1",
    name: "DeepSeek-R1",
    description: "DeepSeek 推理模型，强大的逻辑推理能力",
    provider: "ModelScope"
  },
  {
    id: "THUDM/glm-4-9b-chat",
    name: "GLM-4-9B",
    description: "智谱 GLM-4 9B 对话模型",
    provider: "ModelScope"
  }
];

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
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [apiEndpoint, setApiEndpoint] = useState("https://api-inference.modelscope.cn/v1");

  const handleSave = () => {
    const config = {
      model: selectedModel,
      apiEndpoint,
      apiKey,
      temperature,
      topP,
      maxTokens
    };
    localStorage.setItem("edunexus_model_config", JSON.stringify(config));
    alert("模型配置已保存");
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
            <Label htmlFor="model">AI 模型</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger id="model">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              当前选择: {AVAILABLE_MODELS.find(m => m.id === selectedModel)?.name}
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

"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Settings,
  Cpu,
  Database,
  Download,
  Upload,
  FileText,
  Info,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LoginPrompt } from "@/components/ui/login-prompt";
import { GeneralSettingsPanel } from "@/components/settings/general-settings-panel";
import { ModelConfigPanel } from "@/components/settings/model-config-panel";
import { JsonImportPanel } from "@/components/settings/json-import-panel";
import { ImportAuditLogPanel } from "@/components/settings/import-audit-log-panel";

type SettingsSection =
  | "general"
  | "model"
  | "data"
  | "import-export"
  | "audit"
  | "about";

const navigationItems = [
  {
    id: "general" as SettingsSection,
    label: "通用设置",
    icon: Settings,
    description: "主题、语言等基础配置",
  },
  {
    id: "model" as SettingsSection,
    label: "模型配置",
    icon: Cpu,
    description: "AI 模型参数和 API 密钥",
  },
  {
    id: "data" as SettingsSection,
    label: "数据管理",
    icon: Database,
    description: "数据存储和清理",
  },
  {
    id: "import-export" as SettingsSection,
    label: "导入/导出",
    icon: Upload,
    description: "数据导入导出功能",
  },
  {
    id: "audit" as SettingsSection,
    label: "审计日志",
    icon: FileText,
    description: "查看操作历史记录",
  },
  {
    id: "about" as SettingsSection,
    label: "关于",
    icon: Info,
    description: "版本信息和帮助",
  },
];

export default function SettingsPage() {
  const { status } = useSession();
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <LoginPrompt title="配置中心" />;
  }

  // Settings state
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("zh-CN");
  const [temperature, setTemperature] = useState(0.7);
  const [topP, setTopP] = useState(0.9);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [apiKey, setApiKey] = useState("");

  // 保存设置
  const handleSaveSettings = useCallback(() => {
    alert('设置已保存');
  }, []);

  // 导出配置
  const handleExportConfig = useCallback(() => {
    const config = {
      theme,
      language,
      temperature,
      topP,
      maxTokens,
      apiKey: apiKey ? '***' : ''
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'edunexus-config.json';
    a.click();
    URL.revokeObjectURL(url);
    alert('配置已导出');
  }, [theme, language, temperature, topP, maxTokens, apiKey]);

  // 导入配置
  const handleImportConfig = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const config = JSON.parse(event.target?.result as string);
            if (config.theme) setTheme(config.theme);
            if (config.language) setLanguage(config.language);
            if (config.temperature) setTemperature(config.temperature);
            if (config.topP) setTopP(config.topP);
            if (config.maxTokens) setMaxTokens(config.maxTokens);
            alert('配置已导入');
          } catch (error) {
            alert('配置文件格式错误');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case "general":
        return (
          <GeneralSettingsPanel
            theme={theme}
            language={language}
            onThemeChange={setTheme}
            onLanguageChange={setLanguage}
          />
        );
      case "model":
        return (
          <ModelConfigPanel
            temperature={temperature}
            topP={topP}
            maxTokens={maxTokens}
            apiKey={apiKey}
            onTemperatureChange={setTemperature}
            onTopPChange={setTopP}
            onMaxTokensChange={setMaxTokens}
            onApiKeyChange={setApiKey}
          />
        );
      case "data":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">数据管理</h2>
              <p className="text-sm text-muted-foreground mt-1">
                管理应用数据存储和清理
              </p>
            </div>
            <Card className="p-6">
              <p className="text-muted-foreground">数据管理功能开发中...</p>
            </Card>
          </div>
        );
      case "import-export":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">导入/导出</h2>
              <p className="text-sm text-muted-foreground mt-1">
                导入或导出应用数据
              </p>
            </div>
            <div className="grid gap-6">
              <JsonImportPanel />
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Download className="h-5 w-5" />
                  <div>
                    <h3 className="font-semibold">数据导出</h3>
                    <p className="text-sm text-muted-foreground">
                      导出所有数据为 JSON 格式
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={handleExportConfig}>
                  <Download className="h-4 w-4 mr-2" />
                  导出数据
                </Button>
              </Card>
            </div>
          </div>
        );
      case "audit":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">审计日志</h2>
              <p className="text-sm text-muted-foreground mt-1">
                查看系统操作历史记录
              </p>
            </div>
            <ImportAuditLogPanel />
          </div>
        );
      case "about":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">关于</h2>
              <p className="text-sm text-muted-foreground mt-1">
                应用版本信息和帮助文档
              </p>
            </div>
            <Card className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-lg">EduNexus</h3>
                <p className="text-sm text-muted-foreground">版本 1.0.0</p>
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  智能教育管理平台，提供知识图谱、工作区管理等功能。
                </p>
              </div>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-yellow-50/30">
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">配置中心</h1>
          <p className="text-muted-foreground mt-1">
            管理应用设置和偏好配置
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Left Navigation */}
          <aside className="space-y-2">
            <Card className="p-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{item.label}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </div>
                    </div>
                    {isActive && <ChevronRight className="h-4 w-4 shrink-0" />}
                  </button>
                );
              })}
            </Card>
          </aside>

          {/* Right Content */}
          <main>{renderContent()}</main>
        </div>
      </div>
    </div>
  );
}


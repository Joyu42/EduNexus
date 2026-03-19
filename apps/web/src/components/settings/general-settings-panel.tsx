"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

interface GeneralSettingsPanelProps {
  theme: string;
  language: string;
  onThemeChange: (theme: string) => void;
  onLanguageChange: (language: string) => void;
}

export function GeneralSettingsPanel({
  theme,
  language,
  onThemeChange,
  onLanguageChange,
}: GeneralSettingsPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">通用设置</h2>
        <p className="text-sm text-muted-foreground mt-1">
          管理应用的基本配置和偏好设置
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>外观</CardTitle>
          <CardDescription>自定义应用的视觉体验</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="theme">主题模式</Label>
              <p className="text-sm text-muted-foreground">
                选择亮色或暗色主题
              </p>
            </div>
            <Select value={theme} onValueChange={onThemeChange}>
              <SelectTrigger id="theme" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">亮色</SelectItem>
                <SelectItem value="dark">暗色</SelectItem>
                <SelectItem value="system">跟随系统</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="language">语言</Label>
              <p className="text-sm text-muted-foreground">
                选择界面显示语言
              </p>
            </div>
            <Select value={language} onValueChange={onLanguageChange}>
              <SelectTrigger id="language" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">简体中文</SelectItem>
                <SelectItem value="en-US">English</SelectItem>
                <SelectItem value="ja-JP">日本語</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => alert('设置已保存')}>
          <Save className="h-4 w-4 mr-2" />
          保存设置
        </Button>
      </div>
    </div>
  );
}

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileJson, AlertCircle } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function JsonImportPanel() {
  const [jsonInput, setJsonInput] = useState("");
  const [error, setError] = useState("");

  const handleImport = () => {
    try {
      JSON.parse(jsonInput);
      setError("");
      // Handle import logic
    } catch {
      setError("无效的 JSON 格式");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setJsonInput(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5" />
          JSON 导入
        </CardTitle>
        <CardDescription>从 JSON 文件或文本导入数据</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="jsonFile">上传 JSON 文件</Label>
          <Input
            id="jsonFile"
            type="file"
            accept=".json"
            onChange={handleFileUpload}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="jsonText">或粘贴 JSON 文本</Label>
          <Textarea
            id="jsonText"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"key": "value"}'
            className="font-mono text-sm min-h-[200px]"
          />
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handleImport} className="w-full">
          <Upload className="h-4 w-4 mr-2" />
          导入数据
        </Button>
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Sparkles, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  getPracticeStorage,
  QuestionType,
  QuestionDifficulty,
  QuestionStatus,
} from "@/lib/practice";
import { toast } from "@/lib/toast";

export default function GenerateQuestionsPage() {
  const router = useRouter();
  const params = useParams();
  const bankId = params.bankId as string;

  const [documentContent, setDocumentContent] = useState("");
  const [count, setCount] = useState(5);
  const [type, setType] = useState<QuestionType | "">("");
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(
    QuestionDifficulty.MEDIUM
  );
  const [tags, setTags] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<any[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(
    new Set()
  );

  const handleGenerate = async () => {
    if (!documentContent.trim()) {
      toast("请输入文档内容", "error");
      return;
    }

    try {
      setIsGenerating(true);
      const response = await fetch("/api/practice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankId,
          documentContent,
          count,
          type: type || undefined,
          difficulty,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setGeneratedQuestions(data.questions || []);
        // 默认全选
        setSelectedQuestions(
          new Set(data.questions.map((_: any, idx: number) => idx))
        );
      } else {
        throw new Error(data.error || "生成失败");
      }
    } catch (error: any) {
      console.error("Generate error:", error);
      toast(error.message || "生成题目失败", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveSelected = async () => {
    try {
      const storage = getPracticeStorage();
      const questionsToSave = generatedQuestions.filter((_, idx) =>
        selectedQuestions.has(idx)
      );

      for (const q of questionsToSave) {
        await storage.createQuestion({
          bankId,
          type: q.type,
          title: q.title,
          content: q.content,
          difficulty: q.difficulty,
          status: QuestionStatus.ACTIVE,
          tags: q.tags || [],
          points: q.points || 10,
          explanation: q.explanation,
          hints: q.hints,
          options: q.options,
          blanks: q.blanks,
          testCases: q.testCases,
          starterCode: q.starterCode,
        });
      }

      toast(`成功添加 ${questionsToSave.length} 道题目`, "success");
      router.push(`/workspace/practice/questions/${bankId}`);
    } catch (error) {
      console.error("Save error:", error);
      toast("保存题目失败", "error");
    }
  };

  const toggleQuestion = (idx: number) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(idx)) {
      newSelected.delete(idx);
    } else {
      newSelected.add(idx);
    }
    setSelectedQuestions(newSelected);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-rose-50/30 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/workspace/practice/questions/${bankId}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回题库
          </Button>

          <h1 className="text-3xl font-bold mb-2">AI 生成题目</h1>
          <p className="text-muted-foreground">
            基于文档内容自动生成高质量练习题
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：输入区 */}
          <Card>
            <CardHeader>
              <CardTitle>输入文档内容</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="content">文档内容</Label>
                <Textarea
                  id="content"
                  value={documentContent}
                  onChange={(e) => setDocumentContent(e.target.value)}
                  placeholder="粘贴或输入要生成题目的文档内容..."
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="count">题目数量</Label>
                  <Input
                    id="count"
                    type="number"
                    min="1"
                    max="20"
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <Label htmlFor="difficulty">难度</Label>
                  <Select
                    value={difficulty}
                    onValueChange={(v) => setDifficulty(v as QuestionDifficulty)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={QuestionDifficulty.EASY}>
                        简单
                      </SelectItem>
                      <SelectItem value={QuestionDifficulty.MEDIUM}>
                        中等
                      </SelectItem>
                      <SelectItem value={QuestionDifficulty.HARD}>
                        困难
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="type">题目类型（可选）</Label>
                <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="不限" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">不限</SelectItem>
                    <SelectItem value={QuestionType.MULTIPLE_CHOICE}>
                      选择题
                    </SelectItem>
                    <SelectItem value={QuestionType.FILL_IN_BLANK}>
                      填空题
                    </SelectItem>
                    <SelectItem value={QuestionType.SHORT_ANSWER}>
                      简答题
                    </SelectItem>
                    <SelectItem value={QuestionType.CODING}>编程题</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tags">标签（逗号分隔）</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="例如：数学, 代数"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !documentContent.trim()}
                className="w-full bg-gradient-to-br from-orange-500 to-rose-500"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    生成题目
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 右侧：生成结果 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>生成的题目</span>
                {generatedQuestions.length > 0 && (
                  <Button onClick={handleSaveSelected} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    添加选中 ({selectedQuestions.size})
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedQuestions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>生成的题目将显示在这里</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {generatedQuestions.map((q, idx) => (
                    <div
                      key={idx}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedQuestions.has(idx)
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => toggleQuestion(idx)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium flex-1">{q.title}</h4>
                        <Badge variant="outline">{q.difficulty}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {q.content}
                      </p>
                      {q.explanation && (
                        <p className="text-xs text-muted-foreground mt-2">
                          💡 {q.explanation.slice(0, 100)}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

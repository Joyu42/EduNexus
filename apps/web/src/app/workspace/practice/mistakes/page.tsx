"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, BookOpen, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  getPracticeStorage,
  WrongQuestion,
  Question,
} from "@/lib/client/practice-storage";

function MistakesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bankId = searchParams.get("bankId");

  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([]);
  const [questions, setQuestions] = useState<Record<string, Question>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    loadWrongQuestions();
  }, [bankId]);

  const loadWrongQuestions = async () => {
    try {
      setIsLoading(true);
      const storage = getPracticeStorage();
      const wrongs = await storage.getWrongQuestions(bankId || undefined, true);
      setWrongQuestions(wrongs);

      // 加载对应的题目详情
      const questionMap: Record<string, Question> = {};
      for (const wrong of wrongs) {
        const question = await storage.getQuestion(wrong.questionId);
        if (question) {
          questionMap[wrong.questionId] = question;
        }
      }
      setQuestions(questionMap);
    } catch (error) {
      console.error("Failed to load wrong questions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAsMastered = async (questionId: string) => {
    try {
      const storage = getPracticeStorage();
      await storage.markAsMastered(questionId);
      await loadWrongQuestions();
    } catch (error) {
      console.error("Failed to mark as mastered:", error);
    }
  };

  const handleSaveNotes = async (wrongQuestion: WrongQuestion) => {
    try {
      const storage = getPracticeStorage();
      const notes = editingNotes[wrongQuestion.questionId];
      await storage.addToWrongQuestions(
        wrongQuestion.questionId,
        wrongQuestion.bankId,
        notes
      );
      setEditingNotes({
        ...editingNotes,
        [wrongQuestion.questionId]: "",
      });
      await loadWrongQuestions();
    } catch (error) {
      console.error("Failed to save notes:", error);
    }
  };

  const handleDelete = async (questionId: string) => {
    if (!confirm("确定要从错题本中删除这道题吗？")) {
      return;
    }

    try {
      const storage = getPracticeStorage();
      await storage.deleteWrongQuestion(questionId);
      await loadWrongQuestions();
    } catch (error) {
      console.error("Failed to delete wrong question:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-rose-50/30 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/workspace/practice/questions")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回题库列表
          </Button>

          <h1 className="text-3xl font-bold mb-2">错题本</h1>
          <p className="text-muted-foreground">
            复习你的错题，巩固薄弱知识点
          </p>
        </div>

        {wrongQuestions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium mb-2">太棒了！</p>
              <p className="text-muted-foreground">
                {bankId ? "这个题库" : "所有题库"}暂时没有错题
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {wrongQuestions.map((wrong) => {
              const question = questions[wrong.questionId];
              if (!question) return null;

              return (
                <Card key={wrong.id}>
                  <CardHeader>
                    <CardTitle className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-5 w-5 text-red-500" />
                          <span>{question.title}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <Badge variant="outline">{question.difficulty}</Badge>
                          <span>错误 {wrong.wrongCount} 次</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {wrong.lastWrongAt.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsMastered(wrong.questionId)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          已掌握
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(wrong.questionId)}
                        >
                          删除
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">题目内容</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {question.content}
                      </p>
                    </div>

                    {question.explanation && (
                      <div>
                        <h4 className="font-medium mb-2">答案解析</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {question.explanation}
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium mb-2">我的笔记</h4>
                      {wrong.notes ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                          {wrong.notes}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mb-2">
                          还没有添加笔记
                        </p>
                      )}
                      <Textarea
                        placeholder="记录你的思考和总结..."
                        value={editingNotes[wrong.questionId] || ""}
                        onChange={(e) =>
                          setEditingNotes({
                            ...editingNotes,
                            [wrong.questionId]: e.target.value,
                          })
                        }
                        rows={3}
                        className="mt-2"
                      />
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={() => handleSaveNotes(wrong)}
                        disabled={!editingNotes[wrong.questionId]?.trim()}
                      >
                        保存笔记
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MistakesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <MistakesContent />
    </Suspense>
  );
}

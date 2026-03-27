"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Play, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getPracticeStorage,
  QuestionBank,
  Question,
} from "@/lib/practice";
import { QuestionList } from "@/components/practice/question-list";
import { QuestionEditor } from "@/components/practice/question-editor";

export default function BankDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bankId = params.bankId as string;

  const [bank, setBank] = useState<QuestionBank | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  useEffect(() => {
    loadData();
  }, [bankId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const storage = getPracticeStorage();
      const allBanks = await storage.getAllBanks();
      const currentBank = allBanks.find((b) => b.id === bankId);
      setBank(currentBank || null);

      if (currentBank) {
        const bankQuestions = await storage.getQuestionsByBank(bankId);
        setQuestions(bankQuestions);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
    router.push(`/workspace/practice/generate/${bankId}`);
  };

  const handleStartPractice = () => {
    router.push(`/workspace/practice/drill?bankId=${bankId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </div>
    );
  }

  if (!bank) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>题库不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-rose-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/workspace/practice/questions")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回题库列表
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{bank.name}</h1>
              <p className="text-muted-foreground">{bank.description}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleGenerateQuestions}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI 生成题目
              </Button>
              <Button onClick={() => setIsEditorOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                添加题目
              </Button>
              <Button
                onClick={handleStartPractice}
                className="bg-gradient-to-br from-orange-500 to-rose-500"
                disabled={questions.length === 0}
              >
                <Play className="h-4 w-4 mr-2" />
                开始练习
              </Button>
            </div>
          </div>
        </div>

        <Card className="p-6">
          <QuestionList
            questions={questions}
            onEdit={(q) => {
              setEditingQuestion(q);
              setIsEditorOpen(true);
            }}
            onDelete={async (qId) => {
              const storage = getPracticeStorage();
              await storage.deleteQuestion(qId);
              await loadData();
            }}
          />
        </Card>

        {isEditorOpen && (
          <QuestionEditor
            bankId={bankId}
            question={editingQuestion}
            onClose={() => {
              setIsEditorOpen(false);
              setEditingQuestion(null);
            }}
            onSave={async () => {
              await loadData();
              setIsEditorOpen(false);
              setEditingQuestion(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

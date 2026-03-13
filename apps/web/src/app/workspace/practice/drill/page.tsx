"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, X, Clock, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  getPracticeStorage,
  Question,
  QuestionType,
  QuestionDifficulty,
} from "@/lib/client/practice-storage";
import { QuestionRenderer } from "@/components/practice/question-renderer";

function DrillContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bankId = searchParams.get("bankId");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [timeSpent, setTimeSpent] = useState<Record<string, number>>({});

  useEffect(() => {
    if (bankId) {
      loadQuestions();
    }
  }, [bankId]);

  const loadQuestions = async () => {
    try {
      const storage = getPracticeStorage();
      const randomQuestions = await storage.getRandomQuestions(bankId!, 10);
      setQuestions(randomQuestions);
      setStartTime(Date.now());
    } catch (error) {
      console.error("Failed to load questions:", error);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = async () => {
    const currentQuestion = questions[currentIndex];
    const answer = answers[currentQuestion.id] || "";
    const questionStartTime = timeSpent[currentQuestion.id] || startTime;
    const spent = Math.floor((Date.now() - questionStartTime) / 1000);

    // 判断答案是否正确
    const isCorrect = checkAnswer(currentQuestion, answer);
    setResults({ ...results, [currentQuestion.id]: isCorrect });
    setTimeSpent({ ...timeSpent, [currentQuestion.id]: spent });

    // 保存练习记录
    const storage = getPracticeStorage();
    await storage.createRecord({
      questionId: currentQuestion.id,
      bankId: bankId!,
      answer,
      isCorrect,
      score: isCorrect ? currentQuestion.points : 0,
      timeSpent: spent,
      attemptCount: 1,
    });

    // 如果答错，添加到错题本
    if (!isCorrect) {
      await storage.addToWrongQuestions(currentQuestion.id, bankId!);
    }

    // 移动到下一题或完成
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setStartTime(Date.now());
    } else {
      setIsFinished(true);
    }
  };

  const checkAnswer = (question: Question, answer: string): boolean => {
    switch (question.type) {
      case QuestionType.MULTIPLE_CHOICE:
        const correctOption = question.options?.find((o) => o.isCorrect);
        return answer === correctOption?.id;

      case QuestionType.FILL_IN_BLANK:
        const blanks = question.blanks || [];
        const userBlanks = answer.split("|");
        return blanks.every((blank, idx) =>
          userBlanks[idx]?.trim().toLowerCase() === blank.trim().toLowerCase()
        );

      case QuestionType.SHORT_ANSWER:
        // 简答题需要人工评分，这里简单判断非空
        return answer.trim().length > 10;

      case QuestionType.CODING:
        // 编程题需要运行测试用例，这里简化处理
        return answer.trim().length > 0;

      default:
        return false;
    }
  };

  const calculateScore = () => {
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    const earnedPoints = questions.reduce((sum, q) => {
      return sum + (results[q.id] ? q.points : 0);
    }, 0);
    return { totalPoints, earnedPoints };
  };

  if (!bankId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>请选择题库</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>加载中...</p>
      </div>
    );
  }

  if (isFinished) {
    const { totalPoints, earnedPoints } = calculateScore();
    const correctCount = Object.values(results).filter((r) => r).length;
    const totalTime = Object.values(timeSpent).reduce((sum, t) => sum + t, 0);

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/20 to-rose-50/30 p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-2xl">练习完成</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white text-3xl font-bold mb-4">
                  {Math.round((earnedPoints / totalPoints) * 100)}
                </div>
                <p className="text-muted-foreground">分数</p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{correctCount}</div>
                  <p className="text-sm text-muted-foreground">正确</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {questions.length - correctCount}
                  </div>
                  <p className="text-sm text-muted-foreground">错误</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, "0")}
                  </div>
                  <p className="text-sm text-muted-foreground">用时</p>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => router.push(`/workspace/practice/mistakes?bankId=${bankId}`)}
                >
                  查看错题本
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  再练一次
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => router.push("/workspace/practice/questions")}
                >
                  返回题库
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

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
            退出练习
          </Button>

          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              题目 {currentIndex + 1} / {questions.length}
            </span>
            <Badge>{currentQuestion.difficulty}</Badge>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{currentQuestion.title}</span>
              <Badge variant="outline">{currentQuestion.points} 分</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuestionRenderer
              question={currentQuestion}
              answer={answers[currentQuestion.id]}
              onAnswer={(answer) => handleAnswer(currentQuestion.id, answer)}
            />

            <div className="mt-6 flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!answers[currentQuestion.id]}
                className="bg-gradient-to-br from-orange-500 to-rose-500"
              >
                {currentIndex < questions.length - 1 ? "下一题" : "完成"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function DrillPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">加载中...</div>}>
      <DrillContent />
    </Suspense>
  );
}

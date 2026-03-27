"use client";

import { use, useState, useEffect, Suspense, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  getPracticeStorage,
  createPracticeSession,
  gradePracticeAnswer,
  summarizePracticeSession,
} from "@/lib/practice";
import type { PracticeSession } from "@/lib/practice";
import { QuestionRenderer } from "@/components/practice/question-renderer";

type DrillPageProps = {
  params: Promise<{ bankId: string }>;
};

function PracticeDrillContent({ bankId }: { bankId: string }) {
  const router = useRouter();

  const [session, setSession] = useState<PracticeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);

  const loadSession = useCallback(async (forceNew = false) => {
    try {
      setLoading(true);
      const storage = getPracticeStorage();

      if (!forceNew) {
        const savedSessionRaw = sessionStorage.getItem(`practice_session_${bankId}`);
        if (savedSessionRaw) {
          try {
            const savedSession = JSON.parse(savedSessionRaw);
            if (!savedSession.isFinished) {
              setSession(savedSession);
              setQuestionStartTime(Date.now());
              setCurrentAnswer("");
              return;
            }
          } catch (e) {
            console.error("Failed to parse saved session", e);
          }
        }
      }

      const newSession = await createPracticeSession(storage, { bankId, count: 10 });
      setSession(newSession);
      sessionStorage.setItem(`practice_session_${bankId}`, JSON.stringify(newSession));
      setQuestionStartTime(Date.now());
      setCurrentAnswer("");
    } catch (error) {
      console.error("Failed to load practice session:", error);
    } finally {
      setLoading(false);
    }
  }, [bankId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const handleSubmit = async () => {
    if (!session || submitting) return;
    
    setSubmitting(true);
    const currentQuestion = session.questions[session.currentIndex];
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);

    const result = gradePracticeAnswer({
      question: currentQuestion,
      answer: currentAnswer,
      timeSpent,
    });

    try {
      const storage = getPracticeStorage();
      await storage.createRecord({
        questionId: currentQuestion.id,
        bankId,
        answer: currentAnswer,
        isCorrect: result.isCorrect,
        score: result.score,
        timeSpent,
        attemptCount: 1,
      });

      if (!result.isCorrect) {
        await storage.addToWrongQuestions(currentQuestion.id, bankId);
      }
    } catch (error) {
      console.error("Failed to save practice record:", error);
    }

    setSession((prev) => {
      if (!prev) return prev;
      
      const newAnswers = { ...prev.answers, [currentQuestion.id]: currentAnswer };
      const newResults = { ...prev.results, [currentQuestion.id]: result };
      
      const isFinished = prev.currentIndex >= prev.totalQuestions - 1;
      
      const nextSession = {
        ...prev,
        answers: newAnswers,
        results: newResults,
        currentIndex: isFinished ? prev.currentIndex : prev.currentIndex + 1,
        isFinished,
      };

      try {
        if (isFinished) {
          sessionStorage.removeItem(`practice_session_${bankId}`);
        } else {
          sessionStorage.setItem(`practice_session_${bankId}`, JSON.stringify(nextSession));
        }
      } catch (e) {
        console.error("Failed to save practice session state:", e);
      }

      return nextSession;
    });

    setCurrentAnswer("");
    setQuestionStartTime(Date.now());
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <p className="text-slate-500">正在生成练习题...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full">
          <AlertCircle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-slate-900 mb-2">加载失败</h2>
          <p className="text-slate-500 mb-6">无法加载练习题，请稍后再试。</p>
          <Button onClick={() => router.push("/practice")}>返回列表</Button>
        </div>
      </div>
    );
  }

  if (session.totalQuestions === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-md w-full">
          <div className="bg-slate-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">该题库暂无题目</h2>
          <p className="text-slate-500 mb-6">此题库目前还没有添加任何题目，无法开始练习。</p>
          <Button onClick={() => router.push("/practice")}>返回列表</Button>
        </div>
      </div>
    );
  }

  if (session.isFinished) {
    const summary = summarizePracticeSession(session);
    const totalTime = Object.values(session.results).reduce((sum, r) => sum + r.timeSpent, 0);

    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-6 flex items-center justify-center">
        <Card className="max-w-md w-full border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-indigo-600 p-8 text-center text-white">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 opacity-90" />
            <h2 className="text-2xl font-bold mb-2">练习完成</h2>
            <p className="text-indigo-100">你的学习报告已生成</p>
          </div>
          
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-slate-500 text-sm mb-1">得分</p>
                <p className="text-3xl font-bold text-slate-900">
                  {summary.earnedPoints} <span className="text-lg text-slate-400 font-normal">/ {summary.totalPoints}</span>
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-slate-500 text-sm mb-1">正确率</p>
                <p className="text-3xl font-bold text-indigo-600">{summary.accuracy}%</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-slate-500 text-sm mb-1">答对题数</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {summary.correctCount} <span className="text-base text-slate-400 font-normal">/ {summary.totalQuestions}</span>
                </p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-slate-500 text-sm mb-1">总用时</p>
                <p className="text-2xl font-bold text-slate-700">
                  {Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, "0")}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={() => loadSession(true)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                再练一次
              </Button>
              <Button
                variant="outline"
                className="w-full border-slate-200 text-slate-600"
                onClick={() => router.push("/practice")}
              >
                返回题库列表
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = session.questions[session.currentIndex];
  const progressPercent = ((session.currentIndex) / session.totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => router.push("/practice")}
            className="text-slate-500 hover:text-slate-900 -ml-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            退出练习
          </Button>
          <div className="text-sm font-medium text-slate-500">
            进度: {session.currentIndex + 1} / {session.totalQuestions}
          </div>
        </div>

        <Progress value={progressPercent} className="h-2 mb-8 bg-slate-200" />

        <Card className="border-slate-200 shadow-sm mb-6">
          <CardHeader className="bg-white border-b border-slate-100 pb-4">
            <CardTitle className="flex items-start justify-between gap-4 text-xl">
              <span className="leading-snug text-slate-800">{currentQuestion.title}</span>
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 shrink-0">
                {currentQuestion.points} 分
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-white">
            <QuestionRenderer
              question={currentQuestion}
              answer={currentAnswer}
              onAnswer={setCurrentAnswer}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={!currentAnswer || submitting}
            className="bg-indigo-600 hover:bg-indigo-700 min-w-[120px]"
          >
            {session.currentIndex < session.totalQuestions - 1 ? "下一题" : "完成提交"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PracticeDrillPage({ params }: DrillPageProps) {
  const resolvedParams = use(params);
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    }>
      <PracticeDrillContent bankId={resolvedParams.bankId} />
    </Suspense>
  );
}

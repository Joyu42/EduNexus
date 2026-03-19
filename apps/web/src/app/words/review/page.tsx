"use client";

import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginPrompt } from "@/components/ui/login-prompt";
import { ReviewButtons, WordCard } from "@/components/words";
import { ensureWordsBootstrap } from "@/lib/words/bootstrap";
import { getWordsToday, listenForWordsTodayChange } from "@/lib/words/date";
import {
  getCompletedCountFromSummary,
  syncWordsProgressToGoal,
} from "@/lib/words/integration";
import { wordsStorage } from "@/lib/words/storage";
import { updateWordStatus } from "@/lib/words/scheduler";
import { selectReviewWordIds } from "@/lib/words/session";
import type { Word, WordAnswerGrade } from "@/lib/words/types";

export default function ReviewWordsPage() {
  const router = useRouter();
  const { status } = useSession();
  const [today, setToday] = useState(getWordsToday());
  const [sessionQueue, setSessionQueue] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cleanup = listenForWordsTodayChange(() => {
      setToday(getWordsToday());
    });
    return cleanup;
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      setSessionQueue([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    const load = async () => {
      await ensureWordsBootstrap();
      const [words, records] = await Promise.all([
        wordsStorage.getAllWords(),
        wordsStorage.getAllLearningRecords(),
      ]);
      if (!active) return;
      const dueWordIds = selectReviewWordIds(words, records, today, 50);
      const byId = new Map(words.map((word) => [word.id, word]));
      const queue = dueWordIds
        .map((id) => byId.get(id))
        .filter((word): word is Word => Boolean(word));
      setSessionQueue(queue);
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [today, status]);

  const [quickRecallMode, setQuickRecallMode] = useState(false);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [isAnswering, setIsAnswering] = useState(false);

  const current = sessionQueue[index];
  const finished = sessionQueue.length > 0 && index >= sessionQueue.length;

  const onAnswer = async (grade: WordAnswerGrade) => {
    if (isAnswering) {
      return;
    }
    if (status !== "authenticated") {
      return;
    }

    const currentWord = sessionQueue[index];
    if (!currentWord) {
      return;
    }

    setIsAnswering(true);
    try {
      await updateWordStatus(wordsStorage, currentWord.bookId, currentWord.id, grade, today);

      const success = grade !== "again";
      if (success) {
        setCorrect((count) => count + 1);
      } else {
        setIncorrect((count) => count + 1);
      }
      setIndex((currentIndex) => currentIndex + 1);

      const stats = await wordsStorage.getLearningStats(today);
      const completed = getCompletedCountFromSummary(stats.todaySummary);
      syncWordsProgressToGoal(today, 20, completed);
    } finally {
      setIsAnswering(false);
    }
  };

  const reset = () => {
    setIndex(0);
    setCorrect(0);
    setIncorrect(0);
    setIsAnswering(false);
  };

  const accuracy =
    sessionQueue.length === 0 ? 0 : Math.round((correct / sessionQueue.length) * 100);
  const safeAccuracy = Math.max(0, Math.min(100, accuracy));

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="text-sm text-slate-600">正在检查登录状态...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <LoginPrompt title="单词复习" />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>正在加载复习队列...</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">请稍候</CardContent>
        </Card>
      </div>
    );
  }

  if (sessionQueue.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>复习队列为空</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-600">
            <p>今天没有待复习单词，继续保持！</p>
            <Button onClick={() => router.push("/words")}>返回单词首页</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(175deg,_#f0fdf4_0%,_#ecfeff_40%,_#f8fafc_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="rounded-xl border border-slate-200 bg-white/85 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">复习模式</h1>
              <p className="text-sm text-slate-600">复习队列: {Math.max(sessionQueue.length - index, 0)} 个单词</p>
            </div>
            <Button variant={quickRecallMode ? "default" : "outline"} onClick={() => setQuickRecallMode((value) => !value)} className="gap-2">
              <Timer className="h-4 w-4" />
              快捷回忆 {quickRecallMode ? "ON" : "OFF"}
            </Button>
          </div>
        </header>

        {finished ? (
          <Card>
            <CardHeader>
              <CardTitle>复习结果统计</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-emerald-600">认识: {correct}</Badge>
                <Badge className="bg-rose-600">不认识: {incorrect}</Badge>
                <Badge variant="outline">总计: {sessionQueue.length}</Badge>
              </div>
              <div className="text-sm text-slate-600">
                准确率: {safeAccuracy}%
              </div>
              <div className="flex gap-2">
                <Button onClick={reset}>重新复习</Button>
                <Button variant="outline" onClick={() => router.push("/words")}>
                  返回首页
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : current ? (
          <>
            <WordCard word={current} showDefinition={!quickRecallMode} showExample={!quickRecallMode} />
            <ReviewButtons onGrade={(value) => void onAnswer(value)} disabled={isAnswering} />
          </>
        ) : null}
      </div>
    </div>
  );
}

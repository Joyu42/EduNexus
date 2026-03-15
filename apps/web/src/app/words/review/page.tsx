"use client";

import { useEffect, useMemo, useState } from "react";
import { Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewButtons, WordCard } from "@/components/words";
import { ensureWordsBootstrap } from "@/lib/words/bootstrap";
import { syncWordsProgressToGoal } from "@/lib/words/integration";
import { wordsStorage } from "@/lib/words/storage";
import { updateWordStatus } from "@/lib/words/scheduler";
import type { LearningRecord, Word } from "@/lib/words/types";

export default function ReviewWordsPage() {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [learningRecords, setLearningRecords] = useState<LearningRecord[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await ensureWordsBootstrap();
      const [words, records] = await Promise.all([
        wordsStorage.getAllWords(),
        wordsStorage.getAllLearningRecords(),
      ]);
      if (!active) return;
      setAllWords(words);
      setLearningRecords(records);
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const dueWordIds = useMemo(
    () =>
      learningRecords
        .filter((record) => record.nextReviewDate <= today)
        .map((record) => record.wordId),
    [learningRecords, today]
  );

  const queue = useMemo(
    () => allWords.filter((word) => dueWordIds.includes(word.id)),
    [allWords, dueWordIds]
  );

  const [quickRecallMode, setQuickRecallMode] = useState(false);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);

  const current = queue[index];
  const finished = queue.length > 0 && index >= queue.length;

  const onAnswer = async (isCorrect: boolean) => {
    const currentWord = queue[index];
    if (!currentWord) {
      return;
    }

    await updateWordStatus(wordsStorage, currentWord.bookId, currentWord.id, isCorrect, today);

    if (isCorrect) {
      setCorrect((count) => count + 1);
    } else {
      setIncorrect((count) => count + 1);
    }
    setIndex((currentIndex) => currentIndex + 1);

    const records = await wordsStorage.getAllLearningRecords();
    setLearningRecords(records);
    const completed = records.filter((record) => record.lastReviewedAt === today).length;
    syncWordsProgressToGoal(today, 20, completed);
  };

  const reset = () => {
    setIndex(0);
    setCorrect(0);
    setIncorrect(0);
  };

  if (queue.length === 0) {
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
              <p className="text-sm text-slate-600">复习队列: {Math.max(queue.length - index, 0)} 个单词</p>
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
                <Badge variant="outline">总计: {queue.length}</Badge>
              </div>
              <div className="text-sm text-slate-600">
                准确率: {queue.length === 0 ? 0 : Math.round((correct / queue.length) * 100)}%
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
            <ReviewButtons onKnow={() => void onAnswer(true)} onDontKnow={() => void onAnswer(false)} />
          </>
        ) : null}
      </div>
    </div>
  );
}

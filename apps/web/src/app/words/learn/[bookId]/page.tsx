"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LoginPrompt } from "@/components/ui/login-prompt";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReviewButtons, WordCard } from "@/components/words";
import { ensureWordsBootstrap } from "@/lib/words/bootstrap";
import { generateWordMnemonic } from "@/lib/words/ai";
import {
  getCompletedCountFromSummary,
  suggestRelatedWords,
  syncWordsProgressToGoal,
} from "@/lib/words/integration";
import { wordsStorage } from "@/lib/words/storage";
import { updateWordStatus } from "@/lib/words/scheduler";
import { getWordsToday, listenForWordsTodayChange } from "@/lib/words/date";
import { selectNewWordIds } from "@/lib/words/session";
import type { Word, WordAnswerGrade } from "@/lib/words/types";

type LearnPageProps = {
  params: Promise<{ bookId: string }>;
};

function buildLearningQueue(words: Word[], size = 20): Word[] {
  return words.slice(0, size);
}

async function buildSmartLearningQueue(bookId: string): Promise<Word[]> {
  const [words, records] = await Promise.all([
    wordsStorage.getWordsByBook(bookId),
    wordsStorage.getAllLearningRecords(),
  ]);

  const sessionWordIds = selectNewWordIds(words, records, 20);
  const byId = new Map(words.map((word) => [word.id, word]));
  return sessionWordIds.map((id) => byId.get(id)).filter((item): item is Word => Boolean(item));
}

export default function LearnWordsPage({ params }: LearnPageProps) {
  const router = useRouter();
  const { status } = useSession();
  const resolvedParams = use(params);
  const [today, setToday] = useState(getWordsToday());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [bookWords, setBookWords] = useState<Word[]>([]);
  const [mnemonic, setMnemonic] = useState<string>("");
  const [mnemonicLoading, setMnemonicLoading] = useState(false);
  const [relatedWords, setRelatedWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const isAnsweringRef = useRef(false);

  const bookId = resolvedParams?.bookId ?? "cet4";
  const queue = useMemo(() => buildLearningQueue(bookWords, 20), [bookWords]);
  const currentWord = queue[currentIndex];
  const progress = queue.length === 0 ? 0 : ((currentIndex + 1) / queue.length) * 100;

  useEffect(() => {
    const cleanup = listenForWordsTodayChange(() => {
      setToday(getWordsToday());
    });
    return cleanup;
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      setBookWords([]);
      return;
    }

    let active = true;
    setLoading(true);

    const load = async () => {
      await ensureWordsBootstrap();
      const words = await buildSmartLearningQueue(bookId);
      if (!active) return;
      setBookWords(words);
      setCurrentIndex(0);
      setKnownCount(0);
      setUnknownCount(0);
      setFinished(false);
      setMnemonic("");
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [bookId, today, status]);

  useEffect(() => {
    let active = true;
    if (!currentWord || status !== "authenticated") {
      setRelatedWords([]);
      return;
    }

    const run = async () => {
      const related = await suggestRelatedWords(currentWord.id, bookId, 3);
      if (!active) return;
      setRelatedWords(related);
    };

    void run();
    return () => {
      active = false;
    };
  }, [bookId, currentWord, status]);

  const generateMnemonic = async (word: Word) => {
    setMnemonicLoading(true);
    const text = await generateWordMnemonic({
      word: word.word,
      definition: word.definition,
      example: word.example,
    });
    setMnemonic(text);
    setMnemonicLoading(false);
  };

  const moveNext = async (grade: WordAnswerGrade) => {
    if (isAnsweringRef.current) {
      return;
    }
    if (status !== "authenticated") {
      return;
    }

    if (!currentWord) {
      return;
    }

    isAnsweringRef.current = true;
    try {
      await updateWordStatus(wordsStorage, bookId, currentWord.id, grade, today);

      const success = grade !== "again";
      if (success) {
        setKnownCount((count) => count + 1);
      } else {
        setUnknownCount((count) => count + 1);
      }

      const stats = await wordsStorage.getLearningStats(today);
      const completed = getCompletedCountFromSummary(stats.todaySummary);
      syncWordsProgressToGoal(today, 20, completed);

      setMnemonic("");

      if (currentIndex >= queue.length - 1) {
        setFinished(true);
        return;
      }
      setCurrentIndex((index) => index + 1);
    } finally {
      isAnsweringRef.current = false;
    }
  };

  const restart = () => {
    if (status !== "authenticated") {
      return;
    }

    void (async () => {
      setLoading(true);
      const words = await buildSmartLearningQueue(bookId);
      setBookWords(words);
      setCurrentIndex(0);
      setKnownCount(0);
      setUnknownCount(0);
      setFinished(false);
      setMnemonic("");
      isAnsweringRef.current = false;
      setLoading(false);
    })();
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <p className="text-sm text-slate-600">正在检查登录状态...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <LoginPrompt title="单词学习" />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="rounded-xl border bg-white px-8 py-6 text-center shadow-sm">
          <p className="text-base font-medium text-slate-900">正在加载学习队列...</p>
        </div>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
          <p className="text-base font-medium text-slate-900">当前词库暂无可学习单词</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Button variant="default" onClick={restart}>
              再学一组
            </Button>
            <Button variant="outline" onClick={() => router.push("/words")}>
              返回仪表盘
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(170deg,_#ecfeff_0%,_#eff6ff_45%,_#f8fafc_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className="rounded-xl border border-slate-200 bg-white/85 p-4 shadow-sm backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between text-sm text-slate-700">
            <span>学习进度</span>
            <span className="font-semibold">
              {Math.min(currentIndex + 1, queue.length)}/{queue.length}
            </span>
          </div>
          <Progress value={progress} />
        </header>

        <WordCard
          word={currentWord}
          mnemonic={mnemonic}
          mnemonicLoading={mnemonicLoading}
          onGenerateMnemonic={generateMnemonic}
        />

        {relatedWords.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white/85 p-4 text-sm shadow-sm">
            <p className="mb-2 font-medium text-slate-800">关联单词推荐</p>
            <div className="flex flex-wrap gap-2">
              {relatedWords.map((word) => (
                <span key={word.id} className="rounded-full bg-cyan-100 px-3 py-1 text-cyan-800">
                  {word.word}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <ReviewButtons onGrade={(value) => void moveNext(value)} disabled={isAnsweringRef.current} />
      </div>

      <Dialog open={finished} onOpenChange={setFinished}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              今日学习完成
            </DialogTitle>
            <DialogDescription>
              你已完成本轮学习，下面是本次学习报告。
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-emerald-50 p-3">
              <p className="text-emerald-700">认识</p>
              <p className="text-2xl font-bold text-emerald-800">{knownCount}</p>
            </div>
            <div className="rounded-lg bg-rose-50 p-3">
              <p className="text-rose-700">不认识</p>
              <p className="text-2xl font-bold text-rose-800">{unknownCount}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => router.push("/words")}>
              返回首页
            </Button>
            <Button className="gap-2" onClick={restart}>
              <RotateCcw className="h-4 w-4" />
              再学一轮
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { use, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
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
import { suggestRelatedWords, syncWordsProgressToGoal } from "@/lib/words/integration";
import { wordsStorage } from "@/lib/words/storage";
import { updateWordStatus } from "@/lib/words/scheduler";
import type { Word } from "@/lib/words/types";

type LearnPageProps = {
  params: Promise<{ bookId: string }>;
};

function buildLearningQueue(words: Word[], size = 20): Word[] {
  if (words.length === 0) {
    return [];
  }
  if (words.length >= size) {
    return words.slice(0, size);
  }

  const queue: Word[] = [];
  while (queue.length < size) {
    queue.push(words[queue.length % words.length]);
  }
  return queue;
}

export default function LearnWordsPage({ params }: LearnPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [knownCount, setKnownCount] = useState(0);
  const [unknownCount, setUnknownCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [bookWords, setBookWords] = useState<Word[]>([]);
  const [mnemonic, setMnemonic] = useState<string>("");
  const [mnemonicLoading, setMnemonicLoading] = useState(false);
  const [relatedWords, setRelatedWords] = useState<Word[]>([]);

  const bookId = resolvedParams?.bookId ?? "cet4";
  const queue = useMemo(() => buildLearningQueue(bookWords, 20), [bookWords]);
  const currentWord = queue[currentIndex];
  const progress = queue.length === 0 ? 0 : ((currentIndex + 1) / queue.length) * 100;

  useEffect(() => {
    let active = true;

    const load = async () => {
      await ensureWordsBootstrap();
      const words = await wordsStorage.getWordsByBook(bookId);
      if (!active) return;
      setBookWords(words);
    };

    void load();
    return () => {
      active = false;
    };
  }, [bookId]);

  useEffect(() => {
    let active = true;
    if (!currentWord) {
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
  }, [bookId, currentWord]);

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

  const moveNext = async (isKnown: boolean) => {
    if (!currentWord) {
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    await updateWordStatus(wordsStorage, bookId, currentWord.id, isKnown, today);

    if (isKnown) {
      setKnownCount((count) => count + 1);
    } else {
      setUnknownCount((count) => count + 1);
    }

    const records = await wordsStorage.getAllLearningRecords();
    const completed = records.filter((record) => record.lastReviewedAt === today).length;
    syncWordsProgressToGoal(today, 20, completed);

    setMnemonic("");

    if (currentIndex >= queue.length - 1) {
      setFinished(true);
      return;
    }
    setCurrentIndex((index) => index + 1);
  };

  const restart = () => {
    setCurrentIndex(0);
    setKnownCount(0);
    setUnknownCount(0);
    setFinished(false);
    setMnemonic("");
  };

  if (!currentWord) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
          <p className="text-base font-medium text-slate-900">当前词库暂无可学习单词</p>
          <Button className="mt-4" onClick={() => router.push("/words")}>
            返回仪表盘
          </Button>
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

        <ReviewButtons onKnow={() => void moveNext(true)} onDontKnow={() => void moveNext(false)} />
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

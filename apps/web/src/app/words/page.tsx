"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Flame, ListTodo, PlayCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  BookSelector,
  ProgressRing,
  StatsCard,
  StreakCalendar,
} from "@/components/words";
import { ensureWordsBootstrap } from "@/lib/words/bootstrap";
import { wordsStorage } from "@/lib/words/storage";
import type { LearningRecord, WordBook } from "@/lib/words/types";
import { countCompletedToday, syncWordsProgressToGoal } from "@/lib/words/integration";

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function WordsDashboardPage() {
  const router = useRouter();
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [books, setBooks] = useState<WordBook[]>([]);
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [dueTodayWordIds, setDueTodayWordIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const today = getTodayIsoDate();

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      await ensureWordsBootstrap();
      const [loadedBooks, loadedRecords, dueWords] = await Promise.all([
        wordsStorage.getWordBooks(),
        wordsStorage.getAllLearningRecords(),
        wordsStorage.getTodayReviewWords(today),
      ]);

      if (!active) {
        return;
      }

      setBooks(loadedBooks);
      setRecords(loadedRecords);
      setDueTodayWordIds(dueWords.map((word) => word.id));

      const current = loadedBooks[0]?.id ?? "";
      setSelectedBookId((prev) => prev || current);

      const completed = countCompletedToday(loadedRecords, today);
      syncWordsProgressToGoal(today, 20, completed);
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [today]);

  const progressByBook = useMemo(() => {
    return books.reduce<Record<string, number>>((acc, book) => {
      const bookRecords = records.filter((record) => record.bookId === book.id);
      const learned = bookRecords.filter((record) => record.status === "mastered").length;
      acc[book.id] = book.wordCount === 0 ? 0 : Math.round((learned / book.wordCount) * 100);
      return acc;
    }, {});
  }, [books, records]);

  const dueByBook = useMemo(() => {
    return books.reduce<Record<string, number>>((acc, book) => {
      acc[book.id] = records.filter(
        (record) => record.bookId === book.id && record.nextReviewDate <= today
      ).length;
      return acc;
    }, {});
  }, [books, records, today]);

  const todayLearned = records.filter((record) => record.learnDate === today).length;
  const todayReviewed = records.filter((record) => record.lastReviewedAt === today).length;
  const streakDays = useMemo(() => {
    const activeDates = Array.from(new Set(records.map((record) => record.lastReviewedAt))).filter(Boolean);
    const set = new Set(activeDates);
    const cursor = new Date(`${today}T00:00:00.000Z`);
    let streak = 0;
    while (true) {
      const value = cursor.toISOString().slice(0, 10);
      if (!set.has(value)) break;
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return streak;
  }, [records, today]);

  const totalDueToday = Object.values(dueByBook).reduce((sum, value) => sum + value, 0);
  const activeDates = Array.from(new Set(records.map((record) => record.lastReviewedAt))).filter(Boolean).sort();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#ecfeff_0%,_transparent_40%),radial-gradient(circle_at_bottom_right,_#ecfdf5_0%,_transparent_45%),linear-gradient(160deg,_#f8fafc_0%,_#eef2ff_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-cyan-700">Words Learning Lab</p>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">单词学习仪表盘</h1>
              <p className="text-sm text-slate-600">
                {loading ? "正在同步词库与进度..." : "聚焦今日任务，持续保持学习节奏。"}
              </p>
            </div>
            <ProgressRing value={Math.min(100, (todayLearned + todayReviewed) * 5)} label="Today" />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard icon={Flame} label="连续学习天数" value={streakDays} trend={8} accentClassName="from-amber-500/15 to-orange-500/10 border-amber-200" />
            <StatsCard icon={ListTodo} label="今日待复习" value={totalDueToday} trend={-4} accentClassName="from-rose-500/15 to-orange-500/10 border-rose-200" />
            <StatsCard icon={BookOpen} label="今日学习" value={todayLearned} accentClassName="from-cyan-500/15 to-sky-500/10 border-cyan-200" />
            <StatsCard icon={PlayCircle} label="今日复习" value={todayReviewed} accentClassName="from-emerald-500/15 to-teal-500/10 border-emerald-200" />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={() =>
                router.push(`/words/learn/${selectedBookId || books[0]?.id || "cet4"}`)
              }
            >
              快速开始学习
            </Button>
            <Button variant="outline" onClick={() => router.push("/words/review")}>
              进入复习模式
            </Button>
          </div>
        </section>

        <StreakCalendar activeDates={activeDates} />

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">词库选择</h2>
            <p className="text-xs text-slate-500">选择后将用于“快速开始学习”</p>
          </div>
          <BookSelector
            books={books}
            selectedBookId={selectedBookId}
            progressByBook={progressByBook}
            dueByBook={dueByBook}
            onSelect={setSelectedBookId}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white/85 p-4 text-sm text-slate-600 shadow-sm">
          今日复习队列词数：{dueTodayWordIds.length}（已同步到每日目标）
        </section>
      </div>
    </div>
  );
}

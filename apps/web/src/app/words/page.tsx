"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { BookOpen, Flame, ListTodo, PlayCircle, UploadCloud, Loader2, Sparkles, BookmarkPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { LoginPrompt } from "@/components/ui/login-prompt";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { toast } from "sonner";
import {
  BookSelector,
  ProgressRing,
  StatsCard,
  StreakCalendar,
} from "@/components/words";
import { ensureWordsBootstrap } from "@/lib/words/bootstrap";
import { getWordsToday, listenForWordsTodayChange } from "@/lib/words/date";
import { wordsStorage } from "@/lib/words/storage";
import { callAI } from "@/lib/ai-service";
import { createDocumentOnServer } from "@/lib/client/kb-storage";
import {
  uploadCustomBook,
  updateCustomBookMetadata,
  replaceCustomBook,
  deleteCustomBook,
} from "@/lib/words/custom-wordbooks-client";
import type {
  LearningRecord,
  LearningStats,
  WordBook,
  WordsTodaySummary,
} from "@/lib/words/types";
import { getCompletedCountFromSummary, syncWordsProgressToGoal } from "@/lib/words/integration";
import {
  filterBooksByMajor,
  nextSelectedBookIdAfterVisibilityChange,
  normalizePersistedSelection,
  PROFESSIONAL_BOOK_IDS,
  MAJOR_TO_PRO_BOOK_ID,
  type WordsMajor,
} from "@/lib/words/major-gating";

const SELECTED_BOOK_STORAGE_KEY = "edunexus_words_selected_book";
const SELECTED_MAJOR_STORAGE_KEY = "edunexus_words_selected_major";

function pickFallbackBookId(availableBooks: WordBook[]): string {
  if (availableBooks.length === 0) return "";
  const custom = availableBooks.find((book) => book.id.startsWith("custom_book_"));
  if (custom) return custom.id;
  const cet4 = availableBooks.find((book) => book.id === "cet4");
  if (cet4) return cet4.id;
  return availableBooks[0].id;
}

export default function WordsDashboardPage() {
  const router = useRouter();
  const { status } = useSession();
  const [selectedBookId, setSelectedBookId] = useState<string>("");
  const [books, setBooks] = useState<WordBook[]>([]);
  const [records, setRecords] = useState<LearningRecord[]>([]);
  const [dueTodayWordIds, setDueTodayWordIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState(getWordsToday());
  const [stats, setStats] = useState<LearningStats | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [replacingBookId, setReplacingBookId] = useState<string | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const [deletingBookId, setDeletingBookId] = useState<string | null>(null);

  const [selectedMajor, setSelectedMajor] = useState<WordsMajor | "">("");
  const [selectionHydrated, setSelectionHydrated] = useState(false);
  const hasHydratedOnceRef = useRef(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [articleContent, setArticleContent] = useState<string | null>(null);
  const [generatedTitle, setGeneratedTitle] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      await ensureWordsBootstrap();
      const [loadedBooks, loadedRecords, dueWords, loadedStats] = await Promise.all([
        wordsStorage.getWordBooks(),
        wordsStorage.getAllLearningRecords(),
        wordsStorage.getTodayReviewWords(today),
        wordsStorage.getLearningStats(today),
      ]);

      setBooks(loadedBooks);
      setRecords(loadedRecords);
      setDueTodayWordIds(dueWords.map((word) => word.id));
      setStats(loadedStats);

      const completed = getCompletedCountFromSummary(loadedStats.todaySummary);
      syncWordsProgressToGoal(today, 20, completed);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    }
  }, [today]);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      setBooks([]);
      setRecords([]);
      setDueTodayWordIds([]);
      setStats(null);
      return;
    }

    let active = true;

    const load = async () => {
      setLoading(true);
      await loadDashboard();
      if (!active) return;
      setLoading(false);
    };

    void load();
    return () => {
      active = false;
    };
  }, [status, loadDashboard]);

  useEffect(() => {
    const cleanup = listenForWordsTodayChange(() => {
      setToday(getWordsToday());
    });
    return cleanup;
  }, []);

  const persistSelection = useCallback(async (major: string, bookId: string) => {
    try {
      if (typeof window !== "undefined") {
        if (major) localStorage.setItem(SELECTED_MAJOR_STORAGE_KEY, major);
        else localStorage.removeItem(SELECTED_MAJOR_STORAGE_KEY);
        if (bookId) localStorage.setItem(SELECTED_BOOK_STORAGE_KEY, bookId);
        else localStorage.removeItem(SELECTED_BOOK_STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }

    if (status === "authenticated") {
      try {
        const current = await wordsStorage.getWordsPlanSettings();
        await wordsStorage.saveWordsPlanSettings({
          ...current,
          selectedMajor: major as WordsMajor | "",
          lastSelectedBookId: bookId,
        });
      } catch {
        // ignore storage errors
      }
    }
  }, [status]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (books.length === 0) return;

    setSelectionHydrated(false);

    const doHydrate = async () => {
      let localMajor = "";
      let localBookId = "";

      try {
        localMajor = localStorage.getItem(SELECTED_MAJOR_STORAGE_KEY) ?? "";
        localBookId = localStorage.getItem(SELECTED_BOOK_STORAGE_KEY) ?? "";
      } catch {
        // ignore storage errors
      }

      let serverMajor = "";
      let serverBookId = "";

      if (status === "authenticated") {
        try {
          const settings = await wordsStorage.getWordsPlanSettings();
          serverMajor = settings.selectedMajor;
          serverBookId = settings.lastSelectedBookId;
        } catch {}
      }

      const hasServerPair = Boolean(serverMajor || serverBookId);
      const sourceMajor = hasServerPair ? serverMajor : localMajor;
      const sourceBookId = hasServerPair ? serverBookId : localBookId;

      const normalized = normalizePersistedSelection(
        sourceMajor as WordsMajor | "",
        sourceBookId,
        books
      );
      const needsRepair =
        normalized.selectedMajor !== sourceMajor ||
        normalized.selectedBookId !== sourceBookId;
      const needsServerMigration =
        status === "authenticated" &&
        !hasServerPair &&
        Boolean(localMajor || localBookId);

      setSelectedMajor(normalized.selectedMajor);
      setSelectedBookId(normalized.selectedBookId);

      if (needsRepair || needsServerMigration) {
        await persistSelection(normalized.selectedMajor, normalized.selectedBookId);
      }

      setSelectionHydrated(true);
    };

    void doHydrate();
  }, [books, persistSelection, status]);

  const visibleBooks = useMemo(
    () => filterBooksByMajor(books, selectedMajor),
    [books, selectedMajor]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!selectionHydrated) return;
    if (!hasHydratedOnceRef.current) {
      hasHydratedOnceRef.current = true;
      return;
    }

    const syncVisibilityFallback = async () => {
      const next = nextSelectedBookIdAfterVisibilityChange({
        visibleBooks,
        selectedBookId,
        storedSelectedBookId: (() => {
          if (typeof window === "undefined") return undefined;
          try { return localStorage.getItem(SELECTED_BOOK_STORAGE_KEY) ?? undefined; }
          catch { return undefined; }
        })(),
      });

      if (next && next !== selectedBookId) {
        setSelectedBookId(next);
        await persistSelection(selectedMajor, next);
      }

      setSelectionHydrated(true);
    };

    void syncVisibilityFallback();
  }, [books, persistSelection, selectedMajor, selectedBookId, selectionHydrated, visibleBooks]);

  const handleSelectBook = (bookId: string) => {
    setSelectedBookId(bookId);
    void persistSelection(selectedMajor, bookId);
  };

  const handleMajorChange = (major: WordsMajor) => {
    // Major-sticky: always select the professional book for this major immediately
    const newBookId = MAJOR_TO_PRO_BOOK_ID[major];
    setSelectedMajor(major);
    setSelectedBookId(newBookId);
    void persistSelection(major, newBookId);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const newBook = await uploadCustomBook(file, uploadName, uploadDescription);
      toast.success("词库上传成功");
      setUploadName("");
      setUploadDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      await loadDashboard();
      handleSelectBook(newBook.id);
    } catch (error: any) {
      toast.error(error.message || "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleManage = (bookId: string) => {
    const book = books.find((b) => b.id === bookId);
    if (book) {
      setEditName(book.name);
      setEditDescription(book.description || "");
      setEditingBookId(bookId);
    }
  };

  const handleEditSave = async () => {
    if (!editingBookId) return;
    try {
      await updateCustomBookMetadata(editingBookId, { name: editName, description: editDescription });
      toast.success("词库信息更新成功");
      setEditingBookId(null);
      await loadDashboard();
    } catch (error: any) {
      toast.error(error.message || "更新失败");
    }
  };

  const handleReplace = (bookId: string) => {
    setReplacingBookId(bookId);
  };

  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingBookId) return;
    try {
      await replaceCustomBook(replacingBookId, file);
      toast.success("词库替换成功");
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = "";
      setReplacingBookId(null);
      await loadDashboard();
    } catch (error: any) {
      toast.error(error.message || "替换失败");
    }
  };

  const handleDelete = (bookId: string) => {
    setDeletingBookId(bookId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBookId) return;
    try {
      await deleteCustomBook(deletingBookId);
      toast.success("词库已删除");
      if (selectedBookId === deletingBookId) {
        const remainingBooks = visibleBooks.filter((b) => b.id !== deletingBookId);
        handleSelectBook(pickFallbackBookId(remainingBooks));
      }
      setDeletingBookId(null);
      await loadDashboard();
    } catch (error: any) {
      toast.error(error.message || "删除失败");
    }
  };

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

  const todaySummary: WordsTodaySummary = stats?.todaySummary ?? {
    learned: 0,
    reviewed: 0,
    relearned: 0,
    accuracy: 0,
  };
  const completedToday = getCompletedCountFromSummary(todaySummary);
  const targetWords = 20;
  const streakDays = stats?.streakDays ?? 0;
  const totalDueToday = stats?.dueToday ?? Object.values(dueByBook).reduce((sum, value) => sum + value, 0);
  const activeDates = Array.from(new Set(records.map((record) => record.lastReviewedAt))).filter(Boolean).sort();

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
            <ProgressRing
              value={Math.min(100, (completedToday / Math.max(1, targetWords)) * 100)}
              label="今日完成"
            />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatsCard icon={Flame} label="连续学习天数" value={streakDays} accentClassName="from-amber-500/15 to-orange-500/10 border-amber-200" />
            <StatsCard icon={ListTodo} label="今日待复习" value={totalDueToday} accentClassName="from-rose-500/15 to-orange-500/10 border-rose-200" />
            <StatsCard icon={BookOpen} label="今日学习" value={todaySummary.learned} accentClassName="from-cyan-500/15 to-sky-500/10 border-cyan-200" />
            <StatsCard icon={PlayCircle} label="今日复习" value={todaySummary.reviewed} accentClassName="from-emerald-500/15 to-teal-500/10 border-emerald-200" />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="bg-cyan-600 hover:bg-cyan-700"
              onClick={() =>
                router.push(`/words/learn/${selectedBookId || visibleBooks[0]?.id || "cet4"}`)
              }
            >
              学习新词
            </Button>
            <Button variant="outline" onClick={() => router.push(`/words/review?bookId=${selectedBookId || visibleBooks[0]?.id || "cet4"}`)}>
              复习旧词
            </Button>
          </div>
        </section>

        <StreakCalendar activeDates={activeDates} today={today} />

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white/80 p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">自定义词库</h2>
              <p className="text-sm text-slate-500">上传您自己的词库文件（支持 .csv, .json），成功上传后会立即出现在下方列表。所有自定义词库仅自己可见。</p>
            </div>
          </div>

          <Alert className="bg-muted/50 border-none">
            <AlertTitle>支持的上传格式说明</AlertTitle>
            <AlertDescription className="space-y-2 mt-2">
              <p>我们支持 <strong>CSV</strong> 和 <strong>JSON</strong> 格式导入词库。</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>必填字段：</strong> <code>word</code> (单词), <code>definition</code> (释义)</li>
                <li><strong>可选字段：</strong> <code>phonetic</code> (音标), <code>example</code> (例句), <code>exampleZh</code> (例句中文), <code>difficulty</code> (难度)</li>
              </ul>
              <p className="text-xs text-muted-foreground">提示：表头或键名也支持中文，如“单词”、“释义”、“音标”等。</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 text-xs font-mono bg-background p-2 rounded border">
                <div>
                  <div className="font-semibold text-muted-foreground mb-1">CSV 示例:</div>
                  <pre className="whitespace-pre-wrap text-[10px]">word,definition,phonetic{"\n"}abandon,放弃,/əˈbændən/{"\n"}accurate,准确的,/ˈækjərət/</pre>
                </div>
                <div>
                  <div className="font-semibold text-muted-foreground mb-1">JSON 示例:</div>
                  <pre className="whitespace-pre-wrap text-[10px]">{`{\n  "words": [\n    {"word": "abandon", "definition": "放弃", "phonetic": "/əˈbændən/"},\n    {"word": "accurate", "definition": "准确的", "phonetic": "/ˈækjərət/"}\n  ]\n}`}</pre>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex-1 space-y-2">
              <Input
                id="words-upload-name"
                placeholder="例如：医学英语术语"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Textarea
                id="words-upload-description"
                placeholder="例如：临床常用术语"
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
                className="min-h-[40px] h-10 resize-none"
              />
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 sm:mt-0"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <UploadCloud className="mr-2 h-4 w-4" />
              {uploading ? "上传中..." : "选择并上传"}
            </Button>
            <input
              type="file"
              className="hidden"
              ref={fileInputRef}
              accept=".csv,.json,application/json,text/csv"
              onChange={handleFileChange}
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white/80 p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-700">选择你的专业</p>
              <p className="text-xs text-slate-500">
                {selectedMajor === ""
                  ? "选择专业以解锁对应的专业词书"
                  : `当前专业：${{ computer: "计算机", electrical: "电气", economics: "经济", medical: "医学" }[selectedMajor]}`}
              </p>
            </div>
            <Select
              value={selectedMajor}
              onValueChange={(v) => handleMajorChange(v as WordsMajor)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="选择专业" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="computer">计算机</SelectItem>
                <SelectItem value="electrical">电气</SelectItem>
                <SelectItem value="economics">经济</SelectItem>
                <SelectItem value="medical">医学</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">词库选择</h2>
            <p className="text-xs text-slate-500">选择后将用于“快速开始学习”</p>
          </div>
          <BookSelector
            books={visibleBooks}
            selectedBookId={selectedBookId}
            progressByBook={progressByBook}
            dueByBook={dueByBook}
            onSelect={handleSelectBook}
            onManage={handleManage}
            onReplace={handleReplace}
            onDelete={handleDelete}
          />
        </section>

        <section className="rounded-xl border border-slate-200 bg-white/85 p-4 text-sm text-slate-600 shadow-sm">
          今日复习队列词数：{dueTodayWordIds.length}（已同步到每日目标）
        </section>
      </div>

      <Dialog open={editingBookId !== null} onOpenChange={(open) => !open && setEditingBookId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑词库信息</DialogTitle>
            <DialogDescription>修改词库名称和描述信息。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Input
                id="words-edit-name"
                placeholder="词库名称"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Textarea
                id="words-edit-description"
                placeholder="词库描述"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBookId(null)}>取消</Button>
            <Button onClick={handleEditSave}>保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={replacingBookId !== null} onOpenChange={(open) => !open && setReplacingBookId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>替换词库文件</DialogTitle>
            <DialogDescription>选择新的 CSV 或 JSON 文件替换「{books.find(b => b.id === replacingBookId)?.name}」的内容。这将清除现有单词和学习记录，再导入新单词。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              type="file"
              accept=".csv,.json,application/json,text/csv"
              ref={replaceFileInputRef}
              onChange={handleReplaceFileChange}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deletingBookId !== null} onOpenChange={(open) => !open && setDeletingBookId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除词库</DialogTitle>
            <DialogDescription>确定要删除「{books.find(b => b.id === deletingBookId)?.name}」吗？此操作不可恢复。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingBookId(null)}>取消</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

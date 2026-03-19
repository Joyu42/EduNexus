# Words Learning Stability Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the `words` module from a demo-grade vocabulary flow into a stable daily-study system with a unified task pool, richer review grading, accurate daily metrics, and safer UI interactions.

**Architecture:** Keep the current `app/components/lib` split, but make `apps/web/src/lib/words` the single source of truth for queue planning, grading, and daily metrics. Pages should stop assembling their own task logic and instead consume consistent `words` helpers so dashboard, learn, and review stay in sync.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Testing Library, IndexedDB via `idb`

---

## Scope And Boundaries

- In scope: P0/P1 improvements for queue planning, grading depth, metric accuracy, loading/empty states, keyboard safety, today/date consistency, bootstrap recovery, and lightweight study-plan settings.
- Out of scope for this plan: account sync, cloud persistence, large new wordbook imports, social features, ranking, and AI-heavy memorization features.
- Delivery strategy: land P0 first behind existing routes and data model evolution; only start P1 after P0 tests pass and manual verification is complete.

## File Map

- Modify: `apps/web/src/lib/words/types.ts` - extend answer grade, session type, and daily event typing.
- Modify: `apps/web/src/lib/words/session.ts` - build one daily task pool shared by learn/review pages; remove duplicate-fill behavior.
- Modify: `apps/web/src/lib/words/scheduler.ts` - map graded answers to next-review intervals and record stage changes.
- Modify: `apps/web/src/lib/words/storage.ts` - persist richer record fields and compute daily summaries without double-counting.
- Modify: `apps/web/src/lib/words/stats.ts` - centralize learned/reviewed/relearned/accuracy calculations.
- Modify: `apps/web/src/lib/words/integration.ts` - sync goal progress from the new summary instead of `lastReviewedAt` counts.
- Modify: `apps/web/src/lib/words/date.ts` - provide one reusable today source for all words pages.
- Modify: `apps/web/src/lib/words/bootstrap.ts` - add integrity checks and safe re-bootstrap logic.
- Modify: `apps/web/src/app/words/page.tsx` - use centralized summary, remove fake trend values, align dashboard with new queue model.
- Modify: `apps/web/src/app/words/learn/[bookId]/page.tsx` - consume unified learn-session queue, support 4-grade answers, add loading state.
- Modify: `apps/web/src/app/words/review/page.tsx` - consume unified review queue, respect today updates, add loading state.
- Modify: `apps/web/src/components/words/word-card.tsx` - reset reveal state on word/mode changes and support explicit hiding rules.
- Modify: `apps/web/src/components/words/review-buttons.tsx` - ignore unsafe key presses and expose four answer grades.
- Modify: `apps/web/src/components/words/streak-calendar.tsx` - use injected `today` instead of raw system time.
- Modify: `apps/web/vitest.config.ts` - discover `.test.tsx` files for words component tests.
- Modify: `apps/web/package.json` - add `jsdom` for component tests.
- Modify: `pnpm-lock.yaml` - record workspace dependency changes.
- Create: `apps/web/src/lib/words/bootstrap.test.ts` - cover integrity-check and repair behavior.
- Create: `apps/web/src/components/words/word-card.test.tsx` - cover reveal-state reset and mode switching.
- Create: `apps/web/src/components/words/review-buttons.test.tsx` - cover keyboard safety and grade callbacks.
- Modify: `apps/web/src/lib/words/session.test.ts`
- Modify: `apps/web/src/lib/words/scheduler.test.ts`
- Modify: `apps/web/src/lib/words/storage.test.ts`
- Modify: `apps/web/src/lib/words/stats.test.ts`
- Modify: `apps/web/src/lib/words/integration.test.ts`

## Delivery Phases

- P0: queue planning, grading, metrics, loading/empty states, reveal-state reset, keyboard safety.
- P1: date consistency, bootstrap repair, daily-plan settings, dashboard cleanup.
- P2 backlog only: richer content layer, wrong-answer notebooks, cloud sync, advanced AI memorization.

## Risk Checkpoints

- Highest risk: data-model drift between stored `LearningRecord` values and page assumptions. Mitigation: add tests first and preserve backward compatibility when fields are missing.
- Highest user-facing risk: changing queue logic can alter daily counts. Mitigation: verify dashboard, learn, and review against the same fixture data.
- Regression risk: keyboard and reveal-state fixes can break current shortcuts. Mitigation: add component tests before editing handlers.

## Acceptance Checklist

- [ ] Learn page and review page no longer flash false empty states before data loads.
- [ ] Daily task pool prioritizes due review before new words and never pads a session with duplicate words.
- [ ] Answer grading supports at least `again`, `hard`, `good`, `easy` and changes next review timing accordingly.
- [ ] Dashboard, learn page, and review page agree on `today learned`, `today reviewed`, `due today`, and goal progress.
- [ ] `WordCard` reveal state resets correctly when the current word or mode changes.
- [ ] Keyboard shortcuts do not fire inside inputs, during IME composition, or on repeated keydown events.
- [ ] Bootstrap detects missing/corrupt local word data and repairs it without duplicating existing books.
- [ ] Targeted words tests pass using explicit file paths; no new warnings remain in modified words files.

## Chunk 1: P0 Queue And Grading Foundation

### Task 1: Replace binary answers with graded task planning

**Files:**
- Modify: `apps/web/src/lib/words/types.ts`
- Modify: `apps/web/src/lib/words/session.ts`
- Modify: `apps/web/src/lib/words/scheduler.ts`
- Test: `apps/web/src/lib/words/session.test.ts`
- Test: `apps/web/src/lib/words/scheduler.test.ts`

- [ ] **Step 1: Write the failing queue-planning tests**

```ts
it("prioritizes due review words before new words", () => {
  expect(selectSessionWordIds(words, records, "2026-03-17", 5)).toEqual([
    "due-1",
    "due-2",
    "new-1",
    "new-2",
    "new-3",
  ]);
});

it("does not duplicate words when the pool is smaller than session size", () => {
  expect(selectSessionWordIds(words.slice(0, 2), [], "2026-03-17", 5)).toEqual([
    "new-1",
    "new-2",
  ]);
});
```

- [ ] **Step 2: Run the queue-planning tests to verify they fail**

Run: `pnpm test:unit src/lib/words/session.test.ts`
Expected: FAIL because the current implementation excludes due words and overfits to new-word-only behavior.

- [ ] **Step 3: Write the failing grading tests**

```ts
it("maps answer grades to distinct next-review intervals", async () => {
  await updateWordStatus(storage, "cet4", "w1", "again", "2026-03-17");
  await updateWordStatus(storage, "cet4", "w2", "good", "2026-03-17");
  expect(saved[0].nextReviewDate).toBe("2026-03-18");
  expect(saved[1].nextReviewDate > saved[0].nextReviewDate).toBe(true);
});

it("does not mark a first successful exposure as mastered", async () => {
  await updateWordStatus(storage, "cet4", "w3", "good", "2026-03-17");
  expect(saved[0].status).toBe("reviewing");
});
```

- [ ] **Step 4: Run the grading tests to verify they fail**

Run: `pnpm test:unit src/lib/words/scheduler.test.ts`
Expected: FAIL because `updateWordStatus()` currently accepts `boolean` instead of a graded answer.

- [ ] **Step 5: Implement the minimal queue and grading model**

```ts
export type WordAnswerGrade = "again" | "hard" | "good" | "easy";

const GRADE_TO_QUALITY: Record<WordAnswerGrade, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};
```

- [ ] **Step 6: Update `selectSessionWordIds()` to use one ordered pool**

```ts
const dueWordIds = words
  .filter((word) => recordByWord.get(word.id)?.nextReviewDate <= today)
  .map((word) => word.id);

const newWordIds = words
  .filter((word) => !recordByWord.has(word.id))
  .map((word) => word.id);

return [...dueWordIds, ...newWordIds].slice(0, size);
```

```ts
export function selectReviewWordIds(words: Word[], records: LearningRecord[], today: string, size = 20): string[] {
  const recordByWord = new Map(records.map((record) => [record.wordId, record]));
  return words
    .filter((word) => {
      const record = recordByWord.get(word.id);
      return Boolean(record && record.nextReviewDate <= today);
    })
    .slice(0, size)
    .map((word) => word.id);
}
```

- [ ] **Step 7: Update `updateWordStatus()` to persist stage-aware record fields**

```ts
const quality = GRADE_TO_QUALITY[grade];
const isFirstSeen = !current;
const status =
  grade === "again"
    ? "learning"
    : isFirstSeen
      ? "reviewing"
      : next.nextInterval > 6
        ? "mastered"
        : "reviewing";
```

- [ ] **Step 8: Run both focused test files**

Run: `pnpm test:unit src/lib/words/session.test.ts src/lib/words/scheduler.test.ts`
Expected: PASS for the new queue and grading assertions.

### Task 2: Wire learn/review pages to the unified task pool

**Files:**
- Modify: `apps/web/src/app/words/learn/[bookId]/page.tsx`
- Modify: `apps/web/src/app/words/review/page.tsx`
- Modify: `apps/web/src/components/words/review-buttons.tsx`
- Modify: `apps/web/vitest.config.ts`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/web/src/components/words/review-buttons.test.tsx`

- [ ] **Step 1: Install `jsdom` for `@edunexus/web` and update Vitest discovery to include `src/**/*.test.{ts,tsx}`**

Run: `pnpm --filter @edunexus/web add -D jsdom`
Expected: `apps/web/package.json` and `pnpm-lock.yaml` update successfully.

- [ ] **Step 2: Update `apps/web/vitest.config.ts` so new component tests are discovered**

```ts
include: ["src/**/*.test.{ts,tsx}"],
```

- [ ] **Step 3: Write the failing `ReviewButtons` tests for four-grade callbacks and guarded arrow shortcuts**

```tsx
// @vitest-environment jsdom
it("emits each answer grade", () => {
  render(<ReviewButtons onGrade={onGrade} />);
  fireEvent.click(screen.getByRole("button", { name: /再想想/i }));
  fireEvent.click(screen.getByRole("button", { name: /较难/i }));
  fireEvent.click(screen.getByRole("button", { name: /认识/i }));
  fireEvent.click(screen.getByRole("button", { name: /很熟/i }));
  expect(onGrade.mock.calls.map(([grade]) => grade)).toEqual(["again", "hard", "good", "easy"]);
});
```

- [ ] **Step 2: Run the `ReviewButtons` tests to verify they fail**

Run: `pnpm test:unit src/components/words/review-buttons.test.tsx`
Expected: FAIL because the component still exposes `onKnow` / `onDontKnow` and unguarded key handlers.

- [ ] **Step 4: Keep `updateWordStatus()` temporarily backward-compatible during the caller migration**

```ts
export async function updateWordStatus(
  storage: StatusStorage,
  bookId: string,
  wordId: string,
  grade: boolean | WordAnswerGrade,
  today: string
) {
  const normalizedGrade = typeof grade === "boolean" ? (grade ? "good" : "again") : grade;
}
```

- [ ] **Step 5: Replace binary callbacks in page components with graded callbacks**

```ts
<ReviewButtons
  onGrade={(grade) => void moveNext(grade)}
  disabled={submitting || !currentWord}
/>
```

- [ ] **Step 6: Add explicit loading state before queue resolution**

```ts
const [loading, setLoading] = useState(true);
```

- [ ] **Step 7: Remove `buildLearningQueue()` duplicate-padding behavior**

```ts
const queue = bookWords;
```

- [ ] **Step 8: Rebuild the review page from `selectReviewWordIds()`; keep `/words/review` due-only while learn uses `selectSessionWordIds()`**

- [ ] **Step 9: Run targeted lint for the modified page and button files**

Run: `pnpm --filter @edunexus/web exec eslint src/app/words/learn/[bookId]/page.tsx src/app/words/review/page.tsx src/components/words/review-buttons.tsx --max-warnings=0`
Expected: PASS for the targeted files.

- [ ] **Step 10: Run typecheck before committing the caller updates**

Run: `pnpm typecheck`
Expected: PASS with no type errors from words pages or `ReviewButtons` props.

- [ ] **Step 11: Seed one due `LearningRecord` in local data before manual browser verification**

Run: use the browser devtools console or a one-off script to create at least one record whose `nextReviewDate <= today`
Expected: `/words/review` has a real due queue to validate.

- [ ] **Step 12: Manually verify the core flow in the browser**

Run: `pnpm dev`
Expected: learn page shows a loading state first, review page no longer flashes empty, there is at least one due review item to advance, and all answer buttons advance the session.

- [ ] **Step 13: Commit queue-wiring changes**

```bash
git add apps/web/src/app/words/learn/[bookId]/page.tsx apps/web/src/app/words/review/page.tsx apps/web/src/components/words/review-buttons.tsx apps/web/src/components/words/review-buttons.test.tsx apps/web/src/lib/words/types.ts apps/web/src/lib/words/session.ts apps/web/src/lib/words/scheduler.ts apps/web/src/lib/words/session.test.ts apps/web/src/lib/words/scheduler.test.ts apps/web/vitest.config.ts apps/web/package.json pnpm-lock.yaml
git commit -m "fix: align words pages with unified task queue"
```

## Chunk 2: P0 Metrics And Interaction Hardening

### Task 3: Correct daily metrics and dashboard progress

**Files:**
- Modify: `apps/web/src/lib/words/types.ts`
- Modify: `apps/web/src/lib/words/scheduler.ts`
- Modify: `apps/web/src/lib/words/storage.ts`
- Modify: `apps/web/src/lib/words/stats.ts`
- Modify: `apps/web/src/lib/words/integration.ts`
- Modify: `apps/web/src/app/words/page.tsx`
- Modify: `apps/web/src/app/words/learn/[bookId]/page.tsx`
- Modify: `apps/web/src/app/words/review/page.tsx`
- Test: `apps/web/src/lib/words/scheduler.test.ts`
- Test: `apps/web/src/lib/words/storage.test.ts`
- Test: `apps/web/src/lib/words/stats.test.ts`
- Test: `apps/web/src/lib/words/integration.test.ts`

- [ ] **Step 1: Write failing tests for persisted study type, daily summary shape, and goal syncing**

```ts
it("persists study type and grade on updateWordStatus", async () => {
  await updateWordStatus(storage, "cet4", "w1", "again", "2026-03-17");
  expect(saved[0].lastStudyType).toBe("relearn");
  expect(saved[0].lastGrade).toBe("again");
});

it("counts today's learn, review, and relearn events without double-counting", async () => {
  const stats = await memory.getLearningStats("2026-03-17");
  expect(stats.dueToday).toBe(2);
  expect(calculateTodayProgress(events, "2026-03-17")).toEqual({
    learned: 1,
    reviewed: 2,
    relearned: 1,
    accuracy: 2 / 3,
  });
});

it("syncs goal progress from summary totals instead of lastReviewedAt counts", () => {
  expect(getCompletedCountFromSummary({ learned: 1, reviewed: 2, relearned: 1 })).toBe(4);
});
```

- [ ] **Step 2: Run the metrics tests to verify they fail**

Run: `pnpm test:unit src/lib/words/scheduler.test.ts src/lib/words/storage.test.ts src/lib/words/stats.test.ts src/lib/words/integration.test.ts`
Expected: FAIL because the write path does not persist study-type metadata and the summary logic still double-counts new learning.

- [ ] **Step 3: Extend the write path and event model to store explicit study-type metadata**

```ts
type StudyEventType = "learn" | "review" | "relearn";

type StudyEvent = {
  date: string;
  type: StudyEventType;
  grade: WordAnswerGrade;
  success: boolean;
};
```

```ts
type LearningRecord = {
  // existing fields
  lastStudyType?: StudyEventType;
  lastGrade?: WordAnswerGrade;
};
```

- [ ] **Step 4: Replace hard-coded dashboard trends with real or omitted values**

```ts
<StatsCard icon={BookOpen} label="今日学习" value={todaySummary.learned} />
```

- [ ] **Step 5: Update goal syncing to use the new completed-count source**

```ts
const completedWords = todaySummary.learned + todaySummary.reviewed + todaySummary.relearned;
syncWordsProgressToGoal(today, targetWords, completedWords);
```

- [ ] **Step 6: Replace page-local completed-count calculations in learn/review with the same summary helper used by the dashboard**

- [ ] **Step 7: Run focused metrics tests again**

Run: `pnpm test:unit src/lib/words/scheduler.test.ts src/lib/words/storage.test.ts src/lib/words/stats.test.ts src/lib/words/integration.test.ts`
Expected: PASS with explicit separation of learned vs reviewed actions.

- [ ] **Step 8: Run typecheck for shared words type changes**

Run: `pnpm typecheck`
Expected: PASS with no type errors from `LearningRecord` / `StudyEvent` changes or dashboard/learn/review callers.

- [ ] **Step 9: Commit metrics changes**

```bash
git add apps/web/src/lib/words/types.ts apps/web/src/lib/words/scheduler.ts apps/web/src/lib/words/storage.ts apps/web/src/lib/words/stats.ts apps/web/src/lib/words/integration.ts apps/web/src/app/words/page.tsx apps/web/src/app/words/learn/[bookId]/page.tsx apps/web/src/app/words/review/page.tsx apps/web/src/lib/words/scheduler.test.ts apps/web/src/lib/words/storage.test.ts apps/web/src/lib/words/stats.test.ts apps/web/src/lib/words/integration.test.ts
git commit -m "fix: correct words daily metrics and dashboard progress"
```

### Task 4: Fix reveal-state carry-over and keyboard misfires

**Files:**
- Modify: `apps/web/src/components/words/word-card.tsx`
- Modify: `apps/web/src/components/words/review-buttons.tsx`
- Modify: `apps/web/vitest.config.ts`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/web/src/components/words/word-card.test.tsx`
- Modify: `apps/web/src/components/words/review-buttons.test.tsx`

- [ ] **Step 1: If Task 2 did not already do it, add `jsdom` and update Vitest discovery for `.test.tsx` files**

Run: `pnpm --filter @edunexus/web add -D jsdom`
Expected: dependency is present in `apps/web/package.json`, and `apps/web/vitest.config.ts` includes `src/**/*.test.{ts,tsx}`.

- [ ] **Step 2: Write the failing `WordCard` reveal-reset test**

```tsx
// @vitest-environment jsdom
it("resets definition visibility when the word changes", async () => {
  const { rerender, queryByText, getByRole } = render(<WordCard word={wordA} showDefinition={false} />);
  fireEvent.click(getByRole("button", { name: /释义/i }));
  expect(queryByText(wordA.definition)).toBeTruthy();
  rerender(<WordCard word={wordB} showDefinition={false} />);
  expect(queryByText(wordB.definition)).toBeNull();
});
```

- [ ] **Step 3: Write the failing keyboard-safety tests**

```tsx
// @vitest-environment jsdom
it("ignores arrow shortcuts while an input is focused", async () => {
  render(<><input aria-label="draft" /><ReviewButtons onGrade={onGrade} /></>);
  fireEvent.focus(screen.getByLabelText("draft"));
  fireEvent.keyDown(screen.getByLabelText("draft"), { key: "ArrowRight" });
  expect(onGrade).not.toHaveBeenCalled();
});

it("ignores composing and repeated key events", () => {
  render(<ReviewButtons onGrade={onGrade} />);
  fireEvent.keyDown(window, { key: "ArrowRight", isComposing: true });
  fireEvent.keyDown(window, { key: "ArrowRight", repeat: true });
  expect(onGrade).not.toHaveBeenCalled();
});
```

- [ ] **Step 4: Run the component tests to verify they fail**

Run: `pnpm test:unit src/components/words/word-card.test.tsx src/components/words/review-buttons.test.tsx`
Expected: FAIL because state is not reset and unsafe keydown events are still accepted.

- [ ] **Step 5: Implement controlled resets and safe keyboard guards**

```ts
useEffect(() => {
  setDefinitionVisible(showDefinition);
  setExampleVisible(showExample);
}, [word.id, showDefinition, showExample]);
```

```ts
if (event.isComposing || event.repeat) return;
if (target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
```

- [ ] **Step 6: Expand `ReviewButtons` UI to four answer grades**

Keep the API and labels aligned with the tests introduced in Task 2 so the button contract stays stable.

```tsx
<Button onClick={() => onGrade("again")}>再想想</Button>
<Button onClick={() => onGrade("hard")}>较难</Button>
<Button onClick={() => onGrade("good")}>认识</Button>
<Button onClick={() => onGrade("easy")}>很熟</Button>
```

- [ ] **Step 7: Run the component tests again**

Run: `pnpm test:unit src/components/words/word-card.test.tsx src/components/words/review-buttons.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit interaction hardening**

```bash
git add apps/web/src/components/words/word-card.tsx apps/web/src/components/words/review-buttons.tsx apps/web/src/components/words/word-card.test.tsx apps/web/src/components/words/review-buttons.test.tsx apps/web/vitest.config.ts apps/web/package.json pnpm-lock.yaml
git commit -m "fix: harden words card state and keyboard controls"
```

## Chunk 3: P1 Date Consistency And Recovery

### Task 5: Unify `today` handling and streak rendering

**Files:**
- Modify: `apps/web/src/lib/words/date.ts`
- Create: `apps/web/src/lib/words/date.test.ts`
- Modify: `apps/web/src/app/words/page.tsx`
- Modify: `apps/web/src/app/words/review/page.tsx`
- Modify: `apps/web/src/app/words/learn/[bookId]/page.tsx`
- Modify: `apps/web/src/components/words/streak-calendar.tsx`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Write the failing date subscription test**

```ts
// @vitest-environment jsdom
it("notifies listeners when the debug today key changes", () => {
  const onChange = vi.fn();
  const cleanup = listenForWordsTodayChange(onChange);
  window.dispatchEvent(new StorageEvent("storage", { key: getWordsDebugTodayKey() }));
  expect(onChange).toHaveBeenCalledTimes(1);
  cleanup();
});
```

- [ ] **Step 2: Run the date test to verify it fails**

Run: `pnpm test:unit src/lib/words/date.test.ts`
Expected: FAIL because the shared subscription helper does not exist yet.

- [ ] **Step 3: Add one reusable words-today subscription helper in `date.ts`**

```ts
export function listenForWordsTodayChange(onChange: () => void): () => void {
  const handler = (event: StorageEvent) => {
    if (event.key === getWordsDebugTodayKey()) onChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}
```

- [ ] **Step 4: If `jsdom` is not already installed from the earlier chunk, add it now for DOM-backed date tests**

Run: `pnpm --filter @edunexus/web add -D jsdom`
Expected: dependency is present in `apps/web/package.json`.

- [ ] **Step 5: Add reactive `today` state to `/words`, `/words/learn/[bookId]`, and `/words/review`; subscribe with `listenForWordsTodayChange(() => setToday(getWordsToday()))` and reload each page when `today` changes**

Run: `pnpm lint src/lib/words/date.ts src/app/words/page.tsx src/app/words/review/page.tsx src/app/words/learn/[bookId]/page.tsx src/components/words/streak-calendar.tsx`
Expected: PASS with correct hook dependencies.

- [ ] **Step 6: Re-run the date subscription test**

Run: `pnpm test:unit src/lib/words/date.test.ts`
Expected: PASS.

- [ ] **Step 7: Inject `today` into the streak calendar instead of calling `new Date()` inside the component**

```tsx
<StreakCalendar activeDates={activeDates} today={today} />
```

- [ ] **Step 8: Manually verify cross-page today consistency**

Run: use the debug today key in localStorage and refresh `/words`, `/words/learn/[bookId]`, `/words/review`
Expected: dashboard due/streak data, learn queue composition, and review queue length or empty state all reflect the same debug today value.

- [ ] **Step 9: Commit today-consistency cleanup**

```bash
git add apps/web/src/lib/words/date.ts apps/web/src/lib/words/date.test.ts apps/web/src/app/words/page.tsx apps/web/src/app/words/review/page.tsx apps/web/src/app/words/learn/[bookId]/page.tsx apps/web/src/components/words/streak-calendar.tsx apps/web/package.json pnpm-lock.yaml
git commit -m "fix: unify words today handling across pages"
```

### Task 6: Add bootstrap integrity checks and recovery tests

**Files:**
- Modify: `apps/web/src/lib/words/bootstrap.ts`
- Create: `apps/web/src/lib/words/bootstrap.test.ts`
- Optionally modify: `apps/web/src/lib/words/storage.ts`

- [ ] **Step 1: Write the failing bootstrap repair tests**

```ts
it("re-seeds local words data when the version key exists but the store is empty", async () => {
  const storage = createWordsStorage({ mode: "memory" });
  const readVersion = () => "kylebing-cet4-cet6-v1";
  const writeVersion = vi.fn();
  await ensureWordsBootstrap({ storage, readVersion, writeVersion });
  expect(await storage.getWordBooks()).not.toHaveLength(0);
});

it("re-seeds local words data when books exist but stored words are missing", async () => {
  const storage = createWordsStorage({ mode: "memory" });
  const readVersion = () => "kylebing-cet4-cet6-v1";
  const writeVersion = vi.fn();
  expect(await storage.getWordBooks()).not.toHaveLength(0);
  expect(await storage.getAllWords()).toHaveLength(0);
  await ensureWordsBootstrap({ storage, readVersion, writeVersion });
  expect(await storage.getAllWords()).not.toHaveLength(0);
});
```

- [ ] **Step 2: Run the bootstrap test to verify it fails**

Run: `pnpm test:unit src/lib/words/bootstrap.test.ts`
Expected: FAIL because bootstrap currently trusts the version key alone.

- [ ] **Step 3: Extract injectable bootstrap dependencies and implement completeness checks before early-returning**

```ts
type BootstrapDeps = {
  storage: WordsStorage;
  readVersion: () => string | null;
  writeVersion: (value: string) => void;
};

const books = await storage.getWordBooks();
const words = await storage.getAllWords();
if (currentVersion === WORDS_DATA_VERSION && isCompleteSeed(books, words, LOCAL_WORD_BOOK_SOURCES)) return;
```

- [ ] **Step 4: Guard against duplicate inserts while re-seeding and run the focused repair tests**

Run: `pnpm test:unit src/lib/words/bootstrap.test.ts src/lib/words/storage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit recovery hardening**

```bash
git add apps/web/src/lib/words/bootstrap.ts apps/web/src/lib/words/bootstrap.test.ts apps/web/src/lib/words/storage.test.ts
git commit -m "fix: harden words bootstrap recovery"
```

### Task 7: Add lightweight study-plan settings

**Files:**
- Modify: `apps/web/src/lib/words/types.ts`
- Modify: `apps/web/src/lib/words/storage.ts`
- Modify: `apps/web/src/lib/words/session.ts`
- Modify: `apps/web/src/lib/words/session.test.ts`
- Modify: `apps/web/src/app/words/page.tsx`
- Modify: `apps/web/src/app/words/learn/[bookId]/page.tsx`
- Modify: `apps/web/src/app/words/review/page.tsx`

- [ ] **Step 1: Write failing settings storage and queue-planning tests**

```ts
it("returns default study-plan settings when none are stored", async () => {
  expect(await storage.getWordsPlanSettings()).toEqual({
    dailyNewLimit: 20,
    reviewFirst: true,
    defaultRevealMode: "hidden",
  });
});

it("respects dailyNewLimit and reviewFirst when selecting a session queue", () => {
  expect(selectSessionWordIds(words, records, "2026-03-17", settings.dailyNewLimit, settings.reviewFirst)).toEqual(expectedIds);
});
```

- [ ] **Step 2: Run the settings tests to verify they fail**

Run: `pnpm test:unit src/lib/words/storage.test.ts src/lib/words/session.test.ts`
Expected: FAIL because settings helpers and queue-setting support do not exist yet.

- [ ] **Step 3: Introduce a minimal persisted settings type**

```ts
type WordsPlanSettings = {
  dailyNewLimit: number;
  reviewFirst: boolean;
  defaultRevealMode: "hidden" | "definition";
};
```

- [ ] **Step 4: Add storage read/write helpers with safe defaults**

- [ ] **Step 5: Thread `WordsPlanSettings` into `selectSessionWordIds()` and review-priority logic**

- [ ] **Step 6: Surface settings on the dashboard and feed them into learn/review page loading**

- [ ] **Step 7: Re-run the focused storage and session tests**

Run: `pnpm test:unit src/lib/words/storage.test.ts src/lib/words/session.test.ts`
Expected: PASS.

```tsx
<Select value={String(settings.dailyNewLimit)} onValueChange={updateLimit} />
```

- [ ] **Step 8: Manually verify that changing the daily limit changes the next learn-session queue size**

Run: `pnpm dev`
Expected: dashboard setting updates the learn queue without breaking review priority.

- [ ] **Step 9: Commit settings support**

```bash
git add apps/web/src/lib/words/types.ts apps/web/src/lib/words/storage.ts apps/web/src/lib/words/session.ts apps/web/src/lib/words/session.test.ts apps/web/src/app/words/page.tsx apps/web/src/app/words/learn/[bookId]/page.tsx apps/web/src/app/words/review/page.tsx
git commit -m "feat: add lightweight words study plan settings"
```

## Final Verification

- [ ] Run focused words unit tests:

```bash
pnpm test:unit src/lib/words/date.test.ts src/lib/words/session.test.ts src/lib/words/scheduler.test.ts src/lib/words/storage.test.ts src/lib/words/stats.test.ts src/lib/words/integration.test.ts src/lib/words/bootstrap.test.ts src/components/words/word-card.test.tsx src/components/words/review-buttons.test.tsx
```

Expected: PASS for all targeted words tests.

- [ ] Run words-specific lint checks:

```bash
pnpm --filter @edunexus/web exec eslint src/app/words/page.tsx src/app/words/learn/[bookId]/page.tsx src/app/words/review/page.tsx src/components/words/word-card.tsx src/components/words/review-buttons.tsx src/components/words/streak-calendar.tsx src/lib/words --max-warnings=0
```

Expected: PASS with no new words-module warnings.

- [ ] Run full typecheck before handoff:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] Manual smoke checklist:
  - Open `/words` and confirm dashboard counts look plausible.
  - Start a learn session and verify due items appear before new items.
  - Use each grade button once and confirm the session advances correctly.
  - Toggle hidden/reveal behavior and verify state resets on the next word.
  - Open `/words/review` and verify no false empty state appears during load.
  - Change debug today and verify dashboard/review/streak calendar stay aligned.

- [ ] If all checks pass, stop and request code review with superpowers:requesting-code-review before merge or PR creation.

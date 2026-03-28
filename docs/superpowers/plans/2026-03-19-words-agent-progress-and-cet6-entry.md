# Words Agent Progress And CET6 Entry Task

> **For coder agent:** implement on the current working branch only. Keep changes focused on the `words` domain and agent integration. Do not refactor unrelated workspace/assistant code.

## Goal

Deliver two improvements:

1. Make the agent able to answer requests like `向我汇报我的英语学习进度` using real authenticated `words` data, with a stronger progress summary covering a recent period instead of only today's snapshot.
2. Ensure the words learning entry clearly supports both `CET-4` and `CET-6`, not only `CET-4`.

---

## Current Findings

### 1) Agent progress capability is too shallow

Relevant files:

- `apps/web/src/lib/server/words-service.ts`
- `apps/web/src/lib/agent/tools-real.ts`
- `apps/web/src/lib/agent/learning-agent.ts`

Current behavior:

- `query_words_progress` already exists, but it only returns a lightweight current snapshot:
  - `streakDays`
  - `dueToday`
  - `learnedToday`
  - `reviewedToday`
  - `relearnedToday`
  - `learnedWords`
  - `masteredWords`
  - `totalWords`
  - partial `bookProgress`
- When users ask for a report like `向我汇报我的英语学习进度`, the agent does not reliably produce a “recent progress report” with trend-like metrics.
- There is no explicit summary for a recent period such as last 7 days / last 14 days.

### 2) CET6 data exists, but the learning entry experience is not explicit enough

Relevant files:

- `apps/web/src/data/words/index.ts`
- `apps/web/src/app/words/page.tsx`
- `apps/web/src/components/words/book-selector.tsx`
- `apps/web/src/lib/agent/tools-real.ts`

Current behavior:

- The local data source already includes both `cet4` and `cet6`.
- But the actual learning entry feels biased to `cet4`:
  - some route fallback logic still defaults to `cet4`
  - the dashboard action is too generic and does not visibly surface a parallel CET6 learning entry
  - the agent's learn recommendation also defaults to `cet4` when no stronger suggestion exists

---

## Task 1: Upgrade words progress summary for recent-period reporting

### Objective

Extend the server-side words progress summary so the agent can report:

- recent study data for a period (default last 7 days)
- total learned words
- average daily learned words
- current streak
- due today
- current book progress

### Suggested implementation direction

Modify `apps/web/src/lib/server/words-service.ts`.

Keep the existing `getWordsProgressSummary(userId, date?)`, but extend it with a recent-period block. Suggested shape:

```ts
type WordsRecentProgress = {
  rangeDays: number;
  startDate: string;
  endDate: string;
  activeDays: number;
  learnedWordsInRange: number;
  reviewedCountInRange: number;
  relearnedCountInRange: number;
  averageDailyLearnedWords: number;
};
```

Suggested rules:

- default range: last `7` days including `date`
- `learnedWordsInRange`:
  - count words whose `learnDate` falls inside the range
- `reviewedCountInRange`:
  - count records whose `lastReviewedAt` falls inside the range and whose `lastStudyType === "review"`
- `relearnedCountInRange`:
  - same idea for `lastStudyType === "relearn"`
- `activeDays`:
  - unique dates within the range from `learnDate` or `lastReviewedAt`
- `averageDailyLearnedWords`:
  - `learnedWordsInRange / rangeDays`
  - keep as number; round to 1 decimal if needed

Important:

- Keep user scoping strict: all calculations must use the authenticated `userId` only.
- Do not introduce a large analytics refactor.

### Acceptance

The summary returned from server can support sentences like:

- `最近7天你学习了 18 个新单词，平均每天 2.6 个。`
- `累计已学习 146 个单词。`
- `今天待复习 12 个，当前连续学习 5 天。`

---

## Task 2: Make the agent reliably answer English progress-report requests

### Objective

When the user says things like:

- `向我汇报我的英语学习进度`
- `我的英语学得怎么样`
- `最近一周我的单词学习情况`

the agent should call the words progress tool and answer with real user data.

### Suggested implementation direction

Modify:

- `apps/web/src/lib/agent/tools-real.ts`
- `apps/web/src/lib/agent/learning-agent.ts`

Required changes:

1. Extend `query_words_progress`
- allow an optional `rangeDays` input
- return the new recent-period stats from `getWordsProgressSummary`
- include a compact `report`-friendly payload, for example:

```json
{
  "date": "2026-03-19",
  "streakDays": 5,
  "dueToday": 12,
  "learnedWords": 146,
  "masteredWords": 48,
  "recentProgress": {
    "rangeDays": 7,
    "learnedWordsInRange": 18,
    "averageDailyLearnedWords": 2.6,
    "activeDays": 6
  },
  "topBooks": [...]
}
```

2. Strengthen prompt guidance
- In `learning-agent.ts`, add explicit instruction that requests about:
  - English progress
  - recent vocabulary learning
  - words study report
  must call `query_words_progress`
- The final answer should summarize actual stats in natural language instead of only returning route guidance.

3. Keep unauthenticated behavior safe
- if there is no `userId`, the tool must still fail safely and not fabricate progress

### Acceptance

For an authenticated user with words records, asking `向我汇报我的英语学习进度` should produce a response containing at least:

- recent-period learning stats
- total learned words
- average daily learned words
- current streak
- due today

And those values must come from the authenticated user's own data.

---

## Task 3: Add explicit CET6 learning entry

### Objective

Make it obvious and usable that the user can start learning from both `CET-4` and `CET-6`.

### Suggested implementation direction

Primary file:

- `apps/web/src/app/words/page.tsx`

Maybe involved:

- `apps/web/src/components/words/book-selector.tsx`
- `apps/web/src/lib/agent/tools-real.ts`

Required behavior:

1. Dashboard entry
- In addition to the current generic `快速开始学习`, make sure there are clear book-specific learning entries:
  - `开始学习 CET-4`
  - `开始学习 CET-6`
- Keep the generic selected-book entry if it is still useful, but the user must be able to directly enter CET6 learning without extra guessing.

2. Route target
- CET4 button -> `/words/learn/cet4`
- CET6 button -> `/words/learn/cet6`

3. Agent learn recommendation
- In `recommend_words_action`, avoid blindly defaulting to `cet4` when the user explicitly mentions `cet6` / `六级`.
- If the user message contains:
  - `cet6`
  - `CET-6`
  - `六级`
  then prefer `/words/learn/cet6`
- Similarly, explicit `cet4` / `四级` should prefer `/words/learn/cet4`

### Acceptance

- Dashboard visibly exposes CET4 and CET6 learning entry points.
- Clicking CET6 starts `/words/learn/cet6`.
- Asking the agent `带我学 CET6 单词` returns or recommends `/words/learn/cet6`.

---

## Task 4: Focused Tests

### Add / update tests for agent progress

Suggested files:

- update `apps/web/src/lib/agent/tools-real.words.test.ts`
- add server summary tests if practical, e.g. a new words-service test

Minimum test coverage:

1. `query_words_progress` includes recent-period fields
- verifies `rangeDays`
- verifies `learnedWordsInRange`
- verifies `averageDailyLearnedWords`

2. per-user isolation
- user A and user B receive different progress summaries

3. safe unauthenticated behavior
- still returns safe error payload instead of fake stats

4. CET6 route recommendation
- `recommend_words_action` with `userMessage: "带我学 CET6 单词"` returns `/words/learn/cet6`

### UI checks

If there are no existing dashboard tests, lightweight manual verification is acceptable for the CET6 entry buttons.

---

## Implementation Constraints

- Keep the work minimal and local to `words` + agent integration.
- Do not redesign the whole dashboard layout.
- Do not replace current words persistence mode in this task.
- Do not add unrelated assistant action protocols.

---

## Verification Commands

Run the smallest relevant checks and report exact commands used, ideally:

```bash
pnpm --filter @edunexus/web exec vitest run src/lib/agent/tools-real.words.test.ts
pnpm --filter @edunexus/web exec vitest run <any new words-service test file>
pnpm --filter @edunexus/web exec eslint "src/app/words/page.tsx" src/lib/agent/tools-real.ts src/lib/agent/learning-agent.ts src/lib/server/words-service.ts
pnpm --filter @edunexus/web typecheck
```

---

## Final Report Expectations

- List changed files and why
- Show what extra fields were added to the words progress summary
- Explain how the agent now answers recent English progress requests
- Confirm how CET6 entry is exposed in the dashboard and route recommendation
- Include exact verification commands and results

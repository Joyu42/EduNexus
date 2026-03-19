# Words Agent Alignment And CET6 Fix Task

> For coder agent: first fix the agent-to-words alignment problems, then make the words entry experience explicit for CET4 and CET6. Keep changes local to `words`, `agent`, and `AI context` files. Do not refactor unrelated workspace/KB modules.

## Goal

Fix two real user-facing problems confirmed by manual testing:

1. The agent is still weakly connected to the user's real English-learning data. Asking `向我汇报我的英语学习进度` does not reliably produce a real words-progress report.
2. The agent and learning entry experience still feel CET4-only. Users need a clear CET6 entry, and generic words-learning guidance should not collapse to CET4 by default.

---

## Confirmed Findings

### Finding 1: Global assistant is overriding the richer default agent prompt

Relevant files:

- `apps/web/src/components/global/global-ai-assistant.tsx`
- `apps/web/src/lib/ai/context-adapter.ts`
- `apps/web/src/lib/agent/learning-agent.ts`

What is happening now:

- `global-ai-assistant.tsx` always sends `config.systemPrompt = context.systemPrompt`.
- In `learning-agent.ts`, the agent uses `customSystemPrompt || defaultSystemPrompt`.
- This means the generic page-context prompt from `context-adapter.ts` replaces the richer default prompt that contains words-tool instructions.
- As a result, even though `query_words_progress` and `recommend_words_action` exist, the model often never gets the right system-level instruction to call them.

Why this matters:

- This is likely the main reason the user asks for English progress and the agent still answers vaguely or fails to fetch real data.

### Finding 2: `/words` has no dedicated AI context

Relevant file:

- `apps/web/src/lib/ai/context-adapter.ts`

What is happening now:

- `getAIContext(...)` has special behavior for `/kb`, `/workspace`, and `/practice`.
- `/words` falls into the generic fallback context:
  - title: `AI 助手`
  - prompt: `你是一个友好的 AI 助手...`
- So on the words dashboard, the assistant is not primed as an English-learning assistant.

Why this matters:

- The words domain does not get dedicated prompts or quick actions.
- User intent like `汇报我的英语学习进度` or `带我学 CET6 单词` is not strongly signaled.

### Finding 3: Generic learn routing still defaults to CET4 too early

Relevant files:

- `apps/web/src/lib/agent/tools-real.ts`
- `apps/web/src/app/words/page.tsx`

What is happening now:

- `recommend_words_action` already detects explicit `cet6/cet-6/六级`.
- But for general learning intent, it still falls back to:

```ts
preferredBookId || summary.suggestedBookId || "cet4"
```

- `summary.suggestedBookId` is derived from sorted book progress; with neutral data this can still bias toward the first book in local catalog order, which is `cet4`.
- `words/page.tsx` still centers the main learning CTA on `selectedBookId || books[0]?.id || "cet4"`, and initial selected book comes from `loadedBooks[0]`.

Why this matters:

- Users experience the system as CET4-first even when they did not ask for CET4.
- Generic `我想学英语单词` should usually land on `/words` dashboard or explicit CET4/CET6 choices, not silently choose CET4.

### Finding 4: Agent date basis and UI date basis can diverge

Relevant files:

- `apps/web/src/lib/words/date.ts`
- `apps/web/src/app/words/page.tsx`
- `apps/web/src/lib/server/words-service.ts`
- `apps/web/src/lib/agent/tools-real.ts`

What is happening now:

- The words UI uses `getWordsToday()` from `date.ts`, which supports local debug override via:

```js
localStorage.setItem("edunexus_words_debug_today", "YYYY-MM-DD")
```

- The server-side agent summary uses `utcToday()` unless a date is explicitly passed into the tool.
- The assistant currently does not automatically align its date with the words UI's debug/current client date.

Why this matters:

- Even if the data source is the same database, agent answers can still look “wrong” compared with what the user sees in the words page.
- This is especially visible during debug/day-shift testing.

---

## Required Fix Direction

### Task 1: Restore words-tool instructions into the actual prompt path

Primary target:

- `apps/web/src/components/global/global-ai-assistant.tsx`
- `apps/web/src/lib/agent/learning-agent.ts`
- `apps/web/src/lib/ai/context-adapter.ts`

Required outcome:

- The default agent tool-aware system prompt must not be accidentally replaced by a weaker page prompt.

Preferred implementation options:

1. Best option:
- Stop passing `context.systemPrompt` as a full override.
- Instead pass it as contextual supplement, for example `contextPrompt` / `pagePrompt`, and merge it inside `learning-agent.ts` with the default system prompt.

2. Acceptable option:
- Keep the current field but concatenate rather than replace, e.g.:
  - base agent system prompt
  - plus page-level context prompt

Acceptance:

- When asking `向我汇报我的英语学习进度`, the agent is clearly instructed to call `query_words_progress`.

### Task 2: Add dedicated `/words` AI context

Primary target:

- `apps/web/src/lib/ai/context-adapter.ts`

Required behavior:

- Add a `/words` branch before the generic fallback.
- The words AI context should explicitly support:
  - progress report
  - start CET4 learning
  - start CET6 learning
  - review today

Suggested quick actions:

- `汇报我的英语学习进度`
- `带我开始学习 CET4 单词`
- `带我开始学习 CET6 单词`
- `带我进入今日复习`

Acceptance:

- On `/words`, the assistant is visibly words-oriented rather than generic.

### Task 3: Make generic learning intent stop defaulting to CET4

Primary target:

- `apps/web/src/lib/agent/tools-real.ts`
- `apps/web/src/app/words/page.tsx`

Required behavior:

1. Agent routing
- If the user explicitly says `CET6 / cet6 / 六级`, route to `/words/learn/cet6`
- If the user explicitly says `CET4 / cet4 / 四级`, route to `/words/learn/cet4`
- If the user only says `学英语单词 / 我想背单词` without specifying a book:
  - do **not** silently default to CET4
  - prefer `/words`
  - or return a route recommendation that clearly asks the user to choose CET4 vs CET6

2. Dashboard entry
- `apps/web/src/app/words/page.tsx` must expose explicit book entry buttons:
  - `开始学习 CET-4`
  - `开始学习 CET-6`
- Keep the selected-book CTA only if it still adds value, but CET6 must be equally explicit.

Acceptance:

- Generic learn intent no longer feels CET4-only.
- CET6 has a visible first-class entry.

### Task 4: Align agent progress report with real user words data

Primary target:

- `apps/web/src/lib/server/words-service.ts`
- `apps/web/src/lib/agent/tools-real.ts`

Required checks and fixes:

1. Keep user scope strict
- Ensure `query_words_progress` always uses authenticated `userId`.
- Verify tool output changes between User A and User B.

2. Expose report-ready fields clearly
- Return a compact report block that the model can read easily, including:
  - recent range (`rangeDays`, `startDate`, `endDate`)
  - `learnedWordsInRange`
  - `averageDailyLearnedWords`
  - `activeDays`
  - `learnedWords` total
  - `masteredWords`
  - `dueToday`
  - `streakDays`

3. Improve date alignment
- Add a small, safe mechanism so agent progress queries can align with the words page date basis when needed.
- Minimum acceptable implementation:
  - allow caller to pass `date`
  - ensure tests cover date-specific querying
- Better implementation if easy:
  - pass words-page current date/debug date from client request context into the assistant request when the user is on `/words`

Acceptance:

- Asking `向我汇报我的英语学习进度` returns a response grounded in real words records.
- During date-specific testing, the agent can be made consistent with the words page date basis.

---

## Suggested Execution Order

1. Fix prompt override path
2. Add `/words` AI context
3. Fix generic learn routing and add explicit CET4/CET6 dashboard buttons
4. Tighten words progress tool/report shape and date alignment
5. Add focused tests and verify manually

---

## Focused Tests To Add Or Update

### Agent / tools

Update or add tests around:

- `apps/web/src/lib/agent/tools-real.words.test.ts`

Must cover:

1. explicit CET6 request -> `/words/learn/cet6`
2. explicit CET4 request -> `/words/learn/cet4`
3. generic learn request -> not blindly `/words/learn/cet4`
4. progress query returns recent report fields
5. different users get different summaries
6. unauthenticated case stays safe

### Server summary

Update or add:

- `apps/web/src/lib/server/words-service.test.ts`

Must cover:

1. date-specific progress query
2. recent-range fields correctness
3. user scoping correctness

### Optional UI check

If there is no page test, manual verification is acceptable for:

- `/words` shows explicit CET4/CET6 buttons
- clicking CET6 enters `/words/learn/cet6`

---

## Manual Verification Scenarios

1. User A has words records, User B has different words records
- ask: `向我汇报我的英语学习进度`
- A sees A's numbers
- B sees B's numbers

2. On `/words`
- assistant quick actions include words-specific options

3. Ask:
- `带我学 CET6 单词`
- expected route recommendation: `/words/learn/cet6`

4. Ask:
- `我想学英语单词`
- expected: dashboard route `/words` or explicit choice guidance, not silent CET4 default

5. Dashboard
- visible buttons for `CET-4` and `CET-6`

---

## Risks

- Highest risk: only fixing the tool logic but forgetting the prompt override path; then tools still exist but agent still will not call them reliably.
- Medium risk: date mismatch remains confusing if only server `today` is used while UI uses debug date override.
- Low risk: adding CET6 buttons without changing generic learn routing still leaves the assistant feeling CET4-biased.

---

## Verification Commands

Run the smallest relevant set and report exact commands used:

```bash
pnpm --filter @edunexus/web exec vitest run src/lib/agent/tools-real.words.test.ts src/lib/server/words-service.test.ts
pnpm --filter @edunexus/web exec eslint src/components/global/global-ai-assistant.tsx src/lib/ai/context-adapter.ts src/lib/agent/tools-real.ts src/lib/agent/learning-agent.ts "src/app/words/page.tsx"
pnpm --filter @edunexus/web typecheck
```

---

## Final Report Expectations

- List changed files and why
- State how the prompt override problem was fixed
- State how `/words` got dedicated AI context
- State how generic learn routing no longer defaults to CET4
- State how user-scoped words progress reporting was verified
- Include exact verification commands and results

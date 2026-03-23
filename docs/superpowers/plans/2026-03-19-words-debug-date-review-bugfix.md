# Words Debug Date / Review Bugfix Task

## Goal

Fix two user-visible issues in the `words` module without introducing a large refactor:

1. After setting

```js
localStorage.setItem("edunexus_words_debug_today", "2026-03-20");
location.reload();
```

the dashboard may show `连续学习 0 天`, but if the user studied on the previous day and has not broken the streak, it should still show an active streak.

2. On the next day, the dashboard/review page may show no due review words, but users expect at least the words learned yesterday to enter review.

Important: keep the fix minimal. Do not switch the whole `words` module from local storage to server APIs in this task.

## Scope

- In scope:
  - `apps/web/src/lib/words/stats.ts`
  - `apps/web/src/lib/words/storage.ts`
  - `apps/web/src/lib/words/scheduler.ts`
  - tests under `apps/web/src/lib/words/*.test.ts`
  - if needed, tiny read-side adjustments in `apps/web/src/app/words/page.tsx`
- Out of scope:
  - migrating `words` to Prisma/server persistence
  - redesigning the whole spaced repetition algorithm
  - changing unrelated auth/database behavior

## Current Findings

### 1) Streak logic is too fragile for debug-day and legacy records

Relevant code:

- `apps/web/src/lib/words/stats.ts`
- `apps/web/src/lib/words/storage.ts`
- `apps/web/src/app/words/page.tsx`

Observed problems:

- The dashboard streak is derived from `lastReviewedAt` only.
- If existing local records are missing `lastReviewedAt` (legacy local data / partial records), streak becomes `0` even when `learnDate` proves the user studied.
- Current streak behavior should represent an ongoing streak up to `today` or `yesterday`, not just an arbitrary historical streak anchored to the latest active date.

### 2) First successful learning schedules review too late

Relevant code:

- `apps/web/src/lib/words/scheduler.ts`
- `apps/web/src/lib/words/algorithm.ts`

Observed problem:

- For a brand-new word answered `good`, current logic writes `nextReviewDate = today + 3 days`.
- For `easy`, it writes `today + 5 days`.
- This means when the user moves debug day to the very next day, there are often no due review words.
- Product expectation here is simpler: new words learned today should be reviewable the next day.

## Minimal Fix Strategy

### A. Make streak calculation resilient

Implement the smallest safe fix:

1. Build active study dates from both fields:
   - prefer `lastReviewedAt`
   - fallback to `learnDate`
2. Treat streak as active when the latest study date is either:
   - `today`, or
   - exactly `yesterday`
3. If the latest study date is older than yesterday, streak should be `0`.

Suggested approach:

- add a helper in `stats.ts` or `storage.ts` to normalize active dates
- keep the function pure and testable

Expected examples:

- studied on `2026-03-19`, debug today `2026-03-20` -> streak `1`
- studied on `2026-03-18`, debug today `2026-03-20` -> streak `0`
- studied on `2026-03-18`, `2026-03-19`, debug today `2026-03-20` -> streak `2`

### B. Make first-day learning enter next-day review

Keep changes local to `scheduler.ts`.

Suggested minimal rule:

- if this is the first time seeing a word (`!current`):
  - `again` -> next review `today + 1 day`
  - `hard` -> next review `today + 1 day`
  - `good` -> next review `today + 1 day`
  - `easy` -> next review `today + 2 days` (or `1 day` if you want the simplest behavior)

Do not heavily rewrite `calculateNextReview` for old records. Keep later review intervals as-is unless required by tests.

### C. Add backward-compatible record normalization on read

In `storage.ts`, when reading stored learning records, tolerate older local records:

- if `lastReviewedAt` is missing, fallback to `learnDate`
- if `retentionScore` is missing, derive a conservative default from status/last grade if possible, otherwise use `0`
- if `nextReviewDate` is missing for an existing record, fallback to `learnDate`

This is mainly to avoid old IndexedDB data causing false `0-day streak` or empty due queues.

Keep this normalization minimal and read-side only if possible.

## Acceptance Criteria

### Repro acceptance

Given a user studied at least one word on `2026-03-19`:

```js
localStorage.setItem("edunexus_words_debug_today", "2026-03-20");
location.reload();
```

Expected:

- dashboard streak is not `0`; it reflects yesterday's active streak
- dashboard shows due review count > `0` for words that should be reviewed next day
- `/words/review` no longer shows an empty queue in this scenario

### Regression acceptance

- if the user skips more than one full day, streak resets to `0`
- same-day learning stats still work
- existing review flow still updates `status`, `nextReviewDate`, `reviewCount`, `lastReviewedAt`

## Required Tests

Add or update tests for at least these cases:

1. `stats.streak.test.ts`
   - yesterday active + today no study -> streak preserved
   - gap of 2+ days -> streak 0
   - fallback from `learnDate` when `lastReviewedAt` missing (if helper exposed at this layer)

2. `scheduler.test.ts`
   - first-time `good` answer schedules next review on next day
   - first-time `again` answer also remains due next day

3. `storage.test.ts`
   - legacy/incomplete record still contributes to streak/due stats after normalization

## Implementation Notes

- Prefer minimal edits over new abstractions.
- Do not change persistence mode in this task.
- Do not refactor words pages to server APIs.
- If a choice is needed, prioritize product behavior over preserving the current test that treats far-future debug dates as still part of streak.

## Suggested Verification

Run:

```bash
pnpm --filter @edunexus/web test:unit -- words
```

If the test filter does not work in this repo, run the closest equivalent unit test command and report the exact command used.

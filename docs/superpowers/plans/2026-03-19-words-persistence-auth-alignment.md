# Words Persistence Auth Alignment Prompt

> **For coder agent:** implement this plan on `merge-preview/auth-english-minimal`. Do not modify `auth-implementation`; only use it as the reference for database access and authenticated/unauthenticated handling.

**Goal:** Make the `words` module follow the same persistence and auth boundary model as the auth/database branch: authenticated users persist vocabulary progress per account, logged-out users cannot read or write progress, and logout/login switches no longer leak word progress across users or anonymous sessions.

**Reference Findings:**
- `auth-implementation` uses Prisma-backed user persistence in `apps/web/src/lib/server/user-service.ts`.
- User-scoped client storage is derived from `apps/web/src/lib/auth/client-user-cache.ts` and synchronized by `apps/web/src/components/providers/auth-sync-provider.tsx`.
- Current merge branch `apps/web/src/lib/words/storage.ts` uses a global IndexedDB database name `edunexus-words` with no user scope, so progress survives regardless of auth state.
- There is currently no `apps/web/src/app/api/words/**` route layer, so words progress is still purely browser-side.

---

## Step 1: Move words progress to server persistence

- Add Prisma models for words progress and settings in `prisma/schema.prisma`, following the same account ownership pattern already used by auth-backed data.
- Create `apps/web/src/app/api/words/**` route handlers for:
  - loading books/records/settings for the current session user
  - saving learning records / review schedules / plan settings
- Create server-side words service helpers in `apps/web/src/lib/server` or `apps/web/src/lib/words` that wrap Prisma access and require `session.user.id`.
- Keep the static wordbook content source as-is for now; only move user progress/state to the database.

**Acceptance:** authenticated requests persist per-user data in Postgres; unauthenticated API requests return `401` JSON, not browser-only fallback data.

## Step 2: Replace global IndexedDB progress with authenticated words data flow

- Refactor `apps/web/src/lib/words/storage.ts` so it no longer acts as the source of truth for user progress.
- Introduce a client API layer for words that reads/writes via `/api/words/*` and only uses local memory for transient UI state if needed.
- Update `apps/web/src/app/words/page.tsx`, `apps/web/src/app/words/learn/[bookId]/page.tsx`, and `apps/web/src/app/words/review/page.tsx` to match the auth branch UX pattern:
  - `status === 'loading'`: loading UI
  - `status === 'unauthenticated'`: `LoginPrompt`
  - `status === 'authenticated'`: fetch and mutate only the current user's words progress
- Remove or disable anonymous/shared persistence so logging out clears access to all words progress views.

**Acceptance:** without login, words pages show login prompts and no stored progress; after login, only the current user's progress appears.

## Step 3: Add migration, tests, and auth-state verification

- If needed, add a one-time migration path from legacy IndexedDB records into the authenticated server model, but only after login and only into the current user account.
- Add focused tests for:
  - unauthenticated words API returns `401`
  - authenticated save/load is isolated per user
  - logout -> login no longer reuses anonymous/global words progress
- Run targeted verification:
  - `pnpm --filter @edunexus/web typecheck`
  - targeted Vitest files for new words API/storage behavior
  - manual check: user A studies words, logout, user B/login page sees no A progress, login back as A restores A progress

**Acceptance:** words persistence is account-bound, survives browser refresh and re-login for the same user, and does not leak across logout or different users.

---

## Constraints

- Do not change `auth-implementation`; only inspect it with `git show` when needed.
- Reuse existing auth/session patterns from `apps/web/src/auth.ts`, `apps/web/src/components/providers/auth-sync-provider.tsx`, and authenticated page guards already used by `kb`, `graph`, `path`, and `goals`.
- Keep the implementation minimal: first persist user progress and settings; do not redesign the entire words content model in this task.

## Suggested Verification Notes For Final Report

- Files changed and why
- Prisma schema additions and new API endpoints
- Whether legacy IndexedDB migration was added
- Exact commands run
- Remaining risks, if any

# Words Calendar And Agent Integration Plan

> **For coder agent:** implement this on `merge-preview/auth-english-minimal`. Do not modify `auth-implementation`; only inspect it as the reference branch for agent-tool wiring, authenticated data access, and page-navigation behavior.

**Goal:**
- Improve the words learning calendar so users can see explicit dates, not only green activity blocks.
- Make the current merge branch's AI agent understand and act on the English vocabulary domain in the same spirit as the auth branch's goal/path-aware agent: it should route users into the right words pages when they ask to learn/review words, and it should answer questions about the current user's English learning progress by reading authenticated words data.

---

## Reference Findings From `auth-implementation`

- Global assistant UI sends requests to `apps/web/src/app/api/workspace/agent/chat/route.ts`.
- The chat route passes authenticated `userId` into `runAgentConversation(...)`.
- The agent implementation in `apps/web/src/lib/agent/learning-agent.ts` builds private context and tool access from authenticated user data.
- The tool layer in `apps/web/src/lib/agent/tools-real.ts` exposes user-scoped tools such as `query_learning_progress`, and those tools read per-user data before generating answers.
- The design principle to follow is: **agent capabilities come from authenticated server-side tools, not from hardcoded front-end heuristics alone**.

---

## Scope

- In scope:
  - words learning calendar date visibility and readability
  - agent routing for words learn/review/dashboard navigation
  - agent access to authenticated words progress/stats
  - minimal prompt/tool updates so the assistant can use the new capability reliably
- Out of scope:
  - redesigning the whole assistant UI
  - adding a brand new agent framework
  - changing `auth-implementation`
  - unrelated KB/path/graph refactors

---

## Task 1: Make the words calendar show explicit dates

**Problem:** `apps/web/src/components/words/streak-calendar.tsx` currently renders activity squares with only a `title={date}` tooltip. Users cannot directly see the calendar dates in the visible UI.

**Implementation target:**
- Upgrade `apps/web/src/components/words/streak-calendar.tsx` so each visible unit communicates the date directly in the rendered interface.
- Preserve the existing active/inactive heatmap signal, but add readable date affordances.

**Suggested implementation direction:**
- Keep the 7-column grid, but add a compact day label inside or below each cell.
- Prefer a two-line compact cell such as:
  - top: weekday short label (`Mon`, `Tue` or localized equivalent)
  - bottom: day-of-month (`19`, `20`, etc.)
- Highlight `today` distinctly.
- Ensure mobile readability; do not overcrowd the cell.

**Files likely involved:**
- Modify: `apps/web/src/components/words/streak-calendar.tsx`
- Maybe modify: `apps/web/src/app/words/page.tsx` if the surrounding layout needs spacing adjustments

**Acceptance:**
- Users can directly read the date for each visible calendar slot without hovering.
- Active study days remain visually obvious.
- `today` is distinguishable from other days.
- Calendar remains usable on mobile.

---

## Task 2: Add words-aware agent tools with authenticated progress access

**Problem:** the current merge branch already has auth-backed words persistence, but the assistant does not yet expose words-domain tools similar to the auth branch's goal/path-aware tools. As a result:
- if a user says “我想学单词” / “I want to learn words”, the agent should be able to guide or jump them into the words flow
- if a user asks “我的英语学习情况怎么样”, the agent should be able to read the current user's words progress and answer from real data

**Implementation target:**
- Extend the assistant tool layer so authenticated agent sessions can query words progress and recommend/open the correct words page.
- Follow the auth branch principle: route through authenticated server-side tool logic using `userId`.

**Suggested implementation direction:**

1. Add a user-scoped words progress tool
- Create or extend an agent tools file in the current branch so it includes tools like:
  - `query_words_progress`
  - `navigate_words_flow` or `recommend_words_action`
- `query_words_progress` should read from the authenticated words persistence layer already available in the merge branch.
- Return structured summaries such as:
  - streak days
  - due today
  - learned today / reviewed today
  - current book progress
  - whether there are due review items

2. Add agent-friendly words context
- Update the current branch's agent orchestration so `userId` reaches the new words tools, just like auth branch tools receive `userId`.
- Update the system prompt/tool description so the model knows when to call the words tools for:
  - learning-intent requests
  - review-intent requests
  - “how am I doing” / “my English progress” requests

3. Enable page-routing guidance
- When the user expresses intent such as:
  - “我想背单词”
  - “带我去复习英语”
  - “打开单词学习页面”
- the agent should produce an actionable navigation result, ideally including the exact destination route such as:
  - `/words`
  - `/words/review`
  - `/words/learn/[bookId]`
- Prefer a structured response shape if the current assistant framework supports front-end actions; otherwise at minimum return a clearly parseable route recommendation in the assistant response.

**Files likely involved:**
- Inspect/modify current-branch equivalents of:
  - `apps/web/src/app/api/workspace/agent/chat/route.ts`
  - `apps/web/src/lib/agent/learning-agent.ts`
  - current branch agent tools file(s)
- Add server helpers if needed:
  - `apps/web/src/lib/server/words-service.ts`
  - words stats helper layer if a dedicated summary function is missing
- Possibly update:
  - `apps/web/src/components/global/global-ai-assistant.tsx`
  - any front-end assistant action parser if navigation actions already exist in another domain

**Acceptance:**
- Asking “我想学单词” yields a words-learning-oriented response with a route recommendation, and preferably a jump action.
- Asking “我想复习英语” yields a review-oriented response with `/words/review`.
- Asking “我的英语学习情况怎么样” returns current-user words stats from real authenticated data, not a generic answer.
- Different users get different progress answers.
- Unauthenticated users do not receive another user's words data.

---

## Task 3: Verification And Safety Checks

**Verification requirements:**
- Add or update focused tests for the new words agent tool layer.
- Verify unauthenticated access returns safe behavior.
- Verify authenticated access is user-scoped.

**Suggested checks:**
- `pnpm --filter @edunexus/web typecheck`
- targeted Vitest files for:
  - words calendar rendering behavior if practical
  - words agent tool responses / route generation
  - authenticated vs unauthenticated words-progress queries

**Manual scenarios to verify:**
- User A has words progress; User B does not.
- Ask assistant: “我的英语学习情况怎么样？”
  - A sees A's real stats
  - B sees B's real stats
- Ask assistant: “我想学单词”
  - returns dashboard/learn route guidance
- Ask assistant: “我想复习单词”
  - returns review route guidance
- Visit words dashboard and confirm the calendar now shows visible date text.

---

## Risks

- Highest risk: words agent integration may stop at plain-text advice instead of actual navigation behavior if the current assistant front-end has no action protocol. Mitigation: first inspect whether the merge branch already supports structured assistant actions in any other domain; if not, implement the smallest consistent route-action contract.
- Data risk: words progress answers must stay per-user. Mitigation: all words tool reads must require authenticated `userId` and go through server-side helpers.
- UI risk: adding date labels may overcrowd the heatmap on small screens. Mitigation: keep labels compact and test mobile width.

---

## Final Report Expectations

- List changed files and why
- Explain whether navigation is implemented as structured action or route recommendation text
- Show how the words progress tool obtains authenticated user data
- Include exact verification commands run

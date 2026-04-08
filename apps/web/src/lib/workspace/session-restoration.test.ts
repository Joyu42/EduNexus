import { describe, expect, it } from "vitest";

import type { ChatSession } from "@/lib/workspace/chat-history-storage";
import { buildWelcomeMessage, resolveWorkspaceBootstrapState } from "@/lib/workspace/session-restoration";

const makeSession = (id: string, updatedAt: string): ChatSession => ({
  id,
  title: `Session ${id}`,
  messages: [
    {
      id: `${id}-1`,
      role: "assistant",
      content: `Message for ${id}`,
      timestamp: new Date(updatedAt),
    },
  ],
  createdAt: new Date(updatedAt),
  updatedAt: new Date(updatedAt),
  socraticMode: true,
});

describe("workspace session restoration bootstrap", () => {
  it("returns welcome for a new user with no sessions", () => {
    const state = resolveWorkspaceBootstrapState({
      sessions: [],
      currentSessionId: null,
    });

    expect(state).toEqual({ type: "welcome" });
  });

  it("builds the required capability-led welcome message", () => {
    expect(buildWelcomeMessage().content).toBe(
      "你好，我是 EduNexus 学习工作区助手。这里可以：1）结合当前学习内容回答问题；2）基于知识宝库文档做总结、提炼重点；3）结合学习进度给出下一步建议。你可以直接提问，也可以先选择知识宝库文档后再发起问题。"
    );
  });

  it("restores the most recent session for returning users", () => {
    const older = makeSession("older", "2026-03-14T10:00:00.000Z");
    const newer = makeSession("newer", "2026-03-15T10:00:00.000Z");

    const state = resolveWorkspaceBootstrapState({
      sessions: [older, newer],
      currentSessionId: null,
    });

    expect(state.type).toBe("restore");
    if (state.type === "restore") {
      expect(state.session.id).toBe("newer");
    }
  });

  it("restores the active session when it still exists", () => {
    const older = makeSession("older", "2026-03-14T10:00:00.000Z");
    const active = makeSession("active", "2026-03-13T10:00:00.000Z");

    const state = resolveWorkspaceBootstrapState({
      sessions: [older, active],
      currentSessionId: "active",
    });

    expect(state.type).toBe("restore");
    if (state.type === "restore") {
      expect(state.session.id).toBe("active");
    }
  });

  it("restores the next most recent session when active was deleted", () => {
    const oldest = makeSession("oldest", "2026-03-12T10:00:00.000Z");
    const nextMostRecent = makeSession("next", "2026-03-16T10:00:00.000Z");

    const state = resolveWorkspaceBootstrapState({
      sessions: [oldest, nextMostRecent],
      currentSessionId: "deleted-session-id",
    });

    expect(state.type).toBe("restore");
    if (state.type === "restore") {
      expect(state.session.id).toBe("next");
    }
  });
});

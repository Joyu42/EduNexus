import type { ChatSession } from "@/lib/workspace/chat-history-storage";

export type WorkspaceBootstrapState =
  | { type: "welcome" }
  | { type: "restore"; session: ChatSession };

export type WorkspaceWelcomeMessage = {
  id: string;
  role: "assistant";
  content: string;
  timestamp: Date;
  mode: "normal";
};

export function buildWelcomeMessage(): WorkspaceWelcomeMessage {
  return {
    id: "welcome",
    role: "assistant",
    content:
      "你好，我是 EduNexus 学习工作区助手。这里可以：1）结合当前学习内容回答问题；2）基于知识宝库文档做总结、提炼重点；3）结合学习进度给出下一步建议。你可以直接提问，也可以先选择知识宝库文档后再发起问题。",
    timestamp: new Date(),
    mode: "normal",
  };
}

export function pickInitialSession(
  sessions: ChatSession[],
  currentSessionId: string | null
): ChatSession | null {
  if (sessions.length === 0) {
    return null;
  }

  if (currentSessionId) {
    const activeSession = sessions.find((session) => session.id === currentSessionId);
    if (activeSession) {
      return activeSession;
    }
  }

  return sessions.reduce((latest, session) =>
    new Date(session.updatedAt).getTime() > new Date(latest.updatedAt).getTime() ? session : latest
  );
}

export function resolveWorkspaceBootstrapState(input: {
  sessions: ChatSession[];
  currentSessionId: string | null;
}): WorkspaceBootstrapState {
  const session = pickInitialSession(input.sessions, input.currentSessionId);

  if (!session) {
    return { type: "welcome" };
  }

  return {
    type: "restore",
    session,
  };
}

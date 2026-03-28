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
      "你好！我是你的智能学习伙伴。我可以帮你：\n\n- 🔍 搜索知识宝库和星图\n- 📝 生成个性化练习题\n- 🗺️ 规划成长地图\n- 💡 解释复杂概念\n- 🤔 通过提问引导思考\n- 🖼️ 分析图片和图表（支持多模态）\n- 💻 解释和调试代码\n\n有什么想学习或探讨的吗？",
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

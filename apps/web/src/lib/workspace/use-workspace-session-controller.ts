import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  appendMessage as appendWorkspaceSessionMessage,
  createSession as createWorkspaceSession,
  deleteSession as deleteWorkspaceSession,
  getSession as getWorkspaceSession,
  listSessions as listWorkspaceSessions,
  type AppendWorkspaceSessionMessageInput,
  type AppendWorkspaceSessionMessageResult,
  type CreateWorkspaceSessionInput,
  type DeleteWorkspaceSessionResult,
  type WorkspaceSessionDetail,
  type WorkspaceSessionSummary,
} from "@/lib/workspace/workspace-session-client";
import {
  buildWelcomeMessage,
  resolveWorkspaceBootstrapState,
} from "@/lib/workspace/session-restoration";
import type { AgentToolStep, ChatSession } from "@/lib/workspace/chat-history-storage";

export type WorkspaceMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  attachments?: { name: string; type: string; url: string }[];
  thinking?: string;
  toolSteps?: AgentToolStep[];
  timestamp: Date;
  mode?: "normal" | "kb-qa";
};

export type WorkspaceControllerTeacher = {
  teachingStyle?: string;
  temperature?: number;
  systemPrompt?: string;
} | null;

export type WorkspaceControllerKBDocument = {
  id: string;
  title: string;
  content: string;
  tags?: string[];
};

export type WorkspaceControllerModelConfig = {
  apiKey?: string;
  apiEndpoint?: string;
  model?: string;
  temperature?: number;
};

export type SendWorkspaceMessageInput = {
  inputValue: string;
  uploadedImages: string[];
  kbQAMode: boolean;
  kbDocuments: WorkspaceControllerKBDocument[];
  modelConfig: WorkspaceControllerModelConfig;
  currentTeacher?: WorkspaceControllerTeacher;
  taskContext?: unknown;
  onAssistantResponse?: (content: string) => Promise<void> | void;
};

type AgentChatResult = {
  content: string;
  thinking?: string;
  toolSteps?: AgentToolStep[];
};

type KBQAChatResult = {
  content: string;
};

export type WorkspaceSessionControllerDependencies = {
  listSessions: () => Promise<WorkspaceSessionSummary[]>;
  getSession: (sessionId: string) => Promise<WorkspaceSessionDetail>;
  createSession: (input?: CreateWorkspaceSessionInput) => Promise<WorkspaceSessionDetail>;
  appendMessage: (
    sessionId: string,
    input: AppendWorkspaceSessionMessageInput
  ) => Promise<AppendWorkspaceSessionMessageResult>;
  deleteSession: (sessionId: string) => Promise<DeleteWorkspaceSessionResult>;
  runAgentChat: (input: SendWorkspaceMessageInput) => Promise<AgentChatResult>;
  runKBQAChat: (input: SendWorkspaceMessageInput) => Promise<KBQAChatResult>;
};

type UseWorkspaceSessionControllerInput = {
  enabled: boolean;
  isDemoUser?: boolean;
  dependencies?: Partial<WorkspaceSessionControllerDependencies>;
};

const defaultDependencies: WorkspaceSessionControllerDependencies = {
  listSessions: listWorkspaceSessions,
  getSession: getWorkspaceSession,
  createSession: createWorkspaceSession,
  appendMessage: appendWorkspaceSessionMessage,
  deleteSession: deleteWorkspaceSession,
  runAgentChat: runWorkspaceAgentChat,
  runKBQAChat: runWorkspaceKBQAChat,
};

function generateMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildSessionTitle(content: string): string {
  const normalized = content.trim().replace(/\s+/g, " ");
  return normalized.slice(0, 30) || "新对话";
}

function toBootstrapSession(summary: WorkspaceSessionSummary): ChatSession {
  const createdAt = new Date(summary.createdAt);
  const updatedAt = new Date(summary.updatedAt);

  return {
    id: summary.id,
    title: summary.title,
    messages: [],
    createdAt,
    updatedAt,
    socraticMode: true,
  };
}

function normalizeToolSteps(value: unknown): AgentToolStep[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const normalized: AgentToolStep[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const maybeStep = item as {
      type?: unknown;
      tool?: unknown;
      content?: unknown;
      args?: unknown;
    };

    if (
      (maybeStep.type !== "tool_call" && maybeStep.type !== "tool_result") ||
      typeof maybeStep.tool !== "string" ||
      typeof maybeStep.content !== "string"
    ) {
      continue;
    }

    normalized.push({
      type: maybeStep.type,
      tool: maybeStep.tool,
      content: maybeStep.content,
      ...(typeof maybeStep.args !== "undefined" ? { args: maybeStep.args } : {}),
    });
  }

  return normalized.length > 0 ? normalized : undefined;
}

function toUiMessages(detail: WorkspaceSessionDetail): WorkspaceMessage[] {
  return detail.messages.map((message, index) => ({
    id: `${detail.id}-${index}`,
    role: message.role === "user" ? "user" : "assistant",
    content: message.content,
    timestamp: new Date(message.createdAt),
    mode: "normal",
  }));
}

function resolveApiErrorMessage(raw: unknown, status: number, fallback: string): string {
  const direct = typeof raw === "string" ? raw.trim() : "";
  if (direct) {
    return direct;
  }
  if (status === 401) {
    return "你还未登录或登录已过期，请重新登录后再试。";
  }
  if (status === 502) {
    return "模型服务鉴权失败：请检查 ModelScope API Key 是否有效。";
  }
  return fallback;
}

async function runWorkspaceKBQAChat(input: SendWorkspaceMessageInput): Promise<KBQAChatResult> {
  const response = await fetch("/api/kb/qa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: input.inputValue || "请分析这些图片",
      documents: input.kbDocuments.map((doc) => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        tags: doc.tags,
      })),
      config: {
        apiKey: input.modelConfig.apiKey,
        apiEndpoint: input.modelConfig.apiEndpoint,
        modelName: input.modelConfig.model,
      },
      taskContext: input.taskContext,
    }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(resolveApiErrorMessage(data?.error, response.status, "知识库问答失败"));
  }

  return { content: data.answer };
}

async function runWorkspaceAgentChat(input: SendWorkspaceMessageInput): Promise<AgentChatResult> {
  const response = await fetch("/api/workspace/agent/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: input.inputValue || "请分析这些图片",
      images: input.uploadedImages.length > 0 ? input.uploadedImages : undefined,
      config: {
        socraticMode: input.currentTeacher?.teachingStyle === "socratic",
        temperature: input.currentTeacher?.temperature ?? input.modelConfig.temperature,
        maxIterations: 5,
        apiKey: input.modelConfig.apiKey,
        apiEndpoint: input.modelConfig.apiEndpoint,
        modelName: input.modelConfig.model,
        systemPrompt: input.currentTeacher?.systemPrompt,
      },
      taskContext: input.taskContext,
    }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(resolveApiErrorMessage(data?.error, response.status, "Agent 对话失败"));
  }

  return {
    content: data.response,
    thinking: typeof data.thinking === "string" ? data.thinking : undefined,
    toolSteps: normalizeToolSteps(data.steps),
  };
}

export function useWorkspaceSessionController({
  enabled,
  isDemoUser = false,
  dependencies,
}: UseWorkspaceSessionControllerInput) {
  const deps = useMemo(
    () => ({ ...defaultDependencies, ...dependencies }),
    [dependencies]
  );
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [recentSessions, setRecentSessions] = useState<WorkspaceSessionSummary[]>([]);
  const [messages, setMessages] = useState<WorkspaceMessage[]>([buildWelcomeMessage()]);
  const [isLoading, setIsLoading] = useState(false);
  const currentSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  const hydrateSession = useCallback(
    async (sessionId: string) => {
      const detail = await deps.getSession(sessionId);
      setMessages(toUiMessages(detail));
      currentSessionIdRef.current = detail.id;
      setCurrentSessionId(detail.id);
      return detail;
    },
    [deps]
  );

  const refreshSessions = useCallback(
    async (preferredSessionId?: string | null) => {
      const sessions = await deps.listSessions();
      setRecentSessions(sessions);

      const bootstrapState = resolveWorkspaceBootstrapState({
        sessions: sessions.map(toBootstrapSession),
        currentSessionId: preferredSessionId ?? currentSessionIdRef.current,
      });

      if (bootstrapState.type === "restore") {
        await hydrateSession(bootstrapState.session.id);
        return sessions;
      }

      setMessages([buildWelcomeMessage()]);
      currentSessionIdRef.current = null;
      setCurrentSessionId(null);
      return sessions;
    },
    [deps, hydrateSession]
  );

  const startNewConversation = useCallback(() => {
    setMessages([buildWelcomeMessage()]);
    currentSessionIdRef.current = null;
    setCurrentSessionId(null);
  }, []);

  const selectSession = useCallback(
    async (sessionId: string) => {
      await hydrateSession(sessionId);
    },
    [hydrateSession]
  );

  const removeSession = useCallback(
    async (sessionId: string) => {
      await deps.deleteSession(sessionId);
      await refreshSessions(currentSessionId === sessionId ? null : currentSessionId);
    },
    [currentSessionId, deps, refreshSessions]
  );

  const sendMessage = useCallback(
    async (input: SendWorkspaceMessageInput) => {
      const effectiveMessage = input.inputValue.trim();
      if ((!effectiveMessage && input.uploadedImages.length === 0) || isLoading) {
        return;
      }

      const userMessage: WorkspaceMessage = {
        id: generateMessageId("user"),
        role: "user",
        content: effectiveMessage || "请分析这些图片",
        images: input.uploadedImages.length > 0 ? [...input.uploadedImages] : undefined,
        timestamp: new Date(),
        mode: input.kbQAMode ? "kb-qa" : "normal",
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      let sessionId = currentSessionId;
      let createdSessionId: string | null = null;

      try {
        if (!sessionId) {
          const createdSession = await deps.createSession({
            title: buildSessionTitle(userMessage.content),
          });
          sessionId = createdSession.id;
          createdSessionId = createdSession.id;
          currentSessionIdRef.current = createdSession.id;
          setCurrentSessionId(createdSession.id);
        }

        const assistantResult = input.kbQAMode
          ? await deps.runKBQAChat(input)
          : await deps.runAgentChat(input);

        const assistantMessage: WorkspaceMessage = {
          id: generateMessageId("assistant"),
          role: "assistant",
          content: assistantResult.content,
          thinking: "thinking" in assistantResult ? assistantResult.thinking : undefined,
          toolSteps: "toolSteps" in assistantResult ? assistantResult.toolSteps : undefined,
          timestamp: new Date(),
          mode: input.kbQAMode ? "kb-qa" : "normal",
        };

        setMessages((prev) => [...prev, assistantMessage]);

        await deps.appendMessage(sessionId, {
          role: "user",
          content: userMessage.content,
        });
        await deps.appendMessage(sessionId, {
          role: "assistant",
          content: assistantMessage.content,
        });

        if (input.onAssistantResponse) {
          await input.onAssistantResponse(assistantMessage.content);
        }

        await refreshSessions(sessionId);
      } catch (error) {
        if (createdSessionId) {
          await deps.deleteSession(createdSessionId).catch(() => undefined);
          currentSessionIdRef.current = null;
          setCurrentSessionId(null);
        }

        const errorMessage: WorkspaceMessage = {
          id: generateMessageId("assistant-error"),
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "抱歉，处理你的请求时出现了错误。请稍后重试。",
          timestamp: new Date(),
          mode: input.kbQAMode ? "kb-qa" : "normal",
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [currentSessionId, deps, isLoading, refreshSessions]
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    void refreshSessions();
  }, [enabled, isDemoUser, refreshSessions]);

  return {
    currentSessionId,
    recentSessions,
    messages,
    isLoading,
    refreshSessions,
    selectSession,
    startNewConversation,
    deleteSession: removeSession,
    sendMessage,
  };
}

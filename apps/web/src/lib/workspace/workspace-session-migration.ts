import { getClientUserIdentity } from "@/lib/auth/client-user-cache";
import { getAllChatSessions, type ChatMessage, type ChatSession } from "@/lib/workspace/chat-history-storage";
import {
  appendMessage,
  createSession,
  listSessions,
  type AppendWorkspaceSessionMessageInput,
  type WorkspaceSessionSummary
} from "@/lib/workspace/workspace-session-client";

const WORKSPACE_MIGRATION_KEY_PREFIX = "edunexus_workspace_session_migration";
const MAX_IMPORTED_SESSIONS = 10;

type MigrationDependencies = {
  listSessions: () => Promise<WorkspaceSessionSummary[]>;
  createSession: (input?: { title?: string }) => Promise<{ id: string }>;
  appendMessage: (
    sessionId: string,
    input: AppendWorkspaceSessionMessageInput
  ) => Promise<unknown>;
};

export type WorkspaceSessionMigrationResult = {
  importedCount: number;
  skipped: boolean;
  reason: "already-migrated" | "missing-user" | "server-has-sessions" | "imported";
};

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getWorkspaceMigrationStorageKey(userId: string): string {
  return `${WORKSPACE_MIGRATION_KEY_PREFIX}:${userId}`;
}

function hasCompletedWorkspaceMigration(userId: string): boolean {
  if (!canUseLocalStorage()) {
    return false;
  }
  return localStorage.getItem(getWorkspaceMigrationStorageKey(userId)) === "done";
}

function markWorkspaceMigrationComplete(userId: string): void {
  if (!canUseLocalStorage()) {
    return;
  }
  localStorage.setItem(getWorkspaceMigrationStorageKey(userId), "done");
}

function sortSessionsNewestFirst(sessions: ChatSession[]): ChatSession[] {
  return sessions
    .slice()
    .sort((left, right) => Number(new Date(right.updatedAt)) - Number(new Date(left.updatedAt)));
}

function sanitizeMessage(message: ChatMessage): AppendWorkspaceSessionMessageInput {
  return {
    role: message.role,
    content: message.content
  };
}

async function importLegacySession(
  session: ChatSession,
  deps: MigrationDependencies
): Promise<void> {
  const created = await deps.createSession({ title: session.title });
  const orderedMessages = session.messages
    .slice()
    .sort((left, right) => Number(new Date(left.timestamp)) - Number(new Date(right.timestamp)));

  for (const message of orderedMessages) {
    await deps.appendMessage(created.id, sanitizeMessage(message));
  }
}

export async function importLegacyWorkspaceSessionsIfNeeded(
  deps: MigrationDependencies = {
    listSessions,
    createSession,
    appendMessage
  }
): Promise<WorkspaceSessionMigrationResult> {
  const userId = getClientUserIdentity();
  if (!userId) {
    return { importedCount: 0, skipped: true, reason: "missing-user" };
  }

  if (hasCompletedWorkspaceMigration(userId)) {
    return { importedCount: 0, skipped: true, reason: "already-migrated" };
  }

  const existingSessions = await deps.listSessions();
  if (existingSessions.length > 0) {
    markWorkspaceMigrationComplete(userId);
    return { importedCount: 0, skipped: true, reason: "server-has-sessions" };
  }

  const legacySessions = sortSessionsNewestFirst(await getAllChatSessions()).slice(0, MAX_IMPORTED_SESSIONS);
  for (const session of legacySessions) {
    await importLegacySession(session, deps);
  }

  markWorkspaceMigrationComplete(userId);
  return {
    importedCount: legacySessions.length,
    skipped: false,
    reason: "imported"
  };
}

/**
 * 学习工作区对话历史存储
 * 使用 IndexedDB 轻量级存储对话记录
 */

import Dexie, { Table } from 'dexie';
import { getClientUserIdentity } from '@/lib/auth/client-user-cache';

export interface AgentToolStep {
  type: 'tool_call' | 'tool_result';
  tool: string;
  content: string;
  args?: unknown;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  thinking?: string;
  toolSteps?: AgentToolStep[];
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  socraticMode: boolean;
}

class ChatHistoryDB extends Dexie {
  sessions!: Table<ChatSession, string>;

  constructor(name: string) {
    super(name);

    this.version(1).stores({
      sessions: 'id, createdAt, updatedAt',
    });
  }
}

export function resolveChatDatabaseName(userId: string | null): string | null {
  if (!userId) {
    return null;
  }
  return `EduNexusChatHistory_${userId}`;
}

const chatHistoryDbs = new Map<string, ChatHistoryDB>();

function getChatHistoryDb(): ChatHistoryDB | null {
  const dbName = resolveChatDatabaseName(getClientUserIdentity());
  if (!dbName) {
    return null;
  }

  const existing = chatHistoryDbs.get(dbName);
  if (existing) {
    return existing;
  }

  const db = new ChatHistoryDB(dbName);
  chatHistoryDbs.set(dbName, db);
  return db;
}

/**
 * 创建新的对话会话
 */
export async function createChatSession(
  title: string = '新对话',
  socraticMode: boolean = true
): Promise<ChatSession> {
  const db = getChatHistoryDb();
  if (!db) {
    throw new Error('Missing client user identity for workspace chat history');
  }

  const session: ChatSession = {
    id: `session-${Date.now()}`,
    title,
    messages: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    socraticMode,
  };

  await db.sessions.add(session);
  return session;
}

/**
 * 获取所有对话会话
 */
export async function getAllChatSessions(): Promise<ChatSession[]> {
  const db = getChatHistoryDb();
  if (!db) {
    return [];
  }
  return await db.sessions.orderBy('updatedAt').reverse().toArray();
}

/**
 * 获取单个对话会话
 */
export async function getChatSession(id: string): Promise<ChatSession | undefined> {
  const db = getChatHistoryDb();
  if (!db) {
    return undefined;
  }
  return await db.sessions.get(id);
}

/**
 * 更新对话会话
 */
export async function updateChatSession(
  id: string,
  updates: Partial<ChatSession>
): Promise<void> {
  const db = getChatHistoryDb();
  if (!db) {
    throw new Error('Missing client user identity for workspace chat history');
  }
  await db.sessions.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
}

/**
 * 添加消息到会话
 */
export async function addMessageToSession(
  sessionId: string,
  message: ChatMessage
): Promise<void> {
  const db = getChatHistoryDb();
  if (!db) {
    throw new Error('Missing client user identity for workspace chat history');
  }
  const session = await db.sessions.get(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  session.messages.push(message);
  await db.sessions.update(sessionId, {
    messages: session.messages,
    updatedAt: new Date(),
  });
}

/**
 * 删除对话会话
 */
export async function deleteChatSession(id: string): Promise<void> {
  const db = getChatHistoryDb();
  if (!db) {
    return;
  }
  await db.sessions.delete(id);
}

/**
 * 清空所有对话历史
 */
export async function clearAllChatHistory(): Promise<void> {
  const db = getChatHistoryDb();
  if (!db) {
    return;
  }
  await db.sessions.clear();
}

export async function upsertChatSession(session: ChatSession): Promise<void> {
  const db = getChatHistoryDb();
  if (!db) {
    throw new Error('Missing client user identity for workspace chat history');
  }
  await db.sessions.put(session);
}

/**
 * 导出对话会话为 JSON
 */
export function exportChatSession(session: ChatSession): string {
  return JSON.stringify(session, null, 2);
}

/**
 * 导出对话会话为 Markdown
 */
export function exportChatSessionAsMarkdown(session: ChatSession): string {
  let markdown = `# ${session.title}\n\n`;
  markdown += `创建时间: ${session.createdAt.toLocaleString()}\n`;
  markdown += `更新时间: ${session.updatedAt.toLocaleString()}\n`;
  markdown += `模式: ${session.socraticMode ? '苏格拉底模式' : '直接教学模式'}\n\n`;
  markdown += `---\n\n`;

  for (const message of session.messages) {
    const role = message.role === 'user' ? '👤 用户' : '🤖 助手';
    markdown += `## ${role}\n\n`;

    if (message.thinking) {
      markdown += `> **思考过程:**\n> ${message.thinking.split('\n').join('\n> ')}\n\n`;
    }

    markdown += `${message.content}\n\n`;

    if (message.images && message.images.length > 0) {
      markdown += `*包含 ${message.images.length} 张图片*\n\n`;
    }

    markdown += `*${message.timestamp.toLocaleString()}*\n\n`;
    markdown += `---\n\n`;
  }

  return markdown;
}

/**
 * 获取最近的对话会话
 */
export async function getRecentChatSessions(limit: number = 10): Promise<ChatSession[]> {
  const db = getChatHistoryDb();
  if (!db) {
    return [];
  }
  return await db.sessions
    .orderBy('updatedAt')
    .reverse()
    .limit(limit)
    .toArray();
}

/**
 * 搜索对话会话
 */
export async function searchChatSessions(query: string): Promise<ChatSession[]> {
  const db = getChatHistoryDb();
  if (!db) {
    return [];
  }
  const allSessions = await db.sessions.toArray();
  const lowerQuery = query.toLowerCase();

  return allSessions.filter((session: ChatSession) => {
    // 搜索标题
    if (session.title.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // 搜索消息内容
    return session.messages.some((message: ChatMessage) =>
      message.content.toLowerCase().includes(lowerQuery)
    );
  });
}

/**
 * 自动生成会话标题（基于第一条用户消息）
 */
export function generateSessionTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((m: ChatMessage) => m.role === 'user');
  if (!firstUserMessage) {
    return '新对话';
  }

  // 取前30个字符作为标题
  const content = firstUserMessage.content.trim();
  if (content.length <= 30) {
    return content;
  }

  return content.substring(0, 30) + '...';
}

/**
 * 获取统计信息
 */
export async function getChatStatistics(): Promise<{
  totalSessions: number;
  totalMessages: number;
  averageMessagesPerSession: number;
}> {
  const db = getChatHistoryDb();
  if (!db) {
    return {
      totalSessions: 0,
      totalMessages: 0,
      averageMessagesPerSession: 0,
    };
  }
  const sessions = await db.sessions.toArray();
  const totalSessions = sessions.length;
  const totalMessages = sessions.reduce((sum: number, s: ChatSession) => sum + s.messages.length, 0);
  const averageMessagesPerSession = totalSessions > 0 ? totalMessages / totalSessions : 0;

  return {
    totalSessions,
    totalMessages,
    averageMessagesPerSession: Math.round(averageMessagesPerSession * 10) / 10,
  };
}

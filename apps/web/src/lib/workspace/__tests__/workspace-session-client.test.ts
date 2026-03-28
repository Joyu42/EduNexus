import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type LegacySession = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  socraticMode: boolean;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    thinking?: string;
    toolSteps?: unknown[];
    images?: string[];
  }>;
};

const storage = new Map<string, string>();
const getAllChatSessions = vi.fn<() => Promise<LegacySession[]>>();
const getClientUserIdentity = vi.fn<() => string | null>();

function createLocalStorageMock() {
  return {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    }
  };
}

function createLegacySession(index: number, options?: Partial<LegacySession>): LegacySession {
  const createdAt = new Date(Date.UTC(2026, 0, 1, 8, index, 0, 0));
  const updatedAt = new Date(createdAt.getTime() + 30_000);

  return {
    id: `legacy-${index}`,
    title: `Legacy Session ${index}`,
    createdAt,
    updatedAt,
    socraticMode: true,
    messages: [
      {
        id: `message-${index}`,
        role: "user",
        content: `Question ${index}`,
        timestamp: updatedAt,
        thinking: `thinking-${index}`,
        toolSteps: [{ type: "tool_call", tool: "search", content: "hidden" }],
        images: ["data:image/png;base64,image"]
      }
    ],
    ...options
  };
}

vi.mock("@/lib/workspace/chat-history-storage", () => ({
  getAllChatSessions
}));

vi.mock("@/lib/auth/client-user-cache", () => ({
  getClientUserIdentity
}));

describe("workspace session client", () => {
  beforeEach(() => {
    storage.clear();
    getAllChatSessions.mockReset();
    getClientUserIdentity.mockReset();
    getClientUserIdentity.mockReturnValue("user-1");

    const localStorageMock = createLocalStorageMock();
    Object.defineProperty(globalThis, "window", {
      value: { localStorage: localStorageMock },
      configurable: true,
      writable: true
    });
    Object.defineProperty(globalThis, "localStorage", {
      value: localStorageMock,
      configurable: true,
      writable: true
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("lists sessions from the server with typed payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        success: true,
        data: {
          sessions: [
            {
              id: "ws_1",
              title: "Algebra",
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
              lastLevel: 2,
              messageCount: 3
            }
          ]
        }
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    const { listSessions } = await import("@/lib/workspace/workspace-session-client");

    await expect(listSessions()).resolves.toEqual([
      {
        id: "ws_1",
        title: "Algebra",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        lastLevel: 2,
        messageCount: 3
      }
    ]);
    expect(fetchMock).toHaveBeenCalledWith("/api/workspace/sessions", {
      credentials: "include"
    });
  });

  it("does not import local history when the server already has sessions", async () => {
    getAllChatSessions.mockResolvedValue([createLegacySession(1), createLegacySession(2)]);

    const { importLegacyWorkspaceSessionsIfNeeded, getWorkspaceMigrationStorageKey } = await import(
      "@/lib/workspace/workspace-session-migration"
    );

    const listSessions = vi.fn().mockResolvedValue([
      {
        id: "ws_existing",
        title: "Existing",
        createdAt: "2026-01-02T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        lastLevel: 1,
        messageCount: 1
      }
    ]);
    const createSession = vi.fn();
    const appendMessage = vi.fn();

    await expect(
      importLegacyWorkspaceSessionsIfNeeded({ listSessions, createSession, appendMessage })
    ).resolves.toEqual({ importedCount: 0, skipped: true, reason: "server-has-sessions" });

    expect(createSession).not.toHaveBeenCalled();
    expect(appendMessage).not.toHaveBeenCalled();
    expect(localStorage.getItem(getWorkspaceMigrationStorageKey("user-1"))).toBe("done");
  });

  it("imports only the newest ten IndexedDB sessions when the server is empty", async () => {
    getAllChatSessions.mockResolvedValue(Array.from({ length: 12 }, (_, index) => createLegacySession(index + 1)));

    const { importLegacyWorkspaceSessionsIfNeeded } = await import(
      "@/lib/workspace/workspace-session-migration"
    );

    const listSessions = vi.fn().mockResolvedValue([]);
    const createSession = vi
      .fn<(input?: { title?: string }) => Promise<{ id: string }>>()
      .mockImplementation(async ({ title } = {}) => ({ id: `ws_${title}` }));
    const appendMessage = vi.fn().mockResolvedValue({});

    const result = await importLegacyWorkspaceSessionsIfNeeded({
      listSessions,
      createSession,
      appendMessage
    });

    expect(result).toEqual({ importedCount: 10, skipped: false, reason: "imported" });
    expect(createSession).toHaveBeenCalledTimes(10);
    expect(createSession.mock.calls.map(([input]) => input?.title)).toEqual([
      "Legacy Session 12",
      "Legacy Session 11",
      "Legacy Session 10",
      "Legacy Session 9",
      "Legacy Session 8",
      "Legacy Session 7",
      "Legacy Session 6",
      "Legacy Session 5",
      "Legacy Session 4",
      "Legacy Session 3"
    ]);
    expect(appendMessage).toHaveBeenCalledTimes(10);
  });

  it("sanitizes imported messages by stripping thinking, tool steps and images", async () => {
    getAllChatSessions.mockResolvedValue([
      createLegacySession(1, {
        messages: [
          {
            id: "legacy-message-1",
            role: "assistant",
            content: "Sanitized content",
            timestamp: new Date("2026-01-03T00:00:00.000Z"),
            thinking: "should be removed",
            toolSteps: [{ type: "tool_call", tool: "python", content: "hidden" }],
            images: ["data:image/png;base64,image"]
          }
        ]
      })
    ]);

    const { importLegacyWorkspaceSessionsIfNeeded } = await import(
      "@/lib/workspace/workspace-session-migration"
    );

    const createSession = vi.fn().mockResolvedValue({ id: "ws_imported" });
    const appendMessage = vi.fn().mockResolvedValue({});

    await importLegacyWorkspaceSessionsIfNeeded({
      listSessions: vi.fn().mockResolvedValue([]),
      createSession,
      appendMessage
    });

    expect(appendMessage).toHaveBeenCalledWith("ws_imported", {
      role: "assistant",
      content: "Sanitized content"
    });
  });
});

// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  useWorkspaceSessionController,
  type WorkspaceSessionControllerDependencies,
} from "@/lib/workspace/use-workspace-session-controller";

function createDependencies(
  overrides: Partial<WorkspaceSessionControllerDependencies> = {}
): WorkspaceSessionControllerDependencies {
  return {
    listSessions: vi.fn().mockResolvedValue([]),
    getSession: vi.fn(),
    createSession: vi.fn(),
    appendMessage: vi.fn().mockResolvedValue({
      id: "ws_created",
      updatedAt: "2026-03-17T10:00:00.000Z",
      messageCount: 2,
    }),
    deleteSession: vi.fn().mockResolvedValue({ deleted: true, id: "ws_created" }),
    runAgentChat: vi.fn(),
    runKBQAChat: vi.fn(),
    ...overrides,
  };
}

describe("useWorkspaceSessionController", () => {
  it("exposes the loaded server session for export flows", async () => {
    const detail = {
      id: "ws_export",
      title: "Exported Session",
      userId: "user-1",
      createdAt: "2026-03-17T08:00:00.000Z",
      updatedAt: "2026-03-17T09:00:00.000Z",
      lastLevel: 2,
      messages: [
        {
          role: "user" as const,
          content: "Need a saved session",
          createdAt: "2026-03-17T08:05:00.000Z",
        },
        {
          role: "assistant" as const,
          content: "Server-backed transcript",
          createdAt: "2026-03-17T08:06:00.000Z",
        },
      ],
    };

    const deps = createDependencies({
      listSessions: vi.fn().mockResolvedValue([
        {
          id: detail.id,
          title: detail.title,
          createdAt: detail.createdAt,
          updatedAt: detail.updatedAt,
          lastLevel: detail.lastLevel,
          messageCount: detail.messages.length,
        },
      ]),
      getSession: vi.fn().mockResolvedValue(detail),
    });

    const { result } = renderHook(() =>
      useWorkspaceSessionController({
        enabled: true,
        dependencies: deps,
      })
    );

    await waitFor(() => {
      expect(result.current.currentSessionId).toBe(detail.id);
    });

    const currentSession = (result.current as typeof result.current & {
      currentSession?: {
        id: string;
        title: string;
        messages: Array<{ content: string }>;
      };
    }).currentSession;

    expect(currentSession).toMatchObject({
      id: detail.id,
      title: detail.title,
      messages: [{ content: "Need a saved session" }, { content: "Server-backed transcript" }],
    });
  });

  it("refresh restores the latest session from the server", async () => {
    const newerDetail = {
      id: "ws_newer",
      title: "Newer Session",
      userId: "user-1",
      createdAt: "2026-03-17T09:00:00.000Z",
      updatedAt: "2026-03-17T10:00:00.000Z",
      lastLevel: 1,
      messages: [
        {
          role: "assistant" as const,
          content: "Restored from server",
          createdAt: "2026-03-17T10:00:00.000Z",
        },
      ],
    };

    const deps = createDependencies({
      listSessions: vi
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            id: "ws_older",
            title: "Older Session",
            createdAt: "2026-03-16T09:00:00.000Z",
            updatedAt: "2026-03-16T10:00:00.000Z",
            lastLevel: 1,
            messageCount: 2,
          },
          {
            id: newerDetail.id,
            title: newerDetail.title,
            createdAt: newerDetail.createdAt,
            updatedAt: newerDetail.updatedAt,
            lastLevel: newerDetail.lastLevel,
            messageCount: newerDetail.messages.length,
          },
        ]),
      getSession: vi.fn().mockResolvedValue(newerDetail),
    });

    const { result } = renderHook(() =>
      useWorkspaceSessionController({
        enabled: true,
        dependencies: deps,
      })
    );

    await waitFor(() => {
      expect(result.current.currentSessionId).toBeNull();
    });

    await act(async () => {
      await result.current.refreshSessions();
    });

    await waitFor(() => {
      expect(result.current.currentSessionId).toBe("ws_newer");
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]?.content).toBe("Restored from server");
    expect(result.current.messages[0]?.timestamp).toBeInstanceOf(Date);
  });

  it("restores learningPack metadata from persisted assistant messages", async () => {
    const detail = {
      id: "ws_lp",
      title: "Java Session",
      userId: "user-1",
      createdAt: "2026-03-17T09:00:00.000Z",
      updatedAt: "2026-03-17T10:00:00.000Z",
      lastLevel: 1,
      messages: [
        {
          role: "assistant" as const,
          content: "已创建学习路线",
          createdAt: "2026-03-17T10:00:00.000Z",
          learningPack: {
            packId: "lp_java_1",
            title: "java 学习路线图",
            topic: "java",
            graphUrl: "/graph?view=path&packId=lp_java_1",
          },
        },
      ],
    };

    const deps = createDependencies({
      listSessions: vi.fn().mockResolvedValue([
        {
          id: detail.id,
          title: detail.title,
          createdAt: detail.createdAt,
          updatedAt: detail.updatedAt,
          lastLevel: detail.lastLevel,
          messageCount: detail.messages.length,
        },
      ]),
      getSession: vi.fn().mockResolvedValue(detail),
    });

    const { result } = renderHook(() =>
      useWorkspaceSessionController({
        enabled: true,
        dependencies: deps,
      })
    );

    await waitFor(() => {
      expect(result.current.currentSessionId).toBe("ws_lp");
    });

    expect(result.current.messages[0]?.learningPack).toMatchObject({
      packId: "lp_java_1",
      graphUrl: "/graph?view=path&packId=lp_java_1",
    });
  });

  it("does not persist history when the assistant response fails", async () => {
    const deps = createDependencies({
      createSession: vi.fn().mockResolvedValue({
        id: "ws_failed",
        title: "Need help with calculus",
        userId: "user-1",
        createdAt: "2026-03-17T10:00:00.000Z",
        updatedAt: "2026-03-17T10:00:00.000Z",
        lastLevel: 1,
        messages: [],
      }),
      runAgentChat: vi.fn().mockRejectedValue(new Error("Agent unavailable")),
    });

    const { result } = renderHook(() =>
      useWorkspaceSessionController({
        enabled: true,
        dependencies: deps,
      })
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.sendMessage({
        inputValue: "Need help with calculus",
        uploadedImages: [],
        kbQAMode: false,
        kbDocuments: [],
        modelConfig: {
          apiKey: "test-key",
          apiEndpoint: "https://example.com",
          model: "qwen-test",
          temperature: 0.3,
        },
        currentTeacher: null,
        taskContext: null,
      });
    });

    expect(deps.createSession).toHaveBeenCalledTimes(1);
    expect(deps.appendMessage).not.toHaveBeenCalled();
    expect(deps.deleteSession).toHaveBeenCalledWith("ws_failed");
    expect(result.current.currentSessionId).toBeNull();
    expect(result.current.recentSessions).toEqual([]);
    expect(result.current.messages.at(-1)?.content).toBe("Agent unavailable");
  });

  it("restores seeded demo sessions from the server for demo users", async () => {
    const demoDetail = {
      id: "ws_demo_frontend_intro",
      title: "前端开发入门会话",
      userId: "demo-user",
      createdAt: "2026-03-17T08:00:00.000Z",
      updatedAt: "2026-03-17T10:00:00.000Z",
      lastLevel: 2,
      messages: [
        {
          role: "system" as const,
          content: "欢迎进入前端开发入门学习。",
          createdAt: "2026-03-17T08:00:00.000Z",
        },
        {
          role: "assistant" as const,
          content: "先从 HTML 语义化结构开始。",
          createdAt: "2026-03-17T08:01:00.000Z",
        },
      ],
    };

    const deps = createDependencies({
      listSessions: vi.fn().mockResolvedValue([
        {
          id: demoDetail.id,
          title: demoDetail.title,
          createdAt: demoDetail.createdAt,
          updatedAt: demoDetail.updatedAt,
          lastLevel: demoDetail.lastLevel,
          messageCount: demoDetail.messages.length,
        },
      ]),
      getSession: vi.fn().mockResolvedValue(demoDetail),
    });

    const { result } = renderHook(() =>
      useWorkspaceSessionController({
        enabled: true,
        dependencies: deps,
      })
    );

    await waitFor(() => {
      expect(result.current.currentSessionId).toBe(demoDetail.id);
    });

    expect(result.current.messages.map((message) => message.content)).toEqual([
      "欢迎进入前端开发入门学习。",
      "先从 HTML 语义化结构开始。",
    ]);
    expect(deps.getSession).toHaveBeenCalledWith(demoDetail.id);
  });
});

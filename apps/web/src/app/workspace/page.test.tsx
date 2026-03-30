// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import WorkspacePage from "./page";

import { useSession } from "next-auth/react";
import { useWorkspaceSessionController } from "@/lib/workspace/use-workspace-session-controller";
import { fetchDocumentsFromServer } from "@/lib/client/kb-storage";
import { saveReplyAsKBDocument } from "@/lib/client/workspace-kb-adapter";
import { toast } from "sonner";

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("framer-motion", async () => {
  const React = await import("react");

  const stripMotionProps = (props: Record<string, unknown>) => {
    const {
      initial,
      animate,
      exit,
      transition,
      whileHover,
      whileTap,
      layout,
      layoutId,
      drag,
      dragConstraints,
      dragElastic,
      dragMomentum,
      ...rest
    } = props;
    return rest;
  };

  const create = (tag: string) =>
    React.forwardRef<any, any>(({ children, ...props }, ref) =>
      React.createElement(tag, { ref, ...stripMotionProps(props) }, children)
    );

  const motion = new Proxy(
    {},
    {
      get: (_target, prop) => create(String(prop)),
    }
  );

  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, title, ...rest }: any) => (
    <button onClick={onClick} disabled={disabled} title={title} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ id, checked, onCheckedChange, disabled }: any) => (
    <input
      type="checkbox"
      id={id}
      aria-label={id}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onCheckedChange((e.target as HTMLInputElement).checked)}
    />
  ),
}));

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor, className }: any) => (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
}));

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ value, onChange, onKeyDown, disabled, placeholder }: any) => (
    <textarea
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      disabled={disabled}
      placeholder={placeholder}
    />
  ),
}));

vi.mock("@/components/markdown-renderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock("@/lib/client/model-config", () => ({
  getModelConfig: () => ({}),
}));

vi.mock("@/components/workspace/kb-document-picker", () => ({
  KBDocumentPicker: ({ documents, selectedDocIds, onChange }: any) => (
    <div>
      <button type="button" onClick={() => onChange(documents.slice(1, 2).map((doc: any) => doc.id))}>
        select-subset
      </button>
      <span>{selectedDocIds.join(",")}</span>
    </div>
  ),
}));

vi.mock("@/lib/client/workspace-kb-adapter", () => ({
  saveReplyAsKBDocument: vi.fn(),
}));

vi.mock("@/lib/client/kb-storage", () => ({
  fetchDocumentsFromServer: vi.fn().mockResolvedValue([
    { id: "kb_doc_1", title: "Doc 1", content: "one", tags: [], createdAt: "2026-03-17T10:00:00.000Z", updatedAt: "2026-03-17T10:00:00.000Z" },
    { id: "kb_doc_2", title: "Doc 2", content: "two", tags: [], createdAt: "2026-03-17T10:01:00.000Z", updatedAt: "2026-03-17T10:01:00.000Z" },
  ]),
}));

vi.mock("@/lib/workspace/teacher-storage", () => ({
  getAllTeachers: vi.fn().mockResolvedValue([
    {
      id: "t1",
      name: "Teacher",
      avatar: "T",
      teachingStyle: "direct",
      description: "desc",
    },
  ]),
}));

vi.mock("@/lib/workspace/chat-history-storage", () => ({
  exportChatSessionAsMarkdown: () => "",
}));

vi.mock("@/lib/workspace/use-workspace-session-controller", () => ({
  useWorkspaceSessionController: vi.fn(),
}));

describe("WorkspacePage KB save button behavior", () => {
  let controller: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (useSession as any).mockReturnValue({
      status: "authenticated",
      data: { user: { name: "u" } },
    });

    vi.stubGlobal("fetch", vi.fn());
    Element.prototype.scrollIntoView = vi.fn();

    controller = {
      currentSessionId: "s1",
      currentSession: { id: "s1", title: "Session 1", createdAt: new Date(), updatedAt: new Date() },
      recentSessions: [
        {
          id: "s1",
          title: "Session 1",
          messageCount: 2,
          updatedAt: new Date().toISOString(),
        },
        {
          id: "s2",
          title: "Session 2",
          messageCount: 0,
          updatedAt: new Date().toISOString(),
        },
      ],
      messages: [
        {
          id: "m1",
          role: "user",
          mode: "normal",
          content: "What is a closure?",
          timestamp: new Date("2026-03-27T00:00:00.000Z"),
        },
        {
          id: "m2",
          role: "assistant",
          mode: "normal",
          content: "A closure is...",
          timestamp: new Date("2026-03-27T00:00:10.000Z"),
        },
      ],
      isLoading: false,
      refreshSessions: vi.fn().mockResolvedValue(undefined),
      selectSession: vi.fn().mockResolvedValue(undefined),
      startNewConversation: vi.fn().mockResolvedValue(undefined),
      deleteSession: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue(undefined),
    };

    (useWorkspaceSessionController as any).mockReturnValue(controller);
  });

  afterEach(() => {
    cleanup();
  });

  it("shows save button only when saveToKB=true, kbQAMode=false, and message role=assistant", async () => {
    render(<WorkspacePage />);

    expect(screen.queryByText("保存到知识库")).toBeNull();

    fireEvent.click(screen.getByLabelText("save-to-kb"));

    await waitFor(() => {
      expect(screen.getAllByText("保存到知识库")).toHaveLength(1);
    });
  });

  it("loads KB docs from the server for KB QA mode", async () => {
    render(<WorkspacePage />);

    fireEvent.click(screen.getByLabelText("kb-qa-mode"));

    await waitFor(() => {
      expect(screen.getByText("kb_doc_1,kb_doc_2")).toBeDefined();
    });

    expect(fetchDocumentsFromServer).toHaveBeenCalledTimes(1);
  });

  it("passes the full KB corpus separately from the selected docs when sending KB QA", async () => {
    controller.sendMessage = vi.fn().mockResolvedValue(undefined);

    render(<WorkspacePage />);

    fireEvent.click(screen.getByLabelText("kb-qa-mode"));

    await waitFor(() => {
      expect(screen.getByText(/知识库问答模式/)).toBeDefined();
    });

    fireEvent.click(screen.getByText("select-subset"));

    await waitFor(() => {
      expect(screen.getByText("kb_doc_2")).toBeDefined();
    });

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "Explain the selected docs" } });

    const sendButton = screen
      .getAllByRole("button")
      .find((button) => button.querySelector("svg.lucide-send"));
    expect(sendButton).toBeDefined();
    fireEvent.click(sendButton!);

    await waitFor(() => {
      expect(controller.sendMessage).toHaveBeenCalledTimes(1);
    });

    expect(controller.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        kbQAMode: true,
        kbDocuments: expect.arrayContaining([
          expect.objectContaining({ id: "kb_doc_1" }),
          expect.objectContaining({ id: "kb_doc_2" }),
        ]),
        selectedKBDocuments: expect.arrayContaining([
          expect.objectContaining({ id: "kb_doc_2" }),
        ]),
      })
    );
  });

  it("does not show save button when kbQAMode=true", async () => {
    render(<WorkspacePage />);

    fireEvent.click(screen.getByLabelText("save-to-kb"));
    await waitFor(() => {
      expect(screen.getByText("保存到知识库")).toBeDefined();
    });

    fireEvent.click(screen.getByLabelText("kb-qa-mode"));
    await waitFor(() => {
      expect(screen.queryByText("保存到知识库")).toBeNull();
    });
  });

  it("resets saving/saved state when switching sessions", async () => {
    (saveReplyAsKBDocument as any).mockResolvedValue({ ok: true, documentId: "doc-1" });

    render(<WorkspacePage />);

    fireEvent.click(screen.getByLabelText("save-to-kb"));
    expect(screen.getByText("保存到知识库")).toBeDefined();

    fireEvent.click(screen.getByText("保存到知识库"));

    await waitFor(() => {
      expect(saveReplyAsKBDocument).toHaveBeenCalledTimes(1);
      expect(screen.getByText("已保存")).toBeDefined();
    });

    fireEvent.click(screen.getByText("Session 2"));

    await waitFor(() => {
      expect(controller.selectSession).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("已保存")).toBeNull();
      expect(screen.getByText("保存到知识库")).toBeDefined();
    });

    await new Promise((resolve) => setTimeout(resolve, 2100));
  });

  it("first save auto-creates vault when no current vault exists and shows success toast", async () => {
    (saveReplyAsKBDocument as any).mockResolvedValue({ ok: true, documentId: "doc_new" });

    render(<WorkspacePage />);

    fireEvent.click(screen.getByLabelText("save-to-kb"));

    await waitFor(() => {
      expect(screen.getByText("保存到知识库")).toBeDefined();
    });

    fireEvent.click(screen.getByText("保存到知识库"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("已保存到知识宝库");
    });

    expect(saveReplyAsKBDocument).toHaveBeenCalledTimes(1);
    expect(screen.getByText("已保存")).toBeDefined();
  });

  it("shows error toast when saveReplyAsKBDocument returns ok=false and does not show 已保存", async () => {
    (saveReplyAsKBDocument as any).mockResolvedValue({ ok: false, error: "请先登录后再保存到知识宝库" });

    render(<WorkspacePage />);

    fireEvent.click(screen.getByLabelText("save-to-kb"));

    await waitFor(() => {
      expect(screen.getByText("保存到知识库")).toBeDefined();
    });

    fireEvent.click(screen.getByText("保存到知识库"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("请先登录后再保存到知识宝库");
    });

    expect(screen.queryByText("已保存")).toBeNull();
  });

  it("shows error toast when saveReplyAsKBDocument throws and does not show 已保存", async () => {
    (saveReplyAsKBDocument as any).mockRejectedValue(new Error("网络错误"));

    render(<WorkspacePage />);

    fireEvent.click(screen.getByLabelText("save-to-kb"));

    await waitFor(() => {
      expect(screen.getByText("保存到知识库")).toBeDefined();
    });

    fireEvent.click(screen.getByText("保存到知识库"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("保存失败: 网络错误");
    });

    expect(screen.queryByText("已保存")).toBeNull();
  });
});

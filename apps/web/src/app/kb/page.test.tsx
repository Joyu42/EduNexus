// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";

import KnowledgeBasePage from "./page";

import { useSession } from "next-auth/react";
import { useDocument } from "@/lib/ai/document-context";
import {
  fetchDocumentsFromServer,
  getKBStorage,
} from "@/lib/client/kb-storage";

const kbLayoutRenderSpy = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/lib/ai/document-context", () => ({
  useDocument: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...rest }: any) => (
    <button onClick={onClick} {...rest}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, placeholder, ...rest }: any) => (
    <input value={value} onChange={onChange} placeholder={placeholder} {...rest} />
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: (props: any) => <hr {...props} />,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div role="menuitem" onClick={onClick}>
      {children}
    </div>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <div>{children}</div>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/kb/kb-layout", async () => {
  const React = await import("react");
  const actualSidebar = await vi.importActual<any>("@/components/kb/kb-sidebar");
  const KBSidebar = actualSidebar.KBSidebar;

  return {
    KBLayout: (props: any) => {
      kbLayoutRenderSpy(props);
      return (
        <div data-testid="kb-layout">
          <KBSidebar
            vaults={props.vaults}
            currentVault={props.currentVault}
            documents={props.documents}
            currentDoc={props.currentDoc}
            onVaultChange={props.onVaultChange}
            onCreateDocument={props.onCreateDocument}
            onDeleteDocument={props.onDeleteDocument}
            onSelectDocument={props.onSelectDocument}
          />
        </div>
      );
    },
  };
});

vi.mock("@/lib/client/kb-storage", () => ({
  fetchDocumentsFromServer: vi.fn(),
  createDocumentOnServer: vi.fn(),
  updateDocumentOnServer: vi.fn(),
  deleteDocumentOnServer: vi.fn(),
  getKBStorage: vi.fn(),
}));

describe("KnowledgeBasePage server workspace docs visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useSession as any).mockReturnValue({ status: "authenticated" });
    (useDocument as any).mockReturnValue({ setCurrentDocument: vi.fn() });

    (getKBStorage as any).mockReturnValue({
      getDocumentsByVault: vi.fn().mockResolvedValue([
        {
          id: "local_doc_ws",
          title: "How does closure work in JavaScript?",
          content: "LOCAL: should be ignored",
          tags: ["workspace-saved", "source:workspace"],
          createdAt: new Date("2026-03-01T00:00:00.000Z"),
          updatedAt: new Date("2026-03-02T00:00:00.000Z"),
          vaultId: "local-vault",
        },
      ]),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows server-saved workspace doc in 所有文档 and updatedAt-sorted 最近访问", async () => {
    const olderDoc = {
      id: "doc_old",
      title: "Older document",
      content: "Old content",
      tags: ["tag-old"],
      createdAt: "2026-03-10T00:00:00.000Z",
      updatedAt: "2026-03-10T00:00:00.000Z",
    };

    const workspaceDoc = {
      id: "doc_ws",
      title: "How does closure work in JavaScript?",
      content: "A closure is ... (from workspace)",
      tags: ["workspace-saved", "source:workspace"],
      createdAt: "2026-03-20T00:00:00.000Z",
      updatedAt: "2026-03-27T12:00:00.000Z",
    };

    (fetchDocumentsFromServer as any).mockResolvedValue([olderDoc, workspaceDoc]);

    render(<KnowledgeBasePage />);

    await waitFor(() => {
      expect(fetchDocumentsFromServer).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("kb-layout")).toBeDefined();
    });

    await waitFor(() => {
      expect(kbLayoutRenderSpy).toHaveBeenCalled();
      const lastProps = kbLayoutRenderSpy.mock.calls.at(-1)?.[0];
      expect(lastProps.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: workspaceDoc.id,
            title: workspaceDoc.title,
            content: workspaceDoc.content,
            tags: workspaceDoc.tags,
            vaultId: "server-vault",
            createdAt: new Date(workspaceDoc.createdAt),
            updatedAt: new Date(workspaceDoc.updatedAt),
          }),
        ])
      );
    });

    const recentButton = screen.getByRole("button", { name: /最近访问/ });
    const recentSection = recentButton.parentElement;
    expect(recentSection).toBeTruthy();

    const recentWorkspaceTitle = within(recentSection as HTMLElement).getByText(workspaceDoc.title);
    const recentOlderTitle = within(recentSection as HTMLElement).getByText(olderDoc.title);
    expect(recentWorkspaceTitle.compareDocumentPosition(recentOlderTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const allButton = screen.getByRole("button", { name: /所有文档/ });
    const allSection = allButton.parentElement;
    expect(allSection).toBeTruthy();
    expect(within(allSection as HTMLElement).getByText(workspaceDoc.title)).toBeDefined();
  });

  it("ignores local vault documents when server returns empty", async () => {
    (fetchDocumentsFromServer as any).mockResolvedValue([]);

    render(<KnowledgeBasePage />);

    await waitFor(() => {
      expect(fetchDocumentsFromServer).toHaveBeenCalledTimes(1);
      expect(screen.getByText("知识库还是空的")).toBeDefined();
    });

    expect(getKBStorage).not.toHaveBeenCalled();
    expect(screen.queryByText("How does closure work in JavaScript?")).toBeNull();
    expect(screen.queryByTestId("kb-layout")).toBeNull();
  });

  it("shows error toast and no documents when fetchDocumentsFromServer rejects", async () => {
    const { toast } = await import("sonner");
    (fetchDocumentsFromServer as any).mockRejectedValue(
      new Error("获取文档列表失败。")
    );

    render(<KnowledgeBasePage />);

    await waitFor(() => {
      expect(fetchDocumentsFromServer).toHaveBeenCalledTimes(1);
    });

    // Should show loading complete (empty state, not stale data)
    expect(screen.queryByTestId("kb-layout")).toBeNull();
    // Should NOT have rendered any document title from stale state
    expect(screen.queryByText("How does closure work in JavaScript?")).toBeNull();
  });
});

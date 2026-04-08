// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { KBLayout } from "./kb-layout";

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> },
}));

vi.mock("./kb-sidebar", () => ({
  KBSidebar: () => <div data-testid="sidebar" />,
}));

vi.mock("./kb-editor", () => ({
  KBEditor: ({ mode, onModeChange }: any) => (
    <div data-testid="kb-editor" data-mode={mode}>
      <button type="button" onClick={() => onModeChange?.("source")}>source</button>
      <button type="button" onClick={() => onModeChange?.("render")}>render</button>
    </div>
  ),
}));

vi.mock("./kb-right-panel", () => ({
  KBRightPanel: ({ onOutlineNavigate }: any) => (
    <div data-testid="kb-right-panel">
      <button type="button" onClick={() => onOutlineNavigate?.("heading-live-title")}>outline item</button>
    </div>
  ),
}));

vi.mock("@/lib/hooks/use-kb-shortcuts", () => ({
  useKBShortcuts: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe("KBLayout", () => {
  it("switches the editor into render mode before jumping to the heading anchor", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const getElementById = vi.spyOn(document, "getElementById").mockImplementation((id) =>
      id === "heading-live-title"
        ? ({
            getBoundingClientRect: () => ({ top: 120 }),
            classList: { add: vi.fn(), remove: vi.fn() },
          } as any)
        : null
    );

    render(
      <KBLayout
        vaults={[]}
        currentVault={null}
        documents={[]}
        currentDoc={{
          id: "doc-1",
          title: "Doc",
          content: "# Live Title",
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          vaultId: "vault-1",
        }}
        onVaultChange={vi.fn()}
        onCreateDocument={vi.fn()}
        onUpdateDocument={vi.fn()}
        onDeleteDocument={vi.fn()}
        onDeleteDocuments={vi.fn()}
        onSelectDocument={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "outline item" }));

    expect(screen.getByTestId("kb-editor").getAttribute("data-mode")).toBe("render");
    expect(scrollTo).toHaveBeenCalled();
    expect(getElementById).toHaveBeenCalledWith("heading-live-title");
  });
});

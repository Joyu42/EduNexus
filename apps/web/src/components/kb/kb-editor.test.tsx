// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { KBEditor } from "./kb-editor";

const editorToolbarRenderSpy = vi.hoisted(() => vi.fn());
const markdownRendererRenderSpy = vi.hoisted(() => vi.fn());

vi.mock("@tiptap/react", () => ({
  useEditor: vi.fn(() => ({
    chain: () => ({ focus: () => ({ run: vi.fn() }) }),
    commands: { setContent: vi.fn() },
    getText: () => "hello world",
    getHTML: () => "<p>hello world</p>",
    can: () => ({ undo: () => false, redo: () => false }),
    isActive: () => false,
  })),
  EditorContent: () => <div data-testid="editor-content" />,
}));

vi.mock("./editor-toolbar", () => ({
  EditorToolbar: (props: any) => {
    editorToolbarRenderSpy(props);
    return (
      <div data-testid="editor-toolbar">
        <button type="button" onClick={() => props.onModeChange?.("source")}>源码</button>
        <button type="button" onClick={() => props.onModeChange?.("render")}>渲染</button>
      </div>
    );
  },
}));

vi.mock("@/components/markdown-renderer", () => ({
  MarkdownRenderer: (props: any) => {
    markdownRendererRenderSpy(props);
    return <div data-testid="markdown-renderer" data-content={props.content} />;
  },
}));

vi.mock("@/lib/sync", () => ({
  useKBDocumentSync: vi.fn(),
}));

vi.mock("@/lib/tiptap/markdown-shortcuts", () => ({
  MarkdownShortcuts: {},
}));

vi.mock("@/lib/tiptap/heading-with-id", () => ({
  HeadingWithId: { configure: vi.fn(() => ({ name: "heading-with-id" })) },
}));

vi.mock("@tiptap/starter-kit", () => ({
  default: { configure: vi.fn(() => ({ name: "starter-kit" })) },
}));

vi.mock("@tiptap/extension-placeholder", () => ({
  default: { configure: vi.fn(() => ({ name: "placeholder" })) },
}));

vi.mock("@tiptap/extension-link", () => ({
  default: { configure: vi.fn(() => ({ name: "link" })) },
}));

vi.mock("@tiptap/extension-image", () => ({
  default: { configure: vi.fn(() => ({ name: "image" })) },
}));

vi.mock("@tiptap/extension-table", () => ({
  Table: { configure: vi.fn(() => ({ name: "table" })) },
}));

vi.mock("@tiptap/extension-table-row", () => ({
  TableRow: { name: "table-row" },
}));

vi.mock("@tiptap/extension-table-cell", () => ({
  TableCell: { name: "table-cell" },
}));

vi.mock("@tiptap/extension-table-header", () => ({
  TableHeader: { name: "table-header" },
}));

vi.mock("@tiptap/extension-task-list", () => ({
  TaskList: { name: "task-list" },
}));

vi.mock("@tiptap/extension-task-item", () => ({
  TaskItem: { configure: vi.fn(() => ({ name: "task-item" })) },
}));

vi.mock("lucide-react", () => ({
  FileText: () => <svg data-testid="file-text-icon" />,
}));

describe("KBEditor mode shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("defaults to 源码 and preserves the markdown string across mode switches", () => {
    render(
      <KBEditor
        document={{
          id: "doc-1",
          title: "Doc",
          content: "# Title\n\nHello **world**",
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          vaultId: "vault-1",
        }}
        onUpdate={vi.fn()}
      />
    );

    const sourceButton = screen.getByRole("button", { name: "源码" });
    const renderButton = screen.getByRole("button", { name: "渲染" });
    expect(sourceButton).toBeDefined();
    expect(renderButton).toBeDefined();

    const sourceArea = screen.getByRole("textbox", { name: "Markdown source" });
    expect((sourceArea as HTMLTextAreaElement).value).toBe("# Title\n\nHello **world**");

    fireEvent.change(sourceArea, { target: { value: "# Title\n\nHello **world**!" } });
    fireEvent.click(renderButton);

    expect(markdownRendererRenderSpy).toHaveBeenCalledWith(
      expect.objectContaining({ content: "# Title\n\nHello **world**!" })
    );
    expect(screen.getByTestId("markdown-renderer").getAttribute("data-content")).toBe(
      "# Title\n\nHello **world**!"
    );

    fireEvent.click(sourceButton);
    expect(
      (screen.getByRole("textbox", { name: "Markdown source" }) as HTMLTextAreaElement).value
    ).toBe("# Title\n\nHello **world**!");
  });
});

// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import {
  mapLegacyNodeIdToDocumentId,
  normalizeGraphToKbHandoff,
  resolveRequestedKbDocument,
} from "./handoff";
import { KBEditor } from "../../components/kb/kb-editor";

const markdownPreviewRenderSpy = vi.hoisted(() => vi.fn());

vi.mock("../../components/kb/kb-markdown-preview", () => ({
  KBMarkdownPreview: (props: any) => {
    markdownPreviewRenderSpy(props);
    return React.createElement("div", {
      "data-testid": "markdown-preview",
      "data-content": props.content,
    });
  },
}));

vi.mock("@/lib/sync", () => ({
  useKBDocumentSync: vi.fn(),
}));

vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();

  return {
    ...actual,
    FileText: () => React.createElement("svg", { "data-testid": "file-text-icon" }),
  };
});

describe("normalizeGraphToKbHandoff", () => {
  it("prioritizes the document-centric doc param", () => {
    expect(normalizeGraphToKbHandoff({ doc: "doc-1", node: "node-1" })).toEqual({
      requestedDocumentId: "doc-1",
      source: "doc",
    });
  });

  it("translates legacy node param to canonical document identity", () => {
    expect(normalizeGraphToKbHandoff({ node: "kg_doc-2" })).toEqual({
      requestedDocumentId: "doc-2",
      source: "node",
    });
  });

  it("trims direct doc params before resolving", () => {
    expect(normalizeGraphToKbHandoff({ doc: "  doc-1  " })).toEqual({
      requestedDocumentId: "doc-1",
      source: "doc",
    });
  });

  it("falls back to translated legacy node when doc param is blank", () => {
    expect(normalizeGraphToKbHandoff({ doc: "   ", node: "kg_doc-2" })).toEqual({
      requestedDocumentId: "doc-2",
      source: "node",
    });
  });

  it("returns null handoff when both doc and node params are empty", () => {
    expect(normalizeGraphToKbHandoff({ doc: "", node: "   " })).toEqual({
      requestedDocumentId: null,
      source: null,
    });
  });
});

describe("mapLegacyNodeIdToDocumentId", () => {
  it("returns null for empty legacy prefixes", () => {
    expect(mapLegacyNodeIdToDocumentId("kg_   ")).toBeNull();
  });

  it("passes through non-prefixed node ids for backward compatibility", () => {
    expect(mapLegacyNodeIdToDocumentId("doc-raw")).toBe("doc-raw");
  });
});

describe("resolveRequestedKbDocument", () => {
  const docs = [
    { id: "doc-1", title: "Doc 1" },
    { id: "doc-2", title: "Doc 2" },
  ];

  it("resolves an existing requested document", () => {
    expect(resolveRequestedKbDocument(docs, "doc-2")?.id).toBe("doc-2");
  });

  it("returns null for missing requested document", () => {
    expect(resolveRequestedKbDocument(docs, "doc-missing")).toBeNull();
  });

  it("matches by exact id and does not resolve partial aliases", () => {
    const scopedDocs = [
      { id: "doc-1", title: "Doc 1" },
      { id: "doc-10", title: "Doc 10" },
    ];

    expect(resolveRequestedKbDocument(scopedDocs, "doc-1")?.id).toBe("doc-1");
    expect(resolveRequestedKbDocument(scopedDocs, "doc")).toBeNull();
  });
});

describe("KBEditor persistence wiring", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("preserves unsaved markdown across mode switches and debounces save", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);

    render(
      React.createElement(KBEditor, {
        document: {
          id: "doc-1",
          title: "Doc",
          content: "# Title\n\nHello",
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          vaultId: "vault-1",
        },
        onUpdate,
      })
    );

    const sourceArea = screen.getByRole("textbox", { name: "Markdown source" }) as HTMLTextAreaElement;
    expect(sourceArea.value).toBe("# Title\n\nHello");
    expect(screen.getByText("未保存")).toBeDefined();

    fireEvent.change(sourceArea, { target: { value: "# Title\n\nHello\n\nDraft" } });
    expect(onUpdate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "渲染" }));
    expect(screen.getByTestId("markdown-preview").getAttribute("data-content")).toBe(
      "# Title\n\nHello\n\nDraft"
    );

    fireEvent.click(screen.getByRole("button", { name: "源码" }));
    expect((screen.getByRole("textbox", { name: "Markdown source" }) as HTMLTextAreaElement).value).toBe(
      "# Title\n\nHello\n\nDraft"
    );

    await act(async () => {
      vi.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ content: "# Title\n\nHello\n\nDraft" })
    );
    expect(screen.getByText("已保存")).toBeDefined();
  });
});

// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { KBDocumentPicker } from "./kb-document-picker";
import type { KBDocument } from "@/lib/client/kb-storage";

const mockDocs: KBDocument[] = [
  {
    id: "doc1",
    title: "React Hooks Guide",
    content: "Content 1",
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    vaultId: "vault1",
  },
  {
    id: "doc2",
    title: "Next.js App Router",
    content: "Content 2",
    tags: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    vaultId: "vault1",
  },
];

describe("KBDocumentPicker", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders a compact trigger showing the number of selected documents", () => {
    render(
      <KBDocumentPicker
        documents={mockDocs}
        selectedDocIds={["doc1", "doc2"]}
        onChange={() => {}}
      />
    );
    
    expect(screen.getByRole("button").textContent).toContain("文档 2 篇");
  });

  it("opens popover and shows document checkboxes when clicked", () => {
    render(
      <KBDocumentPicker
        documents={mockDocs}
        selectedDocIds={["doc1", "doc2"]}
        onChange={() => {}}
      />
    );
    
    fireEvent.click(screen.getByRole("button"));
    
    expect(screen.getByText("React Hooks Guide")).toBeTruthy();
    expect(screen.getByText("Next.js App Router")).toBeTruthy();
  });

  it("calls onChange when a document is toggled", () => {
    const handleChange = vi.fn();
    render(
      <KBDocumentPicker
        documents={mockDocs}
        selectedDocIds={["doc1", "doc2"]}
        onChange={handleChange}
      />
    );
    
    fireEvent.click(screen.getByRole("button"));
    
    const checkbox1 = screen.getByLabelText("React Hooks Guide");
    fireEvent.click(checkbox1);
    
    expect(handleChange).toHaveBeenCalledWith(["doc2"]);
  });

  it("shows an error state when no documents are selected", () => {
    render(
      <KBDocumentPicker
        documents={mockDocs}
        selectedDocIds={[]}
        onChange={() => {}}
      />
    );
    
    const trigger = screen.getByRole("button");
    expect(trigger.textContent).toContain("请选择文档");
    expect(trigger.className).toContain("text-red-500");
  });
});


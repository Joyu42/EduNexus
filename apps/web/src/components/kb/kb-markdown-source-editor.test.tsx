// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { KBMarkdownSourceEditor } from "./kb-markdown-source-editor";

afterEach(() => {
  cleanup();
});

describe("KBMarkdownSourceEditor", () => {
  it("renders a controlled textarea with an accessible label", () => {
    render(
      <KBMarkdownSourceEditor
        id="kb-markdown-source"
        label="Markdown source"
        value={"# Title\n\nBody"}
        onChange={vi.fn()}
      />,
    );

    const textarea = screen.getByLabelText("Markdown source");

    expect((textarea as HTMLTextAreaElement).id).toBe("kb-markdown-source");
    expect((textarea as HTMLTextAreaElement).getAttribute("aria-label")).toBe("Markdown source");
    expect((textarea as HTMLTextAreaElement).value).toBe("# Title\n\nBody");
  });

  it("preserves multiline markdown when editing", () => {
    const onChange = vi.fn();

    render(
      <KBMarkdownSourceEditor
        id="kb-markdown-source"
        label="Markdown source"
        value=""
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Markdown source"), {
      target: { value: "# Heading\n\n- item 1\n- item 2" },
    });

    expect(onChange).toHaveBeenCalledWith("# Heading\n\n- item 1\n- item 2");
  });

  it("reflects updated controlled value props", () => {
    const { rerender } = render(
      <KBMarkdownSourceEditor
        id="kb-markdown-source"
        label="Markdown source"
        value="Original"
        onChange={vi.fn()}
      />,
    );

    rerender(
      <KBMarkdownSourceEditor
        id="kb-markdown-source"
        label="Markdown source"
        value="Updated\nContent"
        onChange={vi.fn()}
      />,
    );

    expect(
      (screen.getByLabelText("Markdown source") as HTMLTextAreaElement).value.replace(/\n/g, "\\n"),
    ).toBe("Updated\\nContent");
  });
});

// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { KBMarkdownPreview } from "./kb-markdown-preview";

afterEach(() => {
  cleanup();
});

describe("KBMarkdownPreview", () => {
  it("renders headings from markdown", () => {
    render(<KBMarkdownPreview content="# 标题" />);

    expect(screen.getByRole("heading", { level: 1, name: "标题" })).toBeDefined();
  });

  it("renders lists from markdown", () => {
    render(<KBMarkdownPreview content="- a\n- b" />);

    const list = screen.getByRole("list");
    expect(list.textContent).toContain("a");
    expect(list.textContent).toContain("b");
  });

  it("does not throw for malformed markdown", () => {
    expect(() => render(<KBMarkdownPreview content="**未闭合" />)).not.toThrow();
    expect(screen.getByText("**未闭合")).toBeDefined();
  });
});

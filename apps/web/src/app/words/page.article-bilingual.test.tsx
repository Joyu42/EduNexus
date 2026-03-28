// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, screen, fireEvent, waitFor } from "@testing-library/react";

import { DailyArticlePreviewDialog } from "../../components/words/daily-article-preview";

vi.mock("@/components/markdown-renderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div data-testid="markdown-renderer">{content}</div>
}));

describe("DailyArticlePreviewDialog", () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders standard content and allows save", () => {
    render(
      <DailyArticlePreviewDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        generatedTitle="今日学词"
        articleContent="### 中文内容\n你好\n### 英文内容\nHello"
        learnedWords={["你好", "Hello"]}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText("今日学词")).toBeDefined();
    
    expect(screen.getByRole("switch")).toBeDefined();
    
    fireEvent.click(screen.getByRole("button", { name: /保存到知识宝库/i }));
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it("toggles bilingual mode and shows full article sections", async () => {
    const bilingualContent = `
### 中文内容

第一段中文内容。

第二段中文内容。

### 英文内容

First English paragraph.

Second English paragraph.
`;

    render(
      <DailyArticlePreviewDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        generatedTitle="今日学词"
        articleContent={bilingualContent}
        learnedWords={["第一段", "Second", "内容"]}
        onSave={mockOnSave}
      />
    );

    const toggle = screen.getByRole("switch") as HTMLButtonElement;
    expect(toggle.getAttribute("aria-checked")).toBe("false");

    expect(screen.getByTestId("markdown-renderer").textContent).toContain("**第一段**中文**内容**。\n\n第二段中文**内容**。");
    expect(screen.getByTestId("markdown-renderer").textContent).not.toContain("First English paragraph");

    fireEvent.click(toggle);

    await waitFor(() => {
      const elements = screen.getAllByTestId("markdown-renderer");
      expect(elements).toHaveLength(2); // One for Chinese, one for English
      
      const zhSection = elements[0].textContent;
      const enSection = elements[1].textContent;
      
      expect(zhSection).toContain("**第一段**中文**内容**。\n\n第二段中文**内容**。");
      expect(enSection).toContain("First English paragraph.\n\n**Second** English paragraph.");
    });
  });

  it("falls back gracefully when translation section is missing", () => {
    const missingTranslation = `
### 中文内容

这里只有中文，没有英文。
`;

    render(
      <DailyArticlePreviewDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        generatedTitle="今日学词"
        articleContent={missingTranslation}
        learnedWords={["只有", "英文"]}
        onSave={mockOnSave}
      />
    );

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);

    expect(screen.getByText(/未能提取到中英对照内容，可能生成结果缺少英文部分/i)).toBeDefined();
    
    fireEvent.click(screen.getByRole("button", { name: /保存到知识宝库/i }));
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });
});

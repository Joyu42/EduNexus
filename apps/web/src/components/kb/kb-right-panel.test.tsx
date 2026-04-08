// @vitest-environment jsdom
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KBRightPanel } from "./kb-right-panel";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("./ai-summary-enhanced", () => ({
  AISummaryEnhanced: () => <div data-testid="ai-summary">Summary Mock</div>,
}));

describe("KBRightPanel", () => {
  it("renders only Outline and Summary tabs", () => {
    const doc = {
      id: "doc-1",
      title: "Doc Title",
      content: "# Heading\nContent",
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    render(<KBRightPanel document={doc} draftContent="# Heading\nContent" />);
    
    // Check tabs
    expect(screen.getByRole("tab", { name: /大纲/ })).toBeDefined();
    expect(screen.getByRole("tab", { name: /摘要/ })).toBeDefined();
    
    // Check old tabs are gone
    expect(screen.queryByRole("tab", { name: /属性/ })).toBeNull();
    expect(screen.queryByRole("tab", { name: /AI/ })).toBeNull();
  });
});

// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MarkdownRenderer } from "./markdown-renderer";
import { generateHeadingIdFromText } from "@/lib/client/document-outline";

afterEach(() => {
  cleanup();
});

describe("MarkdownRenderer", () => {
  it("renders shared heading ids for markdown headings", () => {
    render(<MarkdownRenderer content="# Rendered Title" />);

    expect(screen.getByRole("heading", { level: 1, name: "Rendered Title" }).id).toBe(
      generateHeadingIdFromText("Rendered Title", 0)
    );
  });

  it("renders deterministic unique ids for repeated headings across h1 through h6", () => {
    render(
      <MarkdownRenderer
        content={`# Repeat\n\n## Repeat\n\n### Repeat\n\n#### Repeat\n\n##### Repeat\n\n###### Repeat`}
      />
    );

    expect(screen.getByRole("heading", { level: 1, name: "Repeat" }).id).toBe(
      generateHeadingIdFromText("Repeat", 0)
    );
    expect(screen.getByRole("heading", { level: 2, name: "Repeat" }).id).toBe(
      generateHeadingIdFromText("Repeat", 1)
    );
    expect(screen.getByRole("heading", { level: 3, name: "Repeat" }).id).toBe(
      generateHeadingIdFromText("Repeat", 2)
    );
    expect(screen.getByRole("heading", { level: 4, name: "Repeat" }).id).toBe(
      generateHeadingIdFromText("Repeat", 3)
    );
    expect(screen.getByRole("heading", { level: 5, name: "Repeat" }).id).toBe(
      generateHeadingIdFromText("Repeat", 4)
    );
    expect(screen.getByRole("heading", { level: 6, name: "Repeat" }).id).toBe(
      generateHeadingIdFromText("Repeat", 5)
    );
  });
});

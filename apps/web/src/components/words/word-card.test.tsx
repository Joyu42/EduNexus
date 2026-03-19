// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WordCard } from "./word-card";

const baseWord = {
  phonetic: "/test/",
  example: "example",
  bookId: "book",
  difficulty: "easy" as const,
};

describe("WordCard", () => {
  it("resets definition visibility when the word changes", () => {
    const wordA = { ...baseWord, id: "a", word: "alpha", definition: "definition-a" };
    const wordB = { ...baseWord, id: "b", word: "beta", definition: "definition-b" };

    const { rerender } = render(<WordCard word={wordA} showDefinition={false} />);

    fireEvent.click(screen.getByRole("button", { name: /释义/i }));
    expect(screen.getByText("definition-a")).toBeDefined();

    rerender(<WordCard word={wordB} showDefinition={false} />);
    expect(screen.queryByText("definition-b")).toBeNull();
  });
});

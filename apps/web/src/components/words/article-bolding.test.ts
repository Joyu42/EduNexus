import { describe, it, expect } from "vitest";

import { boldLearnedWords } from "./article-bolding";

describe("boldLearnedWords", () => {
  it("prefers the longest overlapping match", () => {
    const result = boldLearnedWords("We studied article and art.", ["art", "article"]);

    expect(result).toBe("We studied **article** and **art**.");
  });

  it("uses english word boundaries and respects punctuation", () => {
    const result = boldLearnedWords("cat, cat! cat's scatter.", ["cat"]);

    expect(result).toBe("**cat**, **cat**! **cat**'s scatter.");
  });

  it("matches english words case-insensitively", () => {
    const result = boldLearnedWords("Cat, cAT, CAT!", ["cat"]);

    expect(result).toBe("**Cat**, **cAT**, **CAT**!");
  });

  it("does not wrap text that is already bold", () => {
    const result = boldLearnedWords("Already **cat** and **人工智能**.", ["cat", "人工智能"]);

    expect(result).toBe("Already **cat** and **人工智能**.");
  });
});

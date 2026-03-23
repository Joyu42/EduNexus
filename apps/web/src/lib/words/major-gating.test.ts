import { describe, expect, it } from "vitest";
import {
  filterBooksByMajor,
  isMajor,
  nextSelectedBookIdAfterVisibilityChange,
  pickFallbackBookId,
} from "./major-gating";
import type { WordBook } from "./types";

const makeBook = (id: string): WordBook => ({
  id,
  name: id,
  description: "",
  wordCount: 10,
  category: "general",
});

describe("isMajor", () => {
  it("returns true for valid majors", () => {
    expect(isMajor("computer")).toBe(true);
    expect(isMajor("electrical")).toBe(true);
    expect(isMajor("economics")).toBe(true);
    expect(isMajor("medical")).toBe(true);
  });
  it("returns false for invalid values", () => {
    expect(isMajor("invalid")).toBe(false);
    expect(isMajor("")).toBe(false);
    expect(isMajor("MEDICAL")).toBe(false);
  });
});

describe("filterBooksByMajor", () => {
  const allBooks: WordBook[] = [
    makeBook("cet4"),
    makeBook("cet6"),
    makeBook("builtin_book_medical"),
    makeBook("builtin_book_computer"),
    makeBook("builtin_book_economics"),
    makeBook("builtin_book_electrical"),
    makeBook("custom_book_1"),
  ];

  it("hides all 4 professional books when no major selected", () => {
    const result = filterBooksByMajor(allBooks, "");
    const ids = result.map((b) => b.id);
    expect(ids).not.toContain("builtin_book_medical");
    expect(ids).not.toContain("builtin_book_computer");
    expect(ids).not.toContain("builtin_book_economics");
    expect(ids).not.toContain("builtin_book_electrical");
    expect(ids).toContain("cet4");
    expect(ids).toContain("custom_book_1");
  });

  it("shows only builtin_book_medical when major=medical", () => {
    const result = filterBooksByMajor(allBooks, "medical");
    const ids = result.map((b) => b.id);
    expect(ids).toContain("builtin_book_medical");
    expect(ids).not.toContain("builtin_book_computer");
    expect(ids).not.toContain("builtin_book_economics");
    expect(ids).not.toContain("builtin_book_electrical");
    expect(ids).toContain("cet4");
    expect(ids).toContain("custom_book_1");
  });

  it("shows only builtin_book_computer when major=computer", () => {
    const result = filterBooksByMajor(allBooks, "computer");
    const ids = result.map((b) => b.id);
    expect(ids).toContain("builtin_book_computer");
    expect(ids).not.toContain("builtin_book_medical");
    expect(ids).not.toContain("builtin_book_economics");
    expect(ids).not.toContain("builtin_book_electrical");
  });
});

describe("pickFallbackBookId", () => {
  it("returns empty string for empty array", () => {
    expect(pickFallbackBookId([])).toBe("");
  });

  it("prefers custom_book_ over cet4", () => {
    const books = [makeBook("cet4"), makeBook("custom_book_abc")];
    expect(pickFallbackBookId(books)).toBe("custom_book_abc");
  });

  it("falls back to cet4 when no custom", () => {
    const books = [makeBook("cet6"), makeBook("cet4")];
    expect(pickFallbackBookId(books)).toBe("cet4");
  });

  it("returns first item when no custom and no cet4", () => {
    const books = [makeBook("builtin_book_medical"), makeBook("cet6")];
    expect(pickFallbackBookId(books)).toBe("builtin_book_medical");
  });
});

describe("nextSelectedBookIdAfterVisibilityChange", () => {
  const books = [
    makeBook("cet4"),
    makeBook("custom_book_1"),
    makeBook("builtin_book_medical"),
  ];

  it("returns empty string when visibleBooks is empty", () => {
    const result = nextSelectedBookIdAfterVisibilityChange({
      visibleBooks: [],
      selectedBookId: "cet4",
    });
    expect(result).toBe("");
  });

  it("keeps selectedBookId if it is visible", () => {
    const result = nextSelectedBookIdAfterVisibilityChange({
      visibleBooks: books,
      selectedBookId: "cet4",
    });
    expect(result).toBe("cet4");
  });

  it("falls back when selectedBookId is not visible", () => {
    const result = nextSelectedBookIdAfterVisibilityChange({
      visibleBooks: books,
      selectedBookId: "builtin_book_electrical",
    });
    expect(result).toBe("custom_book_1");
  });
});

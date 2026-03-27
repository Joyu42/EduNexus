import { describe, expect, it } from "vitest";
import {
  deriveMajorFromBookId,
  filterBooksByMajor,
  isMajor,
  nextSelectedBookIdAfterVisibilityChange,
  normalizePersistedSelection,
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

describe("deriveMajorFromBookId", () => {
  it("returns medical for builtin_book_medical", () => {
    expect(deriveMajorFromBookId("builtin_book_medical")).toBe("medical");
  });

  it("returns computer for builtin_book_computer", () => {
    expect(deriveMajorFromBookId("builtin_book_computer")).toBe("computer");
  });

  it("returns economics for builtin_book_economics", () => {
    expect(deriveMajorFromBookId("builtin_book_economics")).toBe("economics");
  });

  it("returns electrical for builtin_book_electrical", () => {
    expect(deriveMajorFromBookId("builtin_book_electrical")).toBe("electrical");
  });

  it("returns empty string for non-professional book id", () => {
    expect(deriveMajorFromBookId("cet4")).toBe("");
    expect(deriveMajorFromBookId("custom_book_foo")).toBe("");
  });
});

describe("normalizePersistedSelection", () => {
  const books: WordBook[] = [
    makeBook("cet4"),
    makeBook("builtin_book_medical"),
    makeBook("builtin_book_computer"),
    makeBook("builtin_book_economics"),
    makeBook("builtin_book_electrical"),
    makeBook("custom_book_foo"),
  ];

  // Case 1: professional book + matching major → unchanged
  it("case 1: professional book + matching major → unchanged", () => {
    const result = normalizePersistedSelection(
      "medical",
      "builtin_book_medical",
      books
    );
    expect(result.selectedMajor).toBe("medical");
    expect(result.selectedBookId).toBe("builtin_book_medical");
  });

  // Case 2: professional book + empty major → derive major from book
  it("case 2: professional book + empty major → derive major from book", () => {
    const result = normalizePersistedSelection(
      "",
      "builtin_book_computer",
      books
    );
    expect(result.selectedMajor).toBe("computer");
    expect(result.selectedBookId).toBe("builtin_book_computer");
  });

  // Case 3: professional book + mismatched major → repair to book's major
  it("case 3: professional book + mismatched major → repair to book's major", () => {
    const result = normalizePersistedSelection(
      "economics",
      "builtin_book_medical",
      books
    );
    expect(result.selectedMajor).toBe("medical");
    expect(result.selectedBookId).toBe("builtin_book_medical");
  });

  // Case 4: stored book missing + non-empty major → preserve major, pick fallback from filtered books
  it("case 4: stored book missing + non-empty major → preserve major, pick fallback from filtered books", () => {
    const result = normalizePersistedSelection(
      "computer",
      "builtin_book_nonexistent",
      books
    );
    // filterBooksByMajor(books, "computer") → [cet4, custom_book_foo]
    // fallback: custom_book_* > cet4 > first → custom_book_foo
    expect(result.selectedBookId).toBe("custom_book_foo");
    // major is preserved since it was valid
    expect(result.selectedMajor).toBe("computer");
  });

  // Case 4b: stored book missing + empty major → clear major, pick fallback from all non-pro books
  it("case 4b: stored book missing + empty major → clear major, pick fallback from non-pro books", () => {
    const result = normalizePersistedSelection(
      "",
      "builtin_book_nonexistent",
      books
    );
    // filterBooksByMajor(books, "") → [cet4, custom_book_foo] (all non-pro)
    // fallback: custom_book_foo
    expect(result.selectedBookId).toBe("custom_book_foo");
    expect(result.selectedMajor).toBe("");
  });

  // Case 5: non-professional stored book → preserve empty major
  it("case 5: non-professional stored book → preserve empty major", () => {
    const result = normalizePersistedSelection("", "cet4", books);
    expect(result.selectedMajor).toBe("");
    expect(result.selectedBookId).toBe("cet4");
  });

  it("non-professional stored book with existing major preserves both major and non-pro book", () => {
    const result = normalizePersistedSelection("medical", "cet4", books);
    expect(result.selectedMajor).toBe("medical");
    expect(result.selectedBookId).toBe("cet4");
  });
});

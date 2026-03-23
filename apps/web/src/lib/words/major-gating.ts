import type { WordBook } from "./types";

export type WordsMajor = "computer" | "electrical" | "economics" | "medical";

export const WORDS_MAJORS: readonly WordsMajor[] = ["computer", "electrical", "economics", "medical"];

export const PROFESSIONAL_BOOK_IDS: ReadonlySet<string> = new Set([
  "builtin_book_medical",
  "builtin_book_computer",
  "builtin_book_economics",
  "builtin_book_electrical",
]);

export const MAJOR_TO_PRO_BOOK_ID: Record<WordsMajor, string> = {
  medical: "builtin_book_medical",
  computer: "builtin_book_computer",
  economics: "builtin_book_economics",
  electrical: "builtin_book_electrical",
};

/** Type guard — returns true if value is a valid WordsMajor */
export function isMajor(value: string): value is WordsMajor {
  return value === "computer" || value === "electrical" || value === "economics" || value === "medical";
}

/**
 * Filter books based on selected major.
 * - major === "" → remove all professional books
 * - major !== "" → keep all non-professional books + only the ONE matching professional book
 */
export function filterBooksByMajor(books: WordBook[], major: WordsMajor | ""): WordBook[] {
  return books.filter((book) => {
    const isPro = PROFESSIONAL_BOOK_IDS.has(book.id);
    if (!isPro) return true; // always keep non-pro books
    if (major === "") return false; // no major selected → hide all pro books
    // major selected → keep only the matching one
    return book.id === MAJOR_TO_PRO_BOOK_ID[major];
  });
}

/**
 * Pick fallback bookId from visible books (same order as dashboard).
 * custom_book_* > cet4 > first item
 */
export function pickFallbackBookId(visibleBooks: WordBook[]): string {
  if (visibleBooks.length === 0) return "";
  const custom = visibleBooks.find((book) => book.id.startsWith("custom_book_"));
  if (custom) return custom.id;
  const cet4 = visibleBooks.find((book) => book.id === "cet4");
  if (cet4) return cet4.id;
  return visibleBooks[0].id;
}

export interface NextSelectedBookIdOptions {
  visibleBooks: WordBook[];
  selectedBookId: string;
  storedSelectedBookId?: string;
}

/**
 * Determine the next selectedBookId after visibleBooks may have changed.
 * Rules:
 * - If visibleBooks is empty → return ""
 * - If selectedBookId exists and is in visibleBooks → return selectedBookId
 * - Else if selectedBookId is empty and storedSelectedBookId exists and is in visibleBooks → return storedSelectedBookId
 * - Else → return pickFallbackBookId(visibleBooks)
 */
export function nextSelectedBookIdAfterVisibilityChange({
  visibleBooks,
  selectedBookId,
  storedSelectedBookId,
}: NextSelectedBookIdOptions): string {
  if (visibleBooks.length === 0) return "";
  const visibleIds = new Set(visibleBooks.map((b) => b.id));
  if (selectedBookId && visibleIds.has(selectedBookId)) return selectedBookId;
  if (!selectedBookId && storedSelectedBookId && visibleIds.has(storedSelectedBookId)) {
    return storedSelectedBookId;
  }
  return pickFallbackBookId(visibleBooks);
}

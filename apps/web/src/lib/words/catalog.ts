import { LOCAL_WORD_BOOK_SOURCES } from "@/data/words";

import type { Word, WordBook } from "./types";

export function listLocalWordBooks(): WordBook[] {
  return LOCAL_WORD_BOOK_SOURCES.map((source) => ({
    ...source.book,
    wordCount: source.words.length,
  }));
}

export function listAllLocalWords(): Word[] {
  return LOCAL_WORD_BOOK_SOURCES.flatMap((source) => source.words);
}

export function listLocalWordsByBook(bookId: string): Word[] {
  const target = LOCAL_WORD_BOOK_SOURCES.find((source) => source.book.id === bookId);
  return target ? target.words : [];
}

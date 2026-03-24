import { prisma } from "./prisma";

import type { Word, WordBook } from "@/lib/words/types";

export const BUILTIN_BOOK_ID_PREFIX = "builtin_book_";
export const BUILTIN_WORD_ID_PREFIX = "builtin_word_";

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2021"
  );
}

export function toBuiltinBookId(rawId: string): string {
  return `${BUILTIN_BOOK_ID_PREFIX}${rawId}`;
}

export function parseBuiltinBookId(externalId: string): string {
  if (typeof externalId !== "string" || !externalId.startsWith(BUILTIN_BOOK_ID_PREFIX)) {
    throw new Error("Invalid builtin book ID");
  }
  const raw = externalId.slice(BUILTIN_BOOK_ID_PREFIX.length);
  if (!raw) {
    throw new Error("Invalid builtin book ID");
  }
  return raw;
}

export function toBuiltinWordId(rawEntryId: string): string {
  return `${BUILTIN_WORD_ID_PREFIX}${rawEntryId}`;
}

function normalizeDifficulty(value?: string | null): "easy" | "medium" | "hard" {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "easy" || raw === "medium" || raw === "hard") {
    return raw;
  }
  return "medium";
}

export async function listBuiltinWordBooks(): Promise<WordBook[]> {
  const books = await prisma.builtinWordBook
    .findMany({
      orderBy: { id: "asc" },
      select: { id: true, name: true, description: true, wordCount: true, category: true },
    })
    .catch((error) => {
      if (isMissingTableError(error)) {
        return [];
      }
      throw error;
    });
  return books.map((book) => ({
    id: toBuiltinBookId(book.id),
    name: book.name,
    description: book.description ?? "",
    wordCount: book.wordCount,
    category: "general" as const,
  }));
}

export async function listBuiltinWords(options?: { bookId?: string }): Promise<Word[]> {
  const where = options?.bookId ? { bookId: parseBuiltinBookId(options.bookId) } : {};

  const entries = await prisma.builtinWordEntry
    .findMany({
      where,
      orderBy: options?.bookId ? { sortOrder: "asc" } : [{ bookId: "asc" }, { sortOrder: "asc" }],
    })
    .catch((error) => {
      if (isMissingTableError(error)) {
        return [];
      }
      throw error;
    });

  return entries.map((entry) => ({
    id: toBuiltinWordId(entry.id),
    word: entry.word,
    phonetic: entry.phonetic ?? "",
    definition: entry.definition,
    example: entry.example ?? "",
    exampleZh: entry.exampleZh ?? undefined,
    bookId: toBuiltinBookId(entry.bookId),
    difficulty: normalizeDifficulty(entry.difficulty),
  }));
}

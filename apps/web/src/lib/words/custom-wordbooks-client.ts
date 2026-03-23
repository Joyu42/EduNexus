import type { WordBook, Word } from "./types";
import { requestJson } from "@/lib/client/api";

/**
 * Upload a CSV or JSON wordbook file and create a new custom book.
 */
export async function uploadCustomBook(file: File, name?: string, description?: string): Promise<WordBook> {
  const formData = new FormData();
  formData.append("file", file);
  if (name) formData.append("name", name);
  if (description) formData.append("description", description);
  
  const data = await requestJson<{ book: WordBook }>("/api/words/import", {
    method: "POST",
    body: formData,
  });
  
  return data.book;
}

/**
 * List all custom wordbooks for the current user.
 */
export async function listCustomBooks(): Promise<WordBook[]> {
  const data = await requestJson<{ books: WordBook[] }>("/api/words/custom-books", { cache: "no-store" });
  return data.books;
}

/**
 * Get a single custom book with its words.
 */
export async function getCustomBook(bookId: string): Promise<{ book: WordBook; words: Word[] }> {
  return requestJson<{ book: WordBook; words: Word[] }>(
    `/api/words/custom-books/${encodeURIComponent(bookId)}`,
    { cache: "no-store" }
  );
}

/**
 * Update the name and/or description of a custom book.
 */
export async function updateCustomBookMetadata(
  bookId: string,
  updates: { name?: string; description?: string }
): Promise<WordBook> {
  const data = await requestJson<{ book: WordBook }>(
    `/api/words/custom-books/${encodeURIComponent(bookId)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }
  );
  return data.book;
}

/**
 * Replace the content of a custom book with a new CSV/JSON file.
 */
export async function replaceCustomBook(bookId: string, file: File): Promise<WordBook> {
  const formData = new FormData();
  formData.append("file", file);
  
  const data = await requestJson<{ book: WordBook }>(
    `/api/words/custom-books/${encodeURIComponent(bookId)}/replace`,
    {
      method: "POST",
      body: formData,
    }
  );
  
  return data.book;
}

/**
 * Delete a custom book and all its entries.
 */
export async function deleteCustomBook(bookId: string): Promise<void> {
  await requestJson<{ deleted: boolean }>(
    `/api/words/custom-books/${encodeURIComponent(bookId)}`,
    { method: "DELETE" }
  );
}

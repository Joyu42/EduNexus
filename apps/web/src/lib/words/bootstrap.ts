import cet4Words from "@/data/words/cet4.json";
import cet6Words from "@/data/words/cet6.json";

import { wordsStorage } from "./storage";
import type { Word, WordBook } from "./types";

const BUILTIN_BOOKS: WordBook[] = [
  {
    id: "cet4",
    name: "CET-4 Core 2000",
    description: "College English Test Band 4 core vocabulary",
    wordCount: 2000,
    category: "cet",
  },
  {
    id: "cet6",
    name: "CET-6 Core 2000",
    description: "College English Test Band 6 core vocabulary",
    wordCount: 2000,
    category: "cet",
  },
];

export async function ensureWordsBootstrap(): Promise<void> {
  const books = await wordsStorage.getWordBooks();
  if (books.length > 0) {
    return;
  }

  for (const book of BUILTIN_BOOKS) {
    await wordsStorage.saveWordBook(book);
  }

  await wordsStorage.saveWords(cet4Words as Word[]);
  await wordsStorage.saveWords(cet6Words as Word[]);
}

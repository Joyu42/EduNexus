import { LOCAL_WORD_BOOK_SOURCES } from "@/data/words";

import { wordsStorage, type WordsStorage } from "./storage";

const WORDS_DATA_VERSION = "kylebing-cet4-cet6-v1";
const WORDS_DATA_VERSION_KEY = "edunexus_words_data_version";

type BootstrapOptions = {
  storage?: WordsStorage;
  readVersion?: () => string | null;
  writeVersion?: (value: string) => void;
};

function defaultReadVersion(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return localStorage.getItem(WORDS_DATA_VERSION_KEY);
  } catch {
    return null;
  }
}

function defaultWriteVersion(value: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(WORDS_DATA_VERSION_KEY, value);
  } catch {
    // ignore localStorage write errors
  }
}

async function seedLocalData(storage: WordsStorage): Promise<void> {
  for (const source of LOCAL_WORD_BOOK_SOURCES) {
    const book = {
      ...source.book,
      wordCount: source.words.length,
    };
    await storage.saveWordBook(book);
    await storage.saveWords(source.words);
  }
}

function isSeedComplete(books: Array<{ id: string }>, words: Array<{ id: string }>): boolean {
  if (books.length === 0 || words.length === 0) {
    return false;
  }
  const expectedBookIds = new Set(LOCAL_WORD_BOOK_SOURCES.map((source) => source.book.id));
  const bookIds = new Set(books.map((book) => book.id));
  for (const id of expectedBookIds) {
    if (!bookIds.has(id)) {
      return false;
    }
  }
  return true;
}

export async function ensureWordsBootstrap(options?: BootstrapOptions): Promise<void> {
  const storage = options?.storage ?? wordsStorage;
  const readVersion = options?.readVersion ?? defaultReadVersion;
  const writeVersion = options?.writeVersion ?? defaultWriteVersion;

  const currentVersion = readVersion();
  const [books, words] = await Promise.all([
    storage.getWordBooks(),
    storage.getAllWords(),
  ]);
  const hasCompleteSeed = isSeedComplete(books, words);
  if (currentVersion === WORDS_DATA_VERSION && hasCompleteSeed) {
    return;
  }

  await seedLocalData(storage);
  writeVersion(WORDS_DATA_VERSION);
}

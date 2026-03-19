import cet4Words from "./cet4.json";
import cet6Words from "./cet6.json";

import type { Word, WordBook } from "@/lib/words/types";

export type LocalWordBookSource = {
  book: WordBook;
  words: Word[];
};

export const LOCAL_WORD_BOOK_SOURCES: LocalWordBookSource[] = [
  {
    book: {
      id: "cet4",
      name: "CET-4 Core 2000",
      description: "College English Test Band 4 core vocabulary",
      wordCount: 2000,
      category: "cet",
    },
    words: cet4Words as Word[],
  },
  {
    book: {
      id: "cet6",
      name: "CET-6 Core 2000",
      description: "College English Test Band 6 core vocabulary",
      wordCount: 2000,
      category: "cet",
    },
    words: cet6Words as Word[],
  },
];

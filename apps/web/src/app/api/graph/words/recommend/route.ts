import { NextResponse } from "next/server";

import cet4Words from "@/data/words/cet4.json";
import cet6Words from "@/data/words/cet6.json";

type WordItem = {
  id: string;
  word: string;
  phonetic: string;
  definition: string;
  example: string;
  bookId: string;
  difficulty: "easy" | "medium" | "hard";
};

const allWords = [...(cet4Words as WordItem[]), ...(cet6Words as WordItem[])];

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wordId = searchParams.get("wordId");
  const limit = Number(searchParams.get("limit") ?? "5");

  if (!wordId) {
    return NextResponse.json({ error: "missing wordId" }, { status: 400 });
  }

  const current = allWords.find((item) => item.id === wordId);
  if (!current) {
    return NextResponse.json({ items: [] });
  }

  const currentPrefix = current.word.slice(0, 2).toLowerCase();
  const items = allWords
    .filter((item) => item.id !== current.id)
    .sort((left, right) => {
      const leftBook = Number(left.bookId === current.bookId);
      const rightBook = Number(right.bookId === current.bookId);
      if (leftBook !== rightBook) return rightBook - leftBook;

      const leftDiff = Number(left.difficulty === current.difficulty);
      const rightDiff = Number(right.difficulty === current.difficulty);
      if (leftDiff !== rightDiff) return rightDiff - leftDiff;

      const leftPrefix = Number(left.word.slice(0, 2).toLowerCase() === currentPrefix);
      const rightPrefix = Number(right.word.slice(0, 2).toLowerCase() === currentPrefix);
      if (leftPrefix !== rightPrefix) return rightPrefix - leftPrefix;

      return left.word.localeCompare(right.word);
    })
    .slice(0, Math.max(1, Math.min(20, limit)));

  return NextResponse.json({ items });
}
